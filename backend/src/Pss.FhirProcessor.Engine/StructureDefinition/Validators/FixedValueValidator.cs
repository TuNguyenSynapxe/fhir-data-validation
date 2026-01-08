using Hl7.Fhir.Model;
using Microsoft.Extensions.Logging;
using Pss.FhirProcessor.Engine.Firely;
using Pss.FhirProcessor.Engine.Models;
using Pss.FhirProcessor.Engine.SdValidation.PathResolution;

namespace Pss.FhirProcessor.Engine.SdValidation.Validators;

/// <summary>
/// Phase 2.2: Validates fixed value constraints.
/// Phase 3.1.1: Migrated to use generic path resolution.
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

        // Validate all resolved values
        foreach (var ctx in resolvedValues)
        {
            var actualValue = ctx.Value as DataType;
            if (actualValue == null) continue;

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
    /// </summary>
    private bool ValuesMatch(DataType expected, DataType actual)
    {
        return (expected, actual) switch
        {
            (Code e, Code a) => string.Equals(e.Value, a.Value, StringComparison.Ordinal),
            (FhirString e, FhirString a) => string.Equals(e.Value, a.Value, StringComparison.Ordinal),
            (Integer e, Integer a) => e.Value == a.Value,
            (FhirBoolean e, FhirBoolean a) => e.Value == a.Value,
            _ => false // Phase 2.2: Conservative - assume mismatch for complex types
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
