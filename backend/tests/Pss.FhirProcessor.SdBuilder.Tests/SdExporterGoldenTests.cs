namespace Pss.FhirProcessor.SdBuilder.Tests;

using Hl7.Fhir.Model;
using Hl7.Fhir.Serialization;
using Hl7.Fhir.Specification.Source;
using Pss.FhirProcessor.SdBuilder.Domain;
using Pss.FhirProcessor.SdBuilder.Engine;
using Pss.FhirProcessor.SdBuilder.Export;
using Xunit;

/// <summary>
/// Golden file tests for StructureDefinition export.
/// </summary>
public sealed class SdExporterGoldenTests
{
    [Fact]
    public void Export_MinimalProfile_ExcludesOptionalElements()
    {
        // Arrange
        var baseSd = GetPatientStructureDefinition();
        var design = SdDesignInitializer.Create("Patient", baseSd, VisibilityMode.Minimal);
        
        var meta = new SdMetadata
        {
            Url = "http://example.org/fhir/StructureDefinition/MinimalPatient",
            Name = "MinimalPatient",
            Version = "1.0.0",
            Status = "draft",
            Description = "Minimal Patient profile with optional elements excluded"
        };

        // Act
        var exported = SdExporter.Export(design, baseSd, meta);

        // Assert
        Assert.NotNull(exported);
        Assert.Equal("http://example.org/fhir/StructureDefinition/MinimalPatient", exported.Url);
        Assert.Equal("MinimalPatient", exported.Name);
        Assert.Equal("Patient", exported.Type);
        Assert.Equal(StructureDefinition.TypeDerivationRule.Constraint, exported.Derivation);
        Assert.Equal(baseSd.Url, exported.BaseDefinition);
        Assert.Null(exported.Snapshot); // NO snapshot
        Assert.NotNull(exported.Differential);
        
        // Should have differential elements for excluded (0..0) optional elements
        var excludedElements = exported.Differential.Element
            .Where(e => e.Max == "0")
            .ToList();
        
        Assert.NotEmpty(excludedElements); // Minimal mode excludes optional elements
    }

    [Fact]
    public void Export_CardinalityOverride_WritesDifferential()
    {
        // Arrange
        var baseSd = GetPatientStructureDefinition();
        var design = SdDesignInitializer.Create("Patient", baseSd, VisibilityMode.Full);
        
        // Override Patient.name from 0..* to 1..1 (make required)
        var session = new SdBuilderSession(design);
        session.SetCardinalityOverride("Patient.name", new Cardinality(1, "1"));

        var meta = new SdMetadata
        {
            Url = "http://example.org/fhir/StructureDefinition/PatientWithRequiredName",
            Name = "PatientWithRequiredName",
            Version = "1.0.0",
            Status = "draft",
            Description = "Patient with required name"
        };

        // Act
        var exported = SdExporter.Export(design, baseSd, meta);

        // Assert
        var nameElement = exported.Differential.Element
            .FirstOrDefault(e => e.Path == "Patient.name");
        
        Assert.NotNull(nameElement);
        Assert.Equal(1, nameElement.Min);
        Assert.Equal("1", nameElement.Max);
    }

    [Fact]
    public void Export_WithBinding_WritesBindingBlock()
    {
        // Arrange
        var baseSd = GetPatientStructureDefinition();
        var design = SdDesignInitializer.Create("Patient", baseSd, VisibilityMode.Full);
        
        // Set binding on Patient.gender
        var session = new SdBuilderSession(design);
        session.SetBinding("Patient.gender", new BindingConfig
        {
            Strength = Domain.BindingStrength.Required,
            ValueSetUrl = "http://hl7.org/fhir/ValueSet/administrative-gender"
        });

        var meta = new SdMetadata
        {
            Url = "http://example.org/fhir/StructureDefinition/PatientWithBinding",
            Name = "PatientWithBinding",
            Version = "1.0.0",
            Status = "draft",
            Description = "Patient with gender binding"
        };

        // Act
        var exported = SdExporter.Export(design, baseSd, meta);

        // Assert
        var genderElement = exported.Differential.Element
            .FirstOrDefault(e => e.Path == "Patient.gender");
        
        Assert.NotNull(genderElement);
        Assert.NotNull(genderElement.Binding);
        Assert.Equal(Hl7.Fhir.Model.BindingStrength.Required, genderElement.Binding.Strength);
        Assert.Equal("http://hl7.org/fhir/ValueSet/administrative-gender", genderElement.Binding.ValueSet);
    }

