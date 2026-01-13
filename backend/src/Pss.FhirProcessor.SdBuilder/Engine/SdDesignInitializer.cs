using Hl7.Fhir.Model;
using Pss.FhirProcessor.SdBuilder.Domain;

namespace Pss.FhirProcessor.SdBuilder.Engine;

/// <summary>
/// Initializes ResourceDesignState from a base StructureDefinition.
/// </summary>
public sealed class SdDesignInitializer
{
    /// <summary>
    /// Creates a ResourceDesignState from a base FHIR core resource StructureDefinition.
    /// </summary>
    /// <param name="resourceType">Resource type name (e.g., "Patient").</param>
    /// <param name="baseSd">Base StructureDefinition with snapshot.</param>
    /// <param name="startMode">Minimal or Full initialization mode.</param>
    /// <returns>Initialized ResourceDesignState.</returns>
    public static ResourceDesignState Create(
        string resourceType,
        StructureDefinition baseSd,
        VisibilityMode startMode)
    {
        if (baseSd.Snapshot?.Element == null || baseSd.Snapshot.Element.Count == 0)
        {
            throw new InvalidOperationException("Base StructureDefinition must have snapshot.element.");
        }

        var designState = new ResourceDesignState
        {
            ResourceType = resourceType,
            BaseCanonicalUrl = baseSd.Url ?? string.Empty,
            VisibilityMode = VisibilityMode.Minimal
        };

        foreach (var element in baseSd.Snapshot.Element)
        {
            var elementDesign = new ElementDesignState
            {
                Path = element.Path ?? string.Empty,
                BaseCardinality = new Domain.Cardinality(
                    element.Min ?? 0,
                    element.Max ?? "*"
                ),
                BaseTypeCode = element.Type?.FirstOrDefault()?.Code ?? string.Empty,
                IsIncluded = DetermineInclusion(element, startMode),
                OverrideCardinality = null,
                Binding = null,
                Extensions = new List<ExtensionConfig>()
            };

            designState.Elements.Add(elementDesign);
        }

        return designState;
    }

    private static bool DetermineInclusion(ElementDefinition element, VisibilityMode startMode)
    {
        var baseMin = element.Min ?? 0;

        // Required elements (min >= 1) are always included
        if (baseMin >= 1)
        {
            return true;
        }

        // Optional elements (min == 0) depend on start mode
        return startMode == VisibilityMode.Full;
    }
}
