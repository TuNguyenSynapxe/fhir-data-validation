using Microsoft.Extensions.Logging;
using Pss.FhirProcessor.Engine.Models.Terminology;
using Pss.FhirProcessor.Engine.Interfaces;

namespace Pss.FhirProcessor.Engine.Services.Terminology;

/// <summary>
/// Implementation of IRuleAdvisoryService.
/// Detects issues in terminology authoring such as broken code references.
/// </summary>
public class RuleAdvisoryService : IRuleAdvisoryService
{
    private readonly ILogger<RuleAdvisoryService> _logger;
    private readonly ITerminologyService _terminologyService;
    private readonly IConstraintService _constraintService;

    public RuleAdvisoryService(
        ILogger<RuleAdvisoryService> logger,
        ITerminologyService terminologyService,
        IConstraintService constraintService)
    {
        _logger = logger;
        _terminologyService = terminologyService;
        _constraintService = constraintService;
    }

    public async Task<List<RuleAdvisory>> GenerateAdvisoriesAsync(string projectId, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Generating advisories for project: {ProjectId}", projectId);

        var advisories = new List<RuleAdvisory>();

        try
        {
            // Get all constraints for the project
            var constraints = await _constraintService.ListConstraintsAsync(projectId, cancellationToken);
            _logger.LogDebug("Found {Count} constraints to check", constraints.Count);

            // Check each constraint for issues
            foreach (var constraint in constraints)
            {
                var constraintAdvisories = await GenerateAdvisoriesForConstraintAsync(constraint, cancellationToken);
                advisories.AddRange(constraintAdvisories);
            }

            // Get all CodeSystems for the project
            var codeSystems = await _terminologyService.ListCodeSystemsAsync(projectId, cancellationToken);
            _logger.LogDebug("Found {Count} CodeSystems to check", codeSystems.Count);

            // Check each CodeSystem for issues
            foreach (var codeSystem in codeSystems)
            {
                var codeSystemAdvisories = await GenerateAdvisoriesForCodeSystemAsync(codeSystem, projectId, cancellationToken);
                advisories.AddRange(codeSystemAdvisories);
            }

            _logger.LogInformation("Generated {Count} advisories for project {ProjectId}", advisories.Count, projectId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate advisories for project: {ProjectId}", projectId);
        }

        return advisories;
    }

    public async Task<List<RuleAdvisory>> GenerateAdvisoriesForConstraintAsync(
        TerminologyConstraint constraint, 
        CancellationToken cancellationToken = default)
    {
        _logger.LogDebug("Generating advisories for constraint: {ConstraintId}", constraint.Id);

        var advisories = new List<RuleAdvisory>();

        // Check each allowed answer for CODE_NOT_FOUND
        foreach (var allowedAnswer in constraint.AllowedAnswers)
        {
            var concept = await _terminologyService.FindConceptAsync(
                allowedAnswer.System, 
                allowedAnswer.Code, 
                cancellationToken);

            if (concept == null)
            {
                // CODE_NOT_FOUND: Referenced code does not exist in CodeSystem
                var advisory = new RuleAdvisory
                {
                    AdvisoryCode = "CODE_NOT_FOUND",
                    Severity = AdvisorySeverity.Error,
                    Message = $"Code '{allowedAnswer.Code}' not found in CodeSystem '{allowedAnswer.System}'",
                    Context = new AdvisoryContext
                    {
                        System = allowedAnswer.System,
                        Code = allowedAnswer.Code,
                        Display = allowedAnswer.Display,
                        ConstraintId = constraint.Id,
                        ResourceType = constraint.ResourceType,
                        Path = constraint.Path,
                        ValueSetUrl = constraint.ValueSetUrl
                    },
                    SuggestedActions = new List<string>
                    {
                        $"Add code '{allowedAnswer.Code}' to CodeSystem '{allowedAnswer.System}'",
                        $"Remove this allowed answer from constraint '{constraint.Id}'",
                        "Update the allowed answer to reference an existing code"
                    }
                };

                advisories.Add(advisory);
                _logger.LogDebug("Advisory: CODE_NOT_FOUND for {System}#{Code} in constraint {ConstraintId}", 
                    allowedAnswer.System, allowedAnswer.Code, constraint.Id);
            }
            else
            {
                // Optional: Check if display matches
                if (!string.IsNullOrEmpty(allowedAnswer.Display) && 
                    !string.IsNullOrEmpty(concept.Display) &&
                    allowedAnswer.Display != concept.Display)
                {
                    var advisory = new RuleAdvisory
                    {
                        AdvisoryCode = "DISPLAY_MISMATCH",
                        Severity = AdvisorySeverity.Warning,
                        Message = $"Display text mismatch for code '{allowedAnswer.Code}': constraint has '{allowedAnswer.Display}' but CodeSystem has '{concept.Display}'",
                        Context = new AdvisoryContext
                        {
                            System = allowedAnswer.System,
                            Code = allowedAnswer.Code,
                            Display = allowedAnswer.Display,
                            ConstraintId = constraint.Id,
                            ResourceType = constraint.ResourceType,
                            Path = constraint.Path,
                            Metadata = new Dictionary<string, object>
                            {
                                { "expectedDisplay", concept.Display },
                                { "actualDisplay", allowedAnswer.Display }
                            }
                        },
                        SuggestedActions = new List<string>
                        {
                            $"Update display in constraint to '{concept.Display}'",
                            "Ignore if intentional variant"
                        }
                    };

                    advisories.Add(advisory);
                }
            }
        }

        // Check if ValueSetUrl references a CodeSystem that exists
        if (!string.IsNullOrEmpty(constraint.ValueSetUrl))
        {
            var codeSystem = await _terminologyService.GetCodeSystemByUrlAsync(constraint.ValueSetUrl, cancellationToken);
            if (codeSystem == null)
            {
                var advisory = new RuleAdvisory
                {
                    AdvisoryCode = "CODESYSTEM_NOT_FOUND",
                    Severity = AdvisorySeverity.Error,
                    Message = $"CodeSystem referenced in ValueSetUrl not found: '{constraint.ValueSetUrl}'",
                    Context = new AdvisoryContext
                    {
                        System = constraint.ValueSetUrl,
                        ConstraintId = constraint.Id,
                        ResourceType = constraint.ResourceType,
                        Path = constraint.Path,
                        ValueSetUrl = constraint.ValueSetUrl
                    },
                    SuggestedActions = new List<string>
                    {
                        $"Create CodeSystem with URL '{constraint.ValueSetUrl}'",
                        "Update ValueSetUrl to reference an existing CodeSystem",
                        "Remove the ValueSetUrl if not needed"
                    }
                };

                advisories.Add(advisory);
            }
        }

        return advisories;
    }

    public async Task<List<RuleAdvisory>> GenerateAdvisoriesForCodeSystemAsync(
        CodeSystem codeSystem,
        string projectId,
        CancellationToken cancellationToken = default)
    {
        _logger.LogDebug("Generating advisories for CodeSystem: {Url}", codeSystem.Url);

        var advisories = new List<RuleAdvisory>();

        // Check for duplicate codes
        var duplicates = FindDuplicateCodes(codeSystem.Concept);
        foreach (var duplicateCode in duplicates)
        {
            var advisory = new RuleAdvisory
            {
                AdvisoryCode = "DUPLICATE_CODE",
                Severity = AdvisorySeverity.Error,
                Message = $"Duplicate code '{duplicateCode}' found in CodeSystem '{codeSystem.Url}'",
                Context = new AdvisoryContext
                {
                    System = codeSystem.Url,
                    Code = duplicateCode
                },
                SuggestedActions = new List<string>
                {
                    "Remove or rename duplicate codes to ensure uniqueness",
                    "Review concept hierarchy if codes are intentionally nested"
                }
            };

            advisories.Add(advisory);
        }

        // Check for concepts missing display text
        var conceptsWithoutDisplay = FindConceptsWithoutDisplay(codeSystem.Concept);
        foreach (var concept in conceptsWithoutDisplay)
        {
            var advisory = new RuleAdvisory
            {
                AdvisoryCode = "MISSING_DISPLAY",
                Severity = AdvisorySeverity.Warning,
                Message = $"Concept '{concept.Code}' in CodeSystem '{codeSystem.Url}' is missing display text",
                Context = new AdvisoryContext
                {
                    System = codeSystem.Url,
                    Code = concept.Code
                },
                SuggestedActions = new List<string>
                {
                    "Add display text to improve readability",
                    "Ignore if display text is not required for this use case"
                }
            };

            advisories.Add(advisory);
        }

        return advisories;
    }

    private List<string> FindDuplicateCodes(List<CodeSystemConcept> concepts)
    {
        var allCodes = new List<string>();
        CollectAllCodes(concepts, allCodes);

        return allCodes
            .GroupBy(code => code)
            .Where(g => g.Count() > 1)
            .Select(g => g.Key)
            .ToList();
    }

    private void CollectAllCodes(List<CodeSystemConcept> concepts, List<string> allCodes)
    {
        foreach (var concept in concepts)
        {
            allCodes.Add(concept.Code);

            if (concept.Concept != null)
            {
                CollectAllCodes(concept.Concept, allCodes);
            }
        }
    }

    private List<CodeSystemConcept> FindConceptsWithoutDisplay(List<CodeSystemConcept> concepts)
    {
        var result = new List<CodeSystemConcept>();
        CollectConceptsWithoutDisplay(concepts, result);
        return result;
    }

    private void CollectConceptsWithoutDisplay(List<CodeSystemConcept> concepts, List<CodeSystemConcept> result)
    {
        foreach (var concept in concepts)
        {
            if (string.IsNullOrWhiteSpace(concept.Display))
            {
                result.Add(concept);
            }

            if (concept.Concept != null)
            {
                CollectConceptsWithoutDisplay(concept.Concept, result);
            }
        }
    }
}
