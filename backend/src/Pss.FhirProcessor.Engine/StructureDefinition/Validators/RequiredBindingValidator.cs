using Hl7.Fhir.Model;
using Microsoft.Extensions.Logging;
using Pss.FhirProcessor.Engine.Firely;
using Pss.FhirProcessor.Engine.Models;
using Pss.FhirProcessor.Engine.SdValidation.PathResolution;

namespace Pss.FhirProcessor.Engine.SdValidation.Validators;

/// <summary>
/// Phase 2.3: Validates required terminology bindings.
/// Phase 3.1.1: Migrated to use generic path resolution.
/// 
/// Scope: Required binding strength only, in-memory ValueSet expansion.
/// Checks that coded elements use values from required ValueSets.
/// Engine-owned validator using Firely metadata.
/// </summary>
public class RequiredBindingValidator
{
    private readonly ILogger<RequiredBindingValidator> _logger;
    private readonly IElementPathResolver _pathResolver;

    public RequiredBindingValidator(
        ILogger<RequiredBindingValidator> logger,
        IElementPathResolver pathResolver)
    {
        _logger = logger;
        _pathResolver = pathResolver;
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
            var severity = SdEnforcementPolicy.ResolveSeverity(
                SdConstraintKind.RequiredBinding,
                SdViolationReason.UnresolvableValueSet);

            return new ValidationError
            {
                Source = "StructureDefinition",
                Severity = severity,
                ErrorCode = "SD_REQUIRED_BINDING_VALUESET_NOT_RESOLVED",
                Path = constraint.ElementPath,
                Message = $"Required ValueSet '{valueSetUrl}' could not be resolved",
                Details = new Dictionary<string, object>
                {
                    ["profile"] = constraint.SourceProfile,
                    ["elementPath"] = constraint.ElementPath,
                    ["valueSetUrl"] = valueSetUrl,
                    ["bindingStrength"] = "required",
                    ["policyMode"] = SdEnforcementPolicy.CurrentMode.ToString(),
                    ["violationReason"] = SdViolationReason.UnresolvableValueSet.ToString()
                }
            };
        }

        // Get coded value from Bundle POCO using path resolver
        var contexts = _pathResolver.ResolveValues(
            context.Bundle,
            constraint.ElementPath,
            context.ModelInspector);

        var resolvedValues = contexts.Where(c => !c.IsMissing).ToList();

        if (resolvedValues.Count == 0)
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

        // Validate all resolved coded values
        foreach (var ctx in resolvedValues)
        {
            var codedValue = ExtractCodedValue(ctx.Value);
            if (codedValue == null) continue;

            // Validate code is in ValueSet (Phase 2.4: strict)
            var (found, ambiguousError) = IsCodeInValueSet(codedValue.Value, valueSet, constraint, valueSetUrl);
        
            if (ambiguousError != null)
            {
                return ambiguousError; // ValueSet structure is ambiguous
            }
        
            if (!found)
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
        }

