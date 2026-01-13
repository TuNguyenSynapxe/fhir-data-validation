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

    private StructureDefinition GetPatientStructureDefinition()
    {
        var resolver = ZipSource.CreateValidationSource();
        var patientSd = resolver.ResolveByCanonicalUri("http://hl7.org/fhir/StructureDefinition/Patient") as StructureDefinition;
        
        if (patientSd == null)
            throw new InvalidOperationException("Failed to load Patient StructureDefinition");
        
        return patientSd;
    }
}
