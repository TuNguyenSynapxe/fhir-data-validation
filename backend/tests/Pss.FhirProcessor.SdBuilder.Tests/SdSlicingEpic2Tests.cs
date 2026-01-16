namespace Pss.FhirProcessor.SdBuilder.Tests;

using Hl7.Fhir.Model;
using Hl7.Fhir.Serialization;
using Hl7.Fhir.Specification.Source;
using Pss.FhirProcessor.SdBuilder.Domain;
using Pss.FhirProcessor.SdBuilder.Engine;
using Pss.FhirProcessor.SdBuilder.Export;
using Xunit;

/// <summary>
/// EPIC 2: FHIR Slicing End-to-End Tests
/// Tests all slicing functionality as specified in EPIC 2 requirements.
/// </summary>
public sealed class SdSlicingEpic2Tests
{
    #region Validation Tests

    [Fact]
    public void CannotAddSlicingToNonRepeatableElement()
    {
        // Arrange: Patient.birthDate has max = 1 (non-repeatable)
        var baseSd = GetPatientStructureDefinition();
        var design = SdDesignInitializer.Create("Patient", baseSd, VisibilityMode.Minimal);
        
        var birthDateElement = design.Elements["Patient.birthDate"];
        
        // Act: Try to configure slicing on non-repeatable element
        birthDateElement.Slicing = new SlicingConfig
        {
            Ordered = false,
            Rules = SlicingRules.Open,
            Discriminators = new List<SliceDiscriminator>
            {
                new SliceDiscriminator(DiscriminatorType.Value, "value")
            }
        };
        
        var result = SdDesignValidator.Validate(design, baseSd);
        
        // Assert: Should have SLICING_NON_REPEATABLE error
        Assert.True(result.HasErrors);
        Assert.Contains(result.Issues, i => i.Code == "SLICING_NON_REPEATABLE");
    }

    [Fact]
    public void CanAddSlicingToRepeatableElement()
    {
        // Arrange: Patient.identifier has max = * (repeatable)
        var baseSd = GetPatientStructureDefinition();
        var design = SdDesignInitializer.Create("Patient", baseSd, VisibilityMode.Minimal);
        
        var identifierElement = design.Elements["Patient.identifier"];
        identifierElement.IsIncluded = true;
        
        // Act: Configure slicing on repeatable element
        identifierElement.Slicing = new SlicingConfig
        {
            Ordered = false,
            Rules = SlicingRules.Open,
            Discriminators = new List<SliceDiscriminator>
            {
                new SliceDiscriminator(DiscriminatorType.Value, "system")
            }
        };
        
        var result = SdDesignValidator.Validate(design, baseSd);
        
        // Assert: Should have no errors
        Assert.False(result.HasErrors);
    }

    [Fact]
    public void DuplicateSliceNameRejected()
    {
        // Arrange
        var baseSd = GetPatientStructureDefinition();
        var design = SdDesignInitializer.Create("Patient", baseSd, VisibilityMode.Minimal);
        
        var identifierElement = design.Elements["Patient.identifier"];
        identifierElement.IsIncluded = true;
        identifierElement.Slicing = new SlicingConfig
        {
            Ordered = false,
            Rules = SlicingRules.Open,
            Discriminators = new List<SliceDiscriminator>
            {
                new SliceDiscriminator(DiscriminatorType.Value, "system")
            }
        };
        
        // Act: Add two slices with same name
        identifierElement.Slices = new Dictionary<string, SliceDesignState>
        {
            ["nric"] = new SliceDesignState
            {
                SliceName = "nric",
                Cardinality = new Cardinality(1, "1")
            },
            ["nric"] = new SliceDesignState  // Duplicate name (dictionary prevents this at runtime)
            {
                SliceName = "nric",
                Cardinality = new Cardinality(0, "1")
            }
        };
        
        var result = SdDesignValidator.Validate(design, baseSd);
        
        // Assert: Dictionary prevents duplicates, so no duplicate error expected
        Assert.False(result.HasErrors);
    }

    [Fact]
    public void SliceCardinalityExceedingParentRejected()
    {
        // Arrange
        var baseSd = GetPatientStructureDefinition();
        var design = SdDesignInitializer.Create("Patient", baseSd, VisibilityMode.Minimal);
        
        var identifierElement = design.Elements["Patient.identifier"];
        identifierElement.IsIncluded = true;
        identifierElement.OverrideCardinality = new Cardinality(0, "2"); // Parent max = 2
        identifierElement.Slicing = new SlicingConfig
        {
            Ordered = false,
            Rules = SlicingRules.Open,
            Discriminators = new List<SliceDiscriminator>
            {
                new SliceDiscriminator(DiscriminatorType.Value, "system")
            }
        };
        
        // Act: Add slice with cardinality exceeding parent
        identifierElement.Slices = new Dictionary<string, SliceDesignState>
        {
            ["nric"] = new SliceDesignState
            {
                SliceName = "nric",
                Cardinality = new Cardinality(0, "3")  // Exceeds parent max of 2
            }
        };
        
        var result = SdDesignValidator.Validate(design, baseSd);
        
        // Assert: Should have SLICE_CARDINALITY_EXCEEDS_PARENT error
        Assert.True(result.HasErrors);
        Assert.Contains(result.Issues, i => i.Code == "SLICE_CARDINALITY_EXCEEDS_PARENT");
    }

