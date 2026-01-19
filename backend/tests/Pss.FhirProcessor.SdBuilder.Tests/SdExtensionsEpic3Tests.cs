namespace Pss.FhirProcessor.SdBuilder.Tests;

using Hl7.Fhir.Model;
using Hl7.Fhir.Specification.Source;
using Moq;
using Pss.FhirProcessor.SdBuilder.Abstractions;
using Pss.FhirProcessor.SdBuilder.Domain;
using Pss.FhirProcessor.SdBuilder.Engine;
using Xunit;

/// <summary>
/// EPIC 3: FHIR Extensions End-to-End Tests
/// Tests extension functionality implemented as specialized slicing.
/// </summary>
public sealed class SdExtensionsEpic3Tests
{
    private readonly StructureDefinition _patientSd;
    private readonly Mock<IStructureDefinitionRepository> _mockSdRepo;
    private readonly Mock<ITerminologyRegistry> _mockTerminology;

    public SdExtensionsEpic3Tests()
    {
        _patientSd = GetPatientStructureDefinition();
        _mockSdRepo = new Mock<IStructureDefinitionRepository>();
        _mockTerminology = new Mock<ITerminologyRegistry>();
    }

    #region Session Tests

    [Fact]
    public void AddSimpleExtensionToElement()
    {
        // Arrange
        var design = SdDesignInitializer.Create("Patient", _patientSd, VisibilityMode.Minimal);
        var session = new SdBuilderSession(design);
        
        var extension = new ExtensionConfig
        {
            Url = "http://hl7.org/fhir/StructureDefinition/patient-birthPlace",
            Name = "birthPlace",
            IsModifier = false,
            Cardinality = new Cardinality(0, "1"),
            ValueType = "Address"
        };

        // Act
        session.AddExtension("Patient.extension", extension);

        // Assert
        var patientExt = design.Elements.First(e => e.Path == "Patient.extension");
        Assert.Single(patientExt.Extensions);
        Assert.Equal("http://hl7.org/fhir/StructureDefinition/patient-birthPlace", patientExt.Extensions[0].Url);
        Assert.Equal("birthPlace", patientExt.Extensions[0].Name);
        Assert.True(patientExt.Extensions[0].IsSimple);
        Assert.False(patientExt.Extensions[0].IsComplex);
    }

    [Fact]
    public void AddComplexExtensionWithSubExtensions()
    {
        // Arrange
        var design = SdDesignInitializer.Create("Patient", _patientSd, VisibilityMode.Minimal);
        var session = new SdBuilderSession(design);
        
        var extension = new ExtensionConfig
        {
            Url = "http://hl7.org/fhir/StructureDefinition/patient-nationality",
            Name = "nationality",
            IsModifier = false,
            Cardinality = new Cardinality(0, "*"),
            SubExtensions = new List<ExtensionConfig>
            {
                new ExtensionConfig
                {
                    Url = "code",
                    Name = "code",
                    Cardinality = new Cardinality(1, "1"),
                    ValueType = "CodeableConcept"
                },
                new ExtensionConfig
                {
                    Url = "period",
                    Name = "period",
                    Cardinality = new Cardinality(0, "1"),
                    ValueType = "Period"
                }
            }
        };

        // Act
        session.AddExtension("Patient.extension", extension);

        // Assert
        var patientExt = design.Elements.First(e => e.Path == "Patient.extension");
        Assert.Single(patientExt.Extensions);
        Assert.True(patientExt.Extensions[0].IsComplex);
        Assert.False(patientExt.Extensions[0].IsSimple);
        Assert.NotNull(patientExt.Extensions[0].SubExtensions);
        Assert.Equal(2, patientExt.Extensions[0].SubExtensions.Count);
    }

