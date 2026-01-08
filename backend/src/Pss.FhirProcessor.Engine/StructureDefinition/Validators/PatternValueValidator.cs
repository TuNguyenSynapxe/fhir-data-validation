using Hl7.Fhir.Model;
using Microsoft.Extensions.Logging;
using Pss.FhirProcessor.Engine.Firely;
using Pss.FhirProcessor.Engine.Models;

namespace Pss.FhirProcessor.Engine.SdValidation.Validators;

/// <summary>
/// Phase 2.3: Validates pattern[x] constraints.
/// 
/// Scope: Primitive patterns only (string, code, boolean, integer)
/// Engine-owned validator using Firely metadata.
/// </summary>
public class PatternValueValidator
{
    private readonly ILogger<PatternValueValidator> _logger;

    public PatternValueValidator(ILogger<PatternValueValidator> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// Validates pattern constraint against Bundle POCO.
    /// 
    /// Phase 2.3: Only validates primitive pattern values.
    /// Returns ValidationError if pattern doesn't match, null otherwise.
    /// </summary>
    public ValidationError? Validate(
        SdConstraint constraint,
        FirelyValidationContext context)
    {
        if (constraint.Kind != SdConstraintKind.Pattern)
        {
            throw new ArgumentException(
                $"Expected Pattern constraint, got {constraint.Kind}",
                nameof(constraint));
        }

        var expectedPattern = constraint.Expected as DataType;
        if (expectedPattern == null)
        {
            _logger.LogWarning(
                "Pattern constraint for {Path} has invalid pattern value type",
                constraint.ElementPath);
            return null;
        }

        _logger.LogDebug(
            "Validating pattern for {Path}: {Pattern}",
            constraint.ElementPath,
            GetValueString(expectedPattern));

        // Navigate to element in Bundle POCO
        var actualValue = GetElementValue(constraint.ElementPath, context.Bundle);

        if (actualValue == null)
        {
            return new ValidationError
            {
                Source = "StructureDefinition",
                Severity = "error",
                ErrorCode = "SD_PATTERN_MISSING",
                Path = constraint.ElementPath,
                Message = $"Element must match pattern '{GetValueString(expectedPattern)}' but is missing",
                Details = new Dictionary<string, object>
                {
                    ["profile"] = constraint.SourceProfile,
                    ["elementPath"] = constraint.ElementPath,
                    ["expectedPattern"] = GetValueString(expectedPattern)
                }
            };
        }

        if (!PatternMatches(expectedPattern, actualValue))
        {
            return new ValidationError
            {
                Source = "StructureDefinition",
                Severity = "error",
                ErrorCode = "SD_PATTERN_MISMATCH",
                Path = constraint.ElementPath,
                Message = $"Element must match pattern '{GetValueString(expectedPattern)}', found '{GetValueString(actualValue)}'",
                Details = new Dictionary<string, object>
                {
                    ["profile"] = constraint.SourceProfile,
                    ["elementPath"] = constraint.ElementPath,
                    ["expectedPattern"] = GetValueString(expectedPattern),
                    ["actualValue"] = GetValueString(actualValue)
                }
            };
        }

        return null; // No violation
    }

    /// <summary>
    /// Gets element value from Bundle POCO.
    /// Phase 2.3: Simple paths only.
    /// </summary>
    private DataType? GetElementValue(string elementPath, Bundle bundle)
    {
        // Phase 2.3: Simplified implementation for common cases
        if (elementPath == "Bundle.type")
        {
            return bundle.Type.HasValue ? new Code(bundle.Type.Value.ToString()) : null;
        }

        _logger.LogDebug(
            "Pattern check for complex path {Path} requires reflection (not fully implemented in Phase 2.3)",
            elementPath);

        return null; // Phase 2.3: Conservative
    }

    /// <summary>
    /// Checks if actual value matches expected pattern.
    /// Phase 2.3: Primitive values only - exact equality check.
    /// </summary>
    private bool PatternMatches(DataType expectedPattern, DataType actualValue)
    {
        return (expectedPattern, actualValue) switch
        {
            (Code e, Code a) => string.Equals(e.Value, a.Value, StringComparison.Ordinal),
            (FhirString e, FhirString a) => string.Equals(e.Value, a.Value, StringComparison.Ordinal),
            (Integer e, Integer a) => e.Value == a.Value,
            (FhirBoolean e, FhirBoolean a) => e.Value == a.Value,
            _ => false // Phase 2.3: Conservative - complex types not supported
        };
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
            _ => value.ToString() ?? "(unknown)"
        };
    }
}
