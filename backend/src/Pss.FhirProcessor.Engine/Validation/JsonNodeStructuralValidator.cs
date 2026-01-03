using System.Text.Json;
using System.Text.RegularExpressions;
using Hl7.Fhir.Model;
using Microsoft.Extensions.Logging;
using Pss.FhirProcessor.Engine.Interfaces;
using Pss.FhirProcessor.Engine.Models;

namespace Pss.FhirProcessor.Engine.Validation;

/// <summary>
/// Phase A: JSON Node-based Structural Validation (Primary Authority)
/// 
/// Validates JSON nodes BEFORE Firely POCO parsing.
/// Catches structural errors that would cause parsing failures.
/// 
/// Validation Order (MANDATORY):
/// 1. JSON Syntax
/// 2. JSON Node Structural Validation ← THIS SERVICE
/// 3. Project / Business Rules
/// 4. Firely POCO Validation (LAST)
/// 
/// Scope (Phase A ONLY):
/// - Enum validation
/// - Primitive format validation
/// - Array vs object shape validation
/// - Cardinality validation (min/max)
/// - Required field presence
/// 
/// All errors emitted are STRUCTURE authority with ERROR severity.
/// </summary>
public interface IJsonNodeStructuralValidator
{
    /// <summary>
    /// Validates JSON structure against FHIR schema metadata.
    /// Returns ALL validation errors in one pass (does NOT stop at first error).
    /// </summary>
    /// <param name="bundleJson">Raw JSON bundle string</param>
    /// <param name="fhirVersion">FHIR version (R4 or R5)</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>List of structural validation errors</returns>
    Task<List<ValidationError>> ValidateAsync(
        string bundleJson,
        string fhirVersion,
        CancellationToken cancellationToken = default);
}

/// <summary>
/// Implementation of JSON node-based structural validator.
/// Uses FhirSchemaNode metadata from StructureDefinition registry.
/// </summary>
public class JsonNodeStructuralValidator : IJsonNodeStructuralValidator
{
    private readonly IFhirSchemaService _schemaService;
    private readonly IFhirEnumIndex _enumIndex;
    private readonly ILogger<JsonNodeStructuralValidator> _logger;

    // Primitive type validators
    private static readonly Dictionary<string, Func<string, bool>> PrimitiveValidators = new()
    {
        ["boolean"] = value => value == "true" || value == "false",
        ["integer"] = value => int.TryParse(value, out _),
        ["decimal"] = value => decimal.TryParse(value, out _),
        ["date"] = ValidateDate,
        ["dateTime"] = ValidateDateTime,
        ["id"] = ValidateFhirId,  // Phase 1, Rule 1: FHIR id grammar
        ["string"] = ValidateFhirString  // Phase 1, Rule 2: FHIR string (no newlines)
    };

    // FHIR id regex: 1-64 characters, alphanumeric plus dash and dot
    private static readonly System.Text.RegularExpressions.Regex FhirIdRegex = 
        new(@"^[A-Za-z0-9\-\.]{1,64}$", System.Text.RegularExpressions.RegexOptions.Compiled);

    public JsonNodeStructuralValidator(
        IFhirSchemaService schemaService,
        IFhirEnumIndex enumIndex,
        ILogger<JsonNodeStructuralValidator> logger)
    {
        _schemaService = schemaService;
        _enumIndex = enumIndex;
        _logger = logger;
    }