    [Fact]
    public void RemoveExtensionByUrl()
    {
        // Arrange
        var design = SdDesignInitializer.Create("Patient", _patientSd, VisibilityMode.Minimal);
        var session = new SdBuilderSession(design);
        
        var extension = new ExtensionConfig
        {
            Url = "http://example.org/fhir/StructureDefinition/test-extension",
            Name = "testExt",
            ValueType = "string"
        };
        
        session.AddExtension("Patient.extension", extension);
        Assert.Single(design.Elements.First(e => e.Path == "Patient.extension").Extensions);

        // Act
        var removed = session.RemoveExtension("Patient.extension", "http://example.org/fhir/StructureDefinition/test-extension");

        // Assert
        Assert.True(removed);
        Assert.Empty(design.Elements.First(e => e.Path == "Patient.extension").Extensions);
    }

    [Fact]
    public void RemoveNonExistentExtensionReturnsFalse()
    {
        // Arrange
        var design = SdDesignInitializer.Create("Patient", _patientSd, VisibilityMode.Minimal);
        var session = new SdBuilderSession(design);

        // Act
        var removed = session.RemoveExtension("Patient.extension", "http://non-existent-extension");

        // Assert
        Assert.False(removed);
    }

    #endregion

    #region Validation Tests

    [Fact]
    public async System.Threading.Tasks.Task DuplicateExtensionUrlRejected()
    {
        // Arrange
        var design = SdDesignInitializer.Create("Patient", _patientSd, VisibilityMode.Minimal);
        var session = new SdBuilderSession(design);
        
        var ext1 = new ExtensionConfig
        {
            Url = "http://example.org/duplicate",
            Name = "dup1",
            ValueType = "string"
        };
        
        var ext2 = new ExtensionConfig
        {
            Url = "http://example.org/duplicate",  // Duplicate URL
            Name = "dup2",
            ValueType = "string"
        };
        
        session.AddExtension("Patient.extension", ext1);
        session.AddExtension("Patient.extension", ext2);

        // Act
        var result = await SdDesignValidator.ValidateAsync(
            design,
            _mockSdRepo.Object,
            _mockTerminology.Object,
            CancellationToken.None);

        // Assert
        Assert.True(result.HasErrors);
        Assert.Contains(result.Issues, i => i.Code == "EXTENSION_DUPLICATE_URL");
    }

    [Fact]
    public async System.Threading.Tasks.Task ModifierExtensionRaisesWarning()
    {
        // Arrange
        var design = SdDesignInitializer.Create("Patient", _patientSd, VisibilityMode.Minimal);
        var session = new SdBuilderSession(design);
        
        var extension = new ExtensionConfig
        {
            Url = "http://example.org/modifier-ext",
            Name = "modifierExt",
            IsModifier = true,
            ValueType = "boolean"
        };
        
        session.AddExtension("Patient.modifierExtension", extension);

        // Act
        var result = await SdDesignValidator.ValidateAsync(
            design,
            _mockSdRepo.Object,
            _mockTerminology.Object,
            CancellationToken.None);

        // Assert
        Assert.False(result.HasErrors);
        Assert.Contains(result.Issues, i => 
            i.Code == "EXTENSION_IS_MODIFIER" && 
            i.Severity == SdValidationSeverity.Warning);
    }

    [Fact]
    public async System.Threading.Tasks.Task SimpleExtensionWithoutValueTypeRejected()
    {
        // Arrange
        var design = SdDesignInitializer.Create("Patient", _patientSd, VisibilityMode.Minimal);
        var session = new SdBuilderSession(design);
        
        var extension = new ExtensionConfig
        {
            Url = "http://example.org/invalid-simple",
            Name = "invalidSimple",
            ValueType = null  // Missing value type for simple extension
        };
        
        session.AddExtension("Patient.extension", extension);

        // Act
        var result = await SdDesignValidator.ValidateAsync(
            design,
            _mockSdRepo.Object,
            _mockTerminology.Object,
            CancellationToken.None);

        // Assert
        Assert.True(result.HasErrors);
        Assert.Contains(result.Issues, i => i.Code == "EXTENSION_SIMPLE_NO_VALUE_TYPE");
    }

