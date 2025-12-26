using Hl7.Fhir.Model;
using Pss.FhirProcessor.Engine.Interfaces;
using Pss.FhirProcessor.Engine.Core;
using Pss.FhirProcessor.Engine.RuleEngines;
using Pss.FhirProcessor.Engine.Navigation;
using Pss.FhirProcessor.Engine.Firely;
using Pss.FhirProcessor.Engine.Authoring;
using Pss.FhirProcessor.Engine.Services;
using Pss.FhirProcessor.Engine.Core;
using Pss.FhirProcessor.Engine.RuleEngines;
using Pss.FhirProcessor.Engine.Navigation;
using Pss.FhirProcessor.Engine.Firely;
using Pss.FhirProcessor.Engine.Authoring;
using Xunit;

namespace Pss.FhirProcessor.Engine.Tests;

/// <summary>
/// Tests for SmartPathNavigationService after Phase 1 refactor.
/// Service now returns string? (JSON pointer only), no breadcrumbs/exists/missingParents.
/// </summary>
public class SmartPathNavigationServiceTests
{
    private readonly ISmartPathNavigationService _service;

    public SmartPathNavigationServiceTests()
    {
        _service = new SmartPathNavigationService();
    }

    [Fact]
    public async System.Threading.Tasks.Task ResolvePathAsync_SimpleDirectProperty_ReturnsCorrectPointer()
    {
        // Arrange
        var bundle = TestHelper.CreateSimplePatientBundle(familyName: "Smith");
        var path = "name.family";

        // Act
        var jsonPointer = await _service.ResolvePathAsync(bundle, path);

        // Assert - Service returns JSON pointer string
        Assert.NotNull(jsonPointer);
        // Path "name.family" expands to "name[0].family" since name is an array
        Assert.Equal("/entry/0/resource/name/0/family", jsonPointer);
    }

    [Fact]
    public async System.Threading.Tasks.Task ResolvePathAsync_ArrayWithIndex_ReturnsCorrectPointer()
    {
        // Arrange
        var bundle = TestHelper.CreateSimplePatientBundle(familyName: "Doe");
        var path = "name[0].family";

        // Act
        var jsonPointer = await _service.ResolvePathAsync(bundle, path);

        // Assert
        Assert.NotNull(jsonPointer);
        Assert.Contains("/name/0/family", jsonPointer);
    }

    [Fact]
    public async System.Threading.Tasks.Task ResolvePathAsync_WhereClauseFilter_ReturnsMatchingElement()
    {
        // Arrange
        var bundle = new Bundle
        {
            Type = Bundle.BundleType.Collection,
            Entry = new List<Bundle.EntryComponent>
            {
                new Bundle.EntryComponent
                {
                    FullUrl = "urn:uuid:patient-001",
                    Resource = new Patient
                    {
                        Id = "patient-001",
                        Identifier = new List<Identifier>
                        {
                            new Identifier
                            {
                                System = "http://example.org/mrn",
                                Value = "12345"
                            },
                            new Identifier
                            {
                                System = "http://example.org/nric",
                                Value = "S1234567D"
                            }
                        }
                    }
                }
            }
        };
        var path = "identifier.where(system='http://example.org/nric').value";

        // Act
        var jsonPointer = await _service.ResolvePathAsync(bundle, path);

        // Assert - where() clause resolves to specific array index
        Assert.NotNull(jsonPointer);
        Assert.Equal("/entry/0/resource/identifier/1/value", jsonPointer);
    }

    [Fact]
    public async System.Threading.Tasks.Task ResolvePathAsync_MissingLeafElement_ReturnsNull()
    {
        // Arrange
        var bundle = TestHelper.CreateSimplePatientBundle(familyName: "Smith");
        var path = "birthDate";

        // Act
        var jsonPointer = await _service.ResolvePathAsync(bundle, path);

        // Assert - Missing element returns null
        Assert.Null(jsonPointer);
    }

    [Fact]
    public async System.Threading.Tasks.Task ResolvePathAsync_MissingMultiLevelParent_ReturnsNull()
    {
        // Arrange
        var bundle = TestHelper.CreateSimplePatientBundle(familyName: "Smith");
        var path = "extension[0].valueCodeableConcept.coding[0].code";

        // Act
        var jsonPointer = await _service.ResolvePathAsync(bundle, path);

        // Assert - Missing parent returns null
        Assert.Null(jsonPointer);
    }