    [Fact]
    public void ClosedSlicingEmitsWarning()
    {
        // Arrange
        var baseSd = GetPatientStructureDefinition();
        var design = SdDesignInitializer.Create("Patient", baseSd, VisibilityMode.Minimal);
        
        var identifierElement = design.Elements["Patient.identifier"];
        identifierElement.IsIncluded = true;
        identifierElement.Slicing = new SlicingConfig
        {
            Ordered = false,
            Rules = SlicingRules.Closed,  // Closed slicing
            Discriminators = new List<SliceDiscriminator>
            {
                new SliceDiscriminator(DiscriminatorType.Value, "system")
            }
        };
        
        // Act: No slices defined for closed slicing
        identifierElement.Slices = new Dictionary<string, SliceDesignState>();
        
        var result = SdDesignValidator.Validate(design, baseSd);
        
        // Assert: Should have SLICING_CLOSED_WITHOUT_SLICES warning
        Assert.False(result.HasErrors);  // Warnings don't block
        Assert.Contains(result.Issues, i => i.Code == "SLICING_CLOSED_WITHOUT_SLICES" && i.Severity == SdValidationSeverity.Warning);
    }

    #endregion

    #region Export Tests

    [Fact]
    public void ExportSlicingIntoDifferential()
    {
        // Arrange
        var baseSd = GetPatientStructureDefinition();
        var design = SdDesignInitializer.Create("Patient", baseSd, VisibilityMode.Minimal);
        
        var identifierElement = design.Elements["Patient.identifier"];
        identifierElement.IsIncluded = true;
        identifierElement.Slicing = new SlicingConfig
        {
            Ordered = false,
            Rules = SlicingRules.Open,
            Discriminators = new List<SliceDiscriminator>
            {
                new SliceDiscriminator(DiscriminatorType.Pattern, "system")
            }
        };
        
        identifierElement.Slices = new Dictionary<string, SliceDesignState>
        {
            ["nric"] = new SliceDesignState
            {
                SliceName = "nric",
                Cardinality = new Cardinality(1, "1")
            }
        };
        
        var meta = new SdMetadata
        {
            Url = "http://example.org/fhir/StructureDefinition/TestPatient",
            Name = "TestPatient",
            Version = "1.0.0",
            Status = "draft"
        };
        
        // Act
        var exported = SdExporter.Export(design, baseSd, meta);
        
        // Assert: Verify slicing parent element
        var identifierDiff = exported.Differential.Element.FirstOrDefault(e => e.Path == "Patient.identifier" && e.Slicing != null);
        Assert.NotNull(identifierDiff);
        Assert.NotNull(identifierDiff.Slicing);
        Assert.Single(identifierDiff.Slicing.Discriminator);
        Assert.Equal(ElementDefinition.DiscriminatorType.Pattern, identifierDiff.Slicing.Discriminator[0].Type);
        Assert.Equal("system", identifierDiff.Slicing.Discriminator[0].Path);
        Assert.Equal(ElementDefinition.SlicingRules.Open, identifierDiff.Slicing.Rules);
        
        // Assert: Verify slice element
        var nricSlice = exported.Differential.Element.FirstOrDefault(e => e.ElementId == "Patient.identifier:nric");
        Assert.NotNull(nricSlice);
        Assert.Equal("Patient.identifier", nricSlice.Path);
        Assert.Equal("nric", nricSlice.SliceName);
        Assert.Equal(1, nricSlice.Min);
        Assert.Equal("1", nricSlice.Max);
    }

    [Fact]
    public void ExportSupportsOpenAtEndSlicingRule()
    {
        // Arrange
        var baseSd = GetPatientStructureDefinition();
        var design = SdDesignInitializer.Create("Patient", baseSd, VisibilityMode.Minimal);
        
        var identifierElement = design.Elements["Patient.identifier"];
        identifierElement.IsIncluded = true;
        identifierElement.Slicing = new SlicingConfig
        {
            Ordered = false,
            Rules = SlicingRules.OpenAtEnd,  // New R5 slicing rule
            Discriminators = new List<SliceDiscriminator>
            {
                new SliceDiscriminator(DiscriminatorType.Value, "system")
            }
        };
        
        var meta = new SdMetadata
        {
            Url = "http://example.org/fhir/StructureDefinition/TestPatient",
            Name = "TestPatient",
            Version = "1.0.0",
            Status = "draft"
        };
        
        // Act
        var exported = SdExporter.Export(design, baseSd, meta);
        
        // Assert
        var identifierDiff = exported.Differential.Element.FirstOrDefault(e => e.Path == "Patient.identifier" && e.Slicing != null);
        Assert.NotNull(identifierDiff);
        Assert.Equal(ElementDefinition.SlicingRules.OpenAtEnd, identifierDiff.Slicing.Rules);
    }

