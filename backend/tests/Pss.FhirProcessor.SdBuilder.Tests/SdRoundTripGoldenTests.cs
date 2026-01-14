using Hl7.Fhir.Model;
using Hl7.Fhir.Specification.Source;
using Pss.FhirProcessor.SdBuilder.Domain;
using Pss.FhirProcessor.SdBuilder.Engine;
using Pss.FhirProcessor.SdBuilder.Export;
using Xunit;

namespace Pss.FhirProcessor.SdBuilder.Tests;

/// <summary>
/// Tests for round-trip import/export of StructureDefinitions.
/// Verifies that Import → Export produces semantically equivalent output.
/// </summary>
public sealed class SdRoundTripGoldenTests
{
    private static StructureDefinition GetObservationStructureDefinition()
    {
        // Load Observation StructureDefinition from Firely SDK
        var resolver = ZipSource.CreateValidationSource();
        var observationSd = resolver.ResolveByCanonicalUri("http://hl7.org/fhir/StructureDefinition/Observation") as StructureDefinition;
        
        if (observationSd == null)
        {
            throw new InvalidOperationException("Failed to load Observation StructureDefinition");
        }

        return observationSd;
    }

    [Fact]
    public void RoundTrip_BPObservationProfile_PreservesSemanticEquivalence()
    {
        // Arrange - Create a BP Observation profile with slicing and child constraints
        var baseObservation = GetObservationStructureDefinition();
        
        var bpProfile = new StructureDefinition
        {
            Url = "http://example.org/fhir/StructureDefinition/BPObservation",
            Name = "BPObservation",
            Title = "Blood Pressure Observation",
            Status = PublicationStatus.Draft,
            Type = "Observation",
            BaseDefinition = "http://hl7.org/fhir/StructureDefinition/Observation",
            Derivation = StructureDefinition.TypeDerivationRule.Constraint,
            Differential = new StructureDefinition.DifferentialComponent
            {
                Element = new List<ElementDefinition>
                {
                    // Slicing parent
                    new ElementDefinition
                    {
                        Path = "Observation.component",
                        ElementId = "Observation.component",
                        Slicing = new ElementDefinition.SlicingComponent
                        {
                            Ordered = false,
                            Rules = ElementDefinition.SlicingRules.Closed,
                            Discriminator = new List<ElementDefinition.DiscriminatorComponent>
                            {
                                new ElementDefinition.DiscriminatorComponent
                                {
                                    Type = ElementDefinition.DiscriminatorType.Pattern,
                                    Path = "code"
                                }
                            }
                        }
                    },
                    // Systolic slice root
                    new ElementDefinition
                    {
                        Path = "Observation.component",
                        ElementId = "Observation.component:systolic",
                        SliceName = "systolic",
                        Min = 1,
                        Max = "1"
                    },
                    // Systolic child: valueQuantity.value
                    new ElementDefinition
                    {
                        Path = "Observation.component.valueQuantity.value",
                        ElementId = "Observation.component:systolic.valueQuantity.value",
                        Min = 1,
                        Max = "1"
                    },
                    // Systolic child: valueQuantity.unit
                    new ElementDefinition
                    {
                        Path = "Observation.component.valueQuantity.unit",
                        ElementId = "Observation.component:systolic.valueQuantity.unit",
                        Min = 1,
                        Max = "1"
                    },
                    // Diastolic slice root
                    new ElementDefinition
                    {
                        Path = "Observation.component",
                        ElementId = "Observation.component:diastolic",
                        SliceName = "diastolic",
                        Min = 1,
                        Max = "1"
                    },
                    // Diastolic child: valueQuantity.value
                    new ElementDefinition
                    {
                        Path = "Observation.component.valueQuantity.value",
                        ElementId = "Observation.component:diastolic.valueQuantity.value",
                        Min = 1,
                        Max = "1"
                    },
                    // Diastolic child: valueQuantity.unit
                    new ElementDefinition
                    {
                        Path = "Observation.component.valueQuantity.unit",
                        ElementId = "Observation.component:diastolic.valueQuantity.unit",
                        Min = 1,
                        Max = "1"
                    }
                }
            }
        };

        // Act - Import and then Export
        var importer = new SdImportEngine();
        var designState = importer.Import(baseObservation, bpProfile);
        
        var metadata = new SdMetadata
        {
            Url = "http://example.org/fhir/StructureDefinition/BPObservation",
            Name = "BPObservation",
            Version = "1.0.0",
            Status = "draft",
            Description = "Blood Pressure Observation Profile"
        };
        
        var exported = SdExporter.Export(designState, baseObservation, metadata);

        // Assert - Verify semantic equivalence
        Assert.NotNull(exported);
        Assert.NotNull(exported.Differential);
        Assert.NotNull(exported.Differential.Element);

        var diffElements = exported.Differential.Element;

        // 1. Verify slice names are preserved
        var componentElement = designState.Elements.FirstOrDefault(e => e.Path == "Observation.component");
        Assert.NotNull(componentElement);
        Assert.Contains("systolic", componentElement.Slices.Keys);
        Assert.Contains("diastolic", componentElement.Slices.Keys);

        // 2. Verify slicing configuration
        var slicingParent = diffElements.FirstOrDefault(e => e.Path == "Observation.component" && e.Slicing != null);
        Assert.NotNull(slicingParent);
        Assert.False(slicingParent.Slicing.Ordered);
        Assert.Equal(ElementDefinition.SlicingRules.Closed, slicingParent.Slicing.Rules);
        Assert.Single(slicingParent.Slicing.Discriminator);
        Assert.Equal(ElementDefinition.DiscriminatorType.Pattern, slicingParent.Slicing.Discriminator[0].Type);
        Assert.Equal("code", slicingParent.Slicing.Discriminator[0].Path);

        // 3. Verify slice roots with cardinality
        var systolicRoot = diffElements.FirstOrDefault(e => e.ElementId == "Observation.component:systolic");
        Assert.NotNull(systolicRoot);
        Assert.Equal(1, systolicRoot.Min);
        Assert.Equal("1", systolicRoot.Max);

        var diastolicRoot = diffElements.FirstOrDefault(e => e.ElementId == "Observation.component:diastolic");
        Assert.NotNull(diastolicRoot);
        Assert.Equal(1, diastolicRoot.Min);
        Assert.Equal("1", diastolicRoot.Max);

        // 4. Verify child constraints are preserved
        var systolicValueChild = diffElements.FirstOrDefault(e => e.ElementId == "Observation.component:systolic.valueQuantity.value");
        Assert.NotNull(systolicValueChild);
        Assert.Equal(1, systolicValueChild.Min);
        Assert.Equal("1", systolicValueChild.Max);

        var systolicUnitChild = diffElements.FirstOrDefault(e => e.ElementId == "Observation.component:systolic.valueQuantity.unit");
        Assert.NotNull(systolicUnitChild);
        Assert.Equal(1, systolicUnitChild.Min);
        Assert.Equal("1", systolicUnitChild.Max);

        var diastolicValueChild = diffElements.FirstOrDefault(e => e.ElementId == "Observation.component:diastolic.valueQuantity.value");
        Assert.NotNull(diastolicValueChild);
        Assert.Equal(1, diastolicValueChild.Min);
        Assert.Equal("1", diastolicValueChild.Max);

        var diastolicUnitChild = diffElements.FirstOrDefault(e => e.ElementId == "Observation.component:diastolic.valueQuantity.unit");
        Assert.NotNull(diastolicUnitChild);
        Assert.Equal(1, diastolicUnitChild.Min);
        Assert.Equal("1", diastolicUnitChild.Max);

        // 5. Verify deterministic ordering
        var componentElements = diffElements.Where(e => e.Path?.StartsWith("Observation.component") == true).ToList();
        
        // Expected order:
        // 1. Slicing parent (Observation.component with slicing)
        // 2. diastolic slice root
        // 3. diastolic.valueQuantity.unit (alphabetical child)
        // 4. diastolic.valueQuantity.value (alphabetical child)
        // 5. systolic slice root
        // 6. systolic.valueQuantity.unit (alphabetical child)
        // 7. systolic.valueQuantity.value (alphabetical child)

        Assert.Equal(7, componentElements.Count);
        Assert.Equal("Observation.component", componentElements[0].ElementId); // Slicing parent
        Assert.NotNull(componentElements[0].Slicing); // Slicing parent has slicing config
        Assert.Equal("Observation.component:diastolic", componentElements[1].ElementId); // Diastolic root
        Assert.Equal("Observation.component:diastolic.valueQuantity.unit", componentElements[2].ElementId); // Alphabetical
        Assert.Equal("Observation.component:diastolic.valueQuantity.value", componentElements[3].ElementId); // Alphabetical
        Assert.Equal("Observation.component:systolic", componentElements[4].ElementId); // Systolic root
        Assert.Equal("Observation.component:systolic.valueQuantity.unit", componentElements[5].ElementId); // Alphabetical
        Assert.Equal("Observation.component:systolic.valueQuantity.value", componentElements[6].ElementId); // Alphabetical
    }
}
