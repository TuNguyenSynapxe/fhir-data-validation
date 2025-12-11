using Hl7.Fhir.Model;
using Pss.FhirProcessor.Engine.Interfaces;
using Pss.FhirProcessor.Engine.Services;
using Xunit;

namespace Pss.FhirProcessor.Engine.Tests;

public class SmartPathNavigationServiceTests
{
    private readonly ISmartPathNavigationService _service;

    public SmartPathNavigationServiceTests()
    {
        _service = new SmartPathNavigationService();
    }

    [Fact]
    public async System.Threading.Tasks.Task ResolvePathAsync_SimpleDirectProperty_ReturnsCorrectNavigation()
    {
        // Arrange
        var bundle = TestHelper.CreateSimplePatientBundle(familyName: "Smith");
        var path = "name.family";

        // Act
        var result = await _service.ResolvePathAsync(bundle, path);

        // Assert
        Assert.True(result.Exists);
        Assert.Empty(result.MissingParents);
        Assert.NotNull(result.JsonPointer);
        // Path "name.family" expands to "name[0].family" since name is an array
        Assert.Equal("/entry/0/resource/name/0/family", result.JsonPointer);
        Assert.Contains("name[0]", result.Breadcrumbs);
        Assert.Contains("family", result.Breadcrumbs);
    }

    [Fact]
    public async System.Threading.Tasks.Task ResolvePathAsync_ArrayWithIndex_ReturnsCorrectPointer()
    {
        // Arrange
        var bundle = TestHelper.CreateSimplePatientBundle(familyName: "Doe");
        var path = "name[0].family";

        // Act
        var result = await _service.ResolvePathAsync(bundle, path);

        // Assert
        Assert.True(result.Exists);
        Assert.Empty(result.MissingParents);
        Assert.NotNull(result.JsonPointer);
        Assert.Contains("name[0]", result.Breadcrumbs);
        Assert.Contains("family", result.Breadcrumbs);
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
        var result = await _service.ResolvePathAsync(bundle, path);

        // Assert
        Assert.True(result.Exists);
        Assert.Empty(result.MissingParents);
        Assert.NotNull(result.JsonPointer);
        // where() clause resolves to specific array index
        Assert.Equal("/entry/0/resource/identifier/1/value", result.JsonPointer);
        Assert.Contains("identifier[1]", result.Breadcrumbs);
        Assert.Contains("value", result.Breadcrumbs);
    }

    [Fact]
    public async System.Threading.Tasks.Task ResolvePathAsync_MissingLeafElement_ReturnsExistsFalse()
    {
        // Arrange
        var bundle = TestHelper.CreateSimplePatientBundle(familyName: "Smith");
        var path = "birthDate";

        // Act
        var result = await _service.ResolvePathAsync(bundle, path);

        // Assert
        Assert.False(result.Exists);
        Assert.Single(result.MissingParents);
        Assert.Contains("birthDate", result.MissingParents);
        Assert.NotNull(result.JsonPointer);
        // Pointer should be at nearest existing parent
    }

    [Fact]
    public async System.Threading.Tasks.Task ResolvePathAsync_MissingMultiLevelParent_ReturnsMultipleMissingParents()
    {
        // Arrange
        var bundle = TestHelper.CreateSimplePatientBundle(familyName: "Smith");
        var path = "extension[0].valueCodeableConcept.coding[0].code";

        // Act
        var result = await _service.ResolvePathAsync(bundle, path);

        // Assert
        Assert.False(result.Exists);
        Assert.NotEmpty(result.MissingParents);
        // Should have multiple missing parents since extension doesn't exist
        Assert.True(result.MissingParents.Count >= 1);
        Assert.Contains("extension[0]", result.MissingParents);
    }

