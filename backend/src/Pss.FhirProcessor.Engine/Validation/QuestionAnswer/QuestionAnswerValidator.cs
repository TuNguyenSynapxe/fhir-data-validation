using System.Text.Json;
using System.Text.RegularExpressions;
using Hl7.Fhir.Model;
using Hl7.Fhir.FhirPath;
using Microsoft.Extensions.Logging;
using Pss.FhirProcessor.Engine.Models;
using Pss.FhirProcessor.Engine.Models.Questions;
using Pss.FhirProcessor.Engine.Services.Questions;
using Pss.FhirProcessor.Engine.Validation.QuestionAnswer.Models;
using Pss.FhirProcessor.Engine.Core.Execution;
using Pss.FhirProcessor.Engine.Interfaces;

namespace Pss.FhirProcessor.Engine.Validation.QuestionAnswer;

/// <summary>
/// Validates Question/Answer constraints at runtime
/// Enforces answer type-specific rules defined in Question definitions
/// </summary>
public class QuestionAnswerValidator
{
    private readonly IQuestionService _questionService;
    private readonly ITerminologyService _terminologyService;
    private readonly IQuestionAnswerContextProvider _contextProvider;
    private readonly QuestionAnswerValueExtractor _valueExtractor;
    private readonly ILogger<QuestionAnswerValidator> _logger;

    public QuestionAnswerValidator(
        IQuestionService questionService,
        ITerminologyService terminologyService,
        IQuestionAnswerContextProvider contextProvider,
        QuestionAnswerValueExtractor valueExtractor,
        ILogger<QuestionAnswerValidator> logger)
    {
        _questionService = questionService;
        _terminologyService = terminologyService;
        _contextProvider = contextProvider;
        _valueExtractor = valueExtractor;
        _logger = logger;
    }

