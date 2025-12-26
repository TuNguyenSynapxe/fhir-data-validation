using Hl7.Fhir.Model;
using Hl7.Fhir.ElementModel;
using Hl7.FhirPath;
using Hl7.Fhir.Serialization;
using Microsoft.Extensions.Logging;
using Pss.FhirProcessor.Engine.Interfaces;
using Pss.FhirProcessor.Engine.Models;

namespace Pss.FhirProcessor.Engine.Authoring;

/// <summary>
/// Deterministic rule suggestion service.
/// Analyzes validated bundles to detect patterns and suggest useful business rules.
/// 
/// DESIGN PRINCIPLES:
/// - Deterministic only (no AI, no external APIs)
/// - Read-only analysis (no persistence)
/// - Runs AFTER Firely and SPEC_HINT
/// - Suggestions must be explainable and reproducible
/// - User must explicitly accept suggestions
/// 
/// SAFETY RULES:
/// - Never suggests rules that already exist
/// - Never overlaps with SPEC_HINT coverage
/// - Never auto-creates rules
/// - Never enforces suggestions
/// </summary>
public class SystemRuleSuggestionService : ISystemRuleSuggestionService
{
    private readonly ILogger<SystemRuleSuggestionService> _logger;
    private readonly FhirPathCompiler _compiler;

    // Configuration thresholds for semantic suggestions
    private const int MIN_SAMPLE_SIZE_FOR_FIXED_VALUE = 30;
    private const int HIGH_CONFIDENCE_THRESHOLD = 50;
    private const int MEDIUM_CONFIDENCE_THRESHOLD = 10;
    private const int MAX_ALLOWED_VALUES = 10;
    private const int MIN_REQUIRED_THRESHOLD = 5;
    
    // Instance-only field blocklist (NEVER suggest rules for these)
    private static readonly HashSet<string> INSTANCE_ONLY_FIELDS = new(StringComparer.OrdinalIgnoreCase)
    {
        "telecom.value",
        "identifier.value",
        "address.line",
        "address.text",
        "narrative.div",
        "narrative.text",
        "text.div",
        "text",
        "display",
        "id",
        "meta"
    };
    
    // Known status/lifecycle fields that can have FixedValue rules
    private static readonly HashSet<string> STATUS_LIFECYCLE_FIELDS = new(StringComparer.OrdinalIgnoreCase)
    {
        "status",
        "intent",
        "priority",
        "category",
        "clinicalStatus",
        "verificationStatus"
    };

    public SystemRuleSuggestionService(ILogger<SystemRuleSuggestionService> logger)
    {
        _logger = logger;
        _compiler = new FhirPathCompiler();
    }

    /// <summary>
    /// Classifies a FHIR field path into its semantic type.
    /// This determines what types of rules are appropriate for the field.
    /// </summary>
    private SemanticType ClassifyFieldSemantic(string path, string? fhirType = null)
    {
        var pathLower = path.ToLowerInvariant();
        var lastSegment = path.Split('.').LastOrDefault()?.ToLowerInvariant() ?? "";
        
        // Check instance-only fields first
        if (INSTANCE_ONLY_FIELDS.Any(blocked => pathLower.Contains(blocked.ToLowerInvariant())))
        {
            return SemanticType.FreeTextField;
        }
        
        // Reference fields
        if (lastSegment == "reference" || pathLower.Contains("reference") || fhirType == "Reference")
        {
            return SemanticType.ReferenceField;
        }
        
        // Status/Lifecycle fields
        if (STATUS_LIFECYCLE_FIELDS.Contains(lastSegment))
        {
            return SemanticType.StatusOrLifecycleField;
        }
        
        // Identifier fields
        if (pathLower.Contains("identifier") && lastSegment == "value")
        {
            return SemanticType.IdentifierField;
        }
        
        // Terminology-bound fields (contains "code", "coding", "system")
        if (pathLower.Contains("coding") || pathLower.Contains("code") || lastSegment == "system")
        {
            // Check if it's a coded answer (valueCodeableConcept, component.code, etc.)
            if (pathLower.Contains("value") || pathLower.Contains("component"))
            {
                return SemanticType.CodedAnswerField;
            }
            return SemanticType.TerminologyBoundField;
        }
        
        // Free text fields
        if (lastSegment == "text" || lastSegment == "display" || lastSegment == "div" || 
            pathLower.Contains("narrative") || pathLower.Contains("address.line"))
        {
            return SemanticType.FreeTextField;
        }
        
        return SemanticType.Unknown;
    }
    
