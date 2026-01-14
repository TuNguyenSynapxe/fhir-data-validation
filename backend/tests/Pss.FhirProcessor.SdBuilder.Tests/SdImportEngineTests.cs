using Hl7.Fhir.Model;
using Hl7.Fhir.Specification.Source;
using Pss.FhirProcessor.SdBuilder.Domain;
using Pss.FhirProcessor.SdBuilder.Engine;
using Xunit;

namespace Pss.FhirProcessor.SdBuilder.Tests;

/// <summary>
/// Tests for SdImportEngine - Phase 3 Import functionality.
/// </summary>
public sealed class SdImportEngineTests
{
    private static StructureDefinition GetPatientStructureDefinition()
    {
        // Load Patient StructureDefinition from Firely SDK
        var resolver = ZipSource.CreateValidationSource();
        var patientSd = resolver.ResolveByCanonicalUri("http://hl7.org/fhir/StructureDefinition/Patient") as StructureDefinition;
        
        if (patientSd == null)
        {
            throw new InvalidOperationException("Failed to load Patient StructureDefinition");
        }

        return patientSd;
    }

    [Fact]
    public void Import_ExcludeElement_ResultsInIsIncludedFalse()
    {
        // Arrange
        var baseSd = GetPatientStructureDefinition();
        
        // Create profile SD that excludes Patient.photo (0..0)
        var profileSd = new StructureDefinition
        {
            Url = "http://example.org/fhir/StructureDefinition/TestPatient",
            Type = "Patient",
            BaseDefinition = "http://hl7.org/fhir/StructureDefinition/Patient",
            Derivation = StructureDefinition.TypeDerivationRule.Constraint,
            Differential = new StructureDefinition.DifferentialComponent
            {
                Element = new List<ElementDefinition>
                {
                    new ElementDefinition
                    {
                        Path = "Patient.photo",
                        Min = 0,
                        Max = "0" // Exclusion: 0..0
                    }
                }
            }
        };

        var importer = new SdImportEngine();

        // Act
        var designState = importer.Import(baseSd, profileSd);

        // Assert
        var photoElement = designState.Elements.FirstOrDefault(e => e.Path == "Patient.photo");
        Assert.NotNull(photoElement);
        Assert.False(photoElement.IsIncluded, "Element with 0..0 cardinality should have IsIncluded=false");
        Assert.Null(photoElement.OverrideCardinality); // No override stored for exclusions
    }

    [Fact]
    public void Import_CardinalityOverride_ResultsInOverride()
    {
        // Arrange
        var baseSd = GetPatientStructureDefinition();
        
        // Create profile SD that makes Patient.identifier mandatory (1..*)
        var profileSd = new StructureDefinition
        {
            Url = "http://example.org/fhir/StructureDefinition/TestPatient",
            Type = "Patient",
            BaseDefinition = "http://hl7.org/fhir/StructureDefinition/Patient",
            Derivation = StructureDefinition.TypeDerivationRule.Constraint,
            Differential = new StructureDefinition.DifferentialComponent
            {
                Element = new List<ElementDefinition>
                {
                    new ElementDefinition
                    {
                        Path = "Patient.identifier",
                        Min = 1, // Override: require at least one
                        Max = "*" // Unchanged from base
                    }
                }
            }
        };

        var importer = new SdImportEngine();

        // Act
        var designState = importer.Import(baseSd, profileSd);

        // Assert
        var identifierElement = designState.Elements.FirstOrDefault(e => e.Path == "Patient.identifier");
        Assert.NotNull(identifierElement);
        Assert.True(identifierElement.IsIncluded, "Element with cardinality override should be included");
        Assert.NotNull(identifierElement.OverrideCardinality);
        Assert.Equal(1, identifierElement.OverrideCardinality.Min);
        Assert.Equal("*", identifierElement.OverrideCardinality.Max);
    }

