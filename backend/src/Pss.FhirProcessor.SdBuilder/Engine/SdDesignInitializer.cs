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
            // Extract type codes from ElementDefinition.Type (supports value[x])
            var typeCodes = element.Type?
                .Select(t => t.Code?.ToString() ?? string.Empty)
                .Where(code => !string.IsNullOrEmpty(code))
                .ToArray() ?? Array.Empty<string>();
            
            // Extract base binding from snapshot (if exists)
            BindingConfig? baseBinding = null;
            if (element.Binding != null)
            {
                baseBinding = new BindingConfig
                {
                    ValueSetUrl = element.Binding.ValueSet ?? string.Empty,
                    Strength = MapBindingStrength(element.Binding.Strength)
                };
            }
            
            var elementDesign = new ElementDesignState
            {
                Path = element.Path ?? string.Empty,
                BaseCardinality = new Domain.Cardinality(
                    element.Min ?? 0,
                    element.Max ?? "*"
                ),
                TypeCodes = typeCodes,
                IsIncluded = DetermineInclusion(element, startMode),
                OverrideCardinality = null,
                BaseBinding = baseBinding,
                OverrideBinding = null,
                Extensions = new List<ExtensionConfig>()
            };

            designState.Elements.Add(elementDesign);
        }

        return designState;
    }
    
    private static Domain.BindingStrength MapBindingStrength(Hl7.Fhir.Model.BindingStrength? fhirStrength)
    {
        return fhirStrength switch
        {
            Hl7.Fhir.Model.BindingStrength.Required => Domain.BindingStrength.Required,
            Hl7.Fhir.Model.BindingStrength.Extensible => Domain.BindingStrength.Extensible,
            Hl7.Fhir.Model.BindingStrength.Preferred => Domain.BindingStrength.Preferred,
            Hl7.Fhir.Model.BindingStrength.Example => Domain.BindingStrength.Preferred, // Map Example to Preferred
            _ => Domain.BindingStrength.Preferred // Default fallback
        };
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