    [Fact]
    public async System.Threading.Tasks.Task ResolvePathAsync_ArrayOutOfBounds_ReturnsNull()
    {
        // Arrange
        var bundle = TestHelper.CreateSimplePatientBundle(familyName: "Doe");
        var path = "name[5].family";

        // Act
        var jsonPointer = await _service.ResolvePathAsync(bundle, path);

        // Assert
        Assert.Null(jsonPointer);
    }

    [Fact]
    public async System.Threading.Tasks.Task ResolvePathAsync_WhereClauseNoMatch_ReturnsNull()
    {
        // Arrange
        var bundle = new Bundle
        {
            Type = Bundle.BundleType.Collection,
            Entry = new List<Bundle.EntryComponent>
            {
                new Bundle.EntryComponent
                {
                    FullUrl = "urn:uuid:patient-001",
                    Resource = new Patient
                    {
                        Id = "patient-001",
                        Identifier = new List<Identifier>
                        {
                            new Identifier
                            {
                                System = "http://example.org/mrn",
                                Value = "12345"
                            }
                        }
                    }
                }
            }
        };
        var path = "identifier.where(system='http://does-not-exist.org').value";

        // Act
        var jsonPointer = await _service.ResolvePathAsync(bundle, path);

        // Assert
        Assert.Null(jsonPointer);
    }

    [Fact]
    public async System.Threading.Tasks.Task ResolvePathAsync_BundleEntryResource_ReturnsCorrectPointer()
    {
        // Arrange
        var bundle = TestHelper.CreateSimplePatientBundle(familyName: "Johnson");
        var path = "entry[0].resource.id";

        // Act
        var jsonPointer = await _service.ResolvePathAsync(bundle, path);

        // Assert
        Assert.NotNull(jsonPointer);
        Assert.Contains("/entry/0/resource/id", jsonPointer);
    }

    [Fact]
    public async System.Threading.Tasks.Task ResolvePathAsync_ObservationComponent_ReturnsCorrectPointer()
    {
        // Arrange
        var bundle = new Bundle
        {
            Type = Bundle.BundleType.Collection,
            Entry = new List<Bundle.EntryComponent>
            {
                new Bundle.EntryComponent
                {
                    FullUrl = "urn:uuid:obs-001",
                    Resource = new Observation
                    {
                        Id = "obs-001",
                        Status = ObservationStatus.Final,
                        Code = new CodeableConcept("http://loinc.org", "1234-5"),
                        Component = new List<Observation.ComponentComponent>
                        {
                            new Observation.ComponentComponent
                            {
                                Code = new CodeableConcept
                                {
                                    Coding = new List<Coding>
                                    {
                                        new Coding("http://example.org", "C1", "Component 1")
                                    }
                                }
                            },
                            new Observation.ComponentComponent
                            {
                                Code = new CodeableConcept
                                {
                                    Coding = new List<Coding>
                                    {
                                        new Coding("http://example.org", "C2", "Component 2")
                                    }
                                }
                            }
                        }
                    }
                }
            }
        };
        var path = "component[1].code.coding[0].code";

        // Act
        var jsonPointer = await _service.ResolvePathAsync(bundle, path);

        // Assert
        Assert.NotNull(jsonPointer);
        Assert.Contains("/component/1/code/coding/0/code", jsonPointer);
    }

    [Fact]
    public async System.Threading.Tasks.Task ResolvePathAsync_InvalidFHIRPathExpression_ReturnsNull()
    {
        // Arrange
        var bundle = TestHelper.CreateSimplePatientBundle(familyName: "Smith");
        var path = "identifier.where(system=)";

        // Act
        var jsonPointer = await _service.ResolvePathAsync(bundle, path);

        // Assert - Should not throw exception, returns null
        Assert.Null(jsonPointer);
    }

    [Fact]
    public async System.Threading.Tasks.Task FindEntryIndexByReference_WithFullUrl_ReturnsCorrectIndex()
    {
        // Arrange
        var bundle = new Bundle
        {
            Type = Bundle.BundleType.Collection,
            Entry = new List<Bundle.EntryComponent>
            {
                new Bundle.EntryComponent
                {
                    FullUrl = "urn:uuid:patient-001",
                    Resource = new Patient { Id = "patient-001" }
                },
                new Bundle.EntryComponent
                {
                    FullUrl = "urn:uuid:encounter-001",
                    Resource = new Encounter { Id = "encounter-001", Status = Encounter.EncounterStatus.Finished }
                }
            }
        };

        // Act
        var index = _service.FindEntryIndexByReference(bundle, "urn:uuid:encounter-001");

        // Assert
        Assert.Equal(1, index);
    }