    [Fact]
    public async System.Threading.Tasks.Task ResolvePathAsync_ArrayOutOfBounds_ReturnsExistsFalse()
    {
        // Arrange
        var bundle = TestHelper.CreateSimplePatientBundle(familyName: "Doe");
        var path = "name[5].family";

        // Act
        var result = await _service.ResolvePathAsync(bundle, path);

        // Assert
        Assert.False(result.Exists);
        Assert.NotEmpty(result.MissingParents);
        Assert.Contains("name[5]", result.MissingParents);
    }

    [Fact]
    public async System.Threading.Tasks.Task ResolvePathAsync_WhereClauseNoMatch_ReturnsExistsFalse()
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
        var result = await _service.ResolvePathAsync(bundle, path);

        // Assert
        Assert.False(result.Exists);
        Assert.NotEmpty(result.MissingParents);
        Assert.Contains(result.MissingParents, mp => mp.Contains("where("));
    }

    [Fact]
    public async System.Threading.Tasks.Task ResolvePathAsync_BundleEntryResource_ReturnsCorrectPointer()
    {
        // Arrange
        var bundle = TestHelper.CreateSimplePatientBundle(familyName: "Johnson");
        var path = "entry[0].resource.id";

        // Act
        var result = await _service.ResolvePathAsync(bundle, path);

        // Assert
        Assert.True(result.Exists);
        Assert.Empty(result.MissingParents);
        Assert.NotNull(result.JsonPointer);
        Assert.Contains("entry[0]", result.Breadcrumbs);
        Assert.Contains("resource", result.Breadcrumbs);
        Assert.Contains("id", result.Breadcrumbs);
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
        var result = await _service.ResolvePathAsync(bundle, path);

        // Assert
        Assert.True(result.Exists);
        Assert.Empty(result.MissingParents);
        Assert.NotNull(result.JsonPointer);
        Assert.Contains("component[1]", result.Breadcrumbs);
        Assert.Contains("code", result.Breadcrumbs);
        Assert.Contains("coding[0]", result.Breadcrumbs);
    }

    [Fact]
    public async System.Threading.Tasks.Task ResolvePathAsync_InvalidFHIRPathExpression_HandlesGracefully()
    {
        // Arrange
        var bundle = TestHelper.CreateSimplePatientBundle(familyName: "Smith");
        var path = "identifier.where(system=)";

        // Act
        var result = await _service.ResolvePathAsync(bundle, path);

        // Assert
        Assert.False(result.Exists);
        Assert.NotEmpty(result.MissingParents);
        // Should not throw exception
        Assert.NotNull(result.JsonPointer);
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
    public async System.Threading.Tasks.Task ResolvePathAsync_ComplexNestedPath_ReturnsCorrectNavigation()
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
        var result = await _service.ResolvePathAsync(bundle, path);

        // Assert
        Assert.True(result.Exists);
        Assert.Empty(result.MissingParents);
        Assert.Contains("name[0]", result.Breadcrumbs);
        Assert.Contains("given[1]", result.Breadcrumbs);
    }

    [Fact]
    public async System.Threading.Tasks.Task ResolvePathAsync_EmptyBundle_HandlesGracefully()
    {
        // Arrange
        var bundle = new Bundle
        {
            Type = Bundle.BundleType.Collection,
            Entry = new List<Bundle.EntryComponent>()
        };
        var path = "entry[0].resource.id";

        // Act
        var result = await _service.ResolvePathAsync(bundle, path);

        // Assert
        Assert.False(result.Exists);
        Assert.NotEmpty(result.MissingParents);
    }

    [Fact]
    public async System.Threading.Tasks.Task ResolvePathAsync_BundlePrefixPath_NormalizesCorrectly()
    {
        // Arrange
        var bundle = TestHelper.CreateSimplePatientBundle(familyName: "Smith");
        var path = "Bundle.entry[0].resource.name.family";

        // Act
        var result = await _service.ResolvePathAsync(bundle, path);

        // Assert
        Assert.True(result.Exists);
        Assert.Contains("Bundle", result.Breadcrumbs);
    }
}