        return null; // No violation
    }

    /// <summary>
    /// Extracts (code, system) from a resolved value object.
    /// Phase 3.1.1: Works on any resolved object type.
    /// </summary>
    private (string? Code, string? System)? ExtractCodedValue(object? value)
    {
        if (value == null) return null;

        return value switch
        {
            Code code => (code.Value, null), // Code primitive doesn't carry system
            Coding coding => (coding.Code, coding.System),
            CodeableConcept concept => concept.Coding?.FirstOrDefault() is Coding c ? (c.Code, c.System) : null,
            _ => null
        };
    }

    /// <summary>
    /// Checks if code is in ValueSet.
    /// Phase 2.4: Strict validation - rejects entire-system includes, filters, and imports.
    /// </summary>
    private (bool Found, ValidationError? Error) IsCodeInValueSet(
        (string? Code, string? System) codedValue, 
        ValueSet valueSet, 
        SdConstraint constraint, 
        string valueSetUrl)
    {
        if (string.IsNullOrEmpty(codedValue.Code))
        {
            return (false, null);
        }

        // Phase 2.4: Strict validation - check compose.include
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

                // Phase 2.4: Reject filters (not supported)
                if (include.Filter != null && include.Filter.Any())
                {
                    _logger.LogDebug(
                        "ValueSet include contains filters which cannot be deterministically validated");
                    
                    var severity = SdEnforcementPolicy.ResolveSeverity(
                        SdConstraintKind.RequiredBinding,
                        SdViolationReason.FilteredInclude);

                    return (false, new ValidationError
                    {
                        Source = "StructureDefinition",
                        Severity = severity,
                        ErrorCode = "SD_REQUIRED_BINDING_AMBIGUOUS_VALUESET",
                        Path = constraint.ElementPath,
                        Message = $"Required binding ValueSet '{valueSetUrl}' uses filters which cannot be deterministically validated",
                        Details = new Dictionary<string, object>
                        {
                            ["profile"] = constraint.SourceProfile,
                            ["elementPath"] = constraint.ElementPath,
                            ["valueSetUrl"] = valueSetUrl,
                            ["system"] = include.System ?? "(none)",
                            ["reason"] = "filter-not-supported",
                            ["bindingStrength"] = "required",
                            ["policyMode"] = SdEnforcementPolicy.CurrentMode.ToString(),
                            ["violationReason"] = SdViolationReason.FilteredInclude.ToString()
                        }
                    });
                }

                // Phase 2.4: Reject valueSet imports (not supported)
                if (include.ValueSetElement != null && include.ValueSetElement.Any())
                {
                    _logger.LogDebug(
                        "ValueSet include contains valueSet imports which cannot be deterministically validated");
                    
                    var severity = SdEnforcementPolicy.ResolveSeverity(
                        SdConstraintKind.RequiredBinding,
                        SdViolationReason.ImportedValueSet);

                    return (false, new ValidationError
                    {
                        Source = "StructureDefinition",
                        Severity = severity,
                        ErrorCode = "SD_REQUIRED_BINDING_AMBIGUOUS_VALUESET",
                        Path = constraint.ElementPath,
                        Message = $"Required binding ValueSet '{valueSetUrl}' imports other ValueSets which cannot be deterministically validated",
                        Details = new Dictionary<string, object>
                        {
                            ["profile"] = constraint.SourceProfile,
                            ["elementPath"] = constraint.ElementPath,
                            ["valueSetUrl"] = valueSetUrl,
                            ["system"] = include.System ?? "(none)",
                            ["reason"] = "imported-valueset-not-supported",
                            ["bindingStrength"] = "required",
                            ["policyMode"] = SdEnforcementPolicy.CurrentMode.ToString(),
                            ["violationReason"] = SdViolationReason.ImportedValueSet.ToString()
                        }
                    });
                }

                // Check explicit concept list
                if (include.Concept != null && include.Concept.Any())
                {
                    foreach (var concept in include.Concept)
                    {
                        if (string.Equals(concept.Code, codedValue.Code, StringComparison.Ordinal))
                        {
                            _logger.LogDebug(
                                "Code '{Code}' found in ValueSet include (system: {System})",
                                codedValue.Code,
                                include.System);
                            return (true, null); // Code found
                        }
                    }
                }
                else
                {
                    // Phase 2.4: Reject entire-system includes (ambiguous)
                    _logger.LogDebug(
                        "ValueSet include references entire CodeSystem '{System}' which cannot be deterministically validated",
                        include.System);
                    
                    var severity = SdEnforcementPolicy.ResolveSeverity(
                        SdConstraintKind.RequiredBinding,
                        SdViolationReason.EntireSystemValueSet);

                    return (false, new ValidationError
                    {
                        Source = "StructureDefinition",
                        Severity = severity,
                        ErrorCode = "SD_REQUIRED_BINDING_AMBIGUOUS_VALUESET",
                        Path = constraint.ElementPath,
                        Message = $"Required binding ValueSet '{valueSetUrl}' includes entire CodeSystem '{include.System}' which cannot be deterministically validated",
                        Details = new Dictionary<string, object>
                        {
                            ["profile"] = constraint.SourceProfile,
                            ["elementPath"] = constraint.ElementPath,
                            ["valueSetUrl"] = valueSetUrl,
                            ["system"] = include.System ?? "(none)",
                            ["reason"] = "entire-system-include",
                            ["bindingStrength"] = "required",
                            ["policyMode"] = SdEnforcementPolicy.CurrentMode.ToString(),
                            ["violationReason"] = SdViolationReason.EntireSystemValueSet.ToString()
                        }
                    });
                }
            }
        }

        // Phase 2.4: If no compose, check expansion
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
                    return (true, null);
                }
            }
        }

        _logger.LogDebug(
            "Code '{Code}' (system: {System}) NOT found in ValueSet",
            codedValue.Code,
            codedValue.System);
        return (false, null);
    }
}