    /// <summary>
    /// Validate all QuestionAnswer rules in a bundle
    /// PUBLIC API: Maintains backward compatibility
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
    /// Validate QuestionAnswer rules with pre-computed execution contexts.
    /// INTERNAL API (Phase 3.5 optimization): Used by ValidationPipeline for performance.
    /// Traversal context is computed once and reused, avoiding redundant bundle scanning.
    /// </summary>
    internal async Task<QuestionAnswerResult> ValidateAsync(
        IReadOnlyList<RuleExecutionContext> contexts,
        string projectId,
        CancellationToken cancellationToken = default)
    {
        var result = new QuestionAnswerResult();

        foreach (var context in contexts)
        {
            try
            {
                var ruleErrors = await ValidateRuleWithContextAsync(context, projectId, cancellationToken);
                result.Errors.AddRange(ruleErrors);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error validating QuestionAnswer rule {RuleId}", context.Rule.Id);
                result.AdvisoryNotes.Add($"Failed to validate rule {context.Rule.Id}: {ex.Message}");
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
            errors.Add(QuestionAnswerErrorFactory.QuestionSetDataMissing(
                ruleId: rule.Id,
                resourceType: rule.ResourceType,
                severity: rule.Severity,
                questionSetId: questionSetId,
                entryIndex: 0,
                userHint: rule.UserHint));
            return errors;
        }

        // Load Questions
        var questions = await LoadQuestionsAsync(projectId, questionSet, cancellationToken);

        // Resolve all validation contexts via provider (no traversal in validator)
        var contextSeeds = _contextProvider.Resolve(bundle, rule);

        foreach (var seed in contextSeeds)
        {
            var context = new QuestionAnswerContext
            {
                Rule = rule,
                QuestionSet = questionSet,
                Questions = questions,
                Resource = seed.Resource,
                IterationNode = seed.IterationNode,
                EntryIndex = seed.EntryIndex,
                CurrentPath = seed.CurrentFhirPath
            };

            // Extract question coding
            context.QuestionCoding = _valueExtractor.ExtractQuestionCoding(seed.IterationNode, questionPath);
            if (context.QuestionCoding == null)
            {
                continue; // Skip if no question coding found
            }

            // Match question in set
            _logger.LogDebug("Looking up question: System={System}, Code={Code}, Display={Display}. QuestionSet has {Count} questions",
                context.QuestionCoding.System, context.QuestionCoding.Code, context.QuestionCoding.Display, questionSet.Questions.Count);

            var questionRef = questionSet.Questions.FirstOrDefault(q =>
            {
                var question = questions.GetValueOrDefault(q.QuestionId);
                if (question == null)
                {
                    _logger.LogDebug("Question {QuestionId} not found in questions dictionary", q.QuestionId);
                    return false;
                }
                var matches = question.Code.System == context.QuestionCoding.System &&
                              question.Code.Code == context.QuestionCoding.Code;
                if (!matches)
                {
                    _logger.LogDebug("Question {QuestionId} doesn't match: Expected System={ExpectedSystem}, Code={ExpectedCode}, Got System={ActualSystem}, Code={ActualCode}",
                        q.QuestionId, context.QuestionCoding.System, context.QuestionCoding.Code, question.Code.System, question.Code.Code);
                }
                return matches;
            });

        if (questionRef == null)
            {
                var location = new ValidationLocation(
                    FhirPath: context.CurrentPath,
                    JsonPointer: null);
                var questionRefObj = new QuestionRef(
                    System: context.QuestionCoding.System,
                    Code: context.QuestionCoding.Code,
                    Display: context.QuestionCoding.Display);
                var identifierType = QuestionAnswerContext.GetQuestionIdentifierType(questionPath);
                errors.Add(QuestionAnswerErrorFactory.QuestionNotFound(
                    ruleId: rule.Id,
                    resourceType: rule.ResourceType,
                    severity: "warning",
                    system: context.QuestionCoding.System,
                    code: context.QuestionCoding.Code,
                    location: location,
                    questionSetId: questionSetId,
                    questionIdentifierType: identifierType,
                    iterationIndex: seed.IterationIndex,
                    entryIndex: seed.EntryIndex));
                continue;
            }

            context.ResolvedQuestion = questions.GetValueOrDefault(questionRef.QuestionId);
            context.IsRequired = questionRef.Required;

            if (context.ResolvedQuestion == null)
            {
                errors.Add(QuestionAnswerErrorFactory.QuestionSetDataMissing(
                    ruleId: rule.Id,
                    resourceType: rule.ResourceType,
                    severity: "information",
                    questionSetId: $"Question:{questionRef.QuestionId}",
                    entryIndex: seed.EntryIndex));
                continue;
            }

            // Extract answer value
            context.ExtractedAnswer = _valueExtractor.ExtractAnswerValue(seed.IterationNode, answerPath);

            // Validate answer (passing metadata for enhanced error details)
            var validationErrors = ValidateAnswer(context, questionSetId, questionPath, seed.IterationIndex);
            errors.AddRange(validationErrors);
        }

        return errors;
    }

    /// <summary>
    /// Validate a single QuestionAnswer rule using pre-computed execution context.
    /// INTERNAL (Phase 3.5): Optimized path that skips redundant traversal.
    /// </summary>
    private async Task<List<RuleValidationError>> ValidateRuleWithContextAsync(
        RuleExecutionContext executionContext,
        string projectId,
        CancellationToken cancellationToken)
    {
        var errors = new List<RuleValidationError>();
        var rule = executionContext.Rule;

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
            errors.Add(QuestionAnswerErrorFactory.QuestionSetDataMissing(
                ruleId: rule.Id,
                resourceType: rule.ResourceType,
                severity: rule.Severity,
                questionSetId: questionSetId,
                entryIndex: 0,
                userHint: rule.UserHint));
            return errors;
        }

        // Load Questions
        var questions = await LoadQuestionsAsync(projectId, questionSet, cancellationToken);

        // Use pre-computed seeds (NO traversal recomputation)
        if (executionContext.QuestionAnswerSeeds == null || !executionContext.QuestionAnswerSeeds.Any())
        {
            return errors; // No contexts to validate
        }

        foreach (var seed in executionContext.QuestionAnswerSeeds)
        {
            var context = new QuestionAnswerContext
            {
                Rule = rule,
                QuestionSet = questionSet,
                Questions = questions,
                Resource = seed.Resource,
                IterationNode = seed.IterationNode,
                EntryIndex = seed.EntryIndex,
                CurrentPath = seed.CurrentFhirPath
            };

            // Extract question coding
            context.QuestionCoding = _valueExtractor.ExtractQuestionCoding(seed.IterationNode, questionPath);
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
                var location = new ValidationLocation(
                    FhirPath: context.CurrentPath,
                    JsonPointer: null);
                var questionRefObj = new QuestionRef(
                    System: context.QuestionCoding.System,
                    Code: context.QuestionCoding.Code,
                    Display: context.QuestionCoding.Display);
                var identifierType = QuestionAnswerContext.GetQuestionIdentifierType(questionPath);
                errors.Add(QuestionAnswerErrorFactory.QuestionNotFound(
                    ruleId: rule.Id,
                    resourceType: rule.ResourceType,
                    severity: "warning",
                    system: context.QuestionCoding.System,
                    code: context.QuestionCoding.Code,
                    location: location,
                    questionSetId: questionSetId,
                    questionIdentifierType: identifierType,
                    iterationIndex: seed.IterationIndex,
                    entryIndex: seed.EntryIndex));
                continue;
            }

            context.ResolvedQuestion = questions.GetValueOrDefault(questionRef.QuestionId);
            context.IsRequired = questionRef.Required;

            if (context.ResolvedQuestion == null)
            {
                errors.Add(QuestionAnswerErrorFactory.QuestionSetDataMissing(
                    ruleId: rule.Id,
                    resourceType: rule.ResourceType,
                    severity: "information",
                    questionSetId: $"Question:{questionRef.QuestionId}",
                    entryIndex: seed.EntryIndex));
                continue;
            }

            // Extract answer value
            context.ExtractedAnswer = _valueExtractor.ExtractAnswerValue(seed.IterationNode, answerPath);

            // Validate answer (passing metadata for enhanced error details)
            var validationErrors = ValidateAnswer(context, questionSetId, questionPath, seed.IterationIndex);
            errors.AddRange(validationErrors);
        }