    [Fact]
    public async System.Threading.Tasks.Task ComplexExtensionWithoutSubExtensionsRejected()
    {
        // Arrange
        var design = SdDesignInitializer.Create("Patient", _patientSd, VisibilityMode.Minimal);
        var session = new SdBuilderSession(design);
        
        var extension = new ExtensionConfig
        {
            Url = "http://example.org/invalid-complex",
            Name = "invalidComplex",
            SubExtensions = new List<ExtensionConfig>()  // Empty sub-extensions
        };
        
        session.AddExtension("Patient.extension", extension);

        // Act
        var result = await SdDesignValidator.ValidateAsync(
            design,
            _mockSdRepo.Object,
            _mockTerminology.Object,
            CancellationToken.None);

        // Assert
        Assert.True(result.HasErrors);
        Assert.Contains(result.Issues, i => i.Code == "EXTENSION_COMPLEX_NO_SUBEXTENSIONS");
    }

    [Fact]
    public async System.Threading.Tasks.Task DuplicateSubExtensionUrlRejected()
    {
        // Arrange
        var design = SdDesignInitializer.Create("Patient", _patientSd, VisibilityMode.Minimal);
        var session = new SdBuilderSession(design);
        
        var extension = new ExtensionConfig
        {
            Url = "http://example.org/complex-with-dup-sub",
            Name = "complexWithDupSub",
            SubExtensions = new List<ExtensionConfig>
            {
                new ExtensionConfig
                {
                    Url = "sub1",
                    Name = "sub1",
                    ValueType = "string"
                },
                new ExtensionConfig
                {
                    Url = "sub1",  // Duplicate
                    Name = "sub1Dup",
                    ValueType = "string"
                }
            }
        };
        
        session.AddExtension("Patient.extension", extension);

        // Act
        var result = await SdDesignValidator.ValidateAsync(
            design,
            _mockSdRepo.Object,
            _mockTerminology.Object,
            CancellationToken.None);

        // Assert
        Assert.True(result.HasErrors);
        Assert.Contains(result.Issues, i => i.Code == "EXTENSION_DUPLICATE_SUBEXTENSION_URL");
    }

    #endregion

    #region Architecture Tests

    [Fact]
    public void ExtensionConfigHasNoFirelyReference()
    {
        // Assert: Verify domain type doesn't reference Firely
        var extensionConfigType = typeof(ExtensionConfig);
        var assembly = extensionConfigType.Assembly;
        
        Assert.DoesNotContain(assembly.GetReferencedAssemblies(), a => a.Name.Contains("Hl7.Fhir"));
    }

    [Fact]
    public void ExtensionDesignStateHasNoFirelyReference()
    {
        // Assert: Verify domain type doesn't reference Firely
        var extensionDesignStateType = typeof(ExtensionDesignState);
        var assembly = extensionDesignStateType.Assembly;
        
        Assert.DoesNotContain(assembly.GetReferencedAssemblies(), a => a.Name.Contains("Hl7.Fhir"));
    }

    #endregion

    #region Property Tests

    [Fact]
    public void IsSimpleReturnsTrueForSimpleExtension()
    {
        // Arrange
        var extension = new ExtensionConfig
        {
            Url = "http://example.org/simple",
            Name = "simple",
            ValueType = "string"
        };

        // Assert
        Assert.True(extension.IsSimple);
        Assert.False(extension.IsComplex);
    }

    [Fact]
    public void IsComplexReturnsTrueForComplexExtension()
    {
        // Arrange
        var extension = new ExtensionConfig
        {
            Url = "http://example.org/complex",
            Name = "complex",
            SubExtensions = new List<ExtensionConfig>
            {
                new ExtensionConfig
                {
                    Url = "sub",
                    Name = "sub",
                    ValueType = "string"
                }
            }
        };

        // Assert
        Assert.True(extension.IsComplex);
        Assert.False(extension.IsSimple);
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
