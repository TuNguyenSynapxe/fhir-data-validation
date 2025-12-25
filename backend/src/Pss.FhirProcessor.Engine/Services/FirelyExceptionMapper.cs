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
        
        Console.WriteLine($"[FirelyExceptionMapper] Processing exception: {exceptionMessage}");
        
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
        // Example: "Encountered unknown element 'actualPeriod' at location 'Bundle.entry[1].resource[0].actualPeriod[0]' while parsing"
        var unknownElementMatch = Regex.Match(
            exceptionMessage,
            @"Encountered unknown element\s+['""](?<element>[^'""]+)['""](?:\s+at location\s+['""]?(?<location>[^'""]+)['""]?)?",
            RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);
        
        if (unknownElementMatch.Success)
        {
            var unknownElement = unknownElementMatch.Groups["element"].Value;
            var location = unknownElementMatch.Groups["location"].Success ? unknownElementMatch.Groups["location"].Value : null;            Console.WriteLine($"[FirelyExceptionMapper] Unknown element match - Element: '{unknownElement}', Location: '{location ?? "(null)"}'" );            return CreateUnknownElementError(unknownElement, location, exceptionMessage, rawBundleJson);
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
            Console.WriteLine($"[CreateUnknownElementError] FhirPath: '{fhirPath}', JsonPointer: '{jsonPointer ?? "(null)"}'" );
        }
        else
        {
            Console.WriteLine($"[CreateUnknownElementError] No location provided, using fallback");
            // Fallback to trying to find it in the JSON
            jsonPointer = TryFindJsonPointer(rawBundleJson, unknownElement, null);
        }
        
        Console.WriteLine($"[CreateUnknownElementError] Final - Path: '{fhirPath ?? unknownElement}', JsonPointer: '{jsonPointer ?? "(null)"}'" );
        
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
            Console.WriteLine($"[ConvertFhirPathToJsonPointer] Input: '{fhirPath}'");
            
            // Remove "Bundle." prefix if present
            var path = fhirPath.StartsWith("Bundle.", StringComparison.OrdinalIgnoreCase)
                ? fhirPath.Substring(7)
                : fhirPath;
            
            Console.WriteLine($"[ConvertFhirPathToJsonPointer] After prefix removal: '{path}'");
            
            // FIX: Firely SDK incorrectly reports resource[0] but resource is not an array in Bundle.entry
            // Replace .resource[0]. with .resource. before general conversion
            path = Regex.Replace(path, @"\.resource\[0\]\.", ".resource.", RegexOptions.IgnoreCase);
            
            // FIX: Firely SDK adds [0] to single-value fields that aren't actually arrays
            // Remove trailing [0] at the end of the path (e.g., actualPeriod[0] -> actualPeriod)
            path = Regex.Replace(path, @"\[0\]$", "", RegexOptions.IgnoreCase);
            
            Console.WriteLine($"[ConvertFhirPathToJsonPointer] After [0] cleanup: '{path}'");
            
            // Convert notation: entry[1].resource.actualPeriod -> /entry/1/resource/actualPeriod
            // Replace .property with /property
            path = path.Replace(".", "/");
            
            // Replace [index] with /index
            path = Regex.Replace(path, @"\[(\d+)\]", "/$1");
            
            // Ensure it starts with /
            if (!path.StartsWith("/"))
                path = "/" + path;
            
            Console.WriteLine($"[ConvertFhirPathToJsonPointer] Output: '{path}'");
            
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