        return errors;
    }

    /// <summary>
    /// Validate answer against Question definition
    /// Enhanced with iteration metadata for precise error reporting
    /// </summary>
    private List<RuleValidationError> ValidateAnswer(
        QuestionAnswerContext context,
        string questionSetId,
        string questionPath,
        int iterationIndex)
    {
        var errors = new List<RuleValidationError>();
        var question = context.ResolvedQuestion!;

        // Compute identifier type once for all error calls
        var identifierType = QuestionAnswerContext.GetQuestionIdentifierType(questionPath);

        // Check if answer is present
        bool isPresent = _valueExtractor.IsAnswerPresent(context.ExtractedAnswer);

        if (!isPresent)
        {
            if (context.IsRequired)
            {
                var location = new ValidationLocation(
                    FhirPath: context.CurrentPath,
                    JsonPointer: null);
                var questionRef = new QuestionRef(
                    System: context.QuestionCoding?.System,
                    Code: context.QuestionCoding?.Code ?? "unknown",
                    Display: context.QuestionCoding?.Display);
                errors.Add(QuestionAnswerErrorFactory.AnswerRequired(
                    ruleId: context.Rule.Id,
                    resourceType: context.Rule.ResourceType,
                    severity: context.Rule.Severity,
                    question: questionRef,
                    expectedAnswerType: question.AnswerType.ToString().ToLower(),
                    location: location,
                    questionSetId: questionSetId,
                    questionIdentifierType: identifierType,
                    iterationIndex: iterationIndex,
                    entryIndex: context.EntryIndex,
                userHint: context.Rule.UserHint));
            }
            return errors;
        }

        // Validate based on answer type (pass metadata for error reporting)
        switch (question.AnswerType)
        {
            case QuestionAnswerType.Code:
                errors.AddRange(ValidateCodeAnswer(context, question, questionSetId, identifierType, iterationIndex));
                break;

            case QuestionAnswerType.Quantity:
                errors.AddRange(ValidateQuantityAnswer(context, question, questionSetId, identifierType, iterationIndex));
                break;

            case QuestionAnswerType.Integer:
                errors.AddRange(ValidateIntegerAnswer(context, question, questionSetId, identifierType, iterationIndex));
                break;

            case QuestionAnswerType.Decimal:
                errors.AddRange(ValidateDecimalAnswer(context, question, questionSetId, identifierType, iterationIndex));
                break;

            case QuestionAnswerType.String:
                errors.AddRange(ValidateStringAnswer(context, question, questionSetId, identifierType, iterationIndex));
                break;

            case QuestionAnswerType.Boolean:
                errors.AddRange(ValidateBooleanAnswer(context, question, questionSetId, identifierType, iterationIndex));
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
    private List<RuleValidationError> ValidateCodeAnswer(QuestionAnswerContext context, Question question, string questionSetId, string questionIdentifierType, int iterationIndex)
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
            var location = new ValidationLocation(
                FhirPath: context.CurrentPath,
                JsonPointer: null);
            var questionRef = new QuestionRef(
                System: context.QuestionCoding?.System,
                Code: context.QuestionCoding?.Code ?? "unknown",
                Display: context.QuestionCoding?.Display);
            var expected = new ExpectedAnswer(
                AnswerType: "codeableConcept",
                Constraints: null);
            var actual = new ActualAnswer(
                AnswerType: _valueExtractor.GetAnswerTypeName(context.ExtractedAnswer),
                Value: context.ExtractedAnswer);
            errors.Add(QuestionAnswerErrorFactory.InvalidAnswerValue(
                ruleId: context.Rule.Id,
                resourceType: context.Rule.ResourceType,
                severity: context.Rule.Severity,
                question: questionRef,
                expected: expected,
                actual: actual,
                location: location,
                questionSetId: questionSetId,
                questionIdentifierType: questionIdentifierType,
                iterationIndex: iterationIndex,
                entryIndex: context.EntryIndex,
                userHint: context.Rule.UserHint));
            return errors;
        }

        // Check ValueSet binding
        if (question.ValueSet != null)
        {
            // Note: Full ValueSet validation requires terminology service
            // For now, just check that a code is present
            if (string.IsNullOrEmpty(answerCoding.Code))
            {
                var location = new ValidationLocation(
                    FhirPath: context.CurrentPath,
                    JsonPointer: null);
                var questionRef = new QuestionRef(
                    System: context.QuestionCoding?.System,
                    Code: context.QuestionCoding?.Code ?? "unknown",
                    Display: context.QuestionCoding?.Display);
                var bindingStrength = question.ValueSet.BindingStrength ?? "required";
                var severity = bindingStrength.ToLowerInvariant() switch
                {
                    "required" => "error",
                    "extensible" => "warning",
                    _ => "information"
                };
                errors.Add(QuestionAnswerErrorFactory.AnswerNotInValueSet(
                    ruleId: context.Rule.Id,
                    resourceType: context.Rule.ResourceType,
                    severity: severity,
                    question: questionRef,
                    valueSetUrl: question.ValueSet.Url,
                    actualCode: answerCoding.Code ?? "",
                    actualSystem: answerCoding.System,
                    location: location,
                    questionSetId: questionSetId,
                    questionIdentifierType: questionIdentifierType,
                    iterationIndex: iterationIndex,
                    entryIndex: context.EntryIndex,
                userHint: context.Rule.UserHint));
            }
        }

        return errors;
    }

    /// <summary>
    /// Validate Quantity answer
    /// </summary>
    private List<RuleValidationError> ValidateQuantityAnswer(QuestionAnswerContext context, Question question, string questionSetId, string questionIdentifierType, int iterationIndex)
    {
        var errors = new List<RuleValidationError>();

        if (context.ExtractedAnswer is not Quantity quantity)
        {
            var location = new ValidationLocation(
                FhirPath: context.CurrentPath,
                JsonPointer: null);
            var questionRef = new QuestionRef(
                System: context.QuestionCoding?.System,
                Code: context.QuestionCoding?.Code ?? "unknown",
                Display: context.QuestionCoding?.Display);
            var expected = new ExpectedAnswer(
                AnswerType: "quantity",
                Constraints: null);
            var actual = new ActualAnswer(
                AnswerType: _valueExtractor.GetAnswerTypeName(context.ExtractedAnswer),
                Value: context.ExtractedAnswer);
            errors.Add(QuestionAnswerErrorFactory.InvalidAnswerValue(
                ruleId: context.Rule.Id,
                resourceType: context.Rule.ResourceType,
                severity: context.Rule.Severity,
                question: questionRef,
                expected: expected,
                actual: actual,
                location: location,
                questionSetId: questionSetId,
                questionIdentifierType: questionIdentifierType,
                iterationIndex: iterationIndex,
                entryIndex: context.EntryIndex,
                userHint: context.Rule.UserHint));
            return errors;
        }

        if (!quantity.Value.HasValue)
        {
            if (context.IsRequired)
            {
                var location = new ValidationLocation(
                    FhirPath: context.CurrentPath,
                    JsonPointer: null);
                var questionRef = new QuestionRef(
                    System: context.QuestionCoding?.System,
                    Code: context.QuestionCoding?.Code ?? "unknown",
                    Display: context.QuestionCoding?.Display);
                errors.Add(QuestionAnswerErrorFactory.AnswerRequired(
                    ruleId: context.Rule.Id,
                    resourceType: context.Rule.ResourceType,
                    severity: context.Rule.Severity,
                    question: questionRef,
                    expectedAnswerType: "quantity",
                    location: location,
                    questionSetId: questionSetId,
                    questionIdentifierType: questionIdentifierType,
                    iterationIndex: iterationIndex,
                    entryIndex: context.EntryIndex,
                userHint: context.Rule.UserHint));
            }
            return errors;
        }

        // Check unit
        if (question.Unit != null)
        {
            if (quantity.Unit != question.Unit.Code && quantity.Code != question.Unit.Code)
            {
                var location = new ValidationLocation(
                    FhirPath: context.CurrentPath,
                    JsonPointer: null);
                var questionRef = new QuestionRef(
                    System: context.QuestionCoding?.System,
                    Code: context.QuestionCoding?.Code ?? "unknown",
                    Display: context.QuestionCoding?.Display);
                var expected = new ExpectedAnswer(
                    AnswerType: "quantity",
                    Constraints: new Dictionary<string, object> { ["unit"] = question.Unit.Code });
                var actual = new ActualAnswer(
                    AnswerType: "quantity",
                    Value: new { value = quantity.Value, unit = quantity.Unit ?? quantity.Code ?? "none" });
                errors.Add(QuestionAnswerErrorFactory.InvalidAnswerValue(
                    ruleId: context.Rule.Id,
                    resourceType: context.Rule.ResourceType,
                    severity: context.Rule.Severity,
                    question: questionRef,
                    expected: expected,
                    actual: actual,
                    location: location,
                    questionSetId: questionSetId,
                    questionIdentifierType: questionIdentifierType,
                    iterationIndex: iterationIndex,
                    entryIndex: context.EntryIndex,
                userHint: context.Rule.UserHint));
            }
        }

        // Check min/max
        var value = quantity.Value.Value;
        var constraints = question.Constraints;
        if (constraints != null)
        {
            var location = new ValidationLocation(
                FhirPath: context.CurrentPath,
                JsonPointer: null);
            var questionRef = new QuestionRef(
                System: context.QuestionCoding?.System,
                Code: context.QuestionCoding?.Code ?? "unknown",
                Display: context.QuestionCoding?.Display);
            
            if (constraints.Min.HasValue && value < constraints.Min.Value)
            {
                errors.Add(QuestionAnswerErrorFactory.AnswerOutOfRange(
                    ruleId: context.Rule.Id,
                    resourceType: context.Rule.ResourceType,
                    severity: context.Rule.Severity,
                    question: questionRef,
                    min: constraints.Min,
                    max: constraints.Max,
                    actualValue: value,
                    location: location,
                    questionSetId: questionSetId,
                    questionIdentifierType: questionIdentifierType,
                    iterationIndex: iterationIndex,
                    entryIndex: context.EntryIndex,
                userHint: context.Rule.UserHint));
            }
            else if (constraints.Max.HasValue && value > constraints.Max.Value)
            {
                errors.Add(QuestionAnswerErrorFactory.AnswerOutOfRange(
                    ruleId: context.Rule.Id,
                    resourceType: context.Rule.ResourceType,
                    severity: context.Rule.Severity,
                    question: questionRef,
                    min: constraints.Min,
                    max: constraints.Max,
                    actualValue: value,
                    location: location,
                    questionSetId: questionSetId,
                    questionIdentifierType: questionIdentifierType,
                    iterationIndex: iterationIndex,
                    entryIndex: context.EntryIndex,
                userHint: context.Rule.UserHint));
            }
        }

        return errors;
    }

    /// <summary>
    /// Validate Integer answer
    /// </summary>
    private List<RuleValidationError> ValidateIntegerAnswer(QuestionAnswerContext context, Question question, string questionSetId, string questionIdentifierType, int iterationIndex)
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
                var location = new ValidationLocation(
                    FhirPath: context.CurrentPath,
                    JsonPointer: null);
                var questionRef = new QuestionRef(
                    System: context.QuestionCoding?.System,
                    Code: context.QuestionCoding?.Code ?? "unknown",
                    Display: context.QuestionCoding?.Display);
                var expected = new ExpectedAnswer(
                    AnswerType: "integer",
                    Constraints: null);
                var actual = new ActualAnswer(
                    AnswerType: _valueExtractor.GetAnswerTypeName(context.ExtractedAnswer),
                    Value: context.ExtractedAnswer);
                errors.Add(QuestionAnswerErrorFactory.InvalidAnswerValue(
                    ruleId: context.Rule.Id,
                    resourceType: context.Rule.ResourceType,
                    severity: context.Rule.Severity,
                    question: questionRef,
                    expected: expected,
                    actual: actual,
                    location: location,
                    questionSetId: questionSetId,
                    questionIdentifierType: questionIdentifierType,
                    iterationIndex: iterationIndex,
                    entryIndex: context.EntryIndex,
                userHint: context.Rule.UserHint));
                return errors;
            }
        }

        // Check min/max
        var constraints = question.Constraints;
        if (constraints != null)
        {
            var location = new ValidationLocation(
                FhirPath: context.CurrentPath,
                JsonPointer: null);
            var questionRef = new QuestionRef(
                System: context.QuestionCoding?.System,
                Code: context.QuestionCoding?.Code ?? "unknown",
                Display: context.QuestionCoding?.Display);
            
            if (constraints.Min.HasValue && intValue < constraints.Min.Value)
            {
                errors.Add(QuestionAnswerErrorFactory.AnswerOutOfRange(
                    ruleId: context.Rule.Id,
                    resourceType: context.Rule.ResourceType,
                    severity: context.Rule.Severity,
                    question: questionRef,
                    min: constraints.Min,
                    max: constraints.Max,
                    actualValue: intValue,
                    location: location,
                    questionSetId: questionSetId,
                    questionIdentifierType: questionIdentifierType,
                    iterationIndex: iterationIndex,
                    entryIndex: context.EntryIndex,
                userHint: context.Rule.UserHint));
            }
            else if (constraints.Max.HasValue && intValue > constraints.Max.Value)
            {
                errors.Add(QuestionAnswerErrorFactory.AnswerOutOfRange(
                    ruleId: context.Rule.Id,
                    resourceType: context.Rule.ResourceType,
                    severity: context.Rule.Severity,
                    question: questionRef,
                    min: constraints.Min,
                    max: constraints.Max,
                    actualValue: intValue,
                    location: location,
                    questionSetId: questionSetId,
                    questionIdentifierType: questionIdentifierType,
                    iterationIndex: iterationIndex,
                    entryIndex: context.EntryIndex,
                userHint: context.Rule.UserHint));
            }
        }

        return errors;
    }

    /// <summary>
    /// Validate Decimal answer
    /// </summary>
    private List<RuleValidationError> ValidateDecimalAnswer(QuestionAnswerContext context, Question question, string questionSetId, string questionIdentifierType, int iterationIndex)
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
                var location = new ValidationLocation(
                    FhirPath: context.CurrentPath,
                    JsonPointer: null);
                var questionRef = new QuestionRef(
                    System: context.QuestionCoding?.System,
                    Code: context.QuestionCoding?.Code ?? "unknown",
                    Display: context.QuestionCoding?.Display);
                var expected = new ExpectedAnswer(
                    AnswerType: "decimal",
                    Constraints: null);
                var actual = new ActualAnswer(
                    AnswerType: _valueExtractor.GetAnswerTypeName(context.ExtractedAnswer),
                    Value: context.ExtractedAnswer);
                errors.Add(QuestionAnswerErrorFactory.InvalidAnswerValue(
                    ruleId: context.Rule.Id,
                    resourceType: context.Rule.ResourceType,
                    severity: context.Rule.Severity,
                    question: questionRef,
                    expected: expected,
                    actual: actual,
                    location: location,
                    questionSetId: questionSetId,
                    questionIdentifierType: questionIdentifierType,
                    iterationIndex: iterationIndex,
                    entryIndex: context.EntryIndex,
                userHint: context.Rule.UserHint));
                return errors;
            }
        }

        // Check min/max
        var constraints = question.Constraints;
        if (constraints != null)
        {
            var location = new ValidationLocation(
                FhirPath: context.CurrentPath,
                JsonPointer: null);
            var questionRef = new QuestionRef(
                System: context.QuestionCoding?.System,
                Code: context.QuestionCoding?.Code ?? "unknown",
                Display: context.QuestionCoding?.Display);
            
            if (constraints.Min.HasValue && decValue < constraints.Min.Value)
            {
                errors.Add(QuestionAnswerErrorFactory.AnswerOutOfRange(
                    ruleId: context.Rule.Id,
                    resourceType: context.Rule.ResourceType,
                    severity: context.Rule.Severity,
                    question: questionRef,
                    min: constraints.Min,
                    max: constraints.Max,
                    actualValue: decValue,
                    location: location,
                    questionSetId: questionSetId,
                    questionIdentifierType: questionIdentifierType,
                    iterationIndex: iterationIndex,
                    entryIndex: context.EntryIndex,
                userHint: context.Rule.UserHint));
            }
            else if (constraints.Max.HasValue && decValue > constraints.Max.Value)
            {
                errors.Add(QuestionAnswerErrorFactory.AnswerOutOfRange(
                    ruleId: context.Rule.Id,
                    resourceType: context.Rule.ResourceType,
                    severity: context.Rule.Severity,
                    question: questionRef,
                    min: constraints.Min,
                    max: constraints.Max,
                    actualValue: decValue,
                    location: location,
                    questionSetId: questionSetId,
                    questionIdentifierType: questionIdentifierType,
                    iterationIndex: iterationIndex,
                    entryIndex: context.EntryIndex,
                userHint: context.Rule.UserHint));
            }
        }

        return errors;
    }

    /// <summary>
    /// Validate String answer
    /// </summary>
    private List<RuleValidationError> ValidateStringAnswer(QuestionAnswerContext context, Question question, string questionSetId, string questionIdentifierType, int iterationIndex)
    {
        var errors = new List<RuleValidationError>();

        if (context.ExtractedAnswer is not string strValue)
        {
            var location = new ValidationLocation(
                FhirPath: context.CurrentPath,
                JsonPointer: null);
            var questionRef = new QuestionRef(
                System: context.QuestionCoding?.System,
                Code: context.QuestionCoding?.Code ?? "unknown",
                Display: context.QuestionCoding?.Display);
            var expected = new ExpectedAnswer(
                AnswerType: "string",
                Constraints: null);
            var actual = new ActualAnswer(
                AnswerType: _valueExtractor.GetAnswerTypeName(context.ExtractedAnswer),
                Value: context.ExtractedAnswer);
            errors.Add(QuestionAnswerErrorFactory.InvalidAnswerValue(
                ruleId: context.Rule.Id,
                resourceType: context.Rule.ResourceType,
                severity: context.Rule.Severity,
                question: questionRef,
                expected: expected,
                actual: actual,
                location: location,
                questionSetId: questionSetId,
                questionIdentifierType: questionIdentifierType,
                iterationIndex: iterationIndex,
                entryIndex: context.EntryIndex,
                userHint: context.Rule.UserHint));
            return errors;
        }

        var constraints = question.Constraints;
        if (constraints != null)
        {
            var location = new ValidationLocation(
                FhirPath: context.CurrentPath,
                JsonPointer: null);
            var questionRef = new QuestionRef(
                System: context.QuestionCoding?.System,
                Code: context.QuestionCoding?.Code ?? "unknown",
                Display: context.QuestionCoding?.Display);
            
            // Check max length
            if (constraints.MaxLength.HasValue && strValue.Length > constraints.MaxLength.Value)
            {
                var expected = new ExpectedAnswer(
                    AnswerType: "string",
                    Constraints: new Dictionary<string, object> { ["maxLength"] = constraints.MaxLength.Value });
                var actual = new ActualAnswer(
                    AnswerType: "string",
                    Value: new { value = strValue, length = strValue.Length });
                errors.Add(QuestionAnswerErrorFactory.InvalidAnswerValue(
                    ruleId: context.Rule.Id,
                    resourceType: context.Rule.ResourceType,
                    severity: context.Rule.Severity,
                    question: questionRef,
                    expected: expected,
                    actual: actual,
                    location: location,
                    questionSetId: questionSetId,
                    questionIdentifierType: questionIdentifierType,
                    iterationIndex: iterationIndex,
                    entryIndex: context.EntryIndex,
                userHint: context.Rule.UserHint));
            }

            // Check regex
            if (!string.IsNullOrEmpty(constraints.Regex))
            {
                try
                {
                    if (!System.Text.RegularExpressions.Regex.IsMatch(strValue, constraints.Regex))
                    {
                        var expected = new ExpectedAnswer(
                            AnswerType: "string",
                            Constraints: new Dictionary<string, object> { ["pattern"] = constraints.Regex });
                        var actual = new ActualAnswer(
                            AnswerType: "string",
                            Value: strValue);
                        errors.Add(QuestionAnswerErrorFactory.InvalidAnswerValue(
                            ruleId: context.Rule.Id,
                            resourceType: context.Rule.ResourceType,
                            severity: context.Rule.Severity,
                            question: questionRef,
                            expected: expected,
                            actual: actual,
                            location: location,
                            questionSetId: questionSetId,
                            questionIdentifierType: questionIdentifierType,
                            iterationIndex: iterationIndex,
                            entryIndex: context.EntryIndex,
                userHint: context.Rule.UserHint));
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
    private List<RuleValidationError> ValidateBooleanAnswer(QuestionAnswerContext context, Question question, string questionSetId, string questionIdentifierType, int iterationIndex)
    {
        var errors = new List<RuleValidationError>();

        if (context.ExtractedAnswer is not bool)
        {
            var location = new ValidationLocation(
                FhirPath: context.CurrentPath,
                JsonPointer: null);
            var questionRef = new QuestionRef(
                System: context.QuestionCoding?.System,
                Code: context.QuestionCoding?.Code ?? "unknown",
                Display: context.QuestionCoding?.Display);
            var expected = new ExpectedAnswer(
                AnswerType: "boolean",
                Constraints: null);
            var actual = new ActualAnswer(
                AnswerType: _valueExtractor.GetAnswerTypeName(context.ExtractedAnswer),
                Value: context.ExtractedAnswer);
            errors.Add(QuestionAnswerErrorFactory.InvalidAnswerValue(
                ruleId: context.Rule.Id,
                resourceType: context.Rule.ResourceType,
                severity: context.Rule.Severity,
                question: questionRef,
                expected: expected,
                actual: actual,
                location: location,
                questionSetId: questionSetId,
                questionIdentifierType: questionIdentifierType,
                iterationIndex: iterationIndex,
                entryIndex: context.EntryIndex,
                userHint: context.Rule.UserHint));
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

        // QuestionPath and AnswerPath MUST be in Params (contract hardening)
        if (rule.Params.TryGetValue("questionPath", out var qpObj))
        {
            questionPath = qpObj?.ToString() ?? string.Empty;
        }

        if (rule.Params.TryGetValue("answerPath", out var apObj))
        {
            answerPath = apObj?.ToString() ?? string.Empty;
        }

        // Warn if paths are missing (frontend must write them into Params)
        if (string.IsNullOrEmpty(questionPath) || string.IsNullOrEmpty(answerPath))
        {
            _logger.LogWarning(
                "QuestionAnswer rule {RuleId} missing questionPath/answerPath in Params. " +
                "Ensure authoring writes them into rule.Params.",
                rule.Id);
        }

        return !string.IsNullOrEmpty(questionSetId) && 
               !string.IsNullOrEmpty(questionPath) && 
               !string.IsNullOrEmpty(answerPath);
    }

    /// <summary>
    /// Load QuestionSet from storage
    /// NOTE: Stub implementation until QuestionSet service exists.
    /// Returns null to trigger QuestionSetDataMissing error (returned ONCE per rule, not per resource).
    /// </summary>
    private async Task<QuestionSet?> LoadQuestionSetAsync(string projectId, string questionSetId, CancellationToken cancellationToken)
    {
        try
        {
            // Load CodeSystem (QuestionSet) from terminology service
            var codeSystem = await _terminologyService.GetCodeSystemByUrlAsync(questionSetId, cancellationToken);
            if (codeSystem == null)
            {
                _logger.LogWarning("QuestionSet not found: {QuestionSetId}", questionSetId);
                return null;
            }

            // Convert CodeSystem to QuestionSet model
            var questionSet = new QuestionSet
            {
                Id = codeSystem.Url,
                Name = codeSystem.Name ?? codeSystem.Title ?? "Unknown",
                Description = codeSystem.Description,
                TerminologyUrl = codeSystem.Url,
                Questions = codeSystem.Concept.Select(c => new QuestionSetQuestionRef
                {
                    QuestionId = c.Code,
                    Required = false // Default to not required
                }).ToList()
            };

            _logger.LogDebug("Loaded QuestionSet {QuestionSetId} with {QuestionCount} questions: {QuestionCodes}",
                questionSetId, questionSet.Questions.Count, string.Join(", ", questionSet.Questions.Select(q => q.QuestionId).Take(5)));

            return questionSet;
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

        _logger.LogDebug("LoadQuestionsAsync: Loading ALL questions for project {ProjectId}", projectId);

        // Load ALL questions from the project
        var allQuestions = await _questionService.ListQuestionsAsync(projectId);

        _logger.LogDebug("LoadQuestionsAsync: Loaded {TotalQuestions} questions from project", allQuestions.Count());

        // Build lookup by question code (not UUID)
        foreach (var question in allQuestions)
        {
            try
            {
                var questionCode = question.Code.Code;
                questions[questionCode] = question;
                _logger.LogDebug("Indexed question: Code={Code}, System={System}, Display={Display}",
                    questionCode, question.Code.System, question.Code.Display);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to index question {QuestionId}", question.Id);
            }
        }

        // Check which questions from the QuestionSet were found
        var questionSetCodes = questionSet.Questions.Select(q => q.QuestionId).ToList();
        var foundCodes = questionSetCodes.Where(code => questions.ContainsKey(code)).ToList();
        var missingCodes = questionSetCodes.Except(foundCodes).ToList();

        _logger.LogInformation(
            "LoadQuestionsAsync: For QuestionSet {QuestionSetId}, found {FoundCount}/{TotalCount} questions",
            questionSet.Id, foundCodes.Count, questionSetCodes.Count);

        if (missingCodes.Any())
        {
            _logger.LogWarning(
                "LoadQuestionsAsync: Missing questions: {MissingCodes}",
                string.Join(", ", missingCodes.Take(5)));
        }

        return questions;
    }

    #endregion

    #region REMOVED: Traversal methods (now in IQuestionAnswerContextProvider)

    // TRAVERSAL METHODS REMOVED:
    // - EvaluateRulePath: Now handled by IQuestionAnswerContextProvider
    // - GetIterationNodes: Now handled by IQuestionAnswerContextProvider  
    // - BuildCurrentPath: Now handled by IQuestionAnswerContextProvider
    // All FHIR structure traversal is encapsulated in the provider.

    #endregion
}
