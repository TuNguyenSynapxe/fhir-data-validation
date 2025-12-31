using Microsoft.Extensions.Logging;

namespace Pss.FhirProcessor.Engine.Models;

// ═══════════════════════════════════════════════════════════════════════════
// CONTRACT FROZEN — /docs/validation-error-details-schema.md
// ═══════════════════════════════════════════════════════════════════════════
// DO NOT modify schema without updating contract document
// DO NOT add new errorCodes without schema definition
// DO NOT infer missing fields — FAIL FAST (dev) or WARN (prod)
// ═══════════════════════════════════════════════════════════════════════════

/// <summary>
/// Runtime validator for ValidationError.details schema compliance.
/// Enforces canonical contract defined in /docs/validation-error-details-schema.md
/// 
/// CONTRACT FROZEN: Schema is immutable. Violations throw in Development, warn in Production.
/// 
/// RULES:
/// - details is optional (null/missing is OK)
/// - If present, MUST match schema for errorCode
/// - Throws InvalidOperationException in Development
/// - Logs warning in Production
/// </summary>
public static class ValidationErrorDetailsValidator
{
    private static ILogger? _logger;
    
    public static void SetLogger(ILogger logger)
    {
        _logger = logger;
    }
    
    /// <summary>
    /// Validates details against canonical schema for errorCode.
    /// Throws InvalidOperationException in Development.
    /// Logs warning in Production.
    /// </summary>
    public static void Validate(string errorCode, IDictionary<string, object>? details)
    {
        if (details == null)
            return; // details is optional
        
        var errors = new List<string>();
        
        switch (errorCode)
        {
            case "VALUE_NOT_ALLOWED":
                ValidateValueNotAllowed(details, errors);
                break;
            case "PATTERN_MISMATCH":
                ValidatePatternMismatch(details, errors);
                break;
            case "FIXED_VALUE_MISMATCH":
                ValidateFixedValueMismatch(details, errors);
                break;
            case "REQUIRED_FIELD_MISSING":
                ValidateRequiredFieldMissing(details, errors);
                break;
            case "REQUIRED_RESOURCE_MISSING":
                ValidateRequiredResourceMissing(details, errors);
                break;
            case "ARRAY_LENGTH_OUT_OF_RANGE":
                ValidateArrayLengthOutOfRange(details, errors);
                break;
            case "CODESYSTEM_MISMATCH":
            case "CODESYSTEM_VIOLATION": // Legacy alias
                ValidateCodeSystemMismatch(details, errors);
                break;
            case "CODE_NOT_IN_VALUESET":
                ValidateCodeNotInValueSet(details, errors);
                break;
            case "REFERENCE_NOT_FOUND":
                ValidateReferenceNotFound(details, errors);
                break;
            case "REFERENCE_TYPE_MISMATCH":
                ValidateReferenceTypeMismatch(details, errors);
                break;
            case "FHIR_INVALID_PRIMITIVE":
                ValidateFhirInvalidPrimitive(details, errors);
                break;
            case "FHIR_ARRAY_EXPECTED":
                ValidateFhirArrayExpected(details, errors);
                break;
            case "QUESTIONANSWER_VIOLATION":
                ValidateQuestionAnswerViolation(details, errors);
                break;
            default:
                // Unknown errorCode - log but don't validate
                _logger?.LogWarning("Unknown errorCode '{ErrorCode}' - cannot validate details schema", errorCode);
                return;
        }
        
        if (errors.Any())
        {
            var message = $"ValidationError.details schema violation for errorCode '{errorCode}': {string.Join("; ", errors)}";
            
            #if DEBUG
            throw new InvalidOperationException(message);
            #else
            _logger?.LogWarning(message);
            #endif
        }
    }
    
    private static void ValidateValueNotAllowed(IDictionary<string, object> details, List<string> errors)
    {
        RequireKey(details, "actual", errors, allowNull: true);
        RequireKey(details, "allowed", errors);
        RequireKey(details, "valueType", errors);
        
        if (details.TryGetValue("allowed", out var allowedObj))
        {
            if (allowedObj is not System.Collections.IEnumerable)
                errors.Add("'allowed' must be an array");
        }
    }
    
    private static void ValidatePatternMismatch(IDictionary<string, object> details, List<string> errors)
    {
        RequireKey(details, "actual", errors, allowNull: true);
        RequireKey(details, "pattern", errors);
        // 'description' is optional
    }
    
