using Hl7.Fhir.Model;
using Microsoft.Extensions.Logging;
using Pss.FhirProcessor.Engine.Firely;
using Pss.FhirProcessor.Engine.Models;
using Pss.FhirProcessor.Engine.SdValidation.PathResolution;

namespace Pss.FhirProcessor.Engine.SdValidation.Validators;

/// <summary>
/// Phase 2.2: Validates fixed value constraints.
/// Phase 3.1.1: Migrated to use generic path resolution.
/// Phase 3.2: Added complex datatype support (Coding, CodeableConcept, Quantity, Identifier).
/// 
/// Checks that element values match exactly what SD specifies.
/// Engine-owned validator using Firely metadata.
/// </summary>
public class FixedValueValidator
{
    private readonly ILogger<FixedValueValidator> _logger;
    private readonly IElementPathResolver _pathResolver;

    public FixedValueValidator(
        ILogger<FixedValueValidator> logger,
        IElementPathResolver pathResolver)
    {
        _logger = logger;
        _pathResolver = pathResolver;
    }

    /// <summary>
    /// Validates fixed value constraint against Bundle POCO.
    /// Returns ValidationError if value doesn't match, null otherwise.
    /// </summary>
    public ValidationError? Validate(
        SdConstraint constraint,
        FirelyValidationContext context)
    {
        if (constraint.Kind != SdConstraintKind.FixedValue)
        {
            throw new ArgumentException(
                $"Expected FixedValue constraint, got {constraint.Kind}",
                nameof(constraint));
        }

        var expectedValue = constraint.Expected as DataType;
        if (expectedValue == null)
        {
            _logger.LogWarning(
                "Fixed value constraint for {Path} has invalid expected value type",
                constraint.ElementPath);
            return null;
        }

        _logger.LogDebug(
            "Validating fixed value for {Path}: {Expected}",
            constraint.ElementPath,
            GetValueString(expectedValue));

        // Navigate to element in Bundle POCO using path resolver
        var contexts = _pathResolver.ResolveValues(
            context.Bundle,
            constraint.ElementPath,
            context.ModelInspector);

        // For fixed values, we expect exactly one value
        var resolvedValues = contexts.Where(c => !c.IsMissing).ToList();

        if (resolvedValues.Count == 0)
        {
            return new ValidationError
            {
                Source = "StructureDefinition",
                Severity = "error",
                ErrorCode = "SD_FIXED_VALUE_MISSING",
                Path = constraint.ElementPath,
                Message = $"Element is required with fixed value '{GetValueString(expectedValue)}'",
                Details = new Dictionary<string, object>
                {
                    ["profile"] = constraint.SourceProfile,
                    ["elementPath"] = constraint.ElementPath,
                    ["expectedValue"] = GetValueString(expectedValue),
                    ["actualValue"] = "(missing)"
                }
            };
        }

        // Validate resolved values
        // For collections (resolvedValues.Count > 1), check if ANY value matches (fixed value means "at least this one item")
        // For single values (resolvedValues.Count == 1), check if the one value matches exactly
        
        if (resolvedValues.Count > 1)
        {
            // Collection: Check if at least one element matches
            bool anyMatches = false;
            foreach (var ctx in resolvedValues)
            {
                var actualValue = ctx.Value as DataType;
                if (actualValue != null && ValuesMatch(expectedValue, actualValue))
                {
                    anyMatches = true;
                    break;
                }
            }

            if (!anyMatches)
            {
                // Get first non-null value for error message
                var firstActual = resolvedValues.FirstOrDefault(c => c.Value is DataType)?.Value as DataType;
                return new ValidationError
                {
                    Source = "StructureDefinition",
                    Severity = "error",
                    ErrorCode = "SD_FIXED_VALUE_MISMATCH",
                    Path = constraint.ElementPath,
                    Message = $"Expected fixed value '{GetValueString(expectedValue)}', found '{GetValueString(firstActual!)}'",
                    Details = new Dictionary<string, object>
                    {
                        ["profile"] = constraint.SourceProfile,
                        ["elementPath"] = constraint.ElementPath,
                        ["expectedValue"] = GetValueString(expectedValue),
                        ["actualValue"] = GetValueString(firstActual!)
                    }
                };
            }
        }
        else
        {
            // Single value: Must match exactly
            var actualValue = resolvedValues[0].Value as DataType;
            if (actualValue == null)
            {
                return null; // Already handled by count check above
            }

            if (!ValuesMatch(expectedValue, actualValue))
            {
                return new ValidationError
                {
                    Source = "StructureDefinition",
                    Severity = "error",
                    ErrorCode = "SD_FIXED_VALUE_MISMATCH",
                    Path = constraint.ElementPath,
                    Message = $"Expected fixed value '{GetValueString(expectedValue)}', found '{GetValueString(actualValue)}'",
                    Details = new Dictionary<string, object>
                    {
                        ["profile"] = constraint.SourceProfile,
                        ["elementPath"] = constraint.ElementPath,
                        ["expectedValue"] = GetValueString(expectedValue),
                        ["actualValue"] = GetValueString(actualValue)
                    }
                };
            }
        }

        return null; // No violation
    }

