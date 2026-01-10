using FluentAssertions;
using Pss.FhirProcessor.Application.Projects.Import;
using Pss.FhirProcessor.Application.Projects.Import.ImportModels;
using Pss.FhirProcessor.Persistence.Models;

namespace Pss.FhirProcessor.Application.Tests.Projects.Import;

/// <summary>
/// Phase 10.0: Tests for StructureDefinition classification logic.
/// </summary>
public class StructureDefinitionClassifierTests
{
    private readonly StructureDefinitionClassifier _classifier;

    public StructureDefinitionClassifierTests()
    {
        _classifier = new StructureDefinitionClassifier();
    }

    // ========================================
    // Category A: Validation Profile Tests
    // ========================================

    [Fact]
    public void Classify_ValidationProfile_Patient_PromotesAsValidationProfile()
    {
        // Arrange
        var json = """
        {
          "resourceType": "StructureDefinition",
          "url": "http://example.com/StructureDefinition/MyPatient",
          "kind": "resource",
          "type": "Patient",
          "abstract": false
        }
        """;

        var artifact = new ParsedArtifact
        {
            FilePath = "StructureDefinition/MyPatient.json",
            FileName = "MyPatient.json",
            ResourceType = "StructureDefinition",
            ArtifactType = ArtifactType.StructureDefinition,
            CanonicalUrl = "http://example.com/StructureDefinition/MyPatient",
            ResourceJson = json,
            Hash = "hash"
        };

        var bundleProfileUrls = new HashSet<string>();

        // Act
        var result = _classifier.Classify(artifact, bundleProfileUrls);

        // Assert
        result.Role.Should().Be(StructureDefinitionRole.ValidationProfile);
        result.IsPromoted.Should().BeTrue();
        result.Reason.Should().Contain("Category A");
        result.Reason.Should().Contain("Validation Profile");
    }

    [Fact]
    public void Classify_ValidationProfile_Observation_PromotesAsValidationProfile()
    {
        // Arrange
        var json = """
        {
          "resourceType": "StructureDefinition",
          "url": "http://example.com/StructureDefinition/MyObservation",
          "kind": "resource",
          "type": "Observation"
        }
        """;

        var artifact = new ParsedArtifact
        {
            FilePath = "StructureDefinition/MyObservation.json",
            FileName = "MyObservation.json",
            ResourceType = "StructureDefinition",
            ArtifactType = ArtifactType.StructureDefinition,
            CanonicalUrl = "http://example.com/StructureDefinition/MyObservation",
            ResourceJson = json,
            Hash = "hash"
        };

        var bundleProfileUrls = new HashSet<string>();

        // Act
        var result = _classifier.Classify(artifact, bundleProfileUrls);

        // Assert
        result.Role.Should().Be(StructureDefinitionRole.ValidationProfile);
        result.IsPromoted.Should().BeTrue();
    }

    [Fact]
    public void Classify_AbstractResourceSD_DoesNotPromote()
    {
        // Arrange
        var json = """
        {
          "resourceType": "StructureDefinition",
          "url": "http://example.com/StructureDefinition/AbstractPatient",
          "kind": "resource",
          "type": "Patient",
          "abstract": true
        }
        """;

        var artifact = new ParsedArtifact
        {
            FilePath = "StructureDefinition/AbstractPatient.json",
            FileName = "AbstractPatient.json",
            ResourceType = "StructureDefinition",
            ArtifactType = ArtifactType.StructureDefinition,
            CanonicalUrl = "http://example.com/StructureDefinition/AbstractPatient",
            ResourceJson = json,
            Hash = "hash"
        };

        var bundleProfileUrls = new HashSet<string>();

        // Act
        var result = _classifier.Classify(artifact, bundleProfileUrls);

        // Assert
        result.Role.Should().Be(StructureDefinitionRole.SupportingArtifact);
        result.IsPromoted.Should().BeFalse();
        result.Reason.Should().Contain("Category C");
        result.Reason.Should().Contain("Abstract");
    }

    // ========================================
    // Category B: Bundle Profile Tests
    // ========================================