    private static void ValidateFixedValueMismatch(IDictionary<string, object> details, List<string> errors)
    {
        RequireKey(details, "actual", errors, allowNull: true);
        RequireKey(details, "expected", errors);
    }
    
    private static void ValidateRequiredFieldMissing(IDictionary<string, object> details, List<string> errors)
    {
        RequireKey(details, "required", errors);
        
        if (details.TryGetValue("required", out var requiredObj))
        {
            if (requiredObj is not bool || (bool)requiredObj != true)
                errors.Add("'required' must be true");
        }
    }
    
    private static void ValidateRequiredResourceMissing(IDictionary<string, object> details, List<string> errors)
    {
        RequireKey(details, "requiredResourceType", errors);
        RequireKey(details, "actualResourceTypes", errors);
        
        if (details.TryGetValue("actualResourceTypes", out var actualObj))
        {
            if (actualObj is not System.Collections.IEnumerable)
                errors.Add("'actualResourceTypes' must be an array");
        }
    }
    
    private static void ValidateArrayLengthOutOfRange(IDictionary<string, object> details, List<string> errors)
    {
        RequireKey(details, "min", errors, allowNull: true);
        RequireKey(details, "max", errors, allowNull: true);
        RequireKey(details, "actual", errors);
        
        if (details.TryGetValue("actual", out var actualObj))
        {
            if (!IsNumeric(actualObj))
                errors.Add("'actual' must be a number");
        }
    }
    
    private static void ValidateCodeSystemMismatch(IDictionary<string, object> details, List<string> errors)
    {
        RequireKey(details, "expectedSystem", errors);
        RequireKey(details, "actualSystem", errors, allowNull: true);
    }
    
    private static void ValidateCodeNotInValueSet(IDictionary<string, object> details, List<string> errors)
    {
        RequireKey(details, "system", errors);
        RequireKey(details, "code", errors);
        RequireKey(details, "valueSet", errors);
    }
    
    private static void ValidateReferenceNotFound(IDictionary<string, object> details, List<string> errors)
    {
        RequireKey(details, "reference", errors);
        // 'expectedType' is optional
    }
    
    private static void ValidateReferenceTypeMismatch(IDictionary<string, object> details, List<string> errors)
    {
        RequireKey(details, "reference", errors);
        RequireKey(details, "expectedTypes", errors);
        RequireKey(details, "actualType", errors);
        
        if (details.TryGetValue("expectedTypes", out var expectedTypesObj))
        {
            if (expectedTypesObj is not System.Collections.IEnumerable)
                errors.Add("'expectedTypes' must be an array");
        }
    }
    
    private static void ValidateFhirInvalidPrimitive(IDictionary<string, object> details, List<string> errors)
    {
        RequireKey(details, "actual", errors);
        RequireKey(details, "expectedType", errors);
        RequireKey(details, "reason", errors);
    }
    
    private static void ValidateFhirArrayExpected(IDictionary<string, object> details, List<string> errors)
    {
        RequireKey(details, "expectedType", errors);
        RequireKey(details, "actualType", errors);
        
        if (details.TryGetValue("expectedType", out var expectedTypeObj))
        {
            if (expectedTypeObj?.ToString() != "array")
                errors.Add("'expectedType' must be 'array'");
        }
    }
    
    private static void ValidateQuestionAnswerViolation(IDictionary<string, object> details, List<string> errors)
    {
        RequireKey(details, "violation", errors);
        
        if (details.TryGetValue("violation", out var violationObj))
        {
            var violation = violationObj?.ToString();
            if (violation != "question" && violation != "answer" && violation != "cardinality")
                errors.Add("'violation' must be 'question', 'answer', or 'cardinality'");
        }
        
        // questionCode, answerCode, expectedCardinality are optional
    }
    
    private static void RequireKey(IDictionary<string, object> details, string key, List<string> errors, bool allowNull = false)
    {
        if (!details.ContainsKey(key))
        {
            errors.Add($"Missing required key '{key}'");
            return;
        }
        
        if (!allowNull && details[key] == null)
        {
            errors.Add($"Key '{key}' cannot be null");
        }
    }
    
    private static bool IsNumeric(object obj)
    {
        return obj is int || obj is long || obj is decimal || obj is double || obj is float;
    }
}