    /// <summary>
    /// Determines if a field path matches instance-only data that should NEVER become a rule.
    /// </summary>
    private bool IsInstanceOnlyField(string path)
    {
        var pathLower = path.ToLowerInvariant();
        return INSTANCE_ONLY_FIELDS.Any(blocked => 
            pathLower.EndsWith(blocked.ToLowerInvariant()) || 
            pathLower.Contains($".{blocked.ToLowerInvariant()}.") ||
            pathLower.Contains($".{blocked.ToLowerInvariant()}"));
    }
    
    /// <summary>
    /// Refines semantic classification into sub-types for better explanation and guidance.
    /// </summary>
    private SemanticSubType ClassifyFieldSemanticSubType(string path, SemanticType semanticType)
    {
        var pathLower = path.ToLowerInvariant();
        var lastSegment = path.Split('.').LastOrDefault()?.ToLowerInvariant() ?? "";
        
        // Identifier namespace
        if (pathLower.Contains("identifier") && lastSegment == "system")
        {
            return SemanticSubType.IdentifierNamespace;
        }
        
        // Identifier value
        if (semanticType == SemanticType.IdentifierField || 
            (pathLower.Contains("identifier") && lastSegment == "value"))
        {
            return SemanticSubType.IdentifierValue;
        }
        
        // Instance contact data
        if (pathLower.Contains("telecom") && lastSegment == "value")
        {
            return SemanticSubType.InstanceContactData;
        }
        if (pathLower.Contains("address") && (lastSegment == "line" || lastSegment == "text"))
        {
            return SemanticSubType.InstanceContactData;
        }
        
        // Human-readable labels (coding or reference display)
        if (pathLower.Contains("coding") && lastSegment == "display")
        {
            return SemanticSubType.HumanReadableLabel;
        }
        
        // Reference display - check if parent field is a reference type
        // Common reference fields: subject, patient, practitioner, performer, author, etc.
        var pathSegments = path.Split('.');
        if (lastSegment == "display" && pathSegments.Length >= 2)
        {
            var parentSegment = pathSegments[pathSegments.Length - 2].ToLowerInvariant();
            // Check if parent is a known reference field
            if (parentSegment == "subject" || parentSegment == "patient" || 
                parentSegment == "practitioner" || parentSegment == "performer" ||
                parentSegment == "author" || parentSegment == "basedOn" ||
                parentSegment == "encounter" || parentSegment == "requester" ||
                pathLower.Contains("reference"))
            {
                return SemanticSubType.ReferenceDisplay;
            }
        }
        
        // CodeableConcept display
        if (pathLower.Contains("code") && lastSegment == "display" && !pathLower.Contains("coding"))
        {
            return SemanticSubType.CodedConceptDisplay;
        }
        
        // Derived text (name.text when structured elements exist)
        if (pathLower.Contains("name") && lastSegment == "text")
        {
            return SemanticSubType.DerivedText;
        }
        
        // Free narrative
        if (pathLower.Contains("narrative") || pathLower.Contains("markdown"))
        {
            return SemanticSubType.FreeNarrative;
        }
        if (lastSegment == "div" && pathLower.Contains("text"))
        {
            return SemanticSubType.FreeNarrative;
        }
        
        return SemanticSubType.None;
    }
    
