using Hl7.Fhir.Model;
using Microsoft.Extensions.Logging;
using Pss.FhirProcessor.Engine.Firely;
using Pss.FhirProcessor.Engine.Models;
using Pss.FhirProcessor.Engine.SdValidation.PathResolution;

namespace Pss.FhirProcessor.Engine.SdValidation.Validators;

/// <summary>
/// Phase 2.3: Validates pattern[x] constraints.
/// Phase 3.1.1: Migrated to use generic path resolution.
/// Phase 3.3: Extended with complex datatype structural pattern matching.
/// 
/// Pattern semantics: "actual MUST contain at least the structure and values in pattern"
/// Engine-owned validator using Firely metadata.
/// </summary>
public class PatternValueValidator
{
    private readonly ILogger<PatternValueValidator> _logger;
    private readonly IElementPathResolver _pathResolver;

    public PatternValueValidator(
        ILogger<PatternValueValidator> logger,
        IElementPathResolver pathResolver)
    {
        _logger = logger;
        _pathResolver = pathResolver;
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

        // Navigate to element in Bundle POCO using path resolver
        var contexts = _pathResolver.ResolveValues(
            context.Bundle,
            constraint.ElementPath,
            context.ModelInspector);

        // For patterns, we expect at least one value
        var resolvedValues = contexts.Where(c => !c.IsMissing).ToList();

        if (resolvedValues.Count == 0)
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

        // Validate resolved values
        // For collections (resolvedValues.Count > 1), check if AT LEAST ONE matches pattern
        // For single values, the one value must match
        
        if (resolvedValues.Count > 1)
        {
            // Collection: Check if at least one element matches pattern
            bool anyMatches = false;
            foreach (var ctx in resolvedValues)
            {
                var actualValue = ctx.Value as DataType;
                if (actualValue != null && PatternMatches(expectedPattern, actualValue))
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
                    ErrorCode = "SD_PATTERN_MISMATCH",
                    Path = constraint.ElementPath,
                    Message = $"Element must match pattern '{GetValueString(expectedPattern)}', found '{GetValueString(firstActual!)}'",
                    Details = new Dictionary<string, object>
                    {
                        ["profile"] = constraint.SourceProfile,
                        ["elementPath"] = constraint.ElementPath,
                        ["expectedPattern"] = GetValueString(expectedPattern),
                        ["actualValue"] = GetValueString(firstActual!)
                    }
                };
            }
        }
        else
        {
            // Single value: Must match pattern
            var actualValue = resolvedValues[0].Value as DataType;
            if (actualValue == null)
            {
                return null; // Already handled by count check above
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
        }

        return null; // No violation
    }

    /// <summary>
    /// Checks if actual value matches expected pattern.
    /// Phase 2.3: Primitive values - exact equality check.
    /// Phase 3.3: Complex datatypes - structural containment check.
    /// </summary>
    private bool PatternMatches(DataType expectedPattern, DataType actualValue)
    {
        return (expectedPattern, actualValue) switch
        {
            // Primitives (Phase 2.3) - exact equality
            (Code e, Code a) => string.Equals(e.Value, a.Value, StringComparison.Ordinal),
            (FhirString e, FhirString a) => string.Equals(e.Value, a.Value, StringComparison.Ordinal),
            (Integer e, Integer a) => e.Value == a.Value,
            (FhirBoolean e, FhirBoolean a) => e.Value == a.Value,

            // Complex types (Phase 3.3) - structural pattern matching
            (Coding e, Coding a) => MatchesCodingPattern(e, a),
            (CodeableConcept e, CodeableConcept a) => MatchesCodeableConceptPattern(e, a),
            (Quantity e, Quantity a) => MatchesQuantityPattern(e, a),
            (Identifier e, Identifier a) => MatchesIdentifierPattern(e, a),
            (HumanName e, HumanName a) => MatchesHumanNamePattern(e, a),
            (Address e, Address a) => MatchesAddressPattern(e, a),

            _ => false
        };
    }

    /// <summary>
    /// Phase 3.3: Pattern match for Coding.
    /// Actual must contain all fields present in pattern.
    /// </summary>
    private bool MatchesCodingPattern(Coding pattern, Coding actual)
    {
        if (!string.IsNullOrEmpty(pattern.System) &&
            !string.Equals(pattern.System, actual.System, StringComparison.Ordinal))
            return false;

        if (!string.IsNullOrEmpty(pattern.Code) &&
            !string.Equals(pattern.Code, actual.Code, StringComparison.Ordinal))
            return false;

        if (!string.IsNullOrEmpty(pattern.Version) &&
            !string.Equals(pattern.Version, actual.Version, StringComparison.Ordinal))
            return false;

        if (!string.IsNullOrEmpty(pattern.Display) &&
            !string.Equals(pattern.Display, actual.Display, StringComparison.Ordinal))
            return false;

        return true;
    }