    public async Task<List<ValidationError>> ValidateAsync(
        string bundleJson,
        string fhirVersion,
        CancellationToken cancellationToken = default)
    {
        var errors = new List<ValidationError>();

        try
        {
            // Parse JSON document
            using var doc = JsonDocument.Parse(bundleJson);
            var root = doc.RootElement;

            // Validate Bundle structure
            if (!root.TryGetProperty("resourceType", out var resourceTypeElement) || 
                resourceTypeElement.GetString() != "Bundle")
            {
                // Not our concern - let earlier validation handle this
                return errors;
            }

            // Get Bundle schema
            var bundleSchema = await _schemaService.GetResourceSchemaAsync("Bundle", cancellationToken);
            if (bundleSchema == null)
            {
                _logger.LogWarning("Bundle schema not found for FHIR version {FhirVersion}", fhirVersion);
                return errors;
            }

            // Validate Bundle properties
            ValidateElement(root, bundleSchema, "", "/", "Bundle", fhirVersion, errors);

            // Validate each entry
            if (root.TryGetProperty("entry", out var entryArray) && entryArray.ValueKind == JsonValueKind.Array)
            {
                var entryIndex = 0;
                foreach (var entry in entryArray.EnumerateArray())
                {
                    if (entry.TryGetProperty("resource", out var resource))
                    {
                        if (resource.TryGetProperty("resourceType", out var resTypeElement))
                        {
                            var resourceType = resTypeElement.GetString();
                            if (!string.IsNullOrEmpty(resourceType))
                            {
                                var resourceSchema = await _schemaService.GetResourceSchemaAsync(resourceType, cancellationToken);
                                if (resourceSchema != null)
                                {
                                    var resourcePath = $"Bundle.entry[{entryIndex}].resource";
                                    var resourceJsonPointer = $"/entry/{entryIndex}/resource";
                                    
                                    // Phase 1, Rule 1: FHIR id is a base Resource primitive and is not reached via normal element traversal.
                                    // Explicitly validate it here before normal child element traversal.
                                    if (resource.TryGetProperty("id", out var idElement))
                                    {
                                        ValidateResourceId(idElement, $"{resourceType}.id", $"{resourceJsonPointer}/id", resourceType, errors);
                                    }
                                    
                                    ValidateElement(resource, resourceSchema, resourcePath, resourceJsonPointer, resourceType, fhirVersion, errors);
                                }
                            }
                        }
                    }
                    entryIndex++;
                }
            }

            _logger.LogInformation("JSON node structural validation completed: {ErrorCount} errors found", errors.Count);
        }
        catch (JsonException ex)
        {
            _logger.LogError(ex, "JSON parsing failed in structural validator");
            // Let earlier JSON validation handle this
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error in JSON node structural validation");
        }

        return errors;
    }

    /// <summary>
    /// Recursively validates a JSON element against its schema node.
    /// Collects ALL errors (does not stop at first error).
    /// </summary>
    private void ValidateElement(
        JsonElement element,
        FhirSchemaNode schema,
        string fhirPath,
        string jsonPointer,
        string resourceType,
        string fhirVersion,
        List<ValidationError> errors)
    {
        // Validate each child element defined in schema
        foreach (var childSchema in schema.Children)
        {
            var propertyName = childSchema.ElementName;
            
            // Phase 1, Rule 1: Skip 'id' validation here only at resource level
            // to avoid duplicate validation since it's handled at resource boundary
            if (propertyName == "id" && fhirPath.EndsWith($".resource"))
            {
                continue;
            }
            
            var childFhirPath = string.IsNullOrEmpty(fhirPath) 
                ? propertyName 
                : $"{fhirPath}.{propertyName}";

            if (element.TryGetProperty(propertyName, out var propertyValue))
            {
                // Property exists - validate it
                ValidateProperty(
                    propertyValue,
                    childSchema,
                    childFhirPath,
                    $"{jsonPointer}/{propertyName}",
                    resourceType,
                    fhirVersion,
                    errors);
            }
            else
            {
                // Property missing - check if required
                ValidateRequiredField(
                    childSchema,
                    childFhirPath,
                    $"{jsonPointer}/{propertyName}",
                    resourceType,
                    errors);
            }
        }
    }

    /// <summary>
    /// Validates a single property value against its schema.
    /// </summary>
    private void ValidateProperty(
        JsonElement value,
        FhirSchemaNode schema,
        string fhirPath,
        string jsonPointer,
        string resourceType,
        string fhirVersion,
        List<ValidationError> errors)
    {
        // 1. Array vs Object Shape Validation
        if (schema.IsArray && value.ValueKind != JsonValueKind.Array)
        {
            errors.Add(CreateArrayExpectedError(fhirPath, jsonPointer, value.ValueKind, resourceType));
            // Short-circuit THIS BRANCH only (can't validate children of wrong-shaped value)
            // But this doesn't stop validation of sibling properties
            return;
        }

        if (!schema.IsArray && value.ValueKind == JsonValueKind.Array)
        {
            // Array provided but object expected - report for first item
            var arrayLength = value.GetArrayLength();
            if (arrayLength > 0)
            {
                _logger.LogWarning("Array provided for non-array field {Path}, validating first element only", fhirPath);
                ValidateProperty(value[0], schema, fhirPath, $"{jsonPointer}/0", resourceType, fhirVersion, errors);
            }
            return;
        }

        // 2. Array Validation (if array)
        if (schema.IsArray && value.ValueKind == JsonValueKind.Array)
        {
            ValidateArrayCardinality(value, schema, fhirPath, jsonPointer, resourceType, errors);

            // Validate each array element
            var index = 0;
            foreach (var arrayElement in value.EnumerateArray())
            {
                ValidateSingleValue(
                    arrayElement,
                    schema,
                    $"{fhirPath}[{index}]",
                    $"{jsonPointer}/{index}",
                    resourceType,
                    fhirVersion,
                    errors);
                index++;
            }
        }
        else
        {
            // 3. Single Value Validation
            ValidateSingleValue(value, schema, fhirPath, jsonPointer, resourceType, fhirVersion, errors);
        }
    }