    /// <summary>
    /// Generates semantic-specific rationale based on field sub-type.
    /// Replaces generic "instance-specific data" with contextual explanations.
    /// </summary>
    private string GenerateRationale(
        string path,
        SemanticType semanticType,
        SemanticSubType semanticSubType,
        ObservationType observationType,
        int resourceCount)
    {
        return semanticSubType switch
        {
            SemanticSubType.IdentifierNamespace =>
                $"Field '{path}' represents an identifier namespace (system URI). While stable within an implementation, it should be constrained via an Implementation Guide profile, not inferred from sample instances. Detected in {resourceCount} resources.",
            
            SemanticSubType.IdentifierValue =>
                $"Field '{path}' represents an instance-level identifier value. Values are expected to vary per resource; value-based constraints are not appropriate. Consider enforcing identifier presence or format via regex if needed.",
            
            SemanticSubType.InstanceContactData =>
                $"Field '{path}' represents instance-level contact or address data. Values are expected to differ per individual. Pattern-based validation (regex, format) is more appropriate than value constraints. Analyzed {resourceCount} instances.",
            
            SemanticSubType.HumanReadableLabel =>
                $"Field '{path}' is a human-readable label derived from code and system. Validation should be applied to coding.code and coding.system rather than display text, which may vary by localization.",
            
            SemanticSubType.CodedConceptDisplay =>
                $"Field '{path}' is a display representation of a coded concept. Validation should target the underlying coding, not the display text. Consider terminology binding for the parent CodeableConcept.",
            
            SemanticSubType.ReferenceDisplay =>
                $"Field '{path}' is a display-only representation of a reference target. Referential integrity should be validated on the reference itself, not the display text.",
            
            SemanticSubType.DerivedText =>
                $"Field '{path}' is derived from structured elements and may change based on presentation rules. Validation is not recommended; enforce constraints on the underlying structured fields instead.",
            
            SemanticSubType.FreeNarrative =>
                $"Field '{path}' contains free-form narrative text. Value-based constraints are not appropriate for narrative content. Consider length limits or non-empty validation if needed.",
            
            _ => observationType == ObservationType.InstanceData
                ? $"Field '{path}' contains instance-specific data that should vary per resource. Value-based validation is not appropriate."
                : $"Field '{path}' shows {observationType} pattern but no rule is recommended. Manual review may be needed for proper validation approach."
        };
    }
    
    /// <summary>
    /// Determines the better validation approach when no direct rule is appropriate.
    /// </summary>
    private BetterRuleCandidate? DetermineBetterRuleCandidate(
        SemanticType semanticType,
        SemanticSubType semanticSubType,
        string path)
    {
        return semanticSubType switch
        {
            SemanticSubType.IdentifierNamespace => BetterRuleCandidate.FixedValueIGDefined,
            SemanticSubType.IdentifierValue => BetterRuleCandidate.Regex,
            SemanticSubType.InstanceContactData when path.Contains("address.line") => 
                BetterRuleCandidate.ArrayLength,
            SemanticSubType.InstanceContactData => BetterRuleCandidate.Regex,
            SemanticSubType.HumanReadableLabel => BetterRuleCandidate.TerminologyBinding,
            SemanticSubType.CodedConceptDisplay => BetterRuleCandidate.TerminologyBinding,
            SemanticSubType.ReferenceDisplay => BetterRuleCandidate.ReferenceExists,
            SemanticSubType.DerivedText => BetterRuleCandidate.None,
            SemanticSubType.FreeNarrative => BetterRuleCandidate.NonEmptyString,
            _ when semanticType == SemanticType.ReferenceField => BetterRuleCandidate.ReferenceExists,
            _ => null
        };
    }