    [Fact]
    public void Export_NoChanges_EmptyDifferential()
    {
        // Arrange
        var baseSd = GetPatientStructureDefinition();
        var design = SdDesignInitializer.Create("Patient", baseSd, VisibilityMode.Full);
        // No changes made to design state

        var meta = new SdMetadata
        {
            Url = "http://example.org/fhir/StructureDefinition/UnchangedPatient",
            Name = "UnchangedPatient",
            Version = "1.0.0",
            Status = "draft",
            Description = "Patient with no constraints"
        };

        // Act
        var exported = SdExporter.Export(design, baseSd, meta);

        // Assert
        Assert.NotNull(exported.Differential);
        Assert.Empty(exported.Differential.Element); // No constraints = empty differential
    }

    [Fact]
    public void Export_GoldenJson_StableOrdering()
    {
        // Arrange
        var baseSd = GetPatientStructureDefinition();
        var design = SdDesignInitializer.Create("Patient", baseSd, VisibilityMode.Minimal);
        
        // Make some specific changes
        var session = new SdBuilderSession(design);
        session.SetCardinalityOverride("Patient.gender", new Cardinality(1, "1")); // Make required
        session.SetBinding("Patient.gender", new BindingConfig
        {
            Strength = Domain.BindingStrength.Required,
            ValueSetUrl = "http://hl7.org/fhir/ValueSet/administrative-gender"
        });

        var meta = new SdMetadata
        {
            Url = "http://example.org/fhir/StructureDefinition/GoldenPatient",
            Name = "GoldenPatient",
            Version = "1.0.0",
            Status = "draft",
            Description = "Golden test patient profile"
        };

        // Act - Export twice
        var exported1 = SdExporter.Export(design, baseSd, meta);
        var exported2 = SdExporter.Export(design, baseSd, meta);

        var serializer = new FhirJsonSerializer();

        var json1 = serializer.SerializeToString(exported1);
        var json2 = serializer.SerializeToString(exported2);

        // Assert - Should be identical (deterministic)
        Assert.Equal(json1, json2);
        
        // Verify structure
        Assert.NotNull(exported1.Differential);
        Assert.NotEmpty(exported1.Differential.Element);
        Assert.Null(exported1.Snapshot); // NO snapshot
    }

    [Fact]
    public void Export_MetadataCorrectness()
    {
        // Arrange
        var baseSd = GetPatientStructureDefinition();
        var design = SdDesignInitializer.Create("Patient", baseSd, VisibilityMode.Full);

        var meta = new SdMetadata
        {
            Url = "http://example.org/fhir/StructureDefinition/TestPatient",
            Name = "TestPatient",
            Version = "2.0.1",
            Status = "active",
            Description = "Test patient profile"
        };

        // Act
        var exported = SdExporter.Export(design, baseSd, meta);

        // Assert
        Assert.Equal("http://example.org/fhir/StructureDefinition/TestPatient", exported.Url);
        Assert.Equal("TestPatient", exported.Name);
        Assert.Equal("2.0.1", exported.Version);
        Assert.Equal(PublicationStatus.Active, exported.Status);
        Assert.NotNull(exported.Description);
        Assert.Contains("Test patient profile", exported.Description.ToString());
        Assert.NotNull(exported.Kind);
        Assert.Equal(StructureDefinition.StructureDefinitionKind.Resource, exported.Kind.Value);
        Assert.NotNull(exported.Abstract);
        Assert.False(exported.Abstract.Value);
        Assert.Equal("Patient", exported.Type);
        Assert.Equal("http://hl7.org/fhir/StructureDefinition/Patient", exported.BaseDefinition);
        Assert.Equal(StructureDefinition.TypeDerivationRule.Constraint, exported.Derivation);
    }

    [Fact]
    public void Export_ExcludedElement_Writes0To0()
    {
        // Arrange
        var baseSd = GetPatientStructureDefinition();
        var design = SdDesignInitializer.Create("Patient", baseSd, VisibilityMode.Full);
        
        // Explicitly exclude Patient.name
        var session = new SdBuilderSession(design);
        session.ToggleInclude("Patient.name", false);

        var meta = new SdMetadata
        {
            Url = "http://example.org/fhir/StructureDefinition/PatientWithoutName",
            Name = "PatientWithoutName",
            Version = "1.0.0",
            Status = "draft",
            Description = "Patient without name"
        };

        // Act
        var exported = SdExporter.Export(design, baseSd, meta);

        // Assert
        var nameElement = exported.Differential.Element
            .FirstOrDefault(e => e.Path == "Patient.name");
        
        Assert.NotNull(nameElement);
        Assert.Equal(0, nameElement.Min);
        Assert.Equal("0", nameElement.Max); // Excluded = 0..0
    }

