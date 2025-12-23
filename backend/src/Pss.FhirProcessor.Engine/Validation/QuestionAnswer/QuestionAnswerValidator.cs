using System.Text.Json;
using System.Text.RegularExpressions;
using Hl7.Fhir.Model;
using Hl7.Fhir.FhirPath;
using Microsoft.Extensions.Logging;
using Pss.FhirProcessor.Engine.Models;
using Pss.FhirProcessor.Engine.Models.Questions;
using Pss.FhirProcessor.Engine.Services.Questions;

namespace Pss.FhirProcessor.Engine.Validation.QuestionAnswer;

/// <summary>
/// Validates Question/Answer constraints at runtime
/// Enforces answer type-specific rules defined in Question definitions
/// </summary>
public class QuestionAnswerValidator
{
    private readonly IQuestionService _questionService;
    private readonly QuestionAnswerValueExtractor _valueExtractor;
    private readonly ILogger<QuestionAnswerValidator> _logger;

    public QuestionAnswerValidator(
        IQuestionService questionService,
        QuestionAnswerValueExtractor valueExtractor,
        ILogger<QuestionAnswerValidator> logger)
    {
        _questionService = questionService;
        _valueExtractor = valueExtractor;
        _logger = logger;
    }

    /// <summary>
    /// Validate all QuestionAnswer rules in a bundle
    /// </summary>
    public async Task<QuestionAnswerResult> ValidateAsync(
        Bundle bundle,
        RuleSet ruleSet,
        string projectId,
        CancellationToken cancellationToken = default)
    {
        var result = new QuestionAnswerResult();

        // Filter QuestionAnswer rules
        var questionAnswerRules = ruleSet.Rules
            .Where(r => r.Type.Equals("QuestionAnswer", StringComparison.OrdinalIgnoreCase))
            .ToList();

        if (!questionAnswerRules.Any())
        {
            return result;
        }

        foreach (var rule in questionAnswerRules)
        {
            try
            {
                var ruleErrors = await ValidateRuleAsync(bundle, rule, projectId, cancellationToken);
                result.Errors.AddRange(ruleErrors);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error validating QuestionAnswer rule {RuleId}", rule.Id);
                result.AdvisoryNotes.Add($"Failed to validate rule {rule.Id}: {ex.Message}");
            }
        }

        return result;
    }

    /// <summary>
    /// Validate a single QuestionAnswer rule
    /// </summary>
    private async Task<List<RuleValidationError>> ValidateRuleAsync(
        Bundle bundle,
        RuleDefinition rule,
        string projectId,
        CancellationToken cancellationToken)
    {
        var errors = new List<RuleValidationError>();

        // Extract params
        if (!TryExtractRuleParams(rule, out var questionSetId, out var questionPath, out var answerPath))
        {
            _logger.LogWarning("QuestionAnswer rule {RuleId} missing required params", rule.Id);
            return errors;
        }

        // Load QuestionSet
        var questionSet = await LoadQuestionSetAsync(projectId, questionSetId, cancellationToken);
        if (questionSet == null)
        {
            errors.Add(QuestionAnswerErrorFactory.MasterDataMissing(rule, "QuestionSet", questionSetId, 0));
            return errors;
        }

        // Load Questions
        var questions = await LoadQuestionsAsync(projectId, questionSet, cancellationToken);

        // Evaluate rule path on bundle to get target resources
        var targetResources = EvaluateRulePath(bundle, rule);

        int entryIndex = 0;
        foreach (var resource in targetResources)
        {
            // Get iteration nodes (e.g., components)
            var iterationNodes = GetIterationNodes(resource, rule.Path);

            foreach (var iterationNode in iterationNodes)
            {
                var context = new QuestionAnswerContext
                {
                    Rule = rule,
                    QuestionSet = questionSet,
                    Questions = questions,
                    Resource = resource,
                    IterationNode = iterationNode,
                    EntryIndex = entryIndex,
                    CurrentPath = BuildCurrentPath(resource, rule.Path)
                };

                // Extract question coding
                context.QuestionCoding = _valueExtractor.ExtractQuestionCoding(iterationNode, questionPath);
                if (context.QuestionCoding == null)
                {
                    continue; // Skip if no question coding found
                }

                // Match question in set
                var questionRef = questionSet.Questions.FirstOrDefault(q =>
                {
                    var question = questions.GetValueOrDefault(q.QuestionId);
                    return question != null &&
                           question.Code.System == context.QuestionCoding.System &&
                           question.Code.Code == context.QuestionCoding.Code;
                });

                if (questionRef == null)
                {
                    errors.Add(QuestionAnswerErrorFactory.QuestionNotInSet(context, context.QuestionCoding.Code));
                    continue;
                }

                context.ResolvedQuestion = questions.GetValueOrDefault(questionRef.QuestionId);
                context.IsRequired = questionRef.Required;

                if (context.ResolvedQuestion == null)
                {
                    errors.Add(QuestionAnswerErrorFactory.MasterDataMissing(rule, "Question", questionRef.QuestionId, entryIndex));
                    continue;
                }

                // Extract answer value
                context.ExtractedAnswer = _valueExtractor.ExtractAnswerValue(iterationNode, answerPath);

                // Validate answer
                var validationErrors = ValidateAnswer(context);
                errors.AddRange(validationErrors);
            }

            entryIndex++;
        }

        return errors;
    }

