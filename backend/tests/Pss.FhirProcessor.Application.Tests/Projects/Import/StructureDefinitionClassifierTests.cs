using FluentAssertions;
using Pss.FhirProcessor.Application.Projects.Import;
using Pss.FhirProcessor.Application.Projects.Import.ImportModels;
using Pss.FhirProcessor.Persistence.Models;

namespace Pss.FhirProcessor.Application.Tests.Projects.Import;

/// <summary>
/// Phase 10.2: Tests for StructureDefinition classification logic.
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
          "abstract": false,
          "differential": {
            "element": [
              {
                "id": "Patient.name",
                "path": "Patient.name",
                "min": 1
              }
            ]
          }
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
          "type": "Observation",
          "differential": {
            "element": [
              {
                "id": "Observation.status",
                "path": "Observation.status",
                "mustSupport": true
              }
            ]
          }
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
    public void Classify_BundleProfile_NotReferenced_StillPromotes_Phase102()
    {
        // Arrange - Phase 10.2: Bundle profiles promoted even without bundle references
        var json = """
        {
          "resourceType": "StructureDefinition",
          "url": "http://example.com/StructureDefinition/UnusedBundle",
          "kind": "resource",
          "type": "Bundle",
          "abstract": false,
          "derivation": "constraint"
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

        // Assert - Phase 10.2: All non-abstract Bundle profiles promoted
        result.Role.Should().Be(StructureDefinitionRole.BundleProfile);
        result.IsPromoted.Should().BeTrue();
        result.Reason.Should().Contain("Category B");
        result.Reason.Should().Contain("Bundle Profile");
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
        // Arrange - Phase 10.2: Logical models are not promoted (no differential in this example)
        var json = """
        {
          "resourceType": "StructureDefinition",
          "url": "http://example.com/StructureDefinition/MyLogicalModel",
          "kind": "logical",
          "type": "MyLogicalModel",
          "differential": {
            "element": []
          }
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
        result.Reason.Should().Contain("Supporting Artifact");
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

    // ========================================
    // Phase 10.2: Expanded Promotion Logic Tests
    // ========================================

    [Fact]
    public void Phase102_Classify_PatientProfileWithCardinality_PromotesAsValidationProfile()
    {
        // Arrange - Patient profile with cardinality constraint
        var json = """
        {
          "resourceType": "StructureDefinition",
          "url": "http://example.com/StructureDefinition/MyPatient",
          "type": "Patient",
          "abstract": false,
          "derivation": "constraint",
          "differential": {
            "element": [
              {
                "id": "Patient.name",
                "path": "Patient.name",
                "min": 1
              }
            ]
          }
        }
        """;

        var artifact = CreateArtifact(json, "http://example.com/StructureDefinition/MyPatient");
        var bundleProfileUrls = new HashSet<string>();

        // Act
        var result = _classifier.Classify(artifact, bundleProfileUrls);

        // Assert
        result.Role.Should().Be(StructureDefinitionRole.ValidationProfile);
        result.IsPromoted.Should().BeTrue();
        result.Reason.Should().Contain("actionable constraints");
    }

    [Fact]
    public void Phase102_Classify_ProfileWithMustSupport_PromotesAsValidationProfile()
    {
        // Arrange - Profile with only mustSupport
        var json = """
        {
          "resourceType": "StructureDefinition",
          "url": "http://example.com/StructureDefinition/MyObservation",
          "type": "Observation",
          "abstract": false,
          "derivation": "constraint",
          "differential": {
            "element": [
              {
                "id": "Observation.code",
                "path": "Observation.code",
                "mustSupport": true
              }
            ]
          }
        }
        """;

        var artifact = CreateArtifact(json, "http://example.com/StructureDefinition/MyObservation");
        var bundleProfileUrls = new HashSet<string>();

        // Act
        var result = _classifier.Classify(artifact, bundleProfileUrls);

        // Assert
        result.Role.Should().Be(StructureDefinitionRole.ValidationProfile);
        result.IsPromoted.Should().BeTrue();
    }

    [Fact]
    public void Phase102_Classify_ProfileWithFixedValue_PromotesAsValidationProfile()
    {
        // Arrange - Profile with fixed value
        var json = """
        {
          "resourceType": "StructureDefinition",
          "url": "http://example.com/StructureDefinition/MyEncounter",
          "type": "Encounter",
          "abstract": false,
          "derivation": "constraint",
          "differential": {
            "element": [
              {
                "id": "Encounter.status",
                "path": "Encounter.status",
                "fixedCode": "finished"
              }
            ]
          }
        }
        """;

        var artifact = CreateArtifact(json, "http://example.com/StructureDefinition/MyEncounter");
        var bundleProfileUrls = new HashSet<string>();

        // Act
        var result = _classifier.Classify(artifact, bundleProfileUrls);

        // Assert
        result.Role.Should().Be(StructureDefinitionRole.ValidationProfile);
        result.IsPromoted.Should().BeTrue();
    }

    [Fact]
    public void Phase102_Classify_ProfileWithBinding_PromotesAsValidationProfile()
    {
        // Arrange - Profile with value set binding
        var json = """
        {
          "resourceType": "StructureDefinition",
          "url": "http://example.com/StructureDefinition/MyCondition",
          "type": "Condition",
          "abstract": false,
          "derivation": "constraint",
          "differential": {
            "element": [
              {
                "id": "Condition.code",
                "path": "Condition.code",
                "binding": {
                  "strength": "required",
                  "valueSet": "http://example.com/ValueSet/conditions"
                }
              }
            ]
          }
        }
        """;

        var artifact = CreateArtifact(json, "http://example.com/StructureDefinition/MyCondition");
        var bundleProfileUrls = new HashSet<string>();

        // Act
        var result = _classifier.Classify(artifact, bundleProfileUrls);

        // Assert
        result.Role.Should().Be(StructureDefinitionRole.ValidationProfile);
        result.IsPromoted.Should().BeTrue();
    }

    [Fact]
    public void Phase102_Classify_ProfileWithInvariant_PromotesAsValidationProfile()
    {
        // Arrange - Profile with constraint/invariant
        var json = """
        {
          "resourceType": "StructureDefinition",
          "url": "http://example.com/StructureDefinition/MyProcedure",
          "type": "Procedure",
          "abstract": false,
          "derivation": "constraint",
          "differential": {
            "element": [
              {
                "id": "Procedure",
                "path": "Procedure",
                "constraint": [
                  {
                    "key": "proc-1",
                    "severity": "error",
                    "human": "Must have code",
                    "expression": "code.exists()"
                  }
                ]
              }
            ]
          }
        }
        """;

        var artifact = CreateArtifact(json, "http://example.com/StructureDefinition/MyProcedure");
        var bundleProfileUrls = new HashSet<string>();

        // Act
        var result = _classifier.Classify(artifact, bundleProfileUrls);

        // Assert
        result.Role.Should().Be(StructureDefinitionRole.ValidationProfile);
        result.IsPromoted.Should().BeTrue();
    }

    [Fact]
    public void Phase102_Classify_ProfileWithSlicing_PromotesAsValidationProfile()
    {
        // Arrange - Profile with slicing
        var json = """
        {
          "resourceType": "StructureDefinition",
          "url": "http://example.com/StructureDefinition/MyPatient",
          "type": "Patient",
          "abstract": false,
          "derivation": "constraint",
          "differential": {
            "element": [
              {
                "id": "Patient.identifier",
                "path": "Patient.identifier",
                "slicing": {
                  "discriminator": [
                    {
                      "type": "value",
                      "path": "system"
                    }
                  ],
                  "rules": "open"
                }
              }
            ]
          }
        }
        """;

        var artifact = CreateArtifact(json, "http://example.com/StructureDefinition/MyPatient");
        var bundleProfileUrls = new HashSet<string>();

        // Act
        var result = _classifier.Classify(artifact, bundleProfileUrls);

        // Assert
        result.Role.Should().Be(StructureDefinitionRole.ValidationProfile);
        result.IsPromoted.Should().BeTrue();
    }

    [Fact]
    public void Phase102_Classify_ProfileWithTypeProfile_PromotesAsValidationProfile()
    {
        // Arrange - Profile with type profile constraint
        var json = """
        {
          "resourceType": "StructureDefinition",
          "url": "http://example.com/StructureDefinition/MyObservation",
          "type": "Observation",
          "abstract": false,
          "derivation": "constraint",
          "differential": {
            "element": [
              {
                "id": "Observation.subject",
                "path": "Observation.subject",
                "type": [
                  {
                    "code": "Reference",
                    "targetProfile": [
                      "http://example.com/StructureDefinition/MyPatient"
                    ]
                  }
                ]
              }
            ]
          }
        }
        """;

        var artifact = CreateArtifact(json, "http://example.com/StructureDefinition/MyObservation");
        var bundleProfileUrls = new HashSet<string>();

        // Act
        var result = _classifier.Classify(artifact, bundleProfileUrls);

        // Assert
        result.Role.Should().Be(StructureDefinitionRole.ValidationProfile);
        result.IsPromoted.Should().BeTrue();
    }

    [Fact]
    public void Phase102_Classify_BundleProfile_PromotesAsBundleProfile()
    {
        // Arrange - Bundle profile (Phase 10.2: promoted even without bundle reference)
        var json = """
        {
          "resourceType": "StructureDefinition",
          "url": "http://example.com/StructureDefinition/MyBundle",
          "type": "Bundle",
          "abstract": false,
          "derivation": "constraint",
          "differential": {
            "element": [
              {
                "id": "Bundle.type",
                "path": "Bundle.type",
                "fixedCode": "document"
              }
            ]
          }
        }
        """;

        var artifact = CreateArtifact(json, "http://example.com/StructureDefinition/MyBundle");
        var bundleProfileUrls = new HashSet<string>(); // Empty - not referenced

        // Act
        var result = _classifier.Classify(artifact, bundleProfileUrls);

        // Assert
        result.Role.Should().Be(StructureDefinitionRole.BundleProfile);
        result.IsPromoted.Should().BeTrue();
        result.Reason.Should().Contain("Bundle Profile");
    }

    [Fact]
    public void Phase102_Classify_AbstractProfile_DoesNotPromote()
    {
        // Arrange - Abstract profile
        var json = """
        {
          "resourceType": "StructureDefinition",
          "url": "http://example.com/StructureDefinition/BasePatient",
          "type": "Patient",
          "abstract": true,
          "derivation": "constraint",
          "differential": {
            "element": [
              {
                "id": "Patient.name",
                "path": "Patient.name",
                "min": 1
              }
            ]
          }
        }
        """;

        var artifact = CreateArtifact(json, "http://example.com/StructureDefinition/BasePatient");
        var bundleProfileUrls = new HashSet<string>();

        // Act
        var result = _classifier.Classify(artifact, bundleProfileUrls);

        // Assert
        result.Role.Should().Be(StructureDefinitionRole.SupportingArtifact);
        result.IsPromoted.Should().BeFalse();
        result.Reason.Should().Contain("Abstract");
    }

    [Fact]
    public void Phase102_Classify_ExtensionSD_DoesNotPromote()
    {
        // Arrange - Extension definition
        var json = """
        {
          "resourceType": "StructureDefinition",
          "url": "http://example.com/StructureDefinition/MyExtension",
          "type": "Extension",
          "abstract": false,
          "derivation": "constraint",
          "differential": {
            "element": [
              {
                "id": "Extension.value[x]",
                "path": "Extension.value[x]",
                "type": [
                  {
                    "code": "string"
                  }
                ]
              }
            ]
          }
        }
        """;

        var artifact = CreateArtifact(json, "http://example.com/StructureDefinition/MyExtension");
        var bundleProfileUrls = new HashSet<string>();

        // Act
        var result = _classifier.Classify(artifact, bundleProfileUrls);

        // Assert
        result.Role.Should().Be(StructureDefinitionRole.SupportingArtifact);
        result.IsPromoted.Should().BeFalse();
    }

    [Fact]
    public void Phase102_Classify_LogicalModel_DoesNotPromote()
    {
        // Arrange - Logical model (kind=logical)
        var json = """
        {
          "resourceType": "StructureDefinition",
          "url": "http://example.com/StructureDefinition/MyLogicalModel",
          "kind": "logical",
          "type": "MyModel",
          "abstract": false,
          "derivation": "specialization",
          "differential": {
            "element": [
              {
                "id": "MyModel.field1",
                "path": "MyModel.field1",
                "min": 1
              }
            ]
          }
        }
        """;

        var artifact = CreateArtifact(json, "http://example.com/StructureDefinition/MyLogicalModel");
        var bundleProfileUrls = new HashSet<string>();

        // Act
        var result = _classifier.Classify(artifact, bundleProfileUrls);

        // Assert
        result.Role.Should().Be(StructureDefinitionRole.SupportingArtifact);
        result.IsPromoted.Should().BeFalse();
    }

    [Fact]
    public void Phase102_Classify_ProfileWithEmptyDifferential_DoesNotPromote()
    {
        // Arrange - Profile with no actionable constraints
        var json = """
        {
          "resourceType": "StructureDefinition",
          "url": "http://example.com/StructureDefinition/EmptyPatient",
          "type": "Patient",
          "abstract": false,
          "derivation": "constraint",
          "differential": {
            "element": []
          }
        }
        """;

        var artifact = CreateArtifact(json, "http://example.com/StructureDefinition/EmptyPatient");
        var bundleProfileUrls = new HashSet<string>();

        // Act
        var result = _classifier.Classify(artifact, bundleProfileUrls);

        // Assert
        result.Role.Should().Be(StructureDefinitionRole.SupportingArtifact);
        result.IsPromoted.Should().BeFalse();
        result.Reason.Should().Contain("No actionable constraints");
    }

    [Fact]
    public void Phase102_Classify_ProfileWithOnlyRootElement_DoesNotPromote()
    {
        // Arrange - Profile with only root element, no constraints
        var json = """
        {
          "resourceType": "StructureDefinition",
          "url": "http://example.com/StructureDefinition/MinimalPatient",
          "type": "Patient",
          "abstract": false,
          "derivation": "constraint",
          "differential": {
            "element": [
              {
                "id": "Patient",
                "path": "Patient"
              }
            ]
          }
        }
        """;

        var artifact = CreateArtifact(json, "http://example.com/StructureDefinition/MinimalPatient");
        var bundleProfileUrls = new HashSet<string>();

        // Act
        var result = _classifier.Classify(artifact, bundleProfileUrls);

        // Assert
        result.Role.Should().Be(StructureDefinitionRole.SupportingArtifact);
        result.IsPromoted.Should().BeFalse();
    }

    [Fact]
    public void Phase102_Classify_Determinism_SameInputSameOutput()
    {
        // Arrange - Same profile classified multiple times
        var json = """
        {
          "resourceType": "StructureDefinition",
          "url": "http://example.com/StructureDefinition/MyPatient",
          "type": "Patient",
          "abstract": false,
          "derivation": "constraint",
          "differential": {
            "element": [
              {
                "id": "Patient.name",
                "path": "Patient.name",
                "min": 1
              }
            ]
          }
        }
        """;

        var artifact = CreateArtifact(json, "http://example.com/StructureDefinition/MyPatient");
        var bundleProfileUrls = new HashSet<string>();

        // Act - Classify multiple times
        var result1 = _classifier.Classify(artifact, bundleProfileUrls);
        var result2 = _classifier.Classify(artifact, bundleProfileUrls);
        var result3 = _classifier.Classify(artifact, bundleProfileUrls);

        // Assert - All results identical
        result1.Role.Should().Be(result2.Role);
        result1.IsPromoted.Should().Be(result2.IsPromoted);
        result1.Reason.Should().Be(result2.Reason);

        result2.Role.Should().Be(result3.Role);
        result2.IsPromoted.Should().Be(result3.IsPromoted);
        result2.Reason.Should().Be(result3.Reason);
    }

    // Helper method for Phase 10.2 tests
    private static ParsedArtifact CreateArtifact(string json, string canonicalUrl)
    {
        return new ParsedArtifact
        {
            FilePath = "StructureDefinition/test.json",
            FileName = "test.json",
            ResourceType = "StructureDefinition",
            ArtifactType = ArtifactType.StructureDefinition,
            CanonicalUrl = canonicalUrl,
            ResourceJson = json,
            Hash = "hash"
        };
    }
}