    [Fact]
    public void Import_NullInputs_ThrowsArgumentNullException()
    {
        // Arrange
        var baseSd = GetPatientStructureDefinition();
        var profileSd = new StructureDefinition
        {
            Url = "http://example.org/fhir/StructureDefinition/TestPatient",
            Type = "Patient",
            Derivation = StructureDefinition.TypeDerivationRule.Constraint
        };
        var importer = new SdImportEngine();

        // Act & Assert
        Assert.Throws<ArgumentNullException>(() => importer.Import(null!, profileSd));
        Assert.Throws<ArgumentNullException>(() => importer.Import(baseSd, null!));
    }

    [Fact]
    public void Import_NonConstraintDerivation_ThrowsArgumentException()
    {
        // Arrange
        var baseSd = GetPatientStructureDefinition();
        var specializationSd = new StructureDefinition
        {
            Url = "http://example.org/fhir/StructureDefinition/TestResource",
            Type = "TestResource",
            Derivation = StructureDefinition.TypeDerivationRule.Specialization // Not a constraint
        };
        var importer = new SdImportEngine();

        // Act & Assert
        var exception = Assert.Throws<ArgumentException>(() => importer.Import(baseSd, specializationSd));
        Assert.Contains("constraint derivation", exception.Message);
    }

    [Fact]
    public void Import_ElementNotInDesignState_SkipsWithoutError()
    {
        // Arrange
        var baseSd = GetPatientStructureDefinition();
        
        // Create profile SD with non-existent element path
        var profileSd = new StructureDefinition
        {
            Url = "http://example.org/fhir/StructureDefinition/TestPatient",
            Type = "Patient",
            BaseDefinition = "http://hl7.org/fhir/StructureDefinition/Patient",
            Derivation = StructureDefinition.TypeDerivationRule.Constraint,
            Differential = new StructureDefinition.DifferentialComponent
            {
                Element = new List<ElementDefinition>
                {
                    new ElementDefinition
                    {
                        Path = "Patient.nonExistentElement", // Invalid path
                        Min = 1,
                        Max = "1"
                    }
                }
            }
        };

        var importer = new SdImportEngine();

        // Act - Should not throw
        var designState = importer.Import(baseSd, profileSd);

        // Assert - Design state should still be valid
        Assert.NotNull(designState);
        Assert.NotEmpty(designState.Elements);
    }

    [Fact]
    public void Import_Binding_IsPreservedInDesignState()
    {
        // Arrange
        var baseSd = GetPatientStructureDefinition();
        
        // Create profile SD that adds binding to Patient.maritalStatus
        var profileSd = new StructureDefinition
        {
            Url = "http://example.org/fhir/StructureDefinition/TestPatient",
            Type = "Patient",
            BaseDefinition = "http://hl7.org/fhir/StructureDefinition/Patient",
            Derivation = StructureDefinition.TypeDerivationRule.Constraint,
            Differential = new StructureDefinition.DifferentialComponent
            {
                Element = new List<ElementDefinition>
                {
                    new ElementDefinition
                    {
                        Path = "Patient.maritalStatus",
                        Binding = new ElementDefinition.ElementDefinitionBindingComponent
                        {
                            Strength = Hl7.Fhir.Model.BindingStrength.Required,
                            ValueSet = "http://example.org/fhir/ValueSet/custom-marital-status"
                        }
                    }
                }
            }
        };

        var importer = new SdImportEngine();

        // Act
        var designState = importer.Import(baseSd, profileSd);

        // Assert
        var maritalStatusElement = designState.Elements.FirstOrDefault(e => e.Path == "Patient.maritalStatus");
        Assert.NotNull(maritalStatusElement);
        Assert.True(maritalStatusElement.IsIncluded, "Element with binding should be included");
        Assert.NotNull(maritalStatusElement.Binding);
        Assert.Equal(Domain.BindingStrength.Required, maritalStatusElement.Binding.Strength);
        Assert.Equal("http://example.org/fhir/ValueSet/custom-marital-status", maritalStatusElement.Binding.ValueSetUrl);
    }