    /// <summary>
    /// Validates a single value (not an array).
    /// Checks enum, primitive format, and recursively validates complex types.
    /// </summary>
    private void ValidateSingleValue(
        JsonElement value,
        FhirSchemaNode schema,
        string fhirPath,
        string jsonPointer,
        string resourceType,
        string fhirVersion,
        List<ValidationError> errors)
    {
        // Skip null values
        if (value.ValueKind == JsonValueKind.Null)
        {
            return;
        }

        // Enum Validation (Phase B: Dynamic from StructureDefinition)
        var allowedValues = _enumIndex.GetAllowedValues(fhirVersion, resourceType, schema.ElementName);
        if (allowedValues != null && value.ValueKind == JsonValueKind.String)
        {
            var actualValue = value.GetString();
            if (!string.IsNullOrEmpty(actualValue) && !allowedValues.Contains(actualValue))
            {
                // Get binding strength for severity mapping
                var bindingStrength = _enumIndex.GetBindingStrength(fhirVersion, resourceType, schema.ElementName);
                var severity = MapBindingStrengthToSeverity(bindingStrength);
                
                errors.Add(CreateInvalidEnumError(fhirPath, jsonPointer, actualValue, allowedValues, resourceType, severity));
            }
        }
        // Phase B.2 — Explicit warning when enum validation is skipped
        // Emit warning if element has ValueSet binding but enum values cannot be loaded
        else if (!string.IsNullOrEmpty(schema.ValueSetUrl) &&
                 !string.IsNullOrEmpty(schema.BindingStrength) &&
                 schema.BindingStrength?.ToLowerInvariant() != "example" &&
                 value.ValueKind == JsonValueKind.String)
        {
            // Check if enum index explicitly has no values (empty list vs null)
            // Only warn if GetAllowedValues returned null (not supported) or empty list
            var hasEnumValues = allowedValues != null && allowedValues.Count > 0;
            if (!hasEnumValues)
            {
                _logger.LogDebug("Enum validation skipped for {JsonPointer} — unsupported ValueSet {ValueSetUrl}",
                    jsonPointer, schema.ValueSetUrl);
                    
                var skipSeverity = MapBindingStrengthToSeverity(schema.BindingStrength) == "error" ? "warning" : "info";
                errors.Add(CreateEnumValidationSkippedError(fhirPath, jsonPointer, schema.ValueSetUrl, schema.BindingStrength, resourceType, skipSeverity));
            }
        }

        // Primitive Format Validation
        if (IsPrimitiveType(schema.Type))
        {
            ValidatePrimitiveFormat(value, schema, fhirPath, jsonPointer, resourceType, errors);
        }
        else if (value.ValueKind == JsonValueKind.Object && schema.Children.Any())
        {
            // Recursively validate complex types
            ValidateElement(value, schema, fhirPath, jsonPointer, resourceType, fhirVersion, errors);
        }
    }