    [Fact]
    public void Export_MultipleConstraints_AllWritten()
    {
        // Arrange
        var baseSd = GetPatientStructureDefinition();
        var design = SdDesignInitializer.Create("Patient", baseSd, VisibilityMode.Full);
        
        var session = new SdBuilderSession(design);
        
        // Multiple constraints
        session.SetCardinalityOverride("Patient.name", new Cardinality(1, "*")); // Make required
        session.SetCardinalityOverride("Patient.gender", new Cardinality(1, "1")); // Make required and single
        session.SetBinding("Patient.gender", new BindingConfig
        {
            Strength = Domain.BindingStrength.Required,
            ValueSetUrl = "http://hl7.org/fhir/ValueSet/administrative-gender"
        });
        session.ToggleInclude("Patient.photo", false); // Exclude

        var meta = new SdMetadata
        {
            Url = "http://example.org/fhir/StructureDefinition/ConstrainedPatient",
            Name = "ConstrainedPatient",
            Version = "1.0.0",
            Status = "draft",
            Description = "Patient with multiple constraints"
        };

        // Act
        var exported = SdExporter.Export(design, baseSd, meta);

        // Assert
        var differential = exported.Differential.Element;
        
        // Should have entries for all modified elements
        Assert.Contains(differential, e => e.Path == "Patient.name");
        Assert.Contains(differential, e => e.Path == "Patient.gender");
        Assert.Contains(differential, e => e.Path == "Patient.photo");
        
        var nameElem = differential.First(e => e.Path == "Patient.name");
        Assert.Equal(1, nameElem.Min);
        
        var genderElem = differential.First(e => e.Path == "Patient.gender");
        Assert.Equal(1, genderElem.Min);
        Assert.Equal("1", genderElem.Max);
        Assert.NotNull(genderElem.Binding);
        
        var photoElem = differential.First(e => e.Path == "Patient.photo");
        Assert.Equal(0, photoElem.Min);
        Assert.Equal("0", photoElem.Max);
    }

    [Fact]
    public void Export_NoSnapshot_SnapshotIsNull()
    {
        // Arrange
        var baseSd = GetPatientStructureDefinition();
        var design = SdDesignInitializer.Create("Patient", baseSd, VisibilityMode.Full);

        var meta = new SdMetadata
        {
            Url = "http://example.org/fhir/StructureDefinition/TestPatient",
            Name = "TestPatient",
            Version = "1.0.0",
            Status = "draft",
            Description = "Test"
        };

        // Act
        var exported = SdExporter.Export(design, baseSd, meta);

        // Assert - CRITICAL: No snapshot generation
        Assert.Null(exported.Snapshot);
    }

    // ========================
    // Phase 2.1 - Slicing Tests
    // ========================

    [Fact]
    public void Export_Slicing_EmitsSlicingParent()
    {
        // Arrange
        var baseSd = GetPatientStructureDefinition();
        var design = SdDesignInitializer.Create("Patient", baseSd, VisibilityMode.Full);

        // Configure slicing on Patient.identifier
        var session = new SdBuilderSession(design);
        var discriminators = new List<SliceDiscriminator>
        {
            new SliceDiscriminator(DiscriminatorType.Value, "system")
        };
        session.ConfigureSlicing("Patient.identifier", true, SlicingRules.Closed, discriminators);

        var meta = new SdMetadata
        {
            Url = "http://example.org/fhir/StructureDefinition/SlicedPatient",
            Name = "SlicedPatient",
            Version = "1.0.0",
            Status = "draft",
            Description = "Patient with sliced identifier"
        };

        // Act
        var exported = SdExporter.Export(design, baseSd, meta);

        // Assert
        Assert.Null(exported.Snapshot);
        Assert.NotNull(exported.Differential);

        var differential = exported.Differential.Element;
        var slicingParent = differential.FirstOrDefault(e => e.Path == "Patient.identifier" && e.Slicing != null);
        
        Assert.NotNull(slicingParent);
        Assert.NotNull(slicingParent.Slicing);
        Assert.True(slicingParent.Slicing.Ordered);
        Assert.Equal(ElementDefinition.SlicingRules.Closed, slicingParent.Slicing.Rules);
        Assert.Single(slicingParent.Slicing.Discriminator);
        Assert.Equal(ElementDefinition.DiscriminatorType.Value, slicingParent.Slicing.Discriminator[0].Type);
        Assert.Equal("system", slicingParent.Slicing.Discriminator[0].Path);
    }

