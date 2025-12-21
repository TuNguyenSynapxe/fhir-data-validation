using Pss.FhirProcessor.Engine.Models;
using System.Text;

namespace Pss.FhirProcessor.Engine.Services;

/// <summary>
/// Service for generating structured, template-based explanations for validation issues.
/// 
/// DESIGN PRINCIPLES:
/// - Rule-based, safe, deterministic
/// - No guessing intent
/// - No repeating error messages
/// - No invented examples unless fully deterministic
/// - Confidence-scoped guidance
/// 
/// Templates are mandatory and immutable.
/// </summary>
public static class ValidationExplanationService
{
    /// <summary>
    /// Generate explanation for a FHIR structural validation issue.
    /// Confidence: high (FHIR spec is deterministic)
    /// </summary>
    public static ValidationIssueExplanation? ForFhirStructural(string? errorCode, string? path, Dictionary<string, object>? details)
    {
        // FHIR structural validation has high confidence
        return new ValidationIssueExplanation
        {
            What = "This issue was detected during FHIR structural validation.",
            How = "The resource does not conform to the FHIR specification at this location. Correct the data type or structure indicated by the error.",
            Confidence = "high"
        };
    }
    
    /// <summary>
    /// Generate explanation for a SpecHint (HL7 advisory) issue.
    /// Confidence: low (advisory, non-blocking)
    /// </summary>
    public static ValidationIssueExplanation ForSpecHint(string message, string? path)
    {
        return new ValidationIssueExplanation
        {
            What = "This is a best-effort quality check to improve portability and correctness.",
            How = "This issue may still be accepted by permissive FHIR engines. Review and correct it if interoperability is required.",
            Confidence = "low"
        };
    }
    
    /// <summary>
    /// Generate explanation for a Lint (quality check) issue.
    /// Confidence: low (heuristics, best-effort)
    /// </summary>
    public static ValidationIssueExplanation ForLint(string ruleId, string message)
    {
        return new ValidationIssueExplanation
        {
            What = "This is a best-effort quality check to improve portability and correctness.",
            How = "This issue may still be accepted by permissive FHIR engines. Review and correct it if interoperability is required.",
            Confidence = "low"
        };
    }
    
    /// <summary>
    /// Generate explanation for a Reference validation issue.
    /// Confidence: high (bundle integrity is deterministic)
    /// </summary>
    public static ValidationIssueExplanation ForReference(string? errorCode, string? path, Dictionary<string, object>? details)
    {
        var normalizedCode = errorCode?.ToUpperInvariant();
        
        if (normalizedCode == "REFERENCE_NOT_FOUND")
        {
            return new ValidationIssueExplanation
            {
                What = $"The reference at '{path ?? "this location"}' points to a resource that does not exist in the bundle.",
                How = "Ensure the referenced resource is included in the bundle, or use an external reference if appropriate.",
                Confidence = "high"
            };
        }
        
        if (normalizedCode == "REFERENCE_TYPE_MISMATCH")
        {
            return new ValidationIssueExplanation
            {
                What = "The referenced resource type does not match the expected type for this field.",
                How = "Change the reference to point to the correct resource type, or verify the resource type is allowed.",
                Confidence = "high"
            };
        }
        
        // Fallback for unknown reference errors
        return new ValidationIssueExplanation
        {
            What = "This reference validation issue was detected during bundle integrity checks.",
            How = "Verify that all references point to valid resources of the correct type.",
            Confidence = "high"
        };
    }
    
    /// <summary>
    /// Generate explanation for a Project Rule issue.
    /// Uses strict template matching based on rule type.
    /// </summary>
    public static ValidationIssueExplanation ForProjectRule(
        string ruleType, 
        string path, 
        RuleExplanation? ruleExplanation,
        Dictionary<string, object>? metadata)
    {
        // If rule has custom explanation, use it (high confidence for user-defined rules)
        if (ruleExplanation != null)
        {
            return new ValidationIssueExplanation
            {
                What = ruleExplanation.What,
                How = ruleExplanation.How,
                Confidence = "high"
            };
        }
        
        // Otherwise, generate from template registry
        return GenerateFromTemplate(ruleType, path, metadata);
    }
    