    [Fact]
    public void Import_SlicingParent_ConfiguresSlicing()
    {
        // Arrange
        var baseSd = GetPatientStructureDefinition();
        
        // Create profile SD with slicing on Patient.identifier
        var profileSd = new StructureDefinition
        {
            Url = "http://example.org/fhir/StructureDefinition/TestPatient",
            Type = "Patient",
            BaseDefinition = "http://hl7.org/fhir/StructureDefinition/Patient",
            Derivation = StructureDefinition.TypeDerivationRule.Constraint,
            Differential = new StructureDefinition.DifferentialComponent
            {
                Element = new List<ElementDefinition>
                {
                    new ElementDefinition
                    {
                        Path = "Patient.identifier",
                        ElementId = "Patient.identifier",
                        Slicing = new ElementDefinition.SlicingComponent
                        {
                            Ordered = false,
                            Rules = ElementDefinition.SlicingRules.Open,
                            Discriminator = new List<ElementDefinition.DiscriminatorComponent>
                            {
                                new ElementDefinition.DiscriminatorComponent
                                {
                                    Type = ElementDefinition.DiscriminatorType.Value,
                                    Path = "system"
                                }
                            }
                        }
                    }
                }
            }
        };

        var importer = new SdImportEngine();

        // Act
        var designState = importer.Import(baseSd, profileSd);

        // Assert
        var identifierElement = designState.Elements.FirstOrDefault(e => e.Path == "Patient.identifier");
        Assert.NotNull(identifierElement);
        Assert.NotNull(identifierElement.Slicing);
        Assert.False(identifierElement.Slicing.Ordered);
        Assert.Equal(Domain.SlicingRules.Open, identifierElement.Slicing.Rules);
        Assert.Single(identifierElement.Slicing.Discriminators);
        Assert.Equal(Domain.DiscriminatorType.Value, identifierElement.Slicing.Discriminators[0].Type);
        Assert.Equal("system", identifierElement.Slicing.Discriminators[0].Path);
    }

    [Fact]
    public void Import_SliceRoot_CreatesSlice()
    {
        // Arrange
        var baseSd = GetPatientStructureDefinition();
        
        // Create profile SD with slicing and a slice named "nric"
        var profileSd = new StructureDefinition
        {
            Url = "http://example.org/fhir/StructureDefinition/TestPatient",
            Type = "Patient",
            BaseDefinition = "http://hl7.org/fhir/StructureDefinition/Patient",
            Derivation = StructureDefinition.TypeDerivationRule.Constraint,
            Differential = new StructureDefinition.DifferentialComponent
            {
                Element = new List<ElementDefinition>
                {
                    new ElementDefinition
                    {
                        Path = "Patient.identifier",
                        ElementId = "Patient.identifier",
                        Slicing = new ElementDefinition.SlicingComponent
                        {
                            Ordered = false,
                            Rules = ElementDefinition.SlicingRules.Closed,
                            Discriminator = new List<ElementDefinition.DiscriminatorComponent>
                            {
                                new ElementDefinition.DiscriminatorComponent
                                {
                                    Type = ElementDefinition.DiscriminatorType.Pattern,
                                    Path = "type"
                                }
                            }
                        }
                    },
                    new ElementDefinition
                    {
                        Path = "Patient.identifier",
                        ElementId = "Patient.identifier:nric",
                        SliceName = "nric",
                        Min = 1,
                        Max = "1"
                    }
                }
            }
        };

        var importer = new SdImportEngine();

        // Act
        var designState = importer.Import(baseSd, profileSd);

        // Assert
        var identifierElement = designState.Elements.FirstOrDefault(e => e.Path == "Patient.identifier");
        Assert.NotNull(identifierElement);
        Assert.NotNull(identifierElement.Slicing);
        Assert.Equal(Domain.SlicingRules.Closed, identifierElement.Slicing.Rules);
        Assert.True(identifierElement.Slices.ContainsKey("nric"));
        
        var nricSlice = identifierElement.Slices["nric"];
        Assert.Equal("nric", nricSlice.SliceName);
        Assert.NotNull(nricSlice.OverrideCardinality);
        Assert.Equal(1, nricSlice.OverrideCardinality.Min);
        Assert.Equal("1", nricSlice.OverrideCardinality.Max);
    }