    [Fact]
    public void Export_Slicing_EmitsSliceRoots()
    {
        // Arrange
        var baseSd = GetPatientStructureDefinition();
        var design = SdDesignInitializer.Create("Patient", baseSd, VisibilityMode.Full);

        // Configure slicing with slices
        var session = new SdBuilderSession(design);
        var discriminators = new List<SliceDiscriminator>
        {
            new SliceDiscriminator(DiscriminatorType.Value, "system")
        };
        session.ConfigureSlicing("Patient.identifier", true, SlicingRules.Open, discriminators);
        session.AddSlice("Patient.identifier", "nric");
        session.SetSliceCardinality("Patient.identifier", "nric", new Cardinality(1, "1"));
        session.AddSlice("Patient.identifier", "passport");
        session.SetSliceCardinality("Patient.identifier", "passport", new Cardinality(0, "1"));

        var meta = new SdMetadata
        {
            Url = "http://example.org/fhir/StructureDefinition/SlicedPatient",
            Name = "SlicedPatient",
            Version = "1.0.0",
            Status = "draft",
            Description = "Patient with identifier slices"
        };

        // Act
        var exported = SdExporter.Export(design, baseSd, meta);

        // Assert
        Assert.Null(exported.Snapshot);
        Assert.NotNull(exported.Differential);

        var differential = exported.Differential.Element;
        
        // Find slice roots
        var nricSlice = differential.FirstOrDefault(e => e.Path == "Patient.identifier" && e.SliceName == "nric");
        var passportSlice = differential.FirstOrDefault(e => e.Path == "Patient.identifier" && e.SliceName == "passport");
        
        Assert.NotNull(nricSlice);
        Assert.Equal("nric", nricSlice.SliceName);
        Assert.Equal(1, nricSlice.Min);
        Assert.Equal("1", nricSlice.Max);
        
        Assert.NotNull(passportSlice);
        Assert.Equal("passport", passportSlice.SliceName);
        Assert.Equal(0, passportSlice.Min);
        Assert.Equal("1", passportSlice.Max);
    }

    [Fact]
    public void Export_Slicing_DeterministicOrdering()
    {
        // Arrange
        var baseSd = GetPatientStructureDefinition();
        var design = SdDesignInitializer.Create("Patient", baseSd, VisibilityMode.Full);

        // Configure slicing with multiple slices in non-alphabetical order
        var session = new SdBuilderSession(design);
        var discriminators = new List<SliceDiscriminator>
        {
            new SliceDiscriminator(DiscriminatorType.Value, "system")
        };
        session.ConfigureSlicing("Patient.identifier", false, SlicingRules.Open, discriminators);
        session.AddSlice("Patient.identifier", "zebra");
        session.AddSlice("Patient.identifier", "alpha");
        session.AddSlice("Patient.identifier", "delta");

        var meta = new SdMetadata
        {
            Url = "http://example.org/fhir/StructureDefinition/TestPatient",
            Name = "TestPatient",
            Version = "1.0.0",
            Status = "draft",
            Description = "Test"
        };

        // Act
        var exported = SdExporter.Export(design, baseSd, meta);

        // Assert - Slices should be ordered: alpha, delta, zebra
        var differential = exported.Differential.Element;
        var sliceElements = differential
            .Where(e => e.Path == "Patient.identifier" && !string.IsNullOrEmpty(e.SliceName))
            .Select(e => e.SliceName)
            .ToList();
        
        Assert.Equal(new[] { "alpha", "delta", "zebra" }, sliceElements);
    }