    [Fact]
    public void Classify_BundleProfile_Referenced_PromotesAsBundleProfile()
    {
        // Arrange
        var json = """
        {
          "resourceType": "StructureDefinition",
          "url": "http://example.com/StructureDefinition/MyBundle",
          "kind": "resource",
          "type": "Bundle"
        }
        """;

        var artifact = new ParsedArtifact
        {
            FilePath = "StructureDefinition/MyBundle.json",
            FileName = "MyBundle.json",
            ResourceType = "StructureDefinition",
            ArtifactType = ArtifactType.StructureDefinition,
            CanonicalUrl = "http://example.com/StructureDefinition/MyBundle",
            ResourceJson = json,
            Hash = "hash"
        };

        var bundleProfileUrls = new HashSet<string>
        {
            "http://example.com/StructureDefinition/MyBundle" // Referenced by a bundle
        };

        // Act
        var result = _classifier.Classify(artifact, bundleProfileUrls);

        // Assert
        result.Role.Should().Be(StructureDefinitionRole.BundleProfile);
        result.IsPromoted.Should().BeTrue();
        result.Reason.Should().Contain("Category B");
        result.Reason.Should().Contain("Bundle Profile");
    }

    [Fact]
    public void Classify_BundleProfile_NotReferenced_DoesNotPromote()
    {
        // Arrange
        var json = """
        {
          "resourceType": "StructureDefinition",
          "url": "http://example.com/StructureDefinition/UnusedBundle",
          "kind": "resource",
          "type": "Bundle"
        }
        """;

        var artifact = new ParsedArtifact
        {
            FilePath = "StructureDefinition/UnusedBundle.json",
            FileName = "UnusedBundle.json",
            ResourceType = "StructureDefinition",
            ArtifactType = ArtifactType.StructureDefinition,
            CanonicalUrl = "http://example.com/StructureDefinition/UnusedBundle",
            ResourceJson = json,
            Hash = "hash"
        };

        var bundleProfileUrls = new HashSet<string>(); // NOT referenced

        // Act
        var result = _classifier.Classify(artifact, bundleProfileUrls);

        // Assert
        result.Role.Should().Be(StructureDefinitionRole.SupportingArtifact);
        result.IsPromoted.Should().BeFalse();
        result.Reason.Should().Contain("Category C");
        result.Reason.Should().Contain("Unreferenced Bundle");
    }

    // ========================================
    // Category C: Supporting Artifact Tests
    // ========================================

    [Fact]
    public void Classify_Extension_DoesNotPromote()
    {
        // Arrange
        var json = """
        {
          "resourceType": "StructureDefinition",
          "url": "http://example.com/StructureDefinition/MyExtension",
          "kind": "complex-type",
          "type": "Extension"
        }
        """;

        var artifact = new ParsedArtifact
        {
            FilePath = "StructureDefinition/MyExtension.json",
            FileName = "MyExtension.json",
            ResourceType = "StructureDefinition",
            ArtifactType = ArtifactType.StructureDefinition,
            CanonicalUrl = "http://example.com/StructureDefinition/MyExtension",
            ResourceJson = json,
            Hash = "hash"
        };

        var bundleProfileUrls = new HashSet<string>();

        // Act
        var result = _classifier.Classify(artifact, bundleProfileUrls);

        // Assert
        result.Role.Should().Be(StructureDefinitionRole.SupportingArtifact);
        result.IsPromoted.Should().BeFalse();
        result.Reason.Should().Contain("Category C");
    }

    [Fact]
    public void Classify_LogicalModel_DoesNotPromote()
    {
        // Arrange
        var json = """
        {
          "resourceType": "StructureDefinition",
          "url": "http://example.com/StructureDefinition/MyLogicalModel",
          "kind": "logical",
          "type": "MyLogicalModel"
        }
        """;

        var artifact = new ParsedArtifact
        {
            FilePath = "StructureDefinition/MyLogicalModel.json",
            FileName = "MyLogicalModel.json",
            ResourceType = "StructureDefinition",
            ArtifactType = ArtifactType.StructureDefinition,
            CanonicalUrl = "http://example.com/StructureDefinition/MyLogicalModel",
            ResourceJson = json,
            Hash = "hash"
        };

        var bundleProfileUrls = new HashSet<string>();

        // Act
        var result = _classifier.Classify(artifact, bundleProfileUrls);

        // Assert
        result.Role.Should().Be(StructureDefinitionRole.SupportingArtifact);
        result.IsPromoted.Should().BeFalse();
        result.Reason.Should().Contain("Category C");
        result.Reason.Should().Contain("kind=logical");
    }

