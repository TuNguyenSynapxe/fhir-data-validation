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

        // Separate sliced and non-sliced elements for proper ordering
        var nonSlicedElements = design.Elements.Where(e => e.Slicing == null && e.Slices.Count == 0).ToList();
        var slicedElements = design.Elements.Where(e => e.Slicing != null || e.Slices.Count > 0).ToList();

        // Phase 1: Non-slicing elements
        foreach (var element in nonSlicedElements)
        {
            var baseElement = baseSd.Snapshot.Element.FirstOrDefault(e => e.Path == element.Path);
            if (baseElement == null) continue;

            var diffElement = CreateDifferentialElement(element, baseElement);
            if (diffElement != null)
            {
                differential.Add(diffElement);
            }
        }

        // Phase 2: Slicing parents and slice roots (sorted)
        var sortedSlicedElements = slicedElements.OrderBy(e => e.Path, StringComparer.Ordinal).ToList();

        foreach (var element in sortedSlicedElements)
        {
            // Emit slicing parent element
            if (element.Slicing != null)
            {
                var slicingParent = CreateSlicingParentElement(element);
                differential.Add(slicingParent);
            }

            // Emit slice root elements (sorted by slice name)
            var sortedSlices = element.Slices.OrderBy(kvp => kvp.Key, StringComparer.Ordinal).ToList();
            
            foreach (var (sliceName, slice) in sortedSlices)
            {
                var sliceRoot = CreateSliceRootElement(element.Path, slice);
                differential.Add(sliceRoot);

                // Phase 2.2: Emit slice child constraint elements (sorted)
                var sortedChildren = slice.ChildConstraints
                    .OrderBy(c => c.ElementPath, StringComparer.Ordinal)
                    .ToList();

                foreach (var child in sortedChildren)
                {
                    var childElement = CreateSliceChildElement(element.Path, slice, child);
                    if (childElement != null)
                    {
                        differential.Add(childElement);
                    }
                }
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

        var hasBindingConstraint = element.OverrideBinding != null;

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

        // Write binding if present (only write overrides, not base)
        if (hasBindingConstraint)
        {
            diffElement.Binding = new ElementDefinition.ElementDefinitionBindingComponent
            {
                Strength = MapBindingStrength(element.OverrideBinding!.Strength),
                ValueSet = element.OverrideBinding.ValueSetUrl
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

    private static ElementDefinition CreateSlicingParentElement(ElementDesignState element)
    {
        var slicingParent = new ElementDefinition
        {
            ElementId = element.Path,
            Path = element.Path,
            Slicing = new ElementDefinition.SlicingComponent
            {
                Ordered = element.Slicing!.Ordered,
                Rules = MapSlicingRules(element.Slicing.Rules)
            }
        };

        // Add discriminators
        foreach (var discriminator in element.Slicing.Discriminators)
        {
            slicingParent.Slicing.Discriminator.Add(new ElementDefinition.DiscriminatorComponent
            {
                Type = MapDiscriminatorType(discriminator.Type),
                Path = discriminator.Path
            });
        }

        return slicingParent;
    }

    private static ElementDefinition CreateSliceRootElement(string slicedPath, SliceDesignState slice)
    {
        var sliceRoot = new ElementDefinition
        {
            ElementId = $"{slicedPath}:{slice.SliceName}",
            Path = slicedPath,
            SliceName = slice.SliceName
        };

        // Emit cardinality only if override exists
        if (slice.OverrideCardinality != null)
        {
            sliceRoot.Min = slice.OverrideCardinality.Min;
            sliceRoot.Max = slice.OverrideCardinality.Max;
        }

        // Emit binding if present
        if (slice.Binding != null)
        {
            sliceRoot.Binding = new ElementDefinition.ElementDefinitionBindingComponent
            {
                Strength = MapBindingStrength(slice.Binding.Strength),
                ValueSet = slice.Binding.ValueSetUrl
            };
        }

        return sliceRoot;
    }

    // ============================================
    // Phase 2.2: Slice Child Element Export
    // ============================================

    private static ElementDefinition? CreateSliceChildElement(
        string parentPath,
        SliceDesignState slice,
        SliceElementConstraint constraint)
    {
        // Only emit if there are actual constraints
        var hasConstraint = constraint.CardinalityOverride != null ||
                          constraint.Binding != null ||
                          constraint.FixedValue != null ||
                          constraint.PatternValue != null;

        if (!hasConstraint)
            return null;

        // Construct full path: parentPath.relativePath
        var fullPath = $"{parentPath}.{constraint.ElementPath}";

        var element = new ElementDefinition
        {
            ElementId = $"{parentPath}:{slice.SliceName}.{constraint.ElementPath}",
            Path = fullPath
        };

        // Emit cardinality if overridden
        if (constraint.CardinalityOverride != null)
        {
            element.Min = constraint.CardinalityOverride.Min;
            element.Max = constraint.CardinalityOverride.Max;
        }

        // Emit binding if present
        if (constraint.Binding != null)
        {
            element.Binding = new ElementDefinition.ElementDefinitionBindingComponent
            {
                Strength = MapBindingStrength(constraint.Binding.Strength),
                ValueSet = constraint.Binding.ValueSetUrl
            };
        }

        // Note: Fixed/Pattern values would be emitted here in a full implementation
        // For now we store them but don't serialize (requires type-specific handling)

        return element;
    }

    private static ElementDefinition.SlicingRules MapSlicingRules(SlicingRules rules)
    {
        return rules switch
        {
            SlicingRules.Open => ElementDefinition.SlicingRules.Open,
            SlicingRules.Closed => ElementDefinition.SlicingRules.Closed,
            SlicingRules.OpenAtEnd => ElementDefinition.SlicingRules.OpenAtEnd,
            _ => ElementDefinition.SlicingRules.Open
        };
    }

    private static ElementDefinition.DiscriminatorType MapDiscriminatorType(DiscriminatorType type)
    {
        return type switch
        {
            DiscriminatorType.Value => ElementDefinition.DiscriminatorType.Value,
            DiscriminatorType.Pattern => ElementDefinition.DiscriminatorType.Pattern,
            DiscriminatorType.Type => ElementDefinition.DiscriminatorType.Type,
            DiscriminatorType.Profile => ElementDefinition.DiscriminatorType.Profile,
            _ => ElementDefinition.DiscriminatorType.Value
        };
    }
}