    [Fact]
    public void Export_Slicing_WithBinding()
    {
        // Arrange
        var baseSd = GetPatientStructureDefinition();
        var design = SdDesignInitializer.Create("Patient", baseSd, VisibilityMode.Full);

        // Configure slicing with binding
        var session = new SdBuilderSession(design);
        var discriminators = new List<SliceDiscriminator>
        {
            new SliceDiscriminator(DiscriminatorType.Value, "system")
        };
        session.ConfigureSlicing("Patient.identifier", false, SlicingRules.Open, discriminators);
        session.AddSlice("Patient.identifier", "nric");
        session.SetSliceBinding("Patient.identifier", "nric", new BindingConfig
        {
            Strength = Domain.BindingStrength.Required,
            ValueSetUrl = "http://example.org/fhir/ValueSet/nric-system"
        });

        var meta = new SdMetadata
        {
            Url = "http://example.org/fhir/StructureDefinition/TestPatient",
            Name = "TestPatient",
            Version = "1.0.0",
            Status = "draft",
            Description = "Test"
        };

        // Act
        var exported = SdExporter.Export(design, baseSd, meta);

        // Assert
        var differential = exported.Differential.Element;
        var nricSlice = differential.FirstOrDefault(e => e.Path == "Patient.identifier" && e.SliceName == "nric");
        
        Assert.NotNull(nricSlice);
        Assert.NotNull(nricSlice.Binding);
        Assert.Equal(Hl7.Fhir.Model.BindingStrength.Required, nricSlice.Binding.Strength);
        Assert.Equal("http://example.org/fhir/ValueSet/nric-system", nricSlice.Binding.ValueSet);
    }

    [Fact]
    public void Export_Slicing_MultipleSlicingParents()
    {
        // Arrange
        var baseSd = GetPatientStructureDefinition();
        var design = SdDesignInitializer.Create("Patient", baseSd, VisibilityMode.Full);

        // Configure slicing on both identifier and telecom
        var session = new SdBuilderSession(design);
        
        session.ConfigureSlicing("Patient.identifier", false, SlicingRules.Open, new List<SliceDiscriminator>
        {
            new SliceDiscriminator(DiscriminatorType.Value, "system")
        });
        session.AddSlice("Patient.identifier", "nric");
        
        session.ConfigureSlicing("Patient.telecom", false, SlicingRules.Open, new List<SliceDiscriminator>
        {
            new SliceDiscriminator(DiscriminatorType.Value, "system")
        });
        session.AddSlice("Patient.telecom", "phone");

        var meta = new SdMetadata
        {
            Url = "http://example.org/fhir/StructureDefinition/TestPatient",
            Name = "TestPatient",
            Version = "1.0.0",
            Status = "draft",
            Description = "Test"
        };

        // Act
        var exported = SdExporter.Export(design, baseSd, meta);

        // Assert - Both slicing parents should be present, ordered by path
        var differential = exported.Differential.Element;
        var slicingParents = differential.Where(e => e.Slicing != null).Select(e => e.Path).ToList();
        
        Assert.Equal(new[] { "Patient.identifier", "Patient.telecom" }, slicingParents);
        
        // Verify slices exist
        Assert.Contains(differential, e => e.Path == "Patient.identifier" && e.SliceName == "nric");
        Assert.Contains(differential, e => e.Path == "Patient.telecom" && e.SliceName == "phone");
    }

    // ============================================
    // Phase 2.2: Slice Child Constraint Tests
    // ============================================