    /// <summary>
    /// Compares two FHIR values for equality.
    /// Phase 3.2: Extended with complex datatype support.
    /// </summary>
    private bool ValuesMatch(DataType expected, DataType actual)
    {
        return (expected, actual) switch
        {
            // Primitives (Phase 2.2)
            (Code e, Code a) => string.Equals(e.Value, a.Value, StringComparison.Ordinal),
            (FhirString e, FhirString a) => string.Equals(e.Value, a.Value, StringComparison.Ordinal),
            (Integer e, Integer a) => e.Value == a.Value,
            (FhirBoolean e, FhirBoolean a) => e.Value == a.Value,
            
            // Complex types (Phase 3.2)
            (Coding e, Coding a) => MatchesCoding(e, a),
            (CodeableConcept e, CodeableConcept a) => MatchesCodeableConcept(e, a),
            (Quantity e, Quantity a) => MatchesQuantity(e, a),
            (Identifier e, Identifier a) => MatchesIdentifier(e, a),
            
            _ => false // Unknown types
        };
    }

    /// <summary>
    /// Phase 3.2: Matches Coding using system, code, version, display.
    /// </summary>
    private bool MatchesCoding(Coding expected, Coding actual)
    {
        // Required: system and code must match
        if (!string.Equals(expected.System, actual.System, StringComparison.Ordinal))
            return false;
        
        if (!string.Equals(expected.Code, actual.Code, StringComparison.Ordinal))
            return false;

        // Optional: version and display only if present in expected
        if (!string.IsNullOrEmpty(expected.Version) &&
            !string.Equals(expected.Version, actual.Version, StringComparison.Ordinal))
            return false;

        if (!string.IsNullOrEmpty(expected.Display) &&
            !string.Equals(expected.Display, actual.Display, StringComparison.Ordinal))
            return false;

        return true;
    }

    /// <summary>
    /// Phase 3.2: Matches CodeableConcept if ANY coding matches.
    /// </summary>
    private bool MatchesCodeableConcept(CodeableConcept expected, CodeableConcept actual)
    {
        // Text field: only compare if present in expected
        if (!string.IsNullOrEmpty(expected.Text) &&
            !string.Equals(expected.Text, actual.Text, StringComparison.Ordinal))
            return false;

        // Codings: at least one must match
        if (expected.Coding != null && expected.Coding.Any())
        {
            if (actual.Coding == null || !actual.Coding.Any())
                return false;

            // Check if ANY expected coding matches ANY actual coding
            foreach (var expectedCoding in expected.Coding)
            {
                foreach (var actualCoding in actual.Coding)
                {
                    if (MatchesCoding(expectedCoding, actualCoding))
                        return true;
                }
            }

            return false; // No matching coding found
        }

        return true; // No codings to match
    }

    /// <summary>
    /// Phase 3.2: Matches Quantity using value, system, code, unit.
    /// </summary>
    private bool MatchesQuantity(Quantity expected, Quantity actual)
    {
        // Value must match
        if (expected.Value != actual.Value)
            return false;

        // System must match
        if (!string.Equals(expected.System, actual.System, StringComparison.Ordinal))
            return false;

        // Code must match
        if (!string.Equals(expected.Code, actual.Code, StringComparison.Ordinal))
            return false;

        // Unit: only if present in expected
        if (!string.IsNullOrEmpty(expected.Unit) &&
            !string.Equals(expected.Unit, actual.Unit, StringComparison.Ordinal))
            return false;

        return true;
    }

    /// <summary>
    /// Phase 3.2: Matches Identifier using system and value.
    /// </summary>
    private bool MatchesIdentifier(Identifier expected, Identifier actual)
    {
        // System must match
        if (!string.Equals(expected.System, actual.System, StringComparison.Ordinal))
            return false;

        // Value must match
        if (!string.Equals(expected.Value, actual.Value, StringComparison.Ordinal))
            return false;

        return true;
    }

    private string GetValueString(DataType? value)
    {
        if (value == null) return "(null)";

        return value switch
        {
            FhirString s => s.Value ?? "(empty string)",
            Code c => c.Value ?? "(empty code)",
            Integer i => i.Value?.ToString() ?? "(null integer)",
            FhirBoolean b => b.Value?.ToString() ?? "(null boolean)",
            Coding coding => $"{coding.System}|{coding.Code}",
            CodeableConcept concept => concept.Coding?.FirstOrDefault() is Coding c ? $"{c.System}|{c.Code}" : concept.Text ?? "(empty concept)",
            Quantity qty => $"{qty.Value} {qty.Unit ?? qty.Code}",
            Identifier id => $"{id.System}|{id.Value}",
            _ => value.ToString() ?? "(unknown)"
        };
    }
}