    /// <summary>
    /// Validates primitive format (boolean, integer, decimal, date, dateTime).
    /// </summary>
    private void ValidatePrimitiveFormat(
        JsonElement value,
        FhirSchemaNode schema,
        string fhirPath,
        string jsonPointer,
        string resourceType,
        List<ValidationError> errors)
    {
        var primitiveType = schema.Type.ToLowerInvariant();
        
        // Special handling for boolean - check JSON type
        if (primitiveType == "boolean")
        {
            if (value.ValueKind != JsonValueKind.True && value.ValueKind != JsonValueKind.False)
            {
                var actual = value.ValueKind == JsonValueKind.String ? value.GetString() : value.ToString();
                errors.Add(CreateInvalidPrimitiveError(fhirPath, jsonPointer, actual ?? "null", "boolean", "Must be JSON boolean true or false", resourceType));
            }
            return;
        }

        // For other primitives, validate string representation
        if (value.ValueKind == JsonValueKind.String)
        {
            var textValue = value.GetString();
            if (string.IsNullOrEmpty(textValue))
            {
                return; // Empty strings are handled by required field validation
            }

            if (PrimitiveValidators.TryGetValue(primitiveType, out var validator))
            {
                if (!validator(textValue))
                {
                    var reason = GetValidationReason(primitiveType);
                    errors.Add(CreateInvalidPrimitiveError(fhirPath, jsonPointer, textValue, primitiveType, reason, resourceType));
                }
            }
        }
        else if (primitiveType == "integer" || primitiveType == "decimal")
        {
            // Allow JSON numbers for numeric types
            if (value.ValueKind != JsonValueKind.Number)
            {
                var actual = value.ToString();
                errors.Add(CreateInvalidPrimitiveError(fhirPath, jsonPointer, actual, primitiveType, $"Must be a valid {primitiveType}", resourceType));
            }
        }
    }

    /// <summary>
    /// Validates array cardinality (min/max constraints).
    /// </summary>
    private void ValidateArrayCardinality(
        JsonElement arrayValue,
        FhirSchemaNode schema,
        string fhirPath,
        string jsonPointer,
        string resourceType,
        List<ValidationError> errors)
    {
        var actualCount = arrayValue.GetArrayLength();
        var min = schema.Min;
        var max = schema.Max == "*" ? int.MaxValue : int.Parse(schema.Max);

        if (actualCount < min || actualCount > max)
        {
            errors.Add(CreateCardinalityError(fhirPath, jsonPointer, min, max, actualCount, resourceType));
        }
    }

    /// <summary>
    /// Validates required field presence (min >= 1).
    /// </summary>
    private void ValidateRequiredField(
        FhirSchemaNode schema,
        string fhirPath,
        string jsonPointer,
        string resourceType,
        List<ValidationError> errors)
    {
        if (schema.Min >= 1)
        {
            errors.Add(CreateRequiredFieldMissingError(fhirPath, jsonPointer, resourceType));
        }
    }

    // =========================================================================
    // ERROR FACTORY METHODS (Following unified error model)
    // =========================================================================

    private ValidationError CreateInvalidEnumError(
        string fhirPath,
        string jsonPointer,
        string actualValue,
        IReadOnlyList<string> allowedValues,
        string resourceType,
        string severity = "error")
    {
        var details = new Dictionary<string, object>
        {
            ["actual"] = actualValue,
            ["allowed"] = allowedValues.ToList(),
            ["valueType"] = "enum"
        };

        Models.ValidationErrorDetailsValidator.Validate("INVALID_ENUM_VALUE", details);

        return new ValidationError
        {
            Source = "STRUCTURE",
            Severity = severity,
            ErrorCode = "INVALID_ENUM_VALUE",
            ResourceType = resourceType,
            Path = fhirPath,
            JsonPointer = jsonPointer,
            Message = $"Invalid enum value '{actualValue}' at {fhirPath}. Allowed: {string.Join(", ", allowedValues.Take(5))}{(allowedValues.Count > 5 ? "..." : "")}",
            Details = details
        };
    }

    /// <summary>
    /// Maps FHIR binding strength to error severity.
    /// Follows fhirlab.net severity model.
    /// </summary>
    private string MapBindingStrengthToSeverity(string? bindingStrength)
    {
        return bindingStrength?.ToLowerInvariant() switch
        {
            "required" => "error",
            "extensible" => "warning",
            "preferred" => "info",
            "example" => "info",
            _ => "error" // Default to error for unknown/missing strength
        };
    }

