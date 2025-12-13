using System.Text.RegularExpressions;
using Pss.FhirProcessor.Engine.Models;

namespace Pss.FhirProcessor.Engine.Services;

/// <summary>
/// Maps Firely SDK exceptions to structured ValidationError objects
/// Extracts context from exception messages to provide actionable error information
/// </summary>
public static class FirelyExceptionMapper
{
    /// <summary>
    /// Maps a Firely parsing/deserialization exception to a ValidationError
    /// </summary>
    /// <param name="exception">The exception thrown by Firely SDK</param>
    /// <param name="rawBundleJson">The raw JSON that failed to parse (for context)</param>
    /// <returns>A structured ValidationError with extracted context</returns>
    public static ValidationError MapToValidationError(Exception exception, string? rawBundleJson)
    {
        var exceptionMessage = exception.Message;
        var exceptionType = exception.GetType().Name;
        
        // Check for specific error patterns
        
        // Pattern 1: Invalid enum value
        // Example: "Literal 'completed' is not a valid value for enumeration 'Encounter.StatusCode'"
        var enumMatch = Regex.Match(exceptionMessage, 
            @"Literal '([^']+)' is not a valid value for enumeration '([^']+)'",
            RegexOptions.IgnoreCase);
        
        if (enumMatch.Success)
        {
            var invalidValue = enumMatch.Groups[1].Value;
            var enumType = enumMatch.Groups[2].Value;
            
            return CreateInvalidEnumError(invalidValue, enumType, exceptionMessage, rawBundleJson);
        }
        
        // Pattern 2: Unknown element/property
        // Example: "Encountered unknown element 'invalidField' while parsing..."
        var unknownElementMatch = Regex.Match(exceptionMessage,
            @"Encountered unknown element '([^']+)'",
            RegexOptions.IgnoreCase);
        
        if (unknownElementMatch.Success)
        {
            var unknownElement = unknownElementMatch.Groups[1].Value;
            return CreateUnknownElementError(unknownElement, exceptionMessage, rawBundleJson);
        }
        
        // Pattern 3: Type mismatch
        // Example: "Cannot convert value 'xyz' to type 'integer'"
        var typeMismatchMatch = Regex.Match(exceptionMessage,
            @"Cannot convert.*to type '([^']+)'",
            RegexOptions.IgnoreCase);
        
        if (typeMismatchMatch.Success)
        {
            var expectedType = typeMismatchMatch.Groups[1].Value;
            return CreateTypeMismatchError(expectedType, exceptionMessage, rawBundleJson);
        }
        
        // Pattern 4: Required element missing
        // Example: "Mandatory element 'resourceType' is missing"
        var mandatoryMatch = Regex.Match(exceptionMessage,
            @"Mandatory element '([^']+)' is missing",
            RegexOptions.IgnoreCase);
        
        if (mandatoryMatch.Success)
        {
            var missingElement = mandatoryMatch.Groups[1].Value;
            return CreateMandatoryMissingError(missingElement, exceptionMessage, rawBundleJson);
        }
        
        // Fallback: Generic FHIR deserialization error
        return CreateGenericDeserializationError(exceptionType, exceptionMessage, rawBundleJson);
    }
    
    private static ValidationError CreateInvalidEnumError(string invalidValue, string enumType, string exceptionMessage, string? rawBundleJson)
    {
        // Extract resource type and field name from enum type
        // Example: "Encounter.StatusCode" -> Resource: "Encounter", Field: "status"
        var parts = enumType.Split('.');
        string? resourceType = parts.Length > 0 ? parts[0] : null;
        string? fieldName = parts.Length > 1 ? DeduceFieldName(parts[1]) : null;
        
        // Try to extract possible values from common patterns
        var allowedValues = ExtractAllowedEnumValues(enumType);
        
        var details = new Dictionary<string, object>
        {
            ["actualValue"] = invalidValue,
            ["enumType"] = enumType,
            ["exceptionType"] = "InvalidEnumValue"
        };
        
        if (allowedValues != null)
        {
            details["allowedValues"] = allowedValues;
        }
        
        // Attempt to find location in JSON
        var jsonPointer = TryFindJsonPointer(rawBundleJson, fieldName, invalidValue);
        if (jsonPointer != null)
        {
            details["jsonPointer"] = jsonPointer;
        }
        
        return new ValidationError
        {
            Source = "FHIR",
            Severity = "error",
            ErrorCode = "INVALID_ENUM_VALUE",
            ResourceType = resourceType,
            Path = fieldName,
            JsonPointer = jsonPointer,
            Message = $"Invalid value '{invalidValue}' for field '{fieldName}'. {GetEnumSuggestion(allowedValues)}",
            Details = details
        };
    }
    
    private static ValidationError CreateUnknownElementError(string unknownElement, string exceptionMessage, string? rawBundleJson)
    {
        var details = new Dictionary<string, object>
        {
            ["unknownElement"] = unknownElement,
            ["exceptionType"] = "UnknownElement",
            ["fullMessage"] = exceptionMessage
        };
        
        var jsonPointer = TryFindJsonPointer(rawBundleJson, unknownElement, null);
        
        return new ValidationError
        {
            Source = "FHIR",
            Severity = "error",
            ErrorCode = "UNKNOWN_ELEMENT",
            Path = unknownElement,
            JsonPointer = jsonPointer,
            Message = $"Unknown element '{unknownElement}' is not valid in FHIR R4 schema",
            Details = details
        };
    }
    
