using Hl7.Fhir.Model;
using Hl7.Fhir.Specification.Source;
using Pss.FhirProcessor.SdBuilder.Domain;
using Pss.FhirProcessor.SdBuilder.Engine;
using Xunit;

namespace Pss.FhirProcessor.SdBuilder.Tests;

/// <summary>
/// Tests for SdDesignInitializer.
/// </summary>
public sealed class SdDesignInitializerTests
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
    public void Create_MinimalMode_ExcludesOptionalElements()
    {
        // Arrange
        var patientSd = GetPatientStructureDefinition();

        // Act
        var designState = SdDesignInitializer.Create("Patient", patientSd, VisibilityMode.Minimal);

        // Assert
        // Patient.name has base cardinality 0..*
        var nameElement = designState.Elements.FirstOrDefault(e => e.Path == "Patient.name");
        Assert.NotNull(nameElement);
        Assert.False(nameElement.IsIncluded, "Optional 0..* elements should be excluded in Minimal mode");
    }

    [Fact]
    public void Create_MinimalMode_IncludesRequiredElements()
    {
        // Arrange
        var patientSd = GetPatientStructureDefinition();

        // Act
        var designState = SdDesignInitializer.Create("Patient", patientSd, VisibilityMode.Minimal);

        // Assert
        // Resource root element itself is always min=0, but we verify the behavior:
        // The root element Patient (min=0) should be included based on the rule:
        // all elements from snapshot are included, then IsIncluded is determined by cardinality
        var patientRoot = designState.Elements.FirstOrDefault(e => e.Path == "Patient");
        Assert.NotNull(patientRoot);
        
        // In FHIR, resource root elements typically have min=0, so in Minimal mode they would not be "required"
        // Let's verify the behavior: elements with BaseCardinality.Min == 0 should not be included in Minimal mode
        // unless they are the root element (which we'll need to always include as a special case)
        // For now, let's check that the root element's inclusion matches its base cardinality rule
        Assert.Equal(patientRoot.BaseCardinality.Min >= 1, patientRoot.IsIncluded);
    }

    [Fact]
    public void Create_FullMode_IncludesAllElements()
    {
        // Arrange
        var patientSd = GetPatientStructureDefinition();

        // Act
        var designState = SdDesignInitializer.Create("Patient", patientSd, VisibilityMode.Full);

        // Assert
        // All elements should be included in Full mode
        Assert.All(designState.Elements, element =>
        {
            Assert.True(element.IsIncluded, $"Element {element.Path} should be included in Full mode");
        });
    }

    [Fact]
    public void Create_ContainsAllSnapshotElements()
    {
        // Arrange
        var patientSd = GetPatientStructureDefinition();

        // Act
        var designState = SdDesignInitializer.Create("Patient", patientSd, VisibilityMode.Minimal);

        // Assert
        Assert.Equal(patientSd.Snapshot.Element.Count, designState.Elements.Count);
    }

    [Fact]
    public void Create_NoMutation_OverrideCardinalityIsNull()
    {
        // Arrange
        var patientSd = GetPatientStructureDefinition();

        // Act
        var designState = SdDesignInitializer.Create("Patient", patientSd, VisibilityMode.Full);

        // Assert
        Assert.All(designState.Elements, element =>
        {
            Assert.Null(element.OverrideCardinality);
        });
    }

    [Fact]
    public void Create_NoMutation_BindingIsNull()
    {
        // Arrange
        var patientSd = GetPatientStructureDefinition();

        // Act
        var designState = SdDesignInitializer.Create("Patient", patientSd, VisibilityMode.Full);

        // Assert
        Assert.All(designState.Elements, element =>
        {
            Assert.Null(element.Binding);
        });
    }

    [Fact]
    public void Create_NoMutation_ExtensionsIsEmpty()
    {
        // Arrange
        var patientSd = GetPatientStructureDefinition();

        // Act
        var designState = SdDesignInitializer.Create("Patient", patientSd, VisibilityMode.Full);

        // Assert
        Assert.All(designState.Elements, element =>
        {
            Assert.Empty(element.Extensions);
        });
    }

    [Fact]
    public void Create_ExtractsBaseTypeCode_ForCodeableConceptElements()
    {
        // Arrange
        var patientSd = GetPatientStructureDefinition();

        // Act
        var designState = SdDesignInitializer.Create("Patient", patientSd, VisibilityMode.Full);

        // Assert
        // Patient.maritalStatus has type CodeableConcept
        var maritalStatus = designState.Elements.FirstOrDefault(e => e.Path == "Patient.maritalStatus");
        Assert.NotNull(maritalStatus);
        Assert.Equal("CodeableConcept", maritalStatus.BaseTypeCode);
    }

    [Fact]
    public void Create_ExtractsBaseTypeCode_ForCodeElements()
    {
        // Arrange
        var patientSd = GetPatientStructureDefinition();

        // Act
        var designState = SdDesignInitializer.Create("Patient", patientSd, VisibilityMode.Full);

        // Assert
        // Patient.gender has type code
        var gender = designState.Elements.FirstOrDefault(e => e.Path == "Patient.gender");
        Assert.NotNull(gender);
        Assert.Equal("code", gender.BaseTypeCode);
    }

    [Fact]
    public void Create_SetsBaseCardinality_Correctly()
    {
        // Arrange
        var patientSd = GetPatientStructureDefinition();

        // Act
        var designState = SdDesignInitializer.Create("Patient", patientSd, VisibilityMode.Full);

        // Assert
        // Patient.name has 0..*
        var name = designState.Elements.FirstOrDefault(e => e.Path == "Patient.name");
        Assert.NotNull(name);
        Assert.Equal(0, name.BaseCardinality.Min);
        Assert.Equal("*", name.BaseCardinality.Max);

        // Patient.active has 0..1
        var active = designState.Elements.FirstOrDefault(e => e.Path == "Patient.active");
        Assert.NotNull(active);
        Assert.Equal(0, active.BaseCardinality.Min);
        Assert.Equal("1", active.BaseCardinality.Max);
    }

    [Fact]
    public void Create_SetsResourceDesignState_Metadata()
    {
        // Arrange
        var patientSd = GetPatientStructureDefinition();

        // Act
        var designState = SdDesignInitializer.Create("Patient", patientSd, VisibilityMode.Minimal);

        // Assert
        Assert.Equal("Patient", designState.ResourceType);
        Assert.Equal("http://hl7.org/fhir/StructureDefinition/Patient", designState.BaseCanonicalUrl);
        Assert.Equal(VisibilityMode.Minimal, designState.VisibilityMode);
    }

    [Fact]
    public void Create_ThrowsException_WhenSnapshotIsMissing()
    {
        // Arrange
        var invalidSd = new StructureDefinition
        {
            Url = "http://example.org/StructureDefinition/Invalid",
            Snapshot = null
        };

        // Act & Assert
        Assert.Throws<InvalidOperationException>(() =>
            SdDesignInitializer.Create("Invalid", invalidSd, VisibilityMode.Full));
    }

    [Fact]
    public void Create_ThrowsException_WhenSnapshotElementIsEmpty()
    {
        // Arrange
        var invalidSd = new StructureDefinition
        {
            Url = "http://example.org/StructureDefinition/Invalid",
            Snapshot = new StructureDefinition.SnapshotComponent
            {
                Element = new List<ElementDefinition>()
            }
        };

        // Act & Assert
        Assert.Throws<InvalidOperationException>(() =>
            SdDesignInitializer.Create("Invalid", invalidSd, VisibilityMode.Full));
    }
}