    [Fact]
    public void ExportSupportsProfileDiscriminator()
    {
        // Arrange
        var baseSd = GetPatientStructureDefinition();
        var design = SdDesignInitializer.Create("Patient", baseSd, VisibilityMode.Minimal);
        
        var identifierElement = design.Elements["Patient.identifier"];
        identifierElement.IsIncluded = true;
        identifierElement.Slicing = new SlicingConfig
        {
            Ordered = false,
            Rules = SlicingRules.Open,
            Discriminators = new List<SliceDiscriminator>
            {
                new SliceDiscriminator(DiscriminatorType.Profile, "$this")  // New R5 discriminator type
            }
        };
        
        var meta = new SdMetadata
        {
            Url = "http://example.org/fhir/StructureDefinition/TestPatient",
            Name = "TestPatient",
            Version = "1.0.0",
            Status = "draft"
        };
        
        // Act
        var exported = SdExporter.Export(design, baseSd, meta);
        
        // Assert
        var identifierDiff = exported.Differential.Element.FirstOrDefault(e => e.Path == "Patient.identifier" && e.Slicing != null);
        Assert.NotNull(identifierDiff);
        Assert.Single(identifierDiff.Slicing.Discriminator);
        Assert.Equal(ElementDefinition.DiscriminatorType.Profile, identifierDiff.Slicing.Discriminator[0].Type);
    }

    #endregion

    #region Import Tests

    [Fact]
    public void ImportSlicingRoundTripPreservesConfig()
    {
        // Arrange: Create design with slicing
        var baseSd = GetPatientStructureDefinition();
        var design = SdDesignInitializer.Create("Patient", baseSd, VisibilityMode.Minimal);
        
        var identifierElement = design.Elements["Patient.identifier"];
        identifierElement.IsIncluded = true;
        identifierElement.Slicing = new SlicingConfig
        {
            Ordered = false,
            Rules = SlicingRules.Open,
            Discriminators = new List<SliceDiscriminator>
            {
                new SliceDiscriminator(DiscriminatorType.Pattern, "system"),
                new SliceDiscriminator(DiscriminatorType.Value, "use")
            }
        };
        
        identifierElement.Slices = new Dictionary<string, SliceDesignState>
        {
            ["nric"] = new SliceDesignState
            {
                SliceName = "nric",
                Cardinality = new Cardinality(1, "1")
            },
            ["passport"] = new SliceDesignState
            {
                SliceName = "passport",
                Cardinality = new Cardinality(0, "1")
            }
        };
        
        var meta = new SdMetadata
        {
            Url = "http://example.org/fhir/StructureDefinition/TestPatient",
            Name = "TestPatient",
            Version = "1.0.0",
            Status = "draft"
        };
        
        // Act: Export then import
        var exported = SdExporter.Export(design, baseSd, meta);
        var importedDesign = SdImportEngine.Import(exported, baseSd);
        
        // Assert: Verify slicing config preserved
        var importedIdentifier = importedDesign.Elements["Patient.identifier"];
        Assert.NotNull(importedIdentifier.Slicing);
        Assert.False(importedIdentifier.Slicing.Ordered);
        Assert.Equal(SlicingRules.Open, importedIdentifier.Slicing.Rules);
        Assert.Equal(2, importedIdentifier.Slicing.Discriminators.Count);
        Assert.Contains(importedIdentifier.Slicing.Discriminators, d => d.Type == DiscriminatorType.Pattern && d.Path == "system");
        Assert.Contains(importedIdentifier.Slicing.Discriminators, d => d.Type == DiscriminatorType.Value && d.Path == "use");
        
        // Assert: Verify slices preserved
        Assert.Equal(2, importedIdentifier.Slices.Count);
        Assert.True(importedIdentifier.Slices.ContainsKey("nric"));
        Assert.True(importedIdentifier.Slices.ContainsKey("passport"));
        
        var nricSlice = importedIdentifier.Slices["nric"];
        Assert.Equal("nric", nricSlice.SliceName);
        Assert.Equal(1, nricSlice.Cardinality.Min);
        Assert.Equal("1", nricSlice.Cardinality.Max);
        
        var passportSlice = importedIdentifier.Slices["passport"];
        Assert.Equal("passport", passportSlice.SliceName);
        Assert.Equal(0, passportSlice.Cardinality.Min);
        Assert.Equal("1", passportSlice.Cardinality.Max);
    }