    /// <summary>
    /// Validate answer against Question definition
    /// </summary>
    private List<RuleValidationError> ValidateAnswer(QuestionAnswerContext context)
    {
        var errors = new List<RuleValidationError>();
        var question = context.ResolvedQuestion!;

        // Check if answer is present
        bool isPresent = _valueExtractor.IsAnswerPresent(context.ExtractedAnswer);

        if (!isPresent)
        {
            if (context.IsRequired)
            {
                errors.Add(QuestionAnswerErrorFactory.RequiredMissing(context));
            }
            return errors;
        }

        // Validate based on answer type
        switch (question.AnswerType)
        {
            case QuestionAnswerType.Code:
                errors.AddRange(ValidateCodeAnswer(context, question));
                break;

            case QuestionAnswerType.Quantity:
                errors.AddRange(ValidateQuantityAnswer(context, question));
                break;

            case QuestionAnswerType.Integer:
                errors.AddRange(ValidateIntegerAnswer(context, question));
                break;

            case QuestionAnswerType.Decimal:
                errors.AddRange(ValidateDecimalAnswer(context, question));
                break;

            case QuestionAnswerType.String:
                errors.AddRange(ValidateStringAnswer(context, question));
                break;

            case QuestionAnswerType.Boolean:
                errors.AddRange(ValidateBooleanAnswer(context, question));
                break;

            default:
                _logger.LogWarning("Unknown answer type: {AnswerType}", question.AnswerType);
                break;
        }

        return errors;
    }

    #region Answer Type Validators

    /// <summary>
    /// Validate Code answer
    /// </summary>
    private List<RuleValidationError> ValidateCodeAnswer(QuestionAnswerContext context, Question question)
    {
        var errors = new List<RuleValidationError>();

        // Extract coding
        Coding? answerCoding = context.ExtractedAnswer switch
        {
            CodeableConcept cc => cc.Coding.FirstOrDefault(),
            Coding c => c,
            _ => null
        };

        if (answerCoding == null)
        {
            errors.Add(QuestionAnswerErrorFactory.InvalidType(context, "Code", _valueExtractor.GetAnswerTypeName(context.ExtractedAnswer)));
            return errors;
        }

        // Check ValueSet binding
        if (question.ValueSet != null)
        {
            // Note: Full ValueSet validation requires terminology service
            // For now, just check that a code is present
            if (string.IsNullOrEmpty(answerCoding.Code))
            {
                var bindingStrength = question.ValueSet.BindingStrength ?? "required";
                errors.Add(QuestionAnswerErrorFactory.InvalidCode(context,
                    answerCoding.Code ?? "",
                    answerCoding.System ?? "",
                    question.ValueSet.Url,
                    bindingStrength));
            }
        }

        return errors;
    }

    /// <summary>
    /// Validate Quantity answer
    /// </summary>
    private List<RuleValidationError> ValidateQuantityAnswer(QuestionAnswerContext context, Question question)
    {
        var errors = new List<RuleValidationError>();

        if (context.ExtractedAnswer is not Quantity quantity)
        {
            errors.Add(QuestionAnswerErrorFactory.InvalidType(context, "Quantity", _valueExtractor.GetAnswerTypeName(context.ExtractedAnswer)));
            return errors;
        }

        if (!quantity.Value.HasValue)
        {
            if (context.IsRequired)
            {
                errors.Add(QuestionAnswerErrorFactory.RequiredMissing(context));
            }
            return errors;
        }

        // Check unit
        if (question.Unit != null)
        {
            if (quantity.Unit != question.Unit.Code && quantity.Code != question.Unit.Code)
            {
                errors.Add(QuestionAnswerErrorFactory.InvalidUnit(context, question.Unit.Code, quantity.Unit ?? quantity.Code ?? "none"));
            }
        }

        // Check min/max
        var value = quantity.Value.Value;
        var constraints = question.Constraints;
        if (constraints != null)
        {
            if (constraints.Min.HasValue && value < constraints.Min.Value)
            {
                errors.Add(QuestionAnswerErrorFactory.ValueOutOfRange(context, constraints.Min, constraints.Max, value));
            }
            else if (constraints.Max.HasValue && value > constraints.Max.Value)
            {
                errors.Add(QuestionAnswerErrorFactory.ValueOutOfRange(context, constraints.Min, constraints.Max, value));
            }
        }

        return errors;
    }

