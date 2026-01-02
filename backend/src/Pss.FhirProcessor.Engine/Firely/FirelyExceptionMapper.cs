using System.Text.RegularExpressions;
using Pss.FhirProcessor.Engine.Models;
using Pss.FhirProcessor.Engine.Validation;

namespace Pss.FhirProcessor.Engine.Firely;

/// <summary>
/// Maps Firely SDK exceptions to structured ValidationError objects.
/// Extracts context from exception messages to provide actionable error information.
/// 
/// DLL-SAFETY: DLL-safe (static utility, no external dependencies)
/// NOTE: Uses regex pattern matching which may be fragile across Firely SDK versions.
///       See ARCHITECTURAL_AUDIT_REPORT.md Section 4 for version compatibility concerns.
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
        // Example with location: "Literal 'malex' is not a valid value for enumeration 'AdministrativeGender' (at Bundle.entry[0].resource[0].gender[0])"
        var enumMatch = Regex.Match(exceptionMessage, 
            @"Literal '([^']+)' is not a valid value for enumeration '([^']+)'(?:\s*\(at\s+([^\)]+)\))?",
            RegexOptions.IgnoreCase);
        
        if (enumMatch.Success)
        {
            var invalidValue = enumMatch.Groups[1].Value;
            var enumType = enumMatch.Groups[2].Value;
            var location = enumMatch.Groups[3].Success ? enumMatch.Groups[3].Value : null;
            
            return CreateInvalidEnumError(invalidValue, enumType, location, exceptionMessage, rawBundleJson);
        }
        
        // Pattern 2: Unknown element/property
        // Example: "Encountered unknown element 'invalidField' while parsing..."
        // Example: "Encountered unknown element 'actualPeriod' at location 'Bundle.entry[1].resource[0].actualPeriod[0]' while parsing"
        var unknownElementMatch = Regex.Match(
            exceptionMessage,
            @"Encountered unknown element\s+['""](?<element>[^'""]+)['""](?:\s+at location\s+['""]?(?<location>[^'""]+)['""]?)?",
            RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);
        
        if (unknownElementMatch.Success)
        {
            var unknownElement = unknownElementMatch.Groups["element"].Value;
            var location = unknownElementMatch.Groups["location"].Success ? unknownElementMatch.Groups["location"].Value : null;
            return CreateUnknownElementError(unknownElement, location, exceptionMessage, rawBundleJson);
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
        
        // Pattern 5: Invalid primitive value
        // Example: "Literal '1960-05-15x' cannot be parsed as a date"
        // Example: "Literal 'invalid' cannot be parsed as a boolean"
        var invalidPrimitiveMatch = Regex.Match(exceptionMessage,
            @"Literal '([^']+)' cannot be parsed as an? (\w+)",
            RegexOptions.IgnoreCase);
        
        if (invalidPrimitiveMatch.Success)
        {
            var invalidValue = invalidPrimitiveMatch.Groups[1].Value;
            var expectedType = invalidPrimitiveMatch.Groups[2].Value;
            return CreateInvalidPrimitiveError(invalidValue, expectedType, exceptionMessage, rawBundleJson);
        }
        
        // Pattern 6: Array expected but received non-array
        // Example: "Expected array but received object"
        // Example: "Expected array but received string"
        var arrayExpectedMatch = Regex.Match(exceptionMessage,
            @"Expected array.*but received (\w+)",
            RegexOptions.IgnoreCase);
        
        if (arrayExpectedMatch.Success)
        {
            var actualType = arrayExpectedMatch.Groups[1].Value;
            return CreateArrayExpectedError(actualType, exceptionMessage, rawBundleJson);
        }
        
        // Fallback: Generic FHIR deserialization error
        return CreateGenericDeserializationError(exceptionType, exceptionMessage, rawBundleJson);
    }
    
    private static ValidationError CreateInvalidEnumError(string invalidValue, string enumType, string? location, string exceptionMessage, string? rawBundleJson)
    {
        // Extract resource type and field name from enum type OR location
        // Example: "Encounter.StatusCode" -> Resource: "Encounter", Field: "status"
        // Example location: "Bundle.entry[0].resource[0].gender[0]" -> Field: "gender"
        string? resourceType = null;
        string? fieldName = null;
        string? jsonPointer = null;
        
        // Try to extract from location first (more accurate)
        if (!string.IsNullOrEmpty(location))
        {
            // Extract field from location path (last segment before array indices)
            // "Bundle.entry[0].resource[0].gender[0]" -> "gender"
            var locationMatch = Regex.Match(location, @"\.([a-zA-Z]+)\[");
            if (locationMatch.Success)
            {
                fieldName = locationMatch.Groups[1].Value;
            }
            
            // Convert to JSON pointer
            jsonPointer = ConvertFhirPathToJsonPointer(location);
        }
        
        // Fall back to enum type if location didn't work
        if (string.IsNullOrEmpty(fieldName))
        {
            var parts = enumType.Split('.');
            resourceType = parts.Length > 0 ? parts[0] : null;
            fieldName = parts.Length > 1 ? DeduceFieldName(parts[1]) : null;
        }
        
        // Phase B.1: No hardcoded enum values - error message is generic
        // The actual validation is done by JsonNodeStructuralValidator which should
        // catch enum errors BEFORE Firely. This path should rarely be hit.
        
        // Canonical schema: { actual: string | null, allowed: string[], valueType: "enum" }
        var details = new Dictionary<string, object>
        {
            ["actual"] = invalidValue,
            ["allowed"] = new List<string>(), // No allowed values - use JsonNodeStructuralValidator
            ["valueType"] = "enum"
        };
        
        // Enforce schema
        ValidationErrorDetailsValidator.Validate("INVALID_ENUM_VALUE", details);
        
        // Attempt to find location in JSON if we don't have it yet
        if (jsonPointer == null)
        {
            jsonPointer = TryFindJsonPointer(rawBundleJson, fieldName, invalidValue);
        }
        
        return new ValidationError
        {
            Source = "FHIR",
            Severity = "error",
            ErrorCode = "INVALID_ENUM_VALUE",
            ResourceType = resourceType,
            Path = fieldName,
            JsonPointer = jsonPointer,
            Message = $"Invalid value '{invalidValue}' for field '{fieldName}'. This error should have been caught earlier by structural validation.",
            Details = details
        };
    }
    
    private static ValidationError CreateUnknownElementError(string unknownElement, string? location, string exceptionMessage, string? rawBundleJson)
    {
        var details = new Dictionary<string, object>
        {
            ["unknownElement"] = unknownElement,
            ["exceptionType"] = "UnknownElement",
            ["fullMessage"] = exceptionMessage
        };
        
        // Extract path and jsonPointer from location if available
        // Example location: "Bundle.entry[1].resource[0].actualPeriod[0]"
        string? fhirPath = null;
        string? jsonPointer = null;
        
        if (!string.IsNullOrEmpty(location))
        {
            fhirPath = location;
            jsonPointer = ConvertFhirPathToJsonPointer(location);
            details["location"] = location;
        }
        else
        {
            // Fallback to trying to find it in the JSON
            jsonPointer = TryFindJsonPointer(rawBundleJson, unknownElement, null);
        }
        

        return new ValidationError
        {
            Source = "FHIR",
            Severity = "error",
            ErrorCode = "UNKNOWN_ELEMENT",
            Path = fhirPath ?? unknownElement,
            JsonPointer = jsonPointer,
            Message = $"Unknown element '{unknownElement}' is not valid in FHIR R4 schema",
            Details = details
        };
    }
    
    /// <summary>
    /// Converts a FHIR location path to JSON Pointer format
    /// Example: "Bundle.entry[1].resource[0].actualPeriod[0]" -> "/entry/1/resource/actualPeriod/0"
    /// Note: Firely SDK incorrectly adds [0] to resource, which is not an array in Bundle entries
    /// </summary>
    private static string? ConvertFhirPathToJsonPointer(string fhirPath)
    {
        if (string.IsNullOrEmpty(fhirPath))
            return null;
        
        try
        {
            // Remove "Bundle." prefix if present
            var path = fhirPath.StartsWith("Bundle.", StringComparison.OrdinalIgnoreCase)
                ? fhirPath.Substring(7)
                : fhirPath;
            
            // FIX: Firely SDK incorrectly reports resource[0] but resource is not an array in Bundle.entry
            // Replace .resource[0]. with .resource. before general conversion
            path = Regex.Replace(path, @"\.resource\[0\]\.", ".resource.", RegexOptions.IgnoreCase);
            
            // FIX: Firely SDK adds [0] to single-value fields that aren't actually arrays
            // Remove trailing [0] at the end of the path (e.g., actualPeriod[0] -> actualPeriod)
            path = Regex.Replace(path, @"\[0\]$", "", RegexOptions.IgnoreCase);
            
            // Convert notation: entry[1].resource.actualPeriod -> /entry/1/resource/actualPeriod
            // Replace .property with /property
            path = path.Replace(".", "/");
            
            // Replace [index] with /index
            path = Regex.Replace(path, @"\[(\d+)\]", "/$1");
            
            // Ensure it starts with /
            if (!path.StartsWith("/"))
                path = "/" + path;
            
            return path;
        }
        catch
        {
            return null;
        }
    }
    
    private static ValidationError CreateTypeMismatchError(string expectedType, string exceptionMessage, string? rawBundleJson)
    {
        var details = new Dictionary<string, object>
        {
            ["expectedType"] = expectedType,
            ["exceptionType"] = "TypeMismatch",
            ["fullMessage"] = exceptionMessage
        };
        
        // Attempt to extract location from exception message and resolve jsonPointer
        string? jsonPointer = null;
        var locationMatch = Regex.Match(exceptionMessage, @"\(at\s+(?:location\s+)?(.+?)\)\s*$", RegexOptions.IgnoreCase);
        if (locationMatch.Success)
        {
            var location = locationMatch.Groups[1].Value.Trim().Trim('\'', '\"');
            jsonPointer = ConvertFhirPathToJsonPointer(location);
        }
        
        return new ValidationError
        {
            Source = "FHIR",
            Severity = "error",
            ErrorCode = "TYPE_MISMATCH",
            JsonPointer = jsonPointer,
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
        
        // Attempt to extract location from exception message and resolve jsonPointer
        string? jsonPointer = null;
        var locationMatch = Regex.Match(exceptionMessage, @"\(at\s+(?:location\s+)?(.+?)\)\s*$", RegexOptions.IgnoreCase);
        if (locationMatch.Success)
        {
            var location = locationMatch.Groups[1].Value.Trim().Trim('\'', '\"');
            jsonPointer = ConvertFhirPathToJsonPointer(location);
        }
        
        return new ValidationError
        {
            Source = "FHIR",
            Severity = "error",
            ErrorCode = "MANDATORY_MISSING",
            Path = missingElement,
            JsonPointer = jsonPointer,
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
        
        // Attempt to extract location from exception message and resolve jsonPointer
        string? jsonPointer = null;
        var locationMatch = Regex.Match(exceptionMessage, @"\(at\s+(?:location\s+)?(.+?)\)\s*$", RegexOptions.IgnoreCase);
        if (locationMatch.Success)
        {
            var location = locationMatch.Groups[1].Value.Trim().Trim('\'', '\"');
            jsonPointer = ConvertFhirPathToJsonPointer(location);
        }
        
        return new ValidationError
        {
            Source = "FHIR",
            Severity = "error",
            ErrorCode = "FHIR_DESERIALIZATION_ERROR",
            JsonPointer = jsonPointer,
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
    /// Phase B.1: Removed hardcoded enum values. Enum validation is now handled
    /// exclusively by JsonNodeStructuralValidator using IFhirEnumIndex.
    /// This method is deprecated and returns empty list.
    /// </summary>
    [Obsolete("Enum validation moved to JsonNodeStructuralValidator. This should not be called.")]
    private static List<string>? ExtractAllowedEnumValues(string enumType)
    {
        // Phase B.1: No longer used. Enum validation happens in JSON Node phase.
        return null;
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
    
    /// <summary>
    /// Creates a ValidationError for invalid FHIR primitive values
    /// Canonical schema: { actual: string, expectedType: string, reason: string }
    /// </summary>
    private static ValidationError CreateInvalidPrimitiveError(string invalidValue, string expectedType, string exceptionMessage, string? rawBundleJson)
    {
        var details = new Dictionary<string, object>
        {
            ["actual"] = invalidValue,
            ["expectedType"] = expectedType,
            ["reason"] = $"Cannot parse '{invalidValue}' as {expectedType}"
        };
        
        // CRITICAL: Enforce canonical schema at runtime
        ValidationErrorDetailsValidator.Validate("FHIR_INVALID_PRIMITIVE", details);
        
        // Attempt to extract location from exception message and resolve jsonPointer
        string? jsonPointer = null;
        var locationMatch = Regex.Match(exceptionMessage, @"\(at\s+(?:location\s+)?(.+?)\)\s*$", RegexOptions.IgnoreCase);
        if (locationMatch.Success)
        {
            var location = locationMatch.Groups[1].Value.Trim().Trim('\'', '\"');
            jsonPointer = ConvertFhirPathToJsonPointer(location);
        }
        
        // Fallback: try to find field in JSON by value
        if (jsonPointer == null)
        {
            jsonPointer = TryFindJsonPointer(rawBundleJson, expectedType.ToLowerInvariant(), invalidValue);
        }
        
        return new ValidationError
        {
            Source = "FHIR",
            Severity = "error",
            ErrorCode = "FHIR_INVALID_PRIMITIVE",
            JsonPointer = jsonPointer,
            Message = $"Invalid {expectedType} value: '{invalidValue}'",
            Details = details
        };
    }
    
    /// <summary>
    /// Creates a ValidationError when array was expected but received different type
    /// Canonical schema: { expectedType: "array", actualType: string }
    /// </summary>
    private static ValidationError CreateArrayExpectedError(string actualType, string exceptionMessage, string? rawBundleJson)
    {
        var details = new Dictionary<string, object>
        {
            ["expectedType"] = "array",
            ["actualType"] = actualType
        };
        
        // CRITICAL: Enforce canonical schema at runtime
        ValidationErrorDetailsValidator.Validate("FHIR_ARRAY_EXPECTED", details);
        
        // Attempt to extract location from exception message and resolve jsonPointer
        string? jsonPointer = null;
        var locationMatch = Regex.Match(exceptionMessage, @"\(at\s+(?:location\s+)?(.+?)\)\s*$", RegexOptions.IgnoreCase);
        if (locationMatch.Success)
        {
            var location = locationMatch.Groups[1].Value.Trim().Trim('\'', '\"');
            jsonPointer = ConvertFhirPathToJsonPointer(location);
        }
        
        return new ValidationError
        {
            Source = "FHIR",
            Severity = "error",
            ErrorCode = "FHIR_ARRAY_EXPECTED",
            JsonPointer = jsonPointer,
            Message = $"Expected array but received {actualType}",
            Details = details
        };
    }
}
