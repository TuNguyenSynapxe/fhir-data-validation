using Hl7.Fhir.Model;
using Microsoft.Extensions.Logging;

namespace Pss.FhirProcessor.Engine.SdValidation;

/// <summary>
/// Phase 2.2: Extracts explicit constraints from StructureDefinition snapshots.
/// 
/// This is a PURE EXTRACTOR, NOT A VALIDATOR.
/// - Reads SD.snapshot.element[]
/// - Converts to SdConstraint objects
/// - No POCO mutation
/// - No validation decisions
/// 
/// Firely provides the SD, we extract what we understand.
/// </summary>
public class SdConstraintExtractor
{
    private readonly ILogger<SdConstraintExtractor> _logger;

    public SdConstraintExtractor(ILogger<SdConstraintExtractor> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// Extracts all recognized constraints from a StructureDefinition.
    /// 
    /// Phase 2.2: Extracts all constraint kinds, enforcement policy applied elsewhere.
    /// </summary>
    public IReadOnlyList<SdConstraint> ExtractConstraints(Hl7.Fhir.Model.StructureDefinition sd)
    {
        if (sd == null) throw new ArgumentNullException(nameof(sd));

        if (sd.Snapshot == null || sd.Snapshot.Element.Count == 0)
        {
            _logger.LogWarning(
                "StructureDefinition {Url} has no snapshot, cannot extract constraints",
                sd.Url);
            return Array.Empty<SdConstraint>();
        }

        var constraints = new List<SdConstraint>();

        _logger.LogDebug(
            "Extracting constraints from {Url} ({ElementCount} elements)",
            sd.Url,
            sd.Snapshot.Element.Count);

        foreach (var element in sd.Snapshot.Element)
        {
            // Extract cardinality constraints
            if (HasCardinalityConstraint(element))
            {
                constraints.Add(ExtractCardinalityConstraint(element, sd.Url));
            }

            // Extract fixed value constraints
            if (HasFixedValueConstraint(element))
            {
                constraints.Add(ExtractFixedValueConstraint(element, sd.Url));
            }

            // Extract required binding constraints
            if (HasRequiredBindingConstraint(element))
            {
                constraints.Add(ExtractRequiredBindingConstraint(element, sd.Url));
            }

            // Extract pattern constraints (deferred, but still extract)
            if (HasPatternConstraint(element))
            {
                constraints.Add(ExtractPatternConstraint(element, sd.Url));
            }

            // Extract invariants (deferred, but still extract)
            if (element.Constraint != null)
            {
                foreach (var invariant in element.Constraint)
                {
                    constraints.Add(ExtractInvariantConstraint(element, invariant, sd.Url));
                }
            }
        }

        _logger.LogInformation(
            "Extracted {Count} constraints from {Url}",
            constraints.Count,
            sd.Url);

        return constraints;
    }

    private bool HasCardinalityConstraint(ElementDefinition element)
    {
        // Cardinality is always present, but we only care about non-default constraints
        // Default is 0..* (unbounded), so we check for restrictions
        return element.Min.HasValue && element.Min.Value > 0
            || !string.IsNullOrEmpty(element.Max) && element.Max != "*";
    }

    private SdConstraint ExtractCardinalityConstraint(ElementDefinition element, string sourceProfile)
    {
        int min = element.Min ?? 0;
        int? max = element.Max == "*" ? null : int.TryParse(element.Max, out var m) ? m : null;

        return new SdConstraint(
            elementPath: element.Path,
            kind: SdConstraintKind.Cardinality,
            expected: (min, max),
            sourceProfile: sourceProfile,
            description: $"Cardinality {min}..{element.Max}"
        );
    }

    private bool HasFixedValueConstraint(ElementDefinition element)
    {
        // Check for fixed[x] elements
        return element.Fixed != null;
    }

    private SdConstraint ExtractFixedValueConstraint(ElementDefinition element, string sourceProfile)
    {
        return new SdConstraint(
            elementPath: element.Path,
            kind: SdConstraintKind.FixedValue,
            expected: element.Fixed!,
            sourceProfile: sourceProfile,
            description: $"Fixed value: {GetValueString(element.Fixed)}"
        );
    }

    private bool HasRequiredBindingConstraint(ElementDefinition element)
    {
        return element.Binding != null
            && element.Binding.Strength == BindingStrength.Required
            && !string.IsNullOrEmpty(element.Binding.ValueSet);
    }

    private SdConstraint ExtractRequiredBindingConstraint(ElementDefinition element, string sourceProfile)
    {
        var valueSetUrl = element.Binding!.ValueSet!;

        return new SdConstraint(
            elementPath: element.Path,
            kind: SdConstraintKind.RequiredBinding,
            expected: valueSetUrl,
            sourceProfile: sourceProfile,
            description: $"Required binding: {valueSetUrl}"
        );
    }

    private bool HasPatternConstraint(ElementDefinition element)
    {
        return element.Pattern != null;
    }

    private SdConstraint ExtractPatternConstraint(ElementDefinition element, string sourceProfile)
    {
        return new SdConstraint(
            elementPath: element.Path,
            kind: SdConstraintKind.Pattern,
            expected: element.Pattern!,
            sourceProfile: sourceProfile,
            description: $"Pattern: {GetValueString(element.Pattern)}"
        );
    }

    private SdConstraint ExtractInvariantConstraint(
        ElementDefinition element,
        ElementDefinition.ConstraintComponent invariant,
        string sourceProfile)
    {
        return new SdConstraint(
            elementPath: element.Path,
            kind: SdConstraintKind.Invariant,
            expected: (invariant.Key, invariant.Expression ?? "(no expression)"),
            sourceProfile: sourceProfile,
            description: invariant.Human
        );
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