    /// <summary>
    /// Validate Integer answer
    /// </summary>
    private List<RuleValidationError> ValidateIntegerAnswer(QuestionAnswerContext context, Question question)
    {
        var errors = new List<RuleValidationError>();

        if (context.ExtractedAnswer is not int intValue)
        {
            // Try to convert
            if (context.ExtractedAnswer is decimal decValue && decValue == Math.Floor(decValue))
            {
                intValue = (int)decValue;
            }
            else
            {
                errors.Add(QuestionAnswerErrorFactory.InvalidType(context, "Integer", _valueExtractor.GetAnswerTypeName(context.ExtractedAnswer)));
                return errors;
            }
        }

        // Check min/max
        var constraints = question.Constraints;
        if (constraints != null)
        {
            if (constraints.Min.HasValue && intValue < constraints.Min.Value)
            {
                errors.Add(QuestionAnswerErrorFactory.ValueOutOfRange(context, constraints.Min, constraints.Max, intValue));
            }
            else if (constraints.Max.HasValue && intValue > constraints.Max.Value)
            {
                errors.Add(QuestionAnswerErrorFactory.ValueOutOfRange(context, constraints.Min, constraints.Max, intValue));
            }
        }

        return errors;
    }

    /// <summary>
    /// Validate Decimal answer
    /// </summary>
    private List<RuleValidationError> ValidateDecimalAnswer(QuestionAnswerContext context, Question question)
    {
        var errors = new List<RuleValidationError>();

        if (context.ExtractedAnswer is not decimal decValue)
        {
            // Try to convert int to decimal
            if (context.ExtractedAnswer is int intVal)
            {
                decValue = intVal;
            }
            else
            {
                errors.Add(QuestionAnswerErrorFactory.InvalidType(context, "Decimal", _valueExtractor.GetAnswerTypeName(context.ExtractedAnswer)));
                return errors;
            }
        }

        // Check min/max
        var constraints = question.Constraints;
        if (constraints != null)
        {
            if (constraints.Min.HasValue && decValue < constraints.Min.Value)
            {
                errors.Add(QuestionAnswerErrorFactory.ValueOutOfRange(context, constraints.Min, constraints.Max, decValue));
            }
            else if (constraints.Max.HasValue && decValue > constraints.Max.Value)
            {
                errors.Add(QuestionAnswerErrorFactory.ValueOutOfRange(context, constraints.Min, constraints.Max, decValue));
            }
        }

        return errors;
    }