    [Fact]
    public void Import_SliceChildConstraint_Preserved()
    {
        // Arrange
        var baseSd = GetPatientStructureDefinition();
        
        // Create profile SD with slice child constraint
        // Patient.identifier:nric.system with 1..1 cardinality
        var profileSd = new StructureDefinition
        {
            Url = "http://example.org/fhir/StructureDefinition/TestPatient",
            Type = "Patient",
            BaseDefinition = "http://hl7.org/fhir/StructureDefinition/Patient",
            Derivation = StructureDefinition.TypeDerivationRule.Constraint,
            Differential = new StructureDefinition.DifferentialComponent
            {
                Element = new List<ElementDefinition>
                {
                    // Slicing parent
                    new ElementDefinition
                    {
                        Path = "Patient.identifier",
                        ElementId = "Patient.identifier",
                        Slicing = new ElementDefinition.SlicingComponent
                        {
                            Ordered = false,
                            Rules = ElementDefinition.SlicingRules.Open,
                            Discriminator = new List<ElementDefinition.DiscriminatorComponent>
                            {
                                new ElementDefinition.DiscriminatorComponent
                                {
                                    Type = ElementDefinition.DiscriminatorType.Value,
                                    Path = "system"
                                }
                            }
                        }
                    },
                    // Slice root
                    new ElementDefinition
                    {
                        Path = "Patient.identifier",
                        ElementId = "Patient.identifier:nric",
                        SliceName = "nric",
                        Min = 1,
                        Max = "1"
                    },
                    // Slice child constraint: system with cardinality 1..1
                    new ElementDefinition
                    {
                        Path = "Patient.identifier.system",
                        ElementId = "Patient.identifier:nric.system",
                        Min = 1,
                        Max = "1"
                    },
                    // Slice child constraint: value with binding
                    new ElementDefinition
                    {
                        Path = "Patient.identifier.value",
                        ElementId = "Patient.identifier:nric.value",
                        Min = 1,
                        Max = "1",
                        Binding = new ElementDefinition.ElementDefinitionBindingComponent
                        {
                            Strength = Hl7.Fhir.Model.BindingStrength.Required,
                            ValueSet = "http://example.org/fhir/ValueSet/nric-pattern"
                        }
                    }
                }
            }
        };

        var importer = new SdImportEngine();

        // Act
        var designState = importer.Import(baseSd, profileSd);

        // Assert
        var identifierElement = designState.Elements.FirstOrDefault(e => e.Path == "Patient.identifier");
        Assert.NotNull(identifierElement);
        Assert.True(identifierElement.Slices.ContainsKey("nric"));
        
        var nricSlice = identifierElement.Slices["nric"];
        
        // Verify slice child constraints exist
        Assert.Equal(2, nricSlice.ChildConstraints.Count);
        
        // Verify system constraint (cardinality only)
        var systemConstraint = nricSlice.ChildConstraints.FirstOrDefault(c => c.ElementPath == "system");
        Assert.NotNull(systemConstraint);
        Assert.Equal("nric", systemConstraint.SliceName);
        Assert.Equal("system", systemConstraint.ElementPath);
        Assert.NotNull(systemConstraint.CardinalityOverride);
        Assert.Equal(1, systemConstraint.CardinalityOverride.Min);
        Assert.Equal("1", systemConstraint.CardinalityOverride.Max);
        Assert.Null(systemConstraint.Binding);
        
        // Verify value constraint (cardinality + binding)
        var valueConstraint = nricSlice.ChildConstraints.FirstOrDefault(c => c.ElementPath == "value");
        Assert.NotNull(valueConstraint);
        Assert.Equal("nric", valueConstraint.SliceName);
        Assert.Equal("value", valueConstraint.ElementPath);
        Assert.NotNull(valueConstraint.CardinalityOverride);
        Assert.Equal(1, valueConstraint.CardinalityOverride.Min);
        Assert.Equal("1", valueConstraint.CardinalityOverride.Max);
        Assert.NotNull(valueConstraint.Binding);
        Assert.Equal(Domain.BindingStrength.Required, valueConstraint.Binding.Strength);
        Assert.Equal("http://example.org/fhir/ValueSet/nric-pattern", valueConstraint.Binding.ValueSetUrl);
    }
}
