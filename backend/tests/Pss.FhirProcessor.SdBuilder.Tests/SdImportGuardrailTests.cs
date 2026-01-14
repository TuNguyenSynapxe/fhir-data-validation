using Hl7.Fhir.Model;
using Hl7.Fhir.Serialization;
using Hl7.Fhir.Specification.Source;
using Pss.FhirProcessor.SdBuilder.Engine;
using Xunit;

namespace Pss.FhirProcessor.SdBuilder.Tests;

/// <summary>
/// Guardrail tests for SdImportEngine to enforce architectural constraints.
/// These tests ensure Phase 3 import functionality maintains system invariants.
/// </summary>
public sealed class SdImportGuardrailTests
{
    private static StructureDefinition GetPatientStructureDefinition()
    {
        var resolver = ZipSource.CreateValidationSource();
        var patientSd = resolver.ResolveByCanonicalUri("http://hl7.org/fhir/StructureDefinition/Patient") as StructureDefinition;
        
        if (patientSd == null)
        {
            throw new InvalidOperationException("Failed to load Patient StructureDefinition");
        }

        return patientSd;
    }

    [Fact]
    public void Import_DoesNotMutateBaseSd()
    {
        // Arrange
        var baseSd = GetPatientStructureDefinition();
        var serializer = new FhirJsonSerializer();
        
        // Serialize base SD before import
        var originalJson = serializer.SerializeToString(baseSd);

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
                        Min = 1,
                        Max = "*"
                    },
                    new ElementDefinition
                    {
                        Path = "Patient.name",
                        Min = 1,
                        Max = "1"
                    }
                }
            }
        };

        var importer = new SdImportEngine();

        // Act
        var designState = importer.Import(baseSd, profileSd);

        // Serialize base SD after import
        var currentJson = serializer.SerializeToString(baseSd);

        // Assert - Base SD must be byte-for-byte identical (no mutation)
        Assert.Equal(originalJson, currentJson);
        Assert.NotNull(designState); // Import succeeded
    }

    [Fact]
    public void Import_IgnoresSnapshot()
    {
        // Arrange
        var baseSd = GetPatientStructureDefinition();

        // Create a profile with ONLY snapshot (no differential)
        var profileWithSnapshot = new StructureDefinition
        {
            Url = "http://example.org/fhir/StructureDefinition/TestPatient",
            Type = "Patient",
            BaseDefinition = "http://hl7.org/fhir/StructureDefinition/Patient",
            Derivation = StructureDefinition.TypeDerivationRule.Constraint,
            Snapshot = new StructureDefinition.SnapshotComponent
            {
                Element = new List<ElementDefinition>
                {
                    new ElementDefinition
                    {
                        Path = "Patient",
                        Min = 1,
                        Max = "1"
                    },
                    new ElementDefinition
                    {
                        Path = "Patient.identifier",
                        Min = 1,  // This is in snapshot but NOT in differential
                        Max = "*"
                    }
                }
            }
            // Deliberately NO Differential
        };

        var importer = new SdImportEngine();

        // Act
        var designState = importer.Import(baseSd, profileWithSnapshot);

        // Assert - Snapshot should be completely ignored
        // Patient.identifier should have base cardinality (0..*), not snapshot cardinality (1..*)
        var identifierElement = designState.Elements.FirstOrDefault(e => e.Path == "Patient.identifier");
        Assert.NotNull(identifierElement);
        
        // If snapshot was used, OverrideCardinality would be set to 1..*
        // Since snapshot is ignored, OverrideCardinality should be null
        Assert.Null(identifierElement.OverrideCardinality);
        
        // Base cardinality should be unchanged from base SD
        Assert.Equal(0, identifierElement.BaseCardinality.Min);
        Assert.Equal("*", identifierElement.BaseCardinality.Max);
    }

    [Fact]
    public void Import_DoesNotCreateImplicitElements()
    {
        // Arrange
        var baseSd = GetPatientStructureDefinition();

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
                    // Only constraint on Patient.identifier
                    new ElementDefinition
                    {
                        Path = "Patient.identifier",
                        Min = 1,
                        Max = "1"
                    }
                }
            }
        };

        var importer = new SdImportEngine();

        // Act
        var designState = importer.Import(baseSd, profileSd);

        // Assert - No implicit elements should be created
        // The design state should only contain elements from the base SD initialization
        // No new elements should appear beyond what SdDesignInitializer.Create() produces
        
        // Patient.identifier should have the constraint from differential
        var identifierElement = designState.Elements.FirstOrDefault(e => e.Path == "Patient.identifier");
        Assert.NotNull(identifierElement);
        Assert.NotNull(identifierElement.OverrideCardinality);
        Assert.Equal(1, identifierElement.OverrideCardinality.Min);
        Assert.Equal("1", identifierElement.OverrideCardinality.Max);
        
        // Count of elements should match base SD snapshot (no new elements created)
        // Import should only modify existing elements, never add new ones
        var baseElementCount = baseSd.Snapshot?.Element?.Count ?? 0;
        Assert.Equal(baseElementCount, designState.Elements.Count);
        
        // Verify no "orphan" or "synthetic" elements exist
        // All paths in design state must exist in base SD snapshot
        var baseSnapshotPaths = baseSd.Snapshot?.Element?.Select(e => e.Path).ToHashSet() ?? new HashSet<string>();
        foreach (var element in designState.Elements)
        {
            Assert.Contains(element.Path, baseSnapshotPaths);
        }
    }

    [Fact]
    public void Import_SkipsUnsupportedConstraintsDeterministically()
    {
        // Arrange
        var baseSd = GetPatientStructureDefinition();

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
                    // Valid constraint - should be imported
                    new ElementDefinition
                    {
                        Path = "Patient.identifier",
                        Min = 1,
                        Max = "1"
                    },
                    // Invalid/unsupported: element not in base SD - should be skipped
                    new ElementDefinition
                    {
                        Path = "Patient.nonExistentElement",
                        Min = 1,
                        Max = "1"
                    },
                    // Valid constraint - should be imported
                    new ElementDefinition
                    {
                        Path = "Patient.name",
                        Min = 1,
                        Max = "*"
                    },
                    // Malformed: empty path - should be skipped
                    new ElementDefinition
                    {
                        Path = "",
                        Min = 1,
                        Max = "1"
                    }
                }
            }
        };

        var importer = new SdImportEngine();

        // Act - Should not throw despite unsupported constraints
        var designState = importer.Import(baseSd, profileSd);

        // Assert - Valid constraints applied, invalid ones skipped
        Assert.NotNull(designState);
        
        // Patient.identifier should have constraint (valid)
        var identifierElement = designState.Elements.FirstOrDefault(e => e.Path == "Patient.identifier");
        Assert.NotNull(identifierElement);
        Assert.NotNull(identifierElement.OverrideCardinality);
        Assert.Equal(1, identifierElement.OverrideCardinality.Min);
        Assert.Equal("1", identifierElement.OverrideCardinality.Max);
        
        // Patient.name should have constraint (valid)
        var nameElement = designState.Elements.FirstOrDefault(e => e.Path == "Patient.name");
        Assert.NotNull(nameElement);
        Assert.NotNull(nameElement.OverrideCardinality);
        Assert.Equal(1, nameElement.OverrideCardinality.Min);
        Assert.Equal("*", nameElement.OverrideCardinality.Max);
        
        // Patient.nonExistentElement should not exist in design state (skipped)
        var nonExistentElement = designState.Elements.FirstOrDefault(e => e.Path == "Patient.nonExistentElement");
        Assert.Null(nonExistentElement);
        
        // Empty path element should not cause any side effects (skipped)
        // Design state should have same element count as base SD (no new elements)
        var baseElementCount = baseSd.Snapshot?.Element?.Count ?? 0;
        Assert.Equal(baseElementCount, designState.Elements.Count);
    }
}