    public async System.Threading.Tasks.Task<List<SystemRuleSuggestion>> GenerateSuggestionsAsync(
        Bundle bundle,
        RuleSet? existingRules,
        List<SpecHintIssue>? specHintIssues,
        CancellationToken cancellationToken = default)
    {
        await System.Threading.Tasks.Task.CompletedTask; // Async for future extensibility
        
        var suggestions = new List<SystemRuleSuggestion>();

        try
        {
            if (bundle?.Entry == null || !bundle.Entry.Any())
            {
                _logger.LogDebug("No bundle entries to analyze for suggestions");
                return suggestions;
            }

            _logger.LogInformation("Analyzing bundle with {Count} entries for rule suggestions", bundle.Entry.Count);

            // Group resources by type
            var resourcesByType = bundle.Entry
                .Where(e => e.Resource != null)
                .GroupBy(e => e.Resource!.TypeName)
                .ToDictionary(g => g.Key, g => g.Select(e => e.Resource!).ToList());

            foreach (var resourceTypeGroup in resourcesByType)
            {
                var resourceType = resourceTypeGroup.Key;
                var resources = resourceTypeGroup.Value;

                _logger.LogDebug("Analyzing {Count} {Type} resources", resources.Count, resourceType);

                // Analyze patterns for this resource type
                var typeSuggestions = AnalyzeResourceTypePatterns(
                    resourceType,
                    resources,
                    existingRules,
                    specHintIssues);

                suggestions.AddRange(typeSuggestions);
            }

            _logger.LogInformation("Generated {Count} rule suggestions", suggestions.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating rule suggestions");
        }

        return suggestions;
    }

    /// <summary>
    /// Analyzes patterns across resources of the same type
    /// </summary>
    private List<SystemRuleSuggestion> AnalyzeResourceTypePatterns(
        string resourceType,
        List<Resource> resources,
        RuleSet? existingRules,
        List<SpecHintIssue>? specHintIssues)
    {
        var suggestions = new List<SystemRuleSuggestion>();

        // Collect field values across all resources
        var fieldValues = CollectFieldValues(resources);

        foreach (var field in fieldValues)
        {
            var path = field.Key;
            var values = field.Value;

            // Skip if SPEC_HINT already covers this path
            if (IsPathCoveredBySpecHint(resourceType, path, specHintIssues))
            {
                continue;
            }

            // Skip if existing rule already covers this path
            if (IsPathCoveredByExistingRule(resourceType, path, existingRules))
            {
                continue;
            }

            // STEP 1: Classify field semantically
            var semanticType = ClassifyFieldSemantic(path);
            
            // STEP 2: Detect if this is instance-only data
            if (IsInstanceOnlyField(path))
            {
                // Create observation but NO rule suggestion
                var instanceDataObservation = CreateInstanceDataObservation(resourceType, path, values, semanticType);
                suggestions.Add(instanceDataObservation);
                continue;
            }

            // STEP 3: Try semantic-aware rule suggestions
            
            // Try FixedValue (with semantic guards)
            var fixedValueSuggestion = TrySuggestFixedValue(resourceType, path, values, semanticType, resources.Count);
            if (fixedValueSuggestion != null)
            {
                suggestions.Add(fixedValueSuggestion);
                continue;
            }

            // Try AllowedValues (with semantic guards)
            var allowedValuesSuggestion = TrySuggestAllowedValues(resourceType, path, values, semanticType);
            if (allowedValuesSuggestion != null)
            {
                suggestions.Add(allowedValuesSuggestion);
                continue;
            }

            // Try CodeSystem (for terminology-bound fields)
            var codeSystemSuggestion = TrySuggestCodeSystem(resourceType, path, values, semanticType);
            if (codeSystemSuggestion != null)
            {
                suggestions.Add(codeSystemSuggestion);
                continue;
            }

            // Try Required (with semantic guards)
            var requiredSuggestion = TrySuggestRequired(resourceType, path, values, resources.Count, semanticType);
            if (requiredSuggestion != null)
            {
                suggestions.Add(requiredSuggestion);
            }
            
            // Try Reference-aware rules
            if (semanticType == SemanticType.ReferenceField)
            {
                var referenceSuggestion = TrySuggestReferenceRule(resourceType, path, values);
                if (referenceSuggestion != null)
                {
                    suggestions.Add(referenceSuggestion);
                }
            }
        }

        return suggestions;
    }

    /// <summary>
    /// Collects all field values from resources using FHIRPath traversal
    /// </summary>
    private Dictionary<string, List<string>> CollectFieldValues(List<Resource> resources)
    {
        var fieldValues = new Dictionary<string, List<string>>();

        foreach (var resource in resources)
        {
            try
            {
                var typedElement = resource.ToTypedElement();
                CollectFieldValuesRecursive(typedElement, "", fieldValues);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to traverse resource {Type}", resource.TypeName);
            }
        }

        return fieldValues;
    }

    /// <summary>
    /// Recursively collects field paths and values
    /// </summary>
    private void CollectFieldValuesRecursive(
        ITypedElement element,
        string parentPath,
        Dictionary<string, List<string>> fieldValues)
    {
        var currentPath = string.IsNullOrEmpty(parentPath)
            ? element.Name
            : $"{parentPath}.{element.Name}";

        // Skip meta fields
        if (element.Name == "id" || element.Name == "meta" || element.Name == "extension")
        {
            return;
        }

        // Collect primitive values
        if (element.Value != null)
        {
            var valueStr = element.Value.ToString() ?? "";
            if (!string.IsNullOrWhiteSpace(valueStr))
            {
                if (!fieldValues.ContainsKey(currentPath))
                {
                    fieldValues[currentPath] = new List<string>();
                }
                fieldValues[currentPath].Add(valueStr);
            }
        }

        // Recurse into children
        foreach (var child in element.Children())
        {
            CollectFieldValuesRecursive(child, currentPath, fieldValues);
        }
    }

    /// <summary>
    /// Creates an observation for instance-only data (NO rule suggestion).
    /// Uses semantic sub-type to generate specific, contextual explanations.
    /// </summary>
    private SystemRuleSuggestion CreateInstanceDataObservation(
        string resourceType,
        string path,
        List<string> values,
        SemanticType semanticType)
    {
        var semanticSubType = ClassifyFieldSemanticSubType(path, semanticType);
        var betterCandidate = DetermineBetterRuleCandidate(semanticType, semanticSubType, path);
        var rationale = GenerateRationale(path, semanticType, semanticSubType, ObservationType.InstanceData, values.Count);
        
        return new SystemRuleSuggestion
        {
            SemanticType = semanticType,
            SemanticSubType = semanticSubType,
            ObservationType = ObservationType.InstanceData,
            RuleType = null, // Explicitly NO rule
            BetterRuleCandidate = betterCandidate,
            ResourceType = resourceType,
            Path = path,
            Params = new Dictionary<string, object>(),
            Confidence = "low",
            Reasoning = rationale,
            SampleEvidence = new SuggestionEvidence
            {
                ResourceCount = values.Count,
                ExampleValues = values.Take(3).Distinct().ToList(),
                Context = new Dictionary<string, object>
                {
                    ["semanticSubType"] = semanticSubType.ToString(),
                    ["betterRuleCandidate"] = betterCandidate?.ToString() ?? "None"
                }
            }
        };
    }
    
    /// <summary>
    /// Suggests FIXEDVALUE rule ONLY for appropriate semantic types with strict thresholds.
    /// 
    /// GUARDS:
    /// - ONLY suggest for StatusOrLifecycleField
    /// - BLOCK FreeTextField, IdentifierField, ReferenceField
    /// - Require minimum sample size (default: 30)
    /// - Must have exactly 1 distinct value
    /// </summary>
    private SystemRuleSuggestion? TrySuggestFixedValue(
        string resourceType,
        string path,
        List<string> values,
        SemanticType semanticType,
        int totalResources)
    {
        // SEMANTIC GUARD: Only suggest FixedValue for Status/Lifecycle fields
        if (semanticType != SemanticType.StatusOrLifecycleField)
        {
            return null;
        }
        
        // SAMPLE SIZE GUARD: Require sufficient sample size
        if (totalResources < MIN_SAMPLE_SIZE_FOR_FIXED_VALUE)
        {
            return null;
        }

        var distinctValues = values.Distinct().ToList();
        if (distinctValues.Count != 1)
        {
            return null; // Not a fixed value
        }

        var value = distinctValues[0];
        var confidence = totalResources >= HIGH_CONFIDENCE_THRESHOLD ? "high" : "medium";

        return new SystemRuleSuggestion
        {
            SemanticType = semanticType,
            ObservationType = ObservationType.ConstantValue,
            RuleType = "FixedValue",
            ResourceType = resourceType,
            Path = path,
            Params = new Dictionary<string, object>
            {
                ["value"] = value
            },
            Confidence = confidence,
            Reasoning = $"Status/lifecycle field '{path}' has constant value '{value}' across {totalResources} instances. If your implementation always uses this status, consider enforcing it as a rule.",
            SampleEvidence = new SuggestionEvidence
            {
                ResourceCount = totalResources,
                ExampleValues = new List<string> { value },
                Context = new Dictionary<string, object>
                {
                    ["semanticType"] = semanticType.ToString(),
                    ["coverage"] = "100%"
                }
            }
        };
    }

    /// <summary>
    /// Suggests ALLOWEDVALUES rule ONLY for terminology-bound or coded answer fields.
    /// 
    /// GUARDS:
    /// - ONLY suggest for TerminologyBoundField or CodedAnswerField
    /// - Values must be codes (not free text)
    /// - Distinct values must be within threshold
    /// </summary>
    private SystemRuleSuggestion? TrySuggestAllowedValues(
        string resourceType,
        string path,
        List<string> values,
        SemanticType semanticType)
    {
        // SEMANTIC GUARD: Only for terminology-bound or coded answer fields
        if (semanticType != SemanticType.TerminologyBoundField && 
            semanticType != SemanticType.CodedAnswerField &&
            semanticType != SemanticType.StatusOrLifecycleField)
        {
            return null;
        }
        
        if (values.Count < MEDIUM_CONFIDENCE_THRESHOLD)
        {
            return null;
        }

        var distinctValues = values.Distinct().ToList();
        if (distinctValues.Count <= 1 || distinctValues.Count > MAX_ALLOWED_VALUES)
        {
            return null; // Either fixed value or too many options
        }
        
        // Check if values look like codes (not free text paragraphs)
        var avgLength = distinctValues.Average(v => v.Length);
        if (avgLength > 100) // Likely free text, not codes
        {
            return null;
        }

        return new SystemRuleSuggestion
        {
            SemanticType = semanticType,
            ObservationType = ObservationType.SmallValueSet,
            RuleType = "AllowedValues",
            ResourceType = resourceType,
            Path = path,
            Params = new Dictionary<string, object>
            {
                ["values"] = distinctValues
            },
            Confidence = "medium",
            Reasoning = $"Terminology field '{path}' uses a constrained set of {distinctValues.Count} distinct codes. If these represent your valid value set, consider enforcing them as AllowedValues.",
            SampleEvidence = new SuggestionEvidence
            {
                ResourceCount = values.Count,
                ExampleValues = distinctValues.Take(MAX_ALLOWED_VALUES).ToList(),
                Context = new Dictionary<string, object>
                {
                    ["semanticType"] = semanticType.ToString(),
                    ["distinctCount"] = distinctValues.Count
                }
            }
        };
    }

    /// <summary>
    /// Suggests CODESYSTEM rule if Coding.system is consistent across all samples.
    /// </summary>
    private SystemRuleSuggestion? TrySuggestCodeSystem(
        string resourceType,
        string path,
        List<string> values,
        SemanticType semanticType)
    {
        // Only suggest for terminology-bound fields
        if (semanticType != SemanticType.TerminologyBoundField && 
            semanticType != SemanticType.CodedAnswerField)
        {
            return null;
        }
        
        // Only suggest for paths that look like coding system
        if (!path.Contains("coding") && !path.Contains("system"))
        {
            return null;
        }

        if (values.Count < MEDIUM_CONFIDENCE_THRESHOLD)
        {
            return null;
        }

        var distinctValues = values.Distinct().ToList();
        if (distinctValues.Count != 1)
        {
            return null; // Not a consistent code system
        }

        var system = distinctValues[0];
        if (!system.StartsWith("http://") && !system.StartsWith("https://"))
        {
            return null; // Not a valid code system URL
        }

        return new SystemRuleSuggestion
        {
            SemanticType = semanticType,
            ObservationType = ObservationType.ConstantValue,
            RuleType = "CodeSystem",
            ResourceType = resourceType,
            Path = path.Replace(".system", ""), // Suggest on the CodeableConcept/Coding itself
            Params = new Dictionary<string, object>
            {
                ["system"] = system
            },
            Confidence = "high",
            Reasoning = $"All {values.Count} codings use the same system: '{system}'. If this is your required code system, consider enforcing it.",
            SampleEvidence = new SuggestionEvidence
            {
                ResourceCount = values.Count,
                ExampleValues = new List<string> { system },
                Context = new Dictionary<string, object>
                {
                    ["semanticType"] = semanticType.ToString()
                }
            }
        };
    }

    /// <summary>
    /// Suggests REQUIRED rule ONLY if field is present in 100% of samples and appropriate.
    /// 
    /// GUARDS:
    /// - Must be present in ALL samples
    /// - Not for derived or display-only fields
    /// - Minimum sample threshold
    /// </summary>
    private SystemRuleSuggestion? TrySuggestRequired(
        string resourceType,
        string path,
        List<string> values,
        int totalResources,
        SemanticType semanticType)
    {
        // GUARD: Don't suggest Required for display-only or derived fields
        if (semanticType == SemanticType.FreeTextField && 
            (path.EndsWith(".display") || path.EndsWith(".text")))
        {
            return null;
        }
        
        // Only suggest if present in ALL samples
        if (values.Count < totalResources)
        {
            return null;
        }

        // Need minimum samples to suggest Required
        if (totalResources < MIN_REQUIRED_THRESHOLD)
        {
            return null;
        }
        
        var confidence = totalResources >= HIGH_CONFIDENCE_THRESHOLD ? "high" : "medium";

        return new SystemRuleSuggestion
        {
            SemanticType = semanticType,
            ObservationType = ObservationType.AlwaysPresent,
            RuleType = "Required",
            ResourceType = resourceType,
            Path = path,
            Params = new Dictionary<string, object>(),
            Confidence = confidence,
            Reasoning = $"Field '{path}' is present in all {totalResources} observed instances. If this field is mandatory for your implementation, consider enforcing it as Required.",
            SampleEvidence = new SuggestionEvidence
            {
                ResourceCount = totalResources,
                ExampleValues = values.Take(3).Distinct().ToList(),
                Context = new Dictionary<string, object>
                {
                    ["coverage"] = "100%",
                    ["semanticType"] = semanticType.ToString()
                }
            }
        };
    }
    
    /// <summary>
    /// Suggests reference validation rules for Reference fields.
    /// NEVER suggests FixedValue for references—checks target resource type consistency.
    /// </summary>
    private SystemRuleSuggestion? TrySuggestReferenceRule(
        string resourceType,
        string path,
        List<string> values)
    {
        if (values.Count < MEDIUM_CONFIDENCE_THRESHOLD)
        {
            return null;
        }
        
        // Extract resource types from reference strings (e.g., "Patient/123" -> "Patient")
        var referenceTypes = values
            .Where(v => v.Contains("/"))
            .Select(v => v.Split('/').FirstOrDefault())
            .Where(t => !string.IsNullOrWhiteSpace(t))
            .Distinct()
            .ToList();
        
        if (!referenceTypes.Any())
        {
            return null; // Can't determine reference types
        }
        
        if (referenceTypes.Count == 1)
        {
            // All references point to same resource type
            var targetType = referenceTypes[0];
            return new SystemRuleSuggestion
            {
                SemanticType = SemanticType.ReferenceField,
                ObservationType = ObservationType.ReferenceTargetConsistent,
                RuleType = "ReferenceExists",
                ResourceType = resourceType,
                Path = path,
                Params = new Dictionary<string, object>
                {
                    ["targetResourceType"] = targetType!,
                    ["scope"] = "Bundle" // Default to bundle-scoped validation
                },
                Confidence = "high",
                Reasoning = $"All references in '{path}' point to {targetType} resources. Consider enforcing reference validation to ensure referential integrity.",
                SampleEvidence = new SuggestionEvidence
                {
                    ResourceCount = values.Count,
                    ExampleValues = values.Take(3).ToList(),
                    Context = new Dictionary<string, object>
                    {
                        ["targetResourceType"] = targetType!,
                        ["distinctReferenceTypes"] = 1
                    }
                }
            };
        }
        
        // Multiple reference types detected (observation only, no rule suggestion)
        var semanticSubType = ClassifyFieldSemanticSubType(path, SemanticType.ReferenceField);
        var betterCandidate = DetermineBetterRuleCandidate(SemanticType.ReferenceField, semanticSubType, path);
        
        return new SystemRuleSuggestion
        {
            SemanticType = SemanticType.ReferenceField,
            SemanticSubType = semanticSubType,
            ObservationType = ObservationType.NoPattern,
            RuleType = null,
            BetterRuleCandidate = betterCandidate,
            ResourceType = resourceType,
            Path = path,
            Params = new Dictionary<string, object>(),
            Confidence = "low",
            Reasoning = $"References in '{path}' point to multiple resource types: {string.Join(", ", referenceTypes)}. Consider validating each reference target type separately, or allow multiple types if this is expected polymorphism.",
            SampleEvidence = new SuggestionEvidence
            {
                ResourceCount = values.Count,
                ExampleValues = values.Take(5).ToList(),
                Context = new Dictionary<string, object>
                {
                    ["distinctReferenceTypes"] = referenceTypes.Count,
                    ["referenceTypes"] = referenceTypes,
                    ["semanticSubType"] = semanticSubType.ToString(),
                    ["betterRuleCandidate"] = betterCandidate?.ToString() ?? "None"
                }
            }
        };
    }

    /// <summary>
    /// Checks if a path is already covered by SPEC_HINT
    /// </summary>
    private bool IsPathCoveredBySpecHint(
        string resourceType,
        string path,
        List<SpecHintIssue>? specHintIssues)
    {
        if (specHintIssues == null)
        {
            return false;
        }

        return specHintIssues.Any(hint =>
            hint.ResourceType == resourceType &&
            hint.Path.Contains(path.Split('.').Last())); // Simplified path matching
    }

    /// <summary>
    /// Checks if a path is already covered by existing rules
    /// </summary>
    private bool IsPathCoveredByExistingRule(
        string resourceType,
        string path,
        RuleSet? existingRules)
    {
        if (existingRules?.Rules == null)
        {
            return false;
        }

        var rules = existingRules.Rules.Where(r => r.ResourceType == resourceType).ToList();
        if (!rules.Any())
        {
            return false;
        }

        return rules.Any(rule =>
            rule.Path != null &&
            (rule.Path == path || path.StartsWith(rule.Path + ".")));
    }
}