    /// <summary>
    /// Phase B.2 — Create warning when enum validation cannot be enforced.
    /// This improves transparency without guessing enum values.
    /// </summary>
    private ValidationError CreateEnumValidationSkippedError(
        string fhirPath,
        string jsonPointer,
        string valueSetUrl,
        string bindingStrength,
        string resourceType,
        string severity)
    {
        var details = new Dictionary<string, object>
        {
            ["valueSet"] = valueSetUrl,
            ["bindingStrength"] = bindingStrength,
            ["reason"] = "ValueSet not supported by enum index"
        };

        Models.ValidationErrorDetailsValidator.Validate("ENUM_VALIDATION_SKIPPED", details);

        return new ValidationError
        {
            Source = "STRUCTURE",
            Severity = severity,
            ErrorCode = "ENUM_VALIDATION_SKIPPED",
            ResourceType = resourceType,
            Path = fhirPath,
            JsonPointer = jsonPointer,
            Message = $"Enum validation skipped for {fhirPath} — ValueSet {valueSetUrl} is not supported",
            Details = details
        };
    }

    private ValidationError CreateInvalidPrimitiveError(
        string fhirPath,
        string jsonPointer,
        string actualValue,
        string expectedType,
        string reason,
        string resourceType)
    {
        // Phase 1: Use specific error codes for different primitive types
        var errorCode = expectedType switch
        {
            "id" => "FHIR_INVALID_ID_FORMAT",
            "string" => "FHIR_INVALID_STRING_NEWLINE",
            _ => "FHIR_INVALID_PRIMITIVE"
        };
        
        var details = new Dictionary<string, object>
        {
            ["actual"] = actualValue,
            ["expectedType"] = expectedType,
            ["reason"] = reason
        };

        Models.ValidationErrorDetailsValidator.Validate(errorCode, details);

        return new ValidationError
        {
            Source = "STRUCTURE",
            Severity = "error",
            ErrorCode = errorCode,
            ResourceType = resourceType,
            Path = fhirPath,
            JsonPointer = jsonPointer,
            Message = $"Invalid {expectedType} format at {fhirPath}: {actualValue}. {reason}",
            Details = details
        };
    }

    private ValidationError CreateArrayExpectedError(
        string fhirPath,
        string jsonPointer,
        JsonValueKind actualKind,
        string resourceType)
    {
        var actualType = actualKind switch
        {
            JsonValueKind.Object => "object",
            JsonValueKind.String => "string",
            JsonValueKind.Number => "number",
            JsonValueKind.True or JsonValueKind.False => "boolean",
            _ => actualKind.ToString().ToLowerInvariant()
        };

        var details = new Dictionary<string, object>
        {
            ["expectedType"] = "array",
            ["actualType"] = actualType
        };

        Models.ValidationErrorDetailsValidator.Validate("FHIR_ARRAY_EXPECTED", details);

        return new ValidationError
        {
            Source = "STRUCTURE",
            Severity = "error",
            ErrorCode = "FHIR_ARRAY_EXPECTED",
            ResourceType = resourceType,
            Path = fhirPath,
            JsonPointer = jsonPointer,
            Message = $"Array expected at {fhirPath} but found {actualType}",
            Details = details
        };
    }

    private ValidationError CreateCardinalityError(
        string fhirPath,
        string jsonPointer,
        int min,
        int max,
        int actual,
        string resourceType)
    {
        var details = new Dictionary<string, object>
        {
            ["min"] = min,
            ["max"] = max == int.MaxValue ? "*" : max,
            ["actual"] = actual
        };

        Models.ValidationErrorDetailsValidator.Validate("ARRAY_LENGTH_OUT_OF_RANGE", details);

        var maxDisplay = max == int.MaxValue ? "*" : max.ToString();
        return new ValidationError
        {
            Source = "STRUCTURE",
            Severity = "error",
            ErrorCode = "ARRAY_LENGTH_OUT_OF_RANGE",
            ResourceType = resourceType,
            Path = fhirPath,
            JsonPointer = jsonPointer,
            Message = $"Array length at {fhirPath} is {actual}, expected between {min} and {maxDisplay}",
            Details = details
        };
    }

    private ValidationError CreateRequiredFieldMissingError(
        string fhirPath,
        string jsonPointer,
        string resourceType)
    {
        var details = new Dictionary<string, object>
        {
            ["required"] = true
        };

        Models.ValidationErrorDetailsValidator.Validate("REQUIRED_FIELD_MISSING", details);

        return new ValidationError
        {
            Source = "STRUCTURE",
            Severity = "error",
            ErrorCode = "REQUIRED_FIELD_MISSING",
            ResourceType = resourceType,
            Path = fhirPath,
            JsonPointer = jsonPointer,
            Message = $"Required field missing: {fhirPath}",
            Details = details
        };
    }