    [Fact]
    public void Classify_MissingKindAndType_DoesNotPromote()
    {
        // Arrange
        var json = """
        {
          "resourceType": "StructureDefinition",
          "url": "http://example.com/StructureDefinition/Incomplete"
        }
        """;

        var artifact = new ParsedArtifact
        {
            FilePath = "StructureDefinition/Incomplete.json",
            FileName = "Incomplete.json",
            ResourceType = "StructureDefinition",
            ArtifactType = ArtifactType.StructureDefinition,
            CanonicalUrl = "http://example.com/StructureDefinition/Incomplete",
            ResourceJson = json,
            Hash = "hash"
        };

        var bundleProfileUrls = new HashSet<string>();

        // Act
        var result = _classifier.Classify(artifact, bundleProfileUrls);

        // Assert
        result.Role.Should().Be(StructureDefinitionRole.SupportingArtifact);
        result.IsPromoted.Should().BeFalse();
        result.Reason.Should().Contain("Category C");
    }

    // ========================================
    // Bundle Profile URL Extraction Tests
    // ========================================

    [Fact]
    public void ExtractBundleProfileUrls_MultipleBundles_ReturnsAllUrls()
    {
        // Arrange
        var bundle1Json = """
        {
          "resourceType": "Bundle",
          "meta": {
            "profile": [
              "http://example.com/StructureDefinition/Bundle1",
              "http://example.com/StructureDefinition/Bundle2"
            ]
          }
        }
        """;

        var bundle2Json = """
        {
          "resourceType": "Bundle",
          "meta": {
            "profile": [
              "http://example.com/StructureDefinition/Bundle2",
              "http://example.com/StructureDefinition/Bundle3"
            ]
          }
        }
        """;

        var bundles = new List<ParsedBundle>
        {
            new() { FilePath = "bundle1.json", FileName = "bundle1.json", Name = "bundle1", BundleJson = bundle1Json },
            new() { FilePath = "bundle2.json", FileName = "bundle2.json", Name = "bundle2", BundleJson = bundle2Json }
        };

        // Act
        var profileUrls = _classifier.ExtractBundleProfileUrls(bundles);

        // Assert
        profileUrls.Should().HaveCount(3);
        profileUrls.Should().Contain("http://example.com/StructureDefinition/Bundle1");
        profileUrls.Should().Contain("http://example.com/StructureDefinition/Bundle2");
        profileUrls.Should().Contain("http://example.com/StructureDefinition/Bundle3");
    }

    [Fact]
    public void ExtractBundleProfileUrls_NoMeta_ReturnsEmpty()
    {
        // Arrange
        var bundleJson = """
        {
          "resourceType": "Bundle"
        }
        """;

        var bundles = new List<ParsedBundle>
        {
            new() { FilePath = "bundle.json", FileName = "bundle.json", Name = "bundle", BundleJson = bundleJson }
        };

        // Act
        var profileUrls = _classifier.ExtractBundleProfileUrls(bundles);

        // Assert
        profileUrls.Should().BeEmpty();
    }

    [Fact]
    public void ExtractBundleProfileUrls_EmptyProfileArray_ReturnsEmpty()
    {
        // Arrange
        var bundleJson = """
        {
          "resourceType": "Bundle",
          "meta": {
            "profile": []
          }
        }
        """;

        var bundles = new List<ParsedBundle>
        {
            new() { FilePath = "bundle.json", FileName = "bundle.json", Name = "bundle", BundleJson = bundleJson }
        };

        // Act
        var profileUrls = _classifier.ExtractBundleProfileUrls(bundles);

        // Assert
        profileUrls.Should().BeEmpty();
    }

    [Fact]
    public void Classify_NonStructureDefinition_ThrowsException()
    {
        // Arrange
        var json = """{"resourceType":"ValueSet"}""";

        var artifact = new ParsedArtifact
        {
            FilePath = "ValueSet/test.json",
            FileName = "test.json",
            ResourceType = "ValueSet",
            ArtifactType = ArtifactType.ValueSet,
            CanonicalUrl = "http://example.com/ValueSet/test",
            ResourceJson = json,
            Hash = "hash"
        };

        var bundleProfileUrls = new HashSet<string>();

        // Act & Assert
        var exception = Assert.Throws<ArgumentException>(() => _classifier.Classify(artifact, bundleProfileUrls));
        exception.Message.Should().Contain("must be a StructureDefinition");
    }
}
