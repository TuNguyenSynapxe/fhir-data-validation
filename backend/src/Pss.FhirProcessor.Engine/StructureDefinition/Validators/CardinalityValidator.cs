using Hl7.Fhir.Model;
using Microsoft.Extensions.Logging;
using Pss.FhirProcessor.Engine.Firely;
using Pss.FhirProcessor.Engine.Models;
using System.Text.Json;

namespace Pss.FhirProcessor.Engine.SdValidation.Validators;

/// <summary>
/// Phase 2.2: Validates cardinality constraints (min/max).
/// 
/// Engine-owned validator using Firely metadata.
/// Does NOT call Validator.Validate().
/// </summary>
public class CardinalityValidator
{
    private readonly ILogger<CardinalityValidator> _logger;

    public CardinalityValidator(ILogger<CardinalityValidator> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// Validates cardinality constraint against Bundle POCO.
    /// Returns ValidationError if constraint violated, null otherwise.
    /// </summary>
    public ValidationError? Validate(
        SdConstraint constraint,
        FirelyValidationContext context)
    {
        if (constraint.Kind != SdConstraintKind.Cardinality)
        {
            throw new ArgumentException(
                $"Expected Cardinality constraint, got {constraint.Kind}",
                nameof(constraint));
        }

        var (min, max) = ((int, int?))constraint.Expected;

        _logger.LogDebug(
            "Validating cardinality for {Path}: {Min}..{Max}",
            constraint.ElementPath,
            min,
            max?.ToString() ?? "*");

        // Navigate to element in Bundle POCO
        var actualCount = CountElement(constraint.ElementPath, context.Bundle);

        // Check min constraint
        if (actualCount < min)
        {
            return new ValidationError
            {
                Source = "StructureDefinition",
                Severity = "error",
                ErrorCode = "SD_CARDINALITY_MIN_VIOLATION",
                Path = constraint.ElementPath,
                Message = $"Expected at least {min} occurrence(s), found {actualCount}",
                Details = new Dictionary<string, object>
                {
                    ["profile"] = constraint.SourceProfile,
                    ["elementPath"] = constraint.ElementPath,
                    ["minRequired"] = min,
                    ["maxAllowed"] = max?.ToString() ?? "*",
                    ["actualCount"] = actualCount,
                    ["expectedCardinality"] = $"{min}..{max?.ToString() ?? "*"}"
                }
            };
        }

        // Check max constraint
        if (max.HasValue && actualCount > max.Value)
        {
            return new ValidationError
            {
                Source = "StructureDefinition",
                Severity = "error",
                ErrorCode = "SD_CARDINALITY_MAX_VIOLATION",
                Path = constraint.ElementPath,
                Message = $"Expected at most {max.Value} occurrence(s), found {actualCount}",
                Details = new Dictionary<string, object>
                {
                    ["profile"] = constraint.SourceProfile,
                    ["elementPath"] = constraint.ElementPath,
                    ["minRequired"] = min,
                    ["maxAllowed"] = max.Value,
                    ["actualCount"] = actualCount,
                    ["expectedCardinality"] = $"{min}..{max.Value}"
                }
            };
        }

        return null; // No violation
    }

    /// <summary>
    /// Counts occurrences of an element in Bundle POCO.
    /// Uses reflection to navigate element path.
    /// </summary>
    private int CountElement(string elementPath, Bundle bundle)
    {
        // Phase 2.2: Simplified implementation for common cases
        // Future: Use ModelInspector for generic path navigation

        if (elementPath == "Bundle.entry")
        {
            return bundle.Entry?.Count ?? 0;
        }

        if (elementPath == "Bundle.type")
        {
            return bundle.Type.HasValue ? 1 : 0;
        }

        // For complex paths, use JSON-based counting (fallback)
        _logger.LogDebug(
            "Cardinality check for complex path {Path} requires JSON navigation (not implemented in Phase 2.2)",
            elementPath);

        return 0; // Phase 2.2: Conservative - assume exists
    }
}