    [Fact]
    public async System.Threading.Tasks.Task FindEntryIndexByReference_WithRelativeReference_ReturnsCorrectIndex()
    {
        // Arrange
        var bundle = new Bundle
        {
            Type = Bundle.BundleType.Collection,
            Entry = new List<Bundle.EntryComponent>
            {
                new Bundle.EntryComponent
                {
                    FullUrl = "urn:uuid:patient-001",
                    Resource = new Patient { Id = "patient-123" }
                },
                new Bundle.EntryComponent
                {
                    FullUrl = "urn:uuid:obs-001",
                    Resource = new Observation { Id = "obs-456", Status = ObservationStatus.Final }
                }
            }
        };

        // Act
        var index = _service.FindEntryIndexByReference(bundle, "Observation/obs-456");

        // Assert
        Assert.Equal(1, index);
    }

    [Fact]
    public async System.Threading.Tasks.Task FindEntryIndexByReference_NotFound_ReturnsNull()
    {
        // Arrange
        var bundle = TestHelper.CreateSimplePatientBundle();

        // Act
        var index = _service.FindEntryIndexByReference(bundle, "urn:uuid:does-not-exist");

        // Assert
        Assert.Null(index);
    }

    [Fact]
    public async System.Threading.Tasks.Task FindEntryIndexByResourceId_WithMatchingResource_ReturnsCorrectIndex()
    {
        // Arrange
        var bundle = new Bundle
        {
            Type = Bundle.BundleType.Collection,
            Entry = new List<Bundle.EntryComponent>
            {
                new Bundle.EntryComponent
                {
                    FullUrl = "urn:uuid:patient-001",
                    Resource = new Patient { Id = "patient-123" }
                },
                new Bundle.EntryComponent
                {
                    FullUrl = "urn:uuid:encounter-001",
                    Resource = new Encounter { Id = "encounter-456", Status = Encounter.EncounterStatus.Finished }
                }
            }
        };

        // Act
        var index = _service.FindEntryIndexByResourceId(bundle, "Encounter", "encounter-456");

        // Assert
        Assert.Equal(1, index);
    }

    [Fact]
    public async System.Threading.Tasks.Task FindEntryIndexByResourceId_NotFound_ReturnsNull()
    {
        // Arrange
        var bundle = TestHelper.CreateSimplePatientBundle();

        // Act
        var index = _service.FindEntryIndexByResourceId(bundle, "Observation", "obs-999");

        // Assert
        Assert.Null(index);
    }

    [Fact]
    public async System.Threading.Tasks.Task ResolvePathAsync_ComplexNestedPath_ReturnsCorrectPointer()
    {
        // Arrange
        var bundle = new Bundle
        {
            Type = Bundle.BundleType.Collection,
            Entry = new List<Bundle.EntryComponent>
            {
                new Bundle.EntryComponent
                {
                    FullUrl = "urn:uuid:patient-001",
                    Resource = new Patient
                    {
                        Id = "patient-001",
                        Name = new List<HumanName>
                        {
                            new HumanName
                            {
                                Family = "Doe",
                                Given = new[] { "John", "Michael" }
                            }
                        }
                    }
                }
            }
        };
        var path = "name[0].given[1]";

        // Act
        var jsonPointer = await _service.ResolvePathAsync(bundle, path);

        // Assert
        Assert.NotNull(jsonPointer);
        Assert.Contains("/name/0/given/1", jsonPointer);
    }

    [Fact]
    public async System.Threading.Tasks.Task ResolvePathAsync_EmptyBundle_ReturnsNull()
    {
        // Arrange
        var bundle = new Bundle
        {
            Type = Bundle.BundleType.Collection,
            Entry = new List<Bundle.EntryComponent>()
        };
        var path = "entry[0].resource.id";

        // Act
        var jsonPointer = await _service.ResolvePathAsync(bundle, path);

        // Assert
        Assert.Null(jsonPointer);
    }

    [Fact]
    public async System.Threading.Tasks.Task ResolvePathAsync_BundlePrefixPath_NormalizesCorrectly()
    {
        // Arrange
        var bundle = TestHelper.CreateSimplePatientBundle(familyName: "Smith");
        var path = "Bundle.entry[0].resource.name.family";

        // Act
        var jsonPointer = await _service.ResolvePathAsync(bundle, path);

        // Assert
        Assert.NotNull(jsonPointer);
        Assert.Contains("/entry/0/resource/name", jsonPointer);
    }
}