    // =========================================================================
    // HELPER METHODS
    // =========================================================================

    private static bool IsPrimitiveType(string type)
    {
        var lowerType = type.ToLowerInvariant();
        
        // Handle generic types like "Code`1"
        if (lowerType.Contains('`'))
        {
            lowerType = lowerType.Substring(0, lowerType.IndexOf('`'));
        }
        
        return lowerType switch
        {
            "boolean" or "integer" or "string" or "decimal" or "uri" or "url" or
            "canonical" or "base64binary" or "instant" or "date" or "datetime" or
            "time" or "code" or "oid" or "id" or "markdown" or "unsignedint" or
            "positiveint" or "uuid" or "xhtml" => true,
            _ => false
        };
    }

    private static bool ValidateDate(string value)
    {
        // FHIR date format: YYYY-MM-DD
        var dateRegex = new Regex(@"^\d{4}(-\d{2}(-\d{2})?)?$");
        if (!dateRegex.IsMatch(value))
        {
            return false;
        }

        // Try parsing full date
        if (value.Length == 10)
        {
            return DateTime.TryParse(value, out _);
        }

        return true; // Partial dates (YYYY or YYYY-MM) are valid
    }

    private static bool ValidateDateTime(string value)
    {
        // FHIR dateTime format: ISO 8601
        // Simplified validation - accept if parseable
        return DateTimeOffset.TryParse(value, out _) || DateTime.TryParse(value, out _);
    }

    /// <summary>
    /// Phase 1, Rule 1: Validates FHIR id primitive grammar.
    /// FHIR id must be 1-64 characters, containing only [A-Za-z0-9.-]
    /// </summary>
    private static bool ValidateFhirId(string value)
    {
        if (string.IsNullOrEmpty(value))
            return false;
            
        return FhirIdRegex.IsMatch(value);
    }

    /// <summary>
    /// Phase 1, Rule 2: Validates FHIR string primitive (no newlines allowed).
    /// FHIR string primitives MUST NOT contain \n or \r.
    /// Use markdown type if multiline text is required.
    /// </summary>
    private static bool ValidateFhirString(string? value)
    {
        // Empty string is valid
        if (string.IsNullOrEmpty(value))
        {
            return true;
        }

        // Check for newline characters (\n or \r)
        return !value.Contains('\n') && !value.Contains('\r');
    }

    /// <summary>
    /// Phase 1, Rule 1: Validates Resource.id explicitly.
    /// id is a base Resource primitive that isn't in individual resource schemas.
    /// This must be called at the resource boundary before normal element traversal.
    /// </summary>
    private void ValidateResourceId(
        JsonElement idElement,
        string fhirPath,
        string jsonPointer,
        string resourceType,
        List<ValidationError> errors)
    {
        // id must be a string
        if (idElement.ValueKind != JsonValueKind.String)
        {
            var actual = idElement.ToString();
            errors.Add(CreateInvalidPrimitiveError(fhirPath, jsonPointer, actual, "id", "Must be a string value", resourceType));
            return;
        }

        var idValue = idElement.GetString();
        
        // Validate FHIR id grammar (including empty string check)
        if (!ValidateFhirId(idValue))
        {
            var reason = GetValidationReason("id");
            errors.Add(CreateInvalidPrimitiveError(fhirPath, jsonPointer, idValue ?? string.Empty, "id", reason, resourceType));
        }
    }

    private static string GetValidationReason(string primitiveType)
    {
        return primitiveType switch
        {
            "date" => "Must be in format YYYY-MM-DD",
            "dateTime" => "Must be in ISO 8601 format",
            "integer" => "Must be a whole number",
            "decimal" => "Must be a numeric value",
            "boolean" => "Must be true or false",
            "id" => "Must be 1-64 characters containing only [A-Za-z0-9.-]",
            "string" => "FHIR string primitives must not contain newline characters. Use markdown if multiline text is required.",
            _ => $"Invalid {primitiveType} format"
        };
    }
}