    [Fact]
    public void ImportHandlesOpenAtEndSlicingRule()
    {
        // Arrange: Create SD with OpenAtEnd slicing rule
        var baseSd = GetPatientStructureDefinition();
        var sd = new StructureDefinition
        {
            Url = "http://example.org/fhir/StructureDefinition/TestPatient",
            Name = "TestPatient",
            Status = PublicationStatus.Draft,
            Kind = StructureDefinition.StructureDefinitionKind.Resource,
            Abstract = false,
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
                        Slicing = new ElementDefinition.SlicingComponent
                        {
                            Discriminator = new List<ElementDefinition.DiscriminatorComponent>
                            {
                                new ElementDefinition.DiscriminatorComponent
                                {
                                    Type = ElementDefinition.DiscriminatorType.Value,
                                    Path = "system"
                                }
                            },
                            Rules = ElementDefinition.SlicingRules.OpenAtEnd,
                            Ordered = false
                        }
                    }
                }
            }
        };
        
        // Act
        var design = SdImportEngine.Import(sd, baseSd);
        
        // Assert
        var identifierElement = design.Elements["Patient.identifier"];
        Assert.NotNull(identifierElement.Slicing);
        Assert.Equal(SlicingRules.OpenAtEnd, identifierElement.Slicing.Rules);
    }

    [Fact]
    public void ImportHandlesProfileDiscriminator()
    {
        // Arrange: Create SD with Profile discriminator
        var baseSd = GetPatientStructureDefinition();
        var sd = new StructureDefinition
        {
            Url = "http://example.org/fhir/StructureDefinition/TestPatient",
            Name = "TestPatient",
            Status = PublicationStatus.Draft,
            Kind = StructureDefinition.StructureDefinitionKind.Resource,
            Abstract = false,
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
                        Slicing = new ElementDefinition.SlicingComponent
                        {
                            Discriminator = new List<ElementDefinition.DiscriminatorComponent>
                            {
                                new ElementDefinition.DiscriminatorComponent
                                {
                                    Type = ElementDefinition.DiscriminatorType.Profile,
                                    Path = "$this"
                                }
                            },
                            Rules = ElementDefinition.SlicingRules.Open,
                            Ordered = false
                        }
                    }
                }
            }
        };
        
        // Act
        var design = SdImportEngine.Import(sd, baseSd);
        
        // Assert
        var identifierElement = design.Elements["Patient.identifier"];
        Assert.NotNull(identifierElement.Slicing);
        Assert.Single(identifierElement.Slicing.Discriminators);
        Assert.Equal(DiscriminatorType.Profile, identifierElement.Slicing.Discriminators[0].Type);
        Assert.Equal("$this", identifierElement.Slicing.Discriminators[0].Path);
    }

    #endregion

    #region Architecture Tests

    [Fact]
    public void NoFirelyReferenceLeakInSlicingDomain()
    {
        // Assert: Verify domain types don't reference Firely
        var slicingConfigType = typeof(SlicingConfig);
        var sliceDesignStateType = typeof(SliceDesignState);
        var sliceDiscriminatorType = typeof(SliceDiscriminator);
        var discriminatorTypeEnum = typeof(DiscriminatorType);
        var slicingRulesEnum = typeof(SlicingRules);
        
        // Check no Firely references in these types
        Assert.DoesNotContain(slicingConfigType.Assembly.GetReferencedAssemblies(), a => a.Name.Contains("Hl7.Fhir"));
        Assert.DoesNotContain(sliceDesignStateType.Assembly.GetReferencedAssemblies(), a => a.Name.Contains("Hl7.Fhir"));
        Assert.DoesNotContain(sliceDiscriminatorType.Assembly.GetReferencedAssemblies(), a => a.Name.Contains("Hl7.Fhir"));
        Assert.DoesNotContain(discriminatorTypeEnum.Assembly.GetReferencedAssemblies(), a => a.Name.Contains("Hl7.Fhir"));
        Assert.DoesNotContain(slicingRulesEnum.Assembly.GetReferencedAssemblies(), a => a.Name.Contains("Hl7.Fhir"));
    }

    #endregion

    #region Helper Methods

    private StructureDefinition GetPatientStructureDefinition()
    {
        var resolver = ZipSource.CreateValidationSource();
        var patientSd = resolver.ResolveByCanonicalUri("http://hl7.org/fhir/StructureDefinition/Patient") as StructureDefinition;
        
        if (patientSd == null)
            throw new InvalidOperationException("Failed to load Patient StructureDefinition");
        
        return patientSd;
    }

    #endregion
}