    private static ValidationError CreateTypeMismatchError(string expectedType, string exceptionMessage, string? rawBundleJson)
    {
        var details = new Dictionary<string, object>
        {
            ["expectedType"] = expectedType,
            ["exceptionType"] = "TypeMismatch",
            ["fullMessage"] = exceptionMessage
        };
        
        return new ValidationError
        {
            Source = "FHIR",
            Severity = "error",
            ErrorCode = "TYPE_MISMATCH",
            Message = $"Value cannot be converted to expected type '{expectedType}'",
            Details = details
        };
    }
    
    private static ValidationError CreateMandatoryMissingError(string missingElement, string exceptionMessage, string? rawBundleJson)
    {
        var details = new Dictionary<string, object>
        {
            ["missingElement"] = missingElement,
            ["exceptionType"] = "MandatoryMissing",
            ["fullMessage"] = exceptionMessage
        };
        
        return new ValidationError
        {
            Source = "FHIR",
            Severity = "error",
            ErrorCode = "MANDATORY_MISSING",
            Path = missingElement,
            Message = $"Mandatory element '{missingElement}' is missing from the resource",
            Details = details
        };
    }
    
    private static ValidationError CreateGenericDeserializationError(string exceptionType, string exceptionMessage, string? rawBundleJson)
    {
        var details = new Dictionary<string, object>
        {
            ["exceptionType"] = exceptionType,
            ["fullMessage"] = exceptionMessage
        };
        
        return new ValidationError
        {
            Source = "FHIR",
            Severity = "error",
            ErrorCode = "FHIR_DESERIALIZATION_ERROR",
            Message = $"FHIR deserialization failed: {exceptionMessage}",
            Details = details
        };
    }
    
    /// <summary>
    /// Converts enum type name to likely field name
    /// Example: "StatusCode" -> "status"
    /// </summary>
    private static string DeduceFieldName(string enumTypeName)
    {
        // Remove "Code" suffix if present
        var fieldName = enumTypeName.EndsWith("Code", StringComparison.OrdinalIgnoreCase)
            ? enumTypeName.Substring(0, enumTypeName.Length - 4)
            : enumTypeName;
        
        // Convert to camelCase
        return char.ToLowerInvariant(fieldName[0]) + fieldName.Substring(1);
    }
    
    /// <summary>
    /// Returns common allowed values for known FHIR enum types
    /// This is a partial implementation - could be expanded with full FHIR R4 value sets
    /// </summary>
    private static List<string>? ExtractAllowedEnumValues(string enumType)
    {
        // Common FHIR R4 enums - add more as needed
        var knownEnums = new Dictionary<string, List<string>>(StringComparer.OrdinalIgnoreCase)
        {
            ["Encounter.StatusCode"] = new List<string> 
            { 
                "planned", "arrived", "triaged", "in-progress", 
                "onleave", "finished", "cancelled", "entered-in-error", "unknown" 
            },
            ["ObservationStatus"] = new List<string>
            {
                "registered", "preliminary", "final", "amended",
                "corrected", "cancelled", "entered-in-error", "unknown"
            },
            ["AdministrativeGender"] = new List<string>
            {
                "male", "female", "other", "unknown"
            },
            ["BundleType"] = new List<string>
            {
                "document", "message", "transaction", "transaction-response",
                "batch", "batch-response", "history", "searchset", "collection"
            }
        };
        
        return knownEnums.TryGetValue(enumType, out var values) ? values : null;
    }
    
    /// <summary>
    /// Attempts to locate a field in the raw JSON and return a JSON pointer
    /// This is a best-effort heuristic approach
    /// </summary>
    private static string? TryFindJsonPointer(string? rawJson, string? fieldName, string? value)
    {
        if (string.IsNullOrWhiteSpace(rawJson) || string.IsNullOrWhiteSpace(fieldName))
            return null;
        
        try
        {
            // Simple heuristic: look for "fieldName": pattern
            var pattern = $"\"{fieldName}\"\\s*:";
            var matches = Regex.Matches(rawJson, pattern);
            
            if (matches.Count == 1)
            {
                // If there's only one match, we can be reasonably confident
                // Count the nesting level by looking at bundle structure
                var matchIndex = matches[0].Index;
                var beforeMatch = rawJson.Substring(0, matchIndex);
                
                // Count entry arrays to estimate bundle index
                var entryMatches = Regex.Matches(beforeMatch, "\"entry\"\\s*:\\s*\\[");
                if (entryMatches.Count > 0)
                {
                    // Rough approximation - count resource objects before this point
                    var resourceCount = Regex.Matches(beforeMatch, "\"resource\"\\s*:\\s*\\{").Count;
                    if (resourceCount > 0)
                    {
                        return $"/entry/{resourceCount - 1}/resource/{fieldName}";
                    }
                }
            }
            
            // Fallback: just return field name
            return null;
        }
        catch
        {
            return null;
        }
    }
    
    private static string GetEnumSuggestion(List<string>? allowedValues)
    {
        if (allowedValues == null || allowedValues.Count == 0)
            return "Check FHIR R4 specification for valid values.";
        
        return $"Allowed values: {string.Join(", ", allowedValues.Take(5))}" +
               (allowedValues.Count > 5 ? $" (and {allowedValues.Count - 5} more)" : "");
    }
}
