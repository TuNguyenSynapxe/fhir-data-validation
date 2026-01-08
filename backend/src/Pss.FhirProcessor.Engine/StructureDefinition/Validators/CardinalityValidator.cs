using Hl7.Fhir.Model;
using Microsoft.Extensions.Logging;
using Pss.FhirProcessor.Engine.Firely;
using Pss.FhirProcessor.Engine.Models;
using Pss.FhirProcessor.Engine.SdValidation.PathResolution;

namespace Pss.FhirProcessor.Engine.SdValidation.Validators;

/// <summary>
/// Phase 2.2: Validates cardinality constraints (min/max).
/// Phase 3.1.1: Migrated to use generic path resolution.
/// 
/// Engine-owned validator using Firely metadata.
/// Does NOT call Validator.Validate().
/// </summary>
public class CardinalityValidator
{
    private readonly ILogger<CardinalityValidator> _logger;
    private readonly IElementPathResolver _pathResolver;

    public CardinalityValidator(
        ILogger<CardinalityValidator> logger,
        IElementPathResolver pathResolver)
    {
        _logger = logger;
        _pathResolver = pathResolver;
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

        // Navigate to element in Bundle POCO using path resolver
        var contexts = _pathResolver.ResolveValues(
            context.Bundle,
            constraint.ElementPath,
            context.ModelInspector);

        var actualCount = contexts.Count();

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
}