    [Fact]
    public void Export_SliceChildConstraints_BPObservationExample()
    {
        // Arrange: Blood Pressure Observation profile with systolic/diastolic slices
        var baseSd = GetObservationStructureDefinition();
        var design = SdDesignInitializer.Create("Observation", baseSd, VisibilityMode.Full);

        var session = new SdBuilderSession(design);
        
        // Configure slicing on Observation.component
        session.ConfigureSlicing("Observation.component", false, SlicingRules.Open, new List<SliceDiscriminator>
        {
            new SliceDiscriminator(DiscriminatorType.Pattern, "code")
        });
        
        // Add systolic slice with child constraints
        session.AddSlice("Observation.component", "systolic");
        session.SetSliceElementCardinality("Observation.component", "systolic", "valueQuantity.value", new Cardinality(1, "1"));
        session.SetSliceElementCardinality("Observation.component", "systolic", "valueQuantity.unit", new Cardinality(1, "1"));
        
        // Add diastolic slice with child constraints
        session.AddSlice("Observation.component", "diastolic");
        session.SetSliceElementCardinality("Observation.component", "diastolic", "valueQuantity.value", new Cardinality(1, "1"));
        session.SetSliceElementCardinality("Observation.component", "diastolic", "valueQuantity.unit", new Cardinality(1, "1"));

        var meta = new SdMetadata
        {
            Url = "http://example.org/fhir/StructureDefinition/BPObservation",
            Name = "BPObservation",
            Version = "1.0.0",
            Status = "draft",
            Description = "Blood Pressure Observation with systolic and diastolic components"
        };

        // Act
        var exported = SdExporter.Export(design, baseSd, meta);

        // Assert
        var differential = exported.Differential.Element;
        
        // 1. Slicing parent should be present
        var slicingParent = differential.FirstOrDefault(e => e.Path == "Observation.component" && e.Slicing != null);
        Assert.NotNull(slicingParent);
        
        // 2. Systolic slice root
        var systolicRoot = differential.FirstOrDefault(e => e.Path == "Observation.component" && e.SliceName == "systolic");
        Assert.NotNull(systolicRoot);
        Assert.Equal("Observation.component:systolic", systolicRoot.ElementId);
        
        // 3. Systolic child constraints (in deterministic order: value before unit)
        var systolicValue = differential.FirstOrDefault(e => 
            e.Path == "Observation.component.valueQuantity.value" && 
            e.ElementId == "Observation.component:systolic.valueQuantity.value");
        Assert.NotNull(systolicValue);
        Assert.Equal(1, systolicValue.Min);
        Assert.Equal("1", systolicValue.Max);
        
        var systolicUnit = differential.FirstOrDefault(e => 
            e.Path == "Observation.component.valueQuantity.unit" && 
            e.ElementId == "Observation.component:systolic.valueQuantity.unit");
        Assert.NotNull(systolicUnit);
        Assert.Equal(1, systolicUnit.Min);
        Assert.Equal("1", systolicUnit.Max);
        
        // 4. Diastolic slice root
        var diastolicRoot = differential.FirstOrDefault(e => e.Path == "Observation.component" && e.SliceName == "diastolic");
        Assert.NotNull(diastolicRoot);
        Assert.Equal("Observation.component:diastolic", diastolicRoot.ElementId);
        
        // 5. Diastolic child constraints
        var diastolicValue = differential.FirstOrDefault(e => 
            e.Path == "Observation.component.valueQuantity.value" && 
            e.ElementId == "Observation.component:diastolic.valueQuantity.value");
        Assert.NotNull(diastolicValue);
        Assert.Equal(1, diastolicValue.Min);
        Assert.Equal("1", diastolicValue.Max);
        
        var diastolicUnit = differential.FirstOrDefault(e => 
            e.Path == "Observation.component.valueQuantity.unit" && 
            e.ElementId == "Observation.component:diastolic.valueQuantity.unit");
        Assert.NotNull(diastolicUnit);
        Assert.Equal(1, diastolicUnit.Min);
        Assert.Equal("1", diastolicUnit.Max);
        
        // 6. Verify deterministic ordering: slicing parent → (slice root + children) per slice
        var componentElements = differential.Where(e => e.Path.StartsWith("Observation.component")).ToList();
        var orderedElementIds = componentElements.Select(e => e.ElementId).ToList();
        
        var expectedOrder = new[]
        {
            "Observation.component",  // Slicing parent
            "Observation.component:diastolic",  // Slice root (alphabetical)
            "Observation.component:diastolic.valueQuantity.unit",  // Diastolic children (alphabetical)
            "Observation.component:diastolic.valueQuantity.value",
            "Observation.component:systolic",  // Slice root
            "Observation.component:systolic.valueQuantity.unit",  // Systolic children (alphabetical)
            "Observation.component:systolic.valueQuantity.value"
        };
        
        Assert.Equal(expectedOrder, orderedElementIds);
    }

    private StructureDefinition GetPatientStructureDefinition()
    {
        var resolver = ZipSource.CreateValidationSource();
        var patientSd = resolver.ResolveByCanonicalUri("http://hl7.org/fhir/StructureDefinition/Patient") as StructureDefinition;
        
        if (patientSd == null)
            throw new InvalidOperationException("Failed to load Patient StructureDefinition");
        
        return patientSd;
    }

    private StructureDefinition GetObservationStructureDefinition()
    {
        var resolver = ZipSource.CreateValidationSource();
        var observationSd = resolver.ResolveByCanonicalUri("http://hl7.org/fhir/StructureDefinition/Observation") as StructureDefinition;
        
        if (observationSd == null)
            throw new InvalidOperationException("Failed to load Observation StructureDefinition");
        
        return observationSd;
    }
}
