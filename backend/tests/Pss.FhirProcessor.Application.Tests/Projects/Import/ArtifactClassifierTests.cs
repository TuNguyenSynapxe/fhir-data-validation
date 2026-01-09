using FluentAssertions;
using Pss.FhirProcessor.Application.Projects.Import;
using Pss.FhirProcessor.Application.Projects.Import.ImportModels;
using Pss.FhirProcessor.Application.Projects.Import.Errors;
using Pss.FhirProcessor.Persistence.Models;

namespace Pss.FhirProcessor.Application.Tests.Projects.Import;

public class ArtifactClassifierTests
{
    private readonly ArtifactClassifier _classifier;

    public ArtifactClassifierTests()
    {
        _classifier = new ArtifactClassifier();
    }

    [Fact]
    public void Classify_StructureDefinition_Success()
    {
        // Arrange
        var json = """
        {
          "resourceType": "StructureDefinition",
          "url": "http://example.com/StructureDefinition/Patient",
          "name": "PatientProfile"
        }
        """;

        // Act
        var artifact = _classifier.Classify("StructureDefinition/Patient.json", json);

        // Assert
        artifact.FilePath.Should().Be("StructureDefinition/Patient.json");
        artifact.FileName.Should().Be("Patient.json");
        artifact.ResourceType.Should().Be("StructureDefinition");
        artifact.ArtifactType.Should().Be(ArtifactType.StructureDefinition);
        artifact.CanonicalUrl.Should().Be("http://example.com/StructureDefinition/Patient");
        artifact.Hash.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public void Classify_ValueSet_Success()
    {
        // Arrange
        var json = """
        {
          "resourceType": "ValueSet",
          "url": "http://example.com/ValueSet/example"
        }
        """;

        // Act
        var artifact = _classifier.Classify("ValueSet/example.json", json);

        // Assert
        artifact.ResourceType.Should().Be("ValueSet");
        artifact.ArtifactType.Should().Be(ArtifactType.ValueSet);
    }

    [Fact]
    public void Classify_Bundle_Success()
    {
        // Arrange
        var json = """
        {
          "resourceType": "Bundle",
          "type": "transaction"
        }
        """;

        // Act
        var artifact = _classifier.Classify("examples/bundle.json", json);

        // Assert
        artifact.ResourceType.Should().Be("Bundle");
        artifact.ArtifactType.Should().Be(ArtifactType.Bundle);
    }

    [Fact]
    public void Classify_MissingResourceType_ThrowsException()
    {
        // Arrange
        var json = """
        {
          "name": "Invalid"
        }
        """;

        // Act & Assert
        var exception = Assert.Throws<ProjectImportException>(
            () => _classifier.Classify("invalid.json", json));

        exception.ErrorCode.Should().Be(ImportErrorCodes.InvalidJsonFile);
        exception.Message.Should().Contain("Missing 'resourceType'");
    }

    [Fact]
    public void Classify_InvalidJson_ThrowsException()
    {
        // Arrange
        var json = "{ invalid json";

        // Act & Assert
        var exception = Assert.Throws<ProjectImportException>(
            () => _classifier.Classify("invalid.json", json));

        exception.ErrorCode.Should().Be(ImportErrorCodes.InvalidJsonFile);
    }

    [Fact]
    public void IdentifyBundles_FromArtifacts_ReturnsMatches()
    {
        // Arrange
        var sdJson = """{"resourceType":"StructureDefinition"}""";
        var bundleJson = """{"resourceType":"Bundle","id":"example-bundle"}""";

        var artifacts = new List<ParsedArtifact>
        {
            _classifier.Classify("StructureDefinition/Patient.json", sdJson),
            _classifier.Classify("examples/bundle.json", bundleJson)
        };

        // Act
        var bundles = _classifier.IdentifyBundles(artifacts);

        // Assert
        bundles.Should().HaveCount(1);
        bundles[0].Name.Should().Be("example-bundle");
        bundles[0].FileName.Should().Be("bundle.json");
    }

    [Theory]
    [InlineData("StructureDefinition", ArtifactType.StructureDefinition)]
    [InlineData("ValueSet", ArtifactType.ValueSet)]
    [InlineData("CodeSystem", ArtifactType.CodeSystem)]
    [InlineData("Bundle", ArtifactType.Bundle)]
    [InlineData("ImplementationGuide", ArtifactType.Guide)]
    [InlineData("SearchParameter", ArtifactType.Other)]
    [InlineData("Unknown", ArtifactType.Other)]
    public void Classify_DifferentResourceTypes_CorrectClassification(
        string resourceType,
        ArtifactType expectedType)
    {
        // Arrange
        var json = $$$"""{"resourceType":"{{{resourceType}}}"}""";

        // Act
        var artifact = _classifier.Classify("test.json", json);

        // Assert
        artifact.ArtifactType.Should().Be(expectedType);
    }
}