    /// <summary>
    /// Normalize rule type by removing separators and upper-casing.
    /// Handles inconsistent formats from UI (e.g., ArrayLength, ARRAY_LENGTH, array-length).
    /// </summary>
    private static string NormalizeRuleType(string ruleType)
    {
        if (string.IsNullOrEmpty(ruleType)) return string.Empty;
        
        // Remove underscores, hyphens, and upper-case
        return ruleType
            .Replace("_", "")
            .Replace("-", "")
            .Replace(" ", "")
            .ToUpperInvariant();
    }
    
    /// <summary>
    /// Template registry for rule-based explanation generation.
    /// Each template follows the strict format provided.
    /// </summary>
    private static ValidationIssueExplanation GenerateFromTemplate(
        string ruleType, 
        string path, 
        Dictionary<string, object>? metadata)
    {
        var normalizedType = NormalizeRuleType(ruleType);
        
        return normalizedType switch
        {
            // Template 1: Required field
            "REQUIRED" => GenerateRequiredExplanation(path),
            
            // Template 2: Fixed value
            "FIXEDVALUE" => GenerateFixedValueExplanation(path, metadata),
            
            // Template 3: Allowed values
            "ALLOWEDVALUES" => GenerateAllowedValuesExplanation(path, metadata),
            
            // Template 4: Regex pattern
            "REGEX" or "PATTERN" => GenerateRegexExplanation(path, metadata),
            
            // Template 5: Array length (aliases: CARDINALITY, ARRAYSIZE)
            "ARRAYLENGTH" or "CARDINALITY" or "ARRAYSIZE" => GenerateArrayLengthExplanation(path, metadata),
            
            // Template 6: Code system (alias: VALUESET)
            "CODESYSTEM" or "VALUESET" => GenerateCodeSystemExplanation(path, metadata),
            
            // Template 7: Custom FHIRPath
            "CUSTOMFHIRPATH" or "FHIRPATH" => GenerateCustomFhirPathExplanation(path),
            
            // Fallback: Unknown rule type
            _ => new ValidationIssueExplanation
            {
                What = $"This rule validates '{path}' according to project-specific requirements.",
                How = null,
                Confidence = "medium"
            }
        };
    }
    
    // ==================== TEMPLATE 1: REQUIRED ====================
    private static ValidationIssueExplanation GenerateRequiredExplanation(string path)
    {
        var leafField = GetLeafField(path);
        
        return new ValidationIssueExplanation
        {
            What = $"This rule requires the field `{path}` to be present.",
            How = $"The field `{path}` is missing or empty in this resource. Add a value to satisfy the requirement.",
            Confidence = "high"
        };
    }
    
    // ==================== TEMPLATE 2: FIXED VALUE ====================
    private static ValidationIssueExplanation GenerateFixedValueExplanation(string path, Dictionary<string, object>? metadata)
    {
        var expected = metadata?.GetValueOrDefault("expectedValue")?.ToString() ?? metadata?.GetValueOrDefault("fixedValue")?.ToString();
        var actual = metadata?.GetValueOrDefault("actualValue")?.ToString();
        
        var howBuilder = new StringBuilder();
        
        if (expected != null)
        {
            howBuilder.AppendLine($"Expected value: {expected}");
        }
        
        if (actual != null)
        {
            howBuilder.AppendLine($"Actual value: {actual}");
        }
        
        howBuilder.Append("Update the field to match the expected value.");
        
        return new ValidationIssueExplanation
        {
            What = $"This rule enforces a fixed value for `{path}` to ensure consistent data.",
            How = howBuilder.ToString().Trim(),
            Confidence = "high"
        };
    }
    
    // ==================== TEMPLATE 3: ALLOWED VALUES ====================
    private static ValidationIssueExplanation GenerateAllowedValuesExplanation(string path, Dictionary<string, object>? metadata)
    {
        var actual = metadata?.GetValueOrDefault("actualValue")?.ToString();
        var allowedValues = metadata?.GetValueOrDefault("allowedValues") as IEnumerable<object>;
        
        var howBuilder = new StringBuilder();
        
        if (actual != null)
        {
            howBuilder.AppendLine($"The value `{actual}` is not allowed.");
        }
        
        if (allowedValues != null && allowedValues.Any())
        {
            howBuilder.AppendLine("Choose one of the permitted values:");
            foreach (var value in allowedValues)
            {
                howBuilder.AppendLine($"  - {value}");
            }
        }
        else
        {
            howBuilder.Append("Choose one of the permitted values defined in the rule.");
        }
        
        return new ValidationIssueExplanation
        {
            What = $"This rule restricts `{path}` to a predefined set of allowed values.",
            How = howBuilder.ToString().Trim(),
            Confidence = "high"
        };
    }
    
