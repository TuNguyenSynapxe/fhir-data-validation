using Hl7.Fhir.Model;
using Microsoft.Extensions.Logging;
using Pss.FhirProcessor.Engine.Firely;
using Pss.FhirProcessor.Engine.Models;

namespace Pss.FhirProcessor.Engine.SdValidation.Validators;

/// <summary>
/// Phase 2.3: Validates required terminology bindings.
/// 
/// Scope: Required binding strength only, in-memory ValueSet expansion.
/// Checks that coded elements use values from required ValueSets.
/// Engine-owned validator using Firely metadata.
/// </summary>
public class RequiredBindingValidator
{
    private readonly ILogger<RequiredBindingValidator> _logger;

    public RequiredBindingValidator(ILogger<RequiredBindingValidator> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// Validates required binding constraint.
    /// 
    /// Phase 2.3: Enforces required bindings with in-memory ValueSet expansion.
    /// Returns ValidationError if code not in ValueSet or ValueSet cannot be resolved.
    /// </summary>
    public ValidationError? Validate(
        SdConstraint constraint,
        FirelyValidationContext context)
    {
        if (constraint.Kind != SdConstraintKind.RequiredBinding)
        {
            throw new ArgumentException(
                $"Expected RequiredBinding constraint, got {constraint.Kind}",
                nameof(constraint));
        }

        var valueSetUrl = constraint.Expected as string;
        if (string.IsNullOrEmpty(valueSetUrl))
        {
            _logger.LogWarning(
                "Required binding constraint for {Path} has invalid ValueSet URL",
                constraint.ElementPath);
            return null;
        }

        _logger.LogDebug(
            "Validating required binding for {Path} → {ValueSet}",
            constraint.ElementPath,
            valueSetUrl);

        // Resolve ValueSet from context
        var valueSet = context.Resolver.ResolveByCanonicalUri(valueSetUrl) as ValueSet;
        if (valueSet == null)
        {
            return new ValidationError
            {
                Source = "StructureDefinition",
                Severity = "error",
                ErrorCode = "SD_REQUIRED_BINDING_VALUESET_NOT_RESOLVED",
                Path = constraint.ElementPath,
                Message = $"Required ValueSet '{valueSetUrl}' could not be resolved",
                Details = new Dictionary<string, object>
                {
                    ["profile"] = constraint.SourceProfile,
                    ["elementPath"] = constraint.ElementPath,
                    ["valueSetUrl"] = valueSetUrl,
                    ["bindingStrength"] = "required"
                }
            };
        }

        // Get coded value from Bundle POCO
        var codedValue = GetCodedValue(constraint.ElementPath, context.Bundle);
        if (codedValue == null)
        {
            return new ValidationError
            {
                Source = "StructureDefinition",
                Severity = "error",
                ErrorCode = "SD_REQUIRED_BINDING_MISSING",
                Path = constraint.ElementPath,
                Message = $"Required binding to ValueSet '{valueSetUrl}' but coded value is missing",
                Details = new Dictionary<string, object>
                {
                    ["profile"] = constraint.SourceProfile,
                    ["elementPath"] = constraint.ElementPath,
                    ["valueSetUrl"] = valueSetUrl,
                    ["bindingStrength"] = "required"
                }
            };
        }

        // Validate code is in ValueSet
        if (!IsCodeInValueSet(codedValue.Value, valueSet))
        {
            return new ValidationError
            {
                Source = "StructureDefinition",
                Severity = "error",
                ErrorCode = "SD_REQUIRED_BINDING_INVALID_CODE",
                Path = constraint.ElementPath,
                Message = $"Code '{codedValue.Value.Code}' (system: {codedValue.Value.System ?? "(none)"}) is not in required ValueSet '{valueSetUrl}'",
                Details = new Dictionary<string, object>
                {
                    ["profile"] = constraint.SourceProfile,
                    ["elementPath"] = constraint.ElementPath,
                    ["valueSetUrl"] = valueSetUrl,
                    ["suppliedCode"] = codedValue.Value.Code ?? "(null)",
                    ["suppliedSystem"] = codedValue.Value.System ?? "(null)",
                    ["bindingStrength"] = "required"
                }
            };
        }

        return null; // No violation
    }

    /// <summary>
    /// Gets coded value from Bundle POCO.
    /// Phase 2.3: Simple paths only, Code/Coding/CodeableConcept support.
    /// </summary>
    private (string? Code, string? System)? GetCodedValue(string elementPath, Bundle bundle)
    {
        // Phase 2.3: Simplified implementation for Bundle.type
        if (elementPath == "Bundle.type")
        {
            if (bundle.Type.HasValue)
            {
                var code = bundle.Type.Value.ToString();
                return (code, "http://hl7.org/fhir/bundle-type");
            }
        }

        _logger.LogDebug(
            "Required binding check for complex path {Path} requires reflection (not fully implemented in Phase 2.3)",
            elementPath);

        return null; // Phase 2.3: Conservative
    }

    /// <summary>
    /// Checks if code is in ValueSet.
    /// Phase 2.3: In-memory expansion only - checks ValueSet.compose.include.concept.
    /// </summary>
    private bool IsCodeInValueSet((string? Code, string? System) codedValue, ValueSet valueSet)
    {
        if (string.IsNullOrEmpty(codedValue.Code))
        {
            return false;
        }

        // Phase 2.3: Simple expansion - check compose.include
        if (valueSet.Compose?.Include != null)
        {
            foreach (var include in valueSet.Compose.Include)
            {
                // Check system match (if specified)
                if (!string.IsNullOrEmpty(include.System) && 
                    !string.IsNullOrEmpty(codedValue.System) &&
                    !string.Equals(include.System, codedValue.System, StringComparison.Ordinal))
                {
                    continue; // System mismatch, skip this include
                }

                // Check concept list
                if (include.Concept != null)
                {
                    foreach (var concept in include.Concept)
                    {
                        if (string.Equals(concept.Code, codedValue.Code, StringComparison.Ordinal))
                        {
                            _logger.LogDebug(
                                "Code '{Code}' found in ValueSet include (system: {System})",
                                codedValue.Code,
                                include.System);
                            return true; // Code found
                        }
                    }
                }
                else if (include.Filter == null && include.ValueSetElement == null)
                {
                    // Include entire system - Phase 2.3: Conservative, assume valid
                    _logger.LogDebug(
                        "Include references entire system {System}, assuming code '{Code}' is valid (Phase 2.3 limitation)",
                        include.System,
                        codedValue.Code);
                    return true;
                }
            }
        }

        // Phase 2.3: If no compose, check expansion
        if (valueSet.Expansion?.Contains != null)
        {
            foreach (var contain in valueSet.Expansion.Contains)
            {
                if (string.Equals(contain.Code, codedValue.Code, StringComparison.Ordinal) &&
                    (string.IsNullOrEmpty(codedValue.System) || 
                     string.Equals(contain.System, codedValue.System, StringComparison.Ordinal)))
                {
                    _logger.LogDebug(
                        "Code '{Code}' found in ValueSet expansion",
                        codedValue.Code);
                    return true;
                }
            }
        }

        _logger.LogDebug(
            "Code '{Code}' (system: {System}) NOT found in ValueSet",
            codedValue.Code,
            codedValue.System);
        return false;
    }
}