    /// <summary>
    /// Validate String answer
    /// </summary>
    private List<RuleValidationError> ValidateStringAnswer(QuestionAnswerContext context, Question question)
    {
        var errors = new List<RuleValidationError>();

        if (context.ExtractedAnswer is not string strValue)
        {
            errors.Add(QuestionAnswerErrorFactory.InvalidType(context, "String", _valueExtractor.GetAnswerTypeName(context.ExtractedAnswer)));
            return errors;
        }

        var constraints = question.Constraints;
        if (constraints != null)
        {
            // Check max length
            if (constraints.MaxLength.HasValue && strValue.Length > constraints.MaxLength.Value)
            {
                errors.Add(QuestionAnswerErrorFactory.MaxLengthExceeded(context, constraints.MaxLength.Value, strValue.Length));
            }

            // Check regex
            if (!string.IsNullOrEmpty(constraints.Regex))
            {
                try
                {
                    if (!System.Text.RegularExpressions.Regex.IsMatch(strValue, constraints.Regex))
                    {
                        errors.Add(QuestionAnswerErrorFactory.RegexMismatch(context, constraints.Regex, strValue));
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Invalid regex pattern: {Pattern}", constraints.Regex);
                }
            }
        }

        return errors;
    }

    /// <summary>
    /// Validate Boolean answer
    /// </summary>
    private List<RuleValidationError> ValidateBooleanAnswer(QuestionAnswerContext context, Question question)
    {
        var errors = new List<RuleValidationError>();

        if (context.ExtractedAnswer is not bool)
        {
            errors.Add(QuestionAnswerErrorFactory.InvalidType(context, "Boolean", _valueExtractor.GetAnswerTypeName(context.ExtractedAnswer)));
        }

        // No constraints for boolean
        return errors;
    }

    #endregion

    #region Helper Methods

    /// <summary>
    /// Extract rule params from rule definition
    /// </summary>
    private bool TryExtractRuleParams(RuleDefinition rule, out string questionSetId, out string questionPath, out string answerPath)
    {
        questionSetId = string.Empty;
        questionPath = string.Empty;
        answerPath = string.Empty;

        if (rule.Params == null)
            return false;

        // Get from params
        if (rule.Params.TryGetValue("questionSetId", out var qsIdObj))
        {
            questionSetId = qsIdObj?.ToString() ?? string.Empty;
        }

        // Get from rule properties (alternative)
        if (string.IsNullOrEmpty(questionSetId))
        {
            return false;
        }

        // QuestionPath and AnswerPath might be in Params or as top-level properties
        if (rule.Params.TryGetValue("questionPath", out var qpObj))
        {
            questionPath = qpObj?.ToString() ?? string.Empty;
        }

        if (rule.Params.TryGetValue("answerPath", out var apObj))
        {
            answerPath = apObj?.ToString() ?? string.Empty;
        }

        // Check if they're stored as dedicated properties (from frontend)
        // The frontend stores questionPath and answerPath directly on the rule
        var ruleJson = JsonSerializer.Serialize(rule);
        var ruleDict = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(ruleJson);
        
        if (ruleDict != null)
        {
            if (string.IsNullOrEmpty(questionPath) && ruleDict.TryGetValue("questionPath", out var qpElem))
            {
                questionPath = qpElem.GetString() ?? string.Empty;
            }
            
            if (string.IsNullOrEmpty(answerPath) && ruleDict.TryGetValue("answerPath", out var apElem))
            {
                answerPath = apElem.GetString() ?? string.Empty;
            }
        }

        return !string.IsNullOrEmpty(questionSetId) && 
               !string.IsNullOrEmpty(questionPath) && 
               !string.IsNullOrEmpty(answerPath);
    }

    /// <summary>
    /// Load QuestionSet from storage
    /// </summary>
    private async Task<QuestionSet?> LoadQuestionSetAsync(string projectId, string questionSetId, CancellationToken cancellationToken)
    {
        try
        {
            // Note: This assumes a QuestionSet service exists
            // For now, return null to trigger advisory error
            // TODO: Implement QuestionSet service
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to load QuestionSet {QuestionSetId}", questionSetId);
            return null;
        }
    }

    /// <summary>
    /// Load questions for a QuestionSet
    /// </summary>
    private async Task<Dictionary<string, Question>> LoadQuestionsAsync(string projectId, QuestionSet questionSet, CancellationToken cancellationToken)
    {
        var questions = new Dictionary<string, Question>();

        foreach (var questionRef in questionSet.Questions)
        {
            try
            {
                var question = await _questionService.GetQuestionAsync(projectId, questionRef.QuestionId);
                if (question != null)
                {
                    questions[questionRef.QuestionId] = question;
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to load Question {QuestionId}", questionRef.QuestionId);
            }
        }

        return questions;
    }

    /// <summary>
    /// Evaluate rule path to get target resources
    /// </summary>
    private List<Resource> EvaluateRulePath(Bundle bundle, RuleDefinition rule)
    {
        var resources = new List<Resource>();

        try
        {
            // Get resources of the specified type
            var targetResources = bundle.Entry
                .Where(e => e.Resource != null && e.Resource.TypeName == rule.ResourceType)
                .Select(e => e.Resource)
                .ToList();

            resources.AddRange(targetResources);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error evaluating rule path: {Path}", rule.Path);
        }

        return resources;
    }

    /// <summary>
    /// Get iteration nodes from resource
    /// For example, if path is "Observation[*].component[*]", return all components
    /// </summary>
    private List<Base> GetIterationNodes(Resource resource, string rulePath)
    {
        var nodes = new List<Base>();

        try
        {
            // Extract the iteration part (e.g., "component[*]")
            // For now, assume the iteration is directly on the resource
            // This is a simplified implementation
            
            // If path contains ".component", iterate over components
            if (rulePath.Contains(".component", StringComparison.OrdinalIgnoreCase))
            {
                if (resource is Observation obs && obs.Component.Any())
                {
                    nodes.AddRange(obs.Component);
                }
            }
            else
            {
                // Default: treat the resource itself as the iteration node
                nodes.Add(resource);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting iteration nodes from path: {Path}", rulePath);
        }

        return nodes;
    }

    /// <summary>
    /// Build current FHIRPath for error reporting
    /// </summary>
    private string BuildCurrentPath(Resource resource, string rulePath)
    {
        return $"Bundle.entry[?(@.resource.resourceType=='{resource.TypeName}')].resource";
    }

    #endregion
}