    // ==================== TEMPLATE 4: REGEX ====================
    private static ValidationIssueExplanation GenerateRegexExplanation(string path, Dictionary<string, object>? metadata)
    {
        var regex = metadata?.GetValueOrDefault("regex")?.ToString() ?? metadata?.GetValueOrDefault("pattern")?.ToString();
        
        var how = regex != null
            ? $"The value does not match the required format.\nExpected pattern: {regex}"
            : "The value does not match the required format.";
        
        return new ValidationIssueExplanation
        {
            What = $"This rule validates the format of `{path}`.",
            How = how,
            Confidence = "medium" // Regex validation is medium confidence
        };
    }
    
    // ==================== TEMPLATE 5: ARRAY LENGTH ====================
    private static ValidationIssueExplanation GenerateArrayLengthExplanation(string path, Dictionary<string, object>? metadata)
    {
        var min = metadata?.GetValueOrDefault("min");
        var max = metadata?.GetValueOrDefault("max");
        var actualCount = metadata?.GetValueOrDefault("actualCount");
        
        var howBuilder = new StringBuilder();
        
        if (actualCount != null)
        {
            howBuilder.AppendLine($"Current item count: {actualCount}");
        }
        
        if (min != null && max != null)
        {
            howBuilder.AppendLine($"Allowed range: {min} to {max}");
        }
        else if (min != null)
        {
            howBuilder.AppendLine($"Minimum required: {min}");
        }
        else if (max != null)
        {
            howBuilder.AppendLine($"Maximum allowed: {max}");
        }
        
        howBuilder.Append("Adjust the number of items to meet this requirement.");
        
        return new ValidationIssueExplanation
        {
            What = $"This rule enforces how many items `{path}` may contain.",
            How = howBuilder.ToString().Trim(),
            Confidence = "high"
        };
    }
    
    // ==================== TEMPLATE 6: CODE SYSTEM ====================
    private static ValidationIssueExplanation GenerateCodeSystemExplanation(string path, Dictionary<string, object>? metadata)
    {
        var codeSystem = metadata?.GetValueOrDefault("codeSystem")?.ToString() ?? metadata?.GetValueOrDefault("systemUrl")?.ToString();
        
        var how = codeSystem != null
            ? $"Expected code system: {codeSystem}\nVerify that `coding.system` and `coding.code` are valid."
            : "Verify that `coding.system` and `coding.code` are valid.";
        
        return new ValidationIssueExplanation
        {
            What = $"This rule ensures `{path}` uses codes from the correct code system.",
            How = how,
            Confidence = "medium" // CodeSystem validation is medium confidence
        };
    }
    
    // ==================== TEMPLATE 7: CUSTOM FHIRPATH ====================
    private static ValidationIssueExplanation GenerateCustomFhirPathExplanation(string path)
    {
        return new ValidationIssueExplanation
        {
            What = $"This rule validates a project-specific condition involving `{path}`.",
            How = "The condition defined for this rule is not satisfied. Review the related data and ensure the condition is met.",
            Confidence = "low" // CustomFHIRPath is low confidence (cannot explain condition)
        };
    }
    
    /// <summary>
    /// Extract leaf field name from path (e.g., "Patient.name[0].given" → "given")
    /// </summary>
    private static string GetLeafField(string path)
    {
        if (string.IsNullOrEmpty(path)) return path;
        
        // Remove array indices
        var cleaned = System.Text.RegularExpressions.Regex.Replace(path, @"\[\d+\]", "");
        
        // Get last segment
        var lastDot = cleaned.LastIndexOf('.');
        return lastDot >= 0 ? cleaned.Substring(lastDot + 1) : cleaned;
    }
}
