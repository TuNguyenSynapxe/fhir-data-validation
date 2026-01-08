using Microsoft.Extensions.Logging;
using Pss.FhirProcessor.Engine.Firely;
using Pss.FhirProcessor.Engine.Models;
using Pss.FhirProcessor.Engine.SdValidation.Validators;

namespace Pss.FhirProcessor.Engine.SdValidation;

/// <summary>
/// Phase 2.2: Orchestrates StructureDefinition constraint validation.
/// 
/// Architecture:
/// - Extracts constraints from SD snapshots
/// - Applies enforcement policy
/// - Delegates to specific validators
/// - Returns explainable ValidationErrors
/// 
/// This is the entry point for SD validation in ValidationPipeline.
/// </summary>
public class SdConstraintValidationService
{
    private readonly SdConstraintExtractor _extractor;
    private readonly CardinalityValidator _cardinalityValidator;
    private readonly FixedValueValidator _fixedValueValidator;
    private readonly RequiredBindingValidator _bindingValidator;
    private readonly PatternValueValidator _patternValidator;
    private readonly ILogger<SdConstraintValidationService> _logger;

    public SdConstraintValidationService(
        SdConstraintExtractor extractor,
        CardinalityValidator cardinalityValidator,
        FixedValueValidator fixedValueValidator,
        RequiredBindingValidator bindingValidator,
        PatternValueValidator patternValidator,
        ILogger<SdConstraintValidationService> logger)
    {
        _extractor = extractor;
        _cardinalityValidator = cardinalityValidator;
        _fixedValueValidator = fixedValueValidator;
        _bindingValidator = bindingValidator;
        _patternValidator = patternValidator;
        _logger = logger;
    }

    /// <summary>
    /// Validates Bundle against StructureDefinition constraints.
    /// 
    /// Phase 2.2: Validates enforced constraints only.
    /// Deferred constraints are extracted but not validated.
    /// </summary>
    public async Task<IReadOnlyList<ValidationError>> ValidateAsync(
        FirelyValidationContext context,
        IEnumerable<string> profileUrls,
        CancellationToken cancellationToken = default)
    {
        var errors = new List<ValidationError>();

        _logger.LogInformation(
            "Starting SD constraint validation for {ProfileCount} profiles",
            profileUrls.Count());

        foreach (var profileUrl in profileUrls)
        {
            var profile = context.Resolver.ResolveByCanonicalUri(profileUrl);
            if (profile is not Hl7.Fhir.Model.StructureDefinition sd)
            {
                _logger.LogWarning(
                    "Profile {Url} not found or not a StructureDefinition, skipping",
                    profileUrl);
                continue;
            }

            // Extract constraints
            var constraints = _extractor.ExtractConstraints(sd);

            _logger.LogDebug(
                "Extracted {Count} constraints from {Url}",
                constraints.Count,
                profileUrl);

            // Validate enforced constraints
            foreach (var constraint in constraints)
            {
                if (!SdEnforcementPolicy.IsEnforced(constraint.Kind))
                {
                    _logger.LogTrace(
                        "Skipping deferred constraint: {Kind} at {Path} (reason: {Reason})",
                        constraint.Kind,
                        constraint.ElementPath,
                        SdEnforcementPolicy.GetDeferralReason(constraint.Kind));
                    continue;
                }

                var error = ValidateConstraint(constraint, context);
                if (error != null)
                {
                    errors.Add(error);
                }
            }
        }

        _logger.LogInformation(
            "SD constraint validation complete: {ErrorCount} violations found",
            errors.Count);

        return errors;
    }

    /// <summary>
    /// Validates a single constraint using appropriate validator.
    /// Returns ValidationError if violated, null otherwise.
    /// </summary>
    private ValidationError? ValidateConstraint(
        SdConstraint constraint,
        FirelyValidationContext context)
    {
        return constraint.Kind switch
        {
            SdConstraintKind.Cardinality => _cardinalityValidator.Validate(constraint, context),
            SdConstraintKind.FixedValue => _fixedValueValidator.Validate(constraint, context),
            SdConstraintKind.RequiredBinding => _bindingValidator.Validate(constraint, context),
            SdConstraintKind.Pattern => _patternValidator.Validate(constraint, context),
            _ => null // Should never reach (policy check done before)
        };
    }
}
