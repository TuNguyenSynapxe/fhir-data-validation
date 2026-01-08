using Hl7.Fhir.Model;
using Microsoft.Extensions.Logging;
using Pss.FhirProcessor.Engine.Firely;
using Pss.FhirProcessor.Engine.Models;
using Pss.FhirProcessor.Engine.SdValidation.PathResolution;
using Pss.FhirProcessor.Engine.SdValidation.Terminology;

namespace Pss.FhirProcessor.Engine.SdValidation.Validators;

/// <summary>
/// Phase 2.3: Validates required terminology bindings.
/// Phase 3.1.1: Migrated to use generic path resolution.
/// Phase 3.4: Extended with offline nested ValueSet expansion support.
/// 
/// Scope: Required binding strength only, in-memory ValueSet expansion.
/// Checks that coded elements use values from required ValueSets.
/// Engine-owned validator using Firely metadata.
/// </summary>
public class RequiredBindingValidator
{
    private readonly ILogger<RequiredBindingValidator> _logger;
    private readonly IElementPathResolver _pathResolver;
    private readonly IOfflineValueSetExpander _valueSetExpander;

    public RequiredBindingValidator(
        ILogger<RequiredBindingValidator> logger,
        IElementPathResolver pathResolver,
        IOfflineValueSetExpander valueSetExpander)
    {
        _logger = logger;
        _pathResolver = pathResolver;
        _valueSetExpander = valueSetExpander;
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

        // Phase 3.4: Expand ValueSet once using offline expander
        var expansionResult = _valueSetExpander.Expand(valueSet, context, CancellationToken.None);
        
        // Phase 3.4 Bug Fix: Explicit codes beat ambiguity
        // If we have explicit codes, validate against them FIRST
        if (expansionResult.Codes.Any())
        {
            // Validate all resolved coded values against expanded codes
            foreach (var ctx in resolvedValues)
            {
                var codedValue = ExtractCodedValue(ctx.Value);
                if (codedValue == null) continue;
            
                // Check if code is in expanded set
                var found = false;
                if (!string.IsNullOrEmpty(codedValue.Value.Code))
                {
                    // Try exact match with system
                    if (!string.IsNullOrEmpty(codedValue.Value.System))
                    {
                        found = expansionResult.Codes.Contains((codedValue.Value.System, codedValue.Value.Code));
                    }
                    
                    // Try code-only match if system match fails
                    if (!found)
                    {
                        found = expansionResult.Codes.Any(c => c.Item2 == codedValue.Value.Code);
                    }
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
                            ["bindingStrength"] = "required",
                            ["expandedCodeCount"] = expansionResult.Codes.Count
                        }
                    };
                }
            }
            
            // Code validation passed, but check if expansion had issues
            if (expansionResult.Issues.Any())
            {
                var firstIssue = expansionResult.Issues.First();
                var severity = SdEnforcementPolicy.ResolveSeverity(
                    SdConstraintKind.RequiredBinding,
                    firstIssue.Reason);

                return new ValidationError
                {
                    Source = "StructureDefinition",
                    Severity = severity,
                    ErrorCode = "SD_REQUIRED_BINDING_AMBIGUOUS_VALUESET",
                    Path = constraint.ElementPath,
                    Message = $"Required binding ValueSet '{valueSetUrl}' has ambiguous structure: {firstIssue.Reason}",
                    Details = new Dictionary<string, object>
                    {
                        ["profile"] = constraint.SourceProfile,
                        ["elementPath"] = constraint.ElementPath,
                        ["valueSetUrl"] = valueSetUrl,
                        ["reason"] = firstIssue.Reason.ToString(),
                        ["bindingStrength"] = "required",
                        ["policyMode"] = SdEnforcementPolicy.CurrentMode.ToString(),
                        ["violationReason"] = firstIssue.Reason.ToString(),
                        ["issueCount"] = expansionResult.Issues.Count
                    }
                };
            }
        }
        else
        {
            // No explicit codes - treat as ambiguity
            if (expansionResult.Issues.Any())
            {
                var firstIssue = expansionResult.Issues.First();
                var severity = SdEnforcementPolicy.ResolveSeverity(
                    SdConstraintKind.RequiredBinding,
                    firstIssue.Reason);

                return new ValidationError
                {
                    Source = "StructureDefinition",
                    Severity = severity,
                    ErrorCode = "SD_REQUIRED_BINDING_AMBIGUOUS_VALUESET",
                    Path = constraint.ElementPath,
                    Message = $"Required binding ValueSet '{valueSetUrl}' has ambiguous structure: {firstIssue.Reason}",
                    Details = new Dictionary<string, object>
                    {
                        ["profile"] = constraint.SourceProfile,
                        ["elementPath"] = constraint.ElementPath,
                        ["valueSetUrl"] = valueSetUrl,
                        ["reason"] = firstIssue.Reason.ToString(),
                        ["bindingStrength"] = "required",
                        ["policyMode"] = SdEnforcementPolicy.CurrentMode.ToString(),
                        ["violationReason"] = firstIssue.Reason.ToString(),
                        ["issueCount"] = expansionResult.Issues.Count
                    }
                };
            }
            else
            {
                // No codes and no issues - empty ValueSet (treat as error)
                return new ValidationError
                {
                    Source = "StructureDefinition",
                    Severity = "error",
                    ErrorCode = "SD_REQUIRED_BINDING_AMBIGUOUS_VALUESET",
                    Path = constraint.ElementPath,
                    Message = $"Required binding ValueSet '{valueSetUrl}' is empty",
                    Details = new Dictionary<string, object>
                    {
                        ["profile"] = constraint.SourceProfile,
                        ["elementPath"] = constraint.ElementPath,
                        ["valueSetUrl"] = valueSetUrl,
                        ["reason"] = "empty-valueset",
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
    /// Phase 3.4: Added support for enum values and Code<T> (e.g., Bundle.Type, Bundle.TypeElement)
    /// </summary>
    private (string? Code, string? System)? ExtractCodedValue(object? value)
    {
        if (value == null) return null;

        // Phase 3.4: Check if this is a Code<T> type (e.g., Code<Bundle.BundleType>)
        var valueType = value.GetType();
        if (valueType.IsGenericType && valueType.GetGenericTypeDefinition() == typeof(Code<>))
        {
            // Get the Value property which returns the enum
            var valueProperty = valueType.GetProperty("Value");
            if (valueProperty != null)
            {
                var enumValue = valueProperty.GetValue(value);
                if (enumValue is Enum en)
                {
                    return (Hl7.Fhir.Utility.EnumUtility.GetLiteral(en), null);
                }
            }
            // If Value is null or not an enum, try getting the string value directly
            if (value is Code code)
            {
                return (code.Value, null);
            }
        }

        (string? Code, string? System)? result = value switch
        {
            Code code => (code.Value, null), // Code primitive doesn't carry system
            Coding coding => (coding.Code, coding.System),
            CodeableConcept concept => concept.Coding?.FirstOrDefault() is Coding c ? (c.Code, c.System) : null,
            // Phase 3.4: Handle enum values using Firely's EnumUtility to get FHIR literal
            Enum enumValue => (Hl7.Fhir.Utility.EnumUtility.GetLiteral(enumValue), null),
            _ => null
        };
        return result;
    }
}