    /// <summary>
    /// Phase 3.3: Pattern match for CodeableConcept.
    /// ANY coding in actual must match ANY coding in pattern.
    /// </summary>
    private bool MatchesCodeableConceptPattern(CodeableConcept pattern, CodeableConcept actual)
    {
        // Check text if present in pattern
        if (!string.IsNullOrEmpty(pattern.Text) &&
            !string.Equals(pattern.Text, actual.Text, StringComparison.Ordinal))
            return false;

        // If pattern has codings, at least one must match
        if (pattern.Coding != null && pattern.Coding.Any())
        {
            if (actual.Coding == null || !actual.Coding.Any())
                return false;

            // Check if ANY pattern coding matches ANY actual coding
            foreach (var patternCoding in pattern.Coding)
            {
                foreach (var actualCoding in actual.Coding)
                {
                    if (MatchesCodingPattern(patternCoding, actualCoding))
                        return true;
                }
            }
            return false;
        }

        return true;
    }

    /// <summary>
    /// Phase 3.3: Pattern match for Quantity.
    /// Actual must contain all fields present in pattern.
    /// </summary>
    private bool MatchesQuantityPattern(Quantity pattern, Quantity actual)
    {
        if (pattern.Value.HasValue && pattern.Value != actual.Value)
            return false;

        if (!string.IsNullOrEmpty(pattern.System) &&
            !string.Equals(pattern.System, actual.System, StringComparison.Ordinal))
            return false;

        if (!string.IsNullOrEmpty(pattern.Code) &&
            !string.Equals(pattern.Code, actual.Code, StringComparison.Ordinal))
            return false;

        if (!string.IsNullOrEmpty(pattern.Unit) &&
            !string.Equals(pattern.Unit, actual.Unit, StringComparison.Ordinal))
            return false;

        return true;
    }

    /// <summary>
    /// Phase 3.3: Pattern match for Identifier.
    /// Actual must contain all fields present in pattern.
    /// </summary>
    private bool MatchesIdentifierPattern(Identifier pattern, Identifier actual)
    {
        if (!string.IsNullOrEmpty(pattern.System) &&
            !string.Equals(pattern.System, actual.System, StringComparison.Ordinal))
            return false;

        if (!string.IsNullOrEmpty(pattern.Value) &&
            !string.Equals(pattern.Value, actual.Value, StringComparison.Ordinal))
            return false;

        return true;
    }

    /// <summary>
    /// Phase 3.3: Pattern match for HumanName.
    /// Actual must contain all fields present in pattern.
    /// Order of given[] does NOT matter.
    /// </summary>
    private bool MatchesHumanNamePattern(HumanName pattern, HumanName actual)
    {
        if (pattern.Use.HasValue && pattern.Use != actual.Use)
            return false;

        if (!string.IsNullOrEmpty(pattern.Family) &&
            !string.Equals(pattern.Family, actual.Family, StringComparison.Ordinal))
            return false;

        if (!string.IsNullOrEmpty(pattern.Text) &&
            !string.Equals(pattern.Text, actual.Text, StringComparison.Ordinal))
            return false;

        // Check given[] - every pattern given must exist in actual (order doesn't matter)
        if (pattern.Given != null && pattern.Given.Any())
        {
            if (actual.Given == null)
                return false;

            var actualGivenSet = actual.Given.ToHashSet(StringComparer.Ordinal);
            foreach (var patternGiven in pattern.Given)
            {
                if (!actualGivenSet.Contains(patternGiven))
                    return false;
            }
        }

        return true;
    }

    /// <summary>
    /// Phase 3.3: Pattern match for Address.
    /// Actual must contain all fields present in pattern.
    /// Every pattern line[] must exist in actual.
    /// </summary>
    private bool MatchesAddressPattern(Address pattern, Address actual)
    {
        if (pattern.Use.HasValue && pattern.Use != actual.Use)
            return false;

        if (pattern.Type.HasValue && pattern.Type != actual.Type)
            return false;

        if (!string.IsNullOrEmpty(pattern.City) &&
            !string.Equals(pattern.City, actual.City, StringComparison.Ordinal))
            return false;

        if (!string.IsNullOrEmpty(pattern.District) &&
            !string.Equals(pattern.District, actual.District, StringComparison.Ordinal))
            return false;

        if (!string.IsNullOrEmpty(pattern.State) &&
            !string.Equals(pattern.State, actual.State, StringComparison.Ordinal))
            return false;

        if (!string.IsNullOrEmpty(pattern.PostalCode) &&
            !string.Equals(pattern.PostalCode, actual.PostalCode, StringComparison.Ordinal))
            return false;

        if (!string.IsNullOrEmpty(pattern.Country) &&
            !string.Equals(pattern.Country, actual.Country, StringComparison.Ordinal))
            return false;

        // Check line[] - every pattern line must exist in actual
        if (pattern.Line != null && pattern.Line.Any())
        {
            if (actual.Line == null)
                return false;

            var actualLineSet = actual.Line.ToHashSet(StringComparer.Ordinal);
            foreach (var patternLine in pattern.Line)
            {
                if (!actualLineSet.Contains(patternLine))
                    return false;
            }
        }

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
            CodeableConcept cc => cc.Text ?? cc.Coding?.FirstOrDefault()?.Code ?? "(empty concept)",
            Quantity q => $"{q.Value} {q.Unit ?? q.Code}",
            Identifier id => $"{id.System}|{id.Value}",
            HumanName hn => hn.Family ?? string.Join(" ", hn.Given ?? Enumerable.Empty<string>()),
            Address addr => addr.City ?? addr.PostalCode ?? "(address)",
            _ => value.ToString() ?? "(unknown)"
        };
    }
}
