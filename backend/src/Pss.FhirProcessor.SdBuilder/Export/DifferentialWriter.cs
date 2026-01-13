namespace Pss.FhirProcessor.SdBuilder.Export;

using Hl7.Fhir.Model;
using Pss.FhirProcessor.SdBuilder.Domain;

/// <summary>
/// Writes differential elements (constraints only).
/// Emits elements ONLY when constraints differ from base.
/// </summary>
public static class DifferentialWriter
{
    /// <summary>
    /// Generates differential elements from design state compared to base snapshot.
    /// </summary>
    /// <param name="design">The design state.</param>
    /// <param name="baseSd">The base StructureDefinition with snapshot.</param>
    /// <returns>List of differential elements (empty if no constraints).</returns>
    public static List<ElementDefinition> GenerateDifferential(
        ResourceDesignState design,
        StructureDefinition baseSd)
    {
        if (design == null) throw new ArgumentNullException(nameof(design));
        if (baseSd == null) throw new ArgumentNullException(nameof(baseSd));
        if (baseSd.Snapshot?.Element == null)
            throw new InvalidOperationException("Base StructureDefinition must have snapshot");

        var differential = new List<ElementDefinition>();

        foreach (var element in design.Elements)
        {
            var baseElement = baseSd.Snapshot.Element.FirstOrDefault(e => e.Path == element.Path);
            if (baseElement == null) continue; // Should not happen if design state is valid

            var diffElement = CreateDifferentialElement(element, baseElement);
            if (diffElement != null)
            {
                differential.Add(diffElement);
            }
        }

        return differential;
    }

    private static ElementDefinition? CreateDifferentialElement(
        ElementDesignState element,
        ElementDefinition baseElement)
    {
        var effectiveCardinality = GetEffectiveCardinality(element);
        var baseMin = baseElement.Min ?? 0;
        var baseMax = baseElement.Max ?? "*";

        var hasCardinalityConstraint = 
            effectiveCardinality.Min != baseMin || 
            effectiveCardinality.Max != baseMax;

        var hasBindingConstraint = element.Binding != null;

        // Only emit differential element if there are actual constraints
        if (!hasCardinalityConstraint && !hasBindingConstraint)
        {
            return null;
        }

        var diffElement = new ElementDefinition
        {
            Path = element.Path
        };

        // Write cardinality only if different from base
        if (hasCardinalityConstraint)
        {
            diffElement.Min = effectiveCardinality.Min;
            diffElement.Max = effectiveCardinality.Max;
        }

        // Write binding if present
        if (hasBindingConstraint)
        {
            diffElement.Binding = new ElementDefinition.ElementDefinitionBindingComponent
            {
                Strength = MapBindingStrength(element.Binding!.Strength),
                ValueSet = element.Binding.ValueSetUrl
            };
        }

        return diffElement;
    }

    private static Cardinality GetEffectiveCardinality(ElementDesignState element)
    {
        // Priority: Override > Exclusion > Base
        if (element.OverrideCardinality != null)
        {
            return element.OverrideCardinality;
        }

        if (!element.IsIncluded)
        {
            return new Cardinality(0, "0"); // Excluded
        }

        return element.BaseCardinality; // Inherit base
    }

    private static Hl7.Fhir.Model.BindingStrength? MapBindingStrength(Domain.BindingStrength strength)
    {
        return strength switch
        {
            Domain.BindingStrength.Required => Hl7.Fhir.Model.BindingStrength.Required,
            Domain.BindingStrength.Extensible => Hl7.Fhir.Model.BindingStrength.Extensible,
            Domain.BindingStrength.Preferred => Hl7.Fhir.Model.BindingStrength.Preferred,
            _ => null
        };
    }
}
