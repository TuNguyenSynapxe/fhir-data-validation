using Hl7.Fhir.Model;
using Pss.FhirProcessor.Engine.Services;
using Xunit;
using Task = System.Threading.Tasks.Task;

namespace Pss.FhirProcessor.Engine.Tests;

/// <summary>
/// Tests for resource-level where() functionality in SmartPathNavigationService
/// Resource-level where() filters Bundle.entry BEFORE JSON traversal
/// </summary>
public class SmartPathNavigationService_ResourceLevelWhereTests
{
    private readonly SmartPathNavigationService _service;

    public SmartPathNavigationService_ResourceLevelWhereTests()
    {
        _service = new SmartPathNavigationService();
    }

    [Fact]
    public async Task ResourceLevelWhere_MatchesEntry_ReturnsPointerToChildProperty()
    {
        // Arrange - multiple Observations, resource-level where() filters to specific entry
        var obs1 = new Observation
        {
            Id = "obs-001",
            Status = ObservationStatus.Final,
            Code = new CodeableConcept
            {
                Coding = new List<Coding>
                {
                    new Coding { Code = "ABC" }
                }
            },
            Performer = new List<ResourceReference>
            {
                new ResourceReference { Display = "Wrong Observation" }
            }
        };
        
        var obs2 = new Observation
        {
            Id = "obs-002",
            Status = ObservationStatus.Final,
            Code = new CodeableConcept
            {
                Coding = new List<Coding>
                {
                    new Coding { Code = "HS" } // This matches the where()
                }
            },
            Performer = new List<ResourceReference>
            {
                new ResourceReference { Display = "" } // Empty display
            }
        };
        
        var bundle = new Bundle
        {
            Type = Bundle.BundleType.Collection,
            Entry = new List<Bundle.EntryComponent>
            {
                new Bundle.EntryComponent { FullUrl = "urn:uuid:obs-001", Resource = obs1 },
                new Bundle.EntryComponent { FullUrl = "urn:uuid:obs-002", Resource = obs2 }
            }
        };
        
        // Resource-level where() - filters Bundle.entry, NOT JSON property
        var path = "Observation.where(code.coding.code='HS').performer.display";

        // Act
        var jsonPointer = await _service.ResolvePathAsync(bundle, path);

        // Assert - should resolve to entry[1] (obs-002) and navigate to performer.display
        // Even though display is empty (""), it's structurally present → return pointer
        Assert.Equal("/entry/1/resource/performer/0/display", jsonPointer);
    }
    
    [Fact]
    public async Task ResourceLevelWhere_NoMatch_ReturnsNull()
    {
        // Arrange
        var obs1 = new Observation
        {
            Id = "obs-001",
            Status = ObservationStatus.Final,
            Code = new CodeableConcept
            {
                Coding = new List<Coding>
                {
                    new Coding { Code = "ABC" }
                }
            }
        };
        
        var bundle = new Bundle
        {
            Type = Bundle.BundleType.Collection,
            Entry = new List<Bundle.EntryComponent>
            {
                new Bundle.EntryComponent { FullUrl = "urn:uuid:obs-001", Resource = obs1 }
            }
        };
        
        // Resource-level where() that doesn't match any entry
        var path = "Observation.where(code.coding.code='NONEXISTENT').performer.display";

        // Act
        var jsonPointer = await _service.ResolvePathAsync(bundle, path);

        // Assert - no entry matches where() → null
        Assert.Null(jsonPointer);
    }
    
    [Fact]
    public async Task ResourceLevelWhere_MissingChildProperty_ReturnsNull()
    {
        // Arrange
        var obs = new Observation
        {
            Id = "obs-001",
            Status = ObservationStatus.Final,
            Code = new CodeableConcept
            {
                Coding = new List<Coding>
                {
                    new Coding { Code = "HS" }
                }
            }
            // NO performer property
        };
        
        var bundle = new Bundle
        {
            Type = Bundle.BundleType.Collection,
            Entry = new List<Bundle.EntryComponent>
            {
                new Bundle.EntryComponent { FullUrl = "urn:uuid:obs-001", Resource = obs }
            }
        };
        
        // Resource-level where() matches entry, but child property (performer) doesn't exist
        var path = "Observation.where(code.coding.code='HS').performer.display";

        // Act
        var jsonPointer = await _service.ResolvePathAsync(bundle, path);

        // Assert - where() matches, but performer is structurally missing → null
        Assert.Null(jsonPointer);
    }
    
    [Fact]
    public async Task ResourceLevelWhere_WithEmptyValue_ReturnsPointer()
    {
        // Arrange
        var obs = new Observation
        {
            Id = "obs-001",
            Status = ObservationStatus.Final,
            Code = new CodeableConcept
            {
                Coding = new List<Coding>
                {
                    new Coding { Code = "HS" }
                }
            },
            Performer = new List<ResourceReference>
            {
                new ResourceReference { Display = "" } // Empty value
            }
        };
        
        var bundle = new Bundle
        {
            Type = Bundle.BundleType.Collection,
            Entry = new List<Bundle.EntryComponent>
            {
                new Bundle.EntryComponent { FullUrl = "urn:uuid:obs-001", Resource = obs }
            }
        };
        
        // Resource-level where() matches, display is empty but exists
        var path = "Observation.where(code.coding.code='HS').performer.display";

        // Act
        var jsonPointer = await _service.ResolvePathAsync(bundle, path);

        // Assert - display property exists (even if empty) → return pointer
        Assert.Equal("/entry/0/resource/performer/0/display", jsonPointer);
    }
    
    [Fact]
    public async Task ResourceLevelWhere_MultipleResources_SelectsCorrectEntry()
    {
        // Arrange - multiple different resource types
        var patient = new Patient { Id = "pat-001", Active = true };
        var obs1 = new Observation
        {
            Id = "obs-001",
            Status = ObservationStatus.Final,
            Code = new CodeableConcept
            {
                Coding = new List<Coding> { new Coding { Code = "ABC" } }
            }
        };
        var obs2 = new Observation
        {
            Id = "obs-002",
            Status = ObservationStatus.Final,
            Code = new CodeableConcept
            {
                Coding = new List<Coding> { new Coding { Code = "HS" } }
            },
            Subject = new ResourceReference { Reference = "Patient/pat-001" }
        };
        var obs3 = new Observation
        {
            Id = "obs-003",
            Status = ObservationStatus.Final,
            Code = new CodeableConcept
            {
                Coding = new List<Coding> { new Coding { Code = "XYZ" } }
            }
        };
        
        var bundle = new Bundle
        {
            Type = Bundle.BundleType.Collection,
            Entry = new List<Bundle.EntryComponent>
            {
                new Bundle.EntryComponent { FullUrl = "urn:uuid:pat-001", Resource = patient },
                new Bundle.EntryComponent { FullUrl = "urn:uuid:obs-001", Resource = obs1 },
                new Bundle.EntryComponent { FullUrl = "urn:uuid:obs-002", Resource = obs2 },
                new Bundle.EntryComponent { FullUrl = "urn:uuid:obs-003", Resource = obs3 }
            }
        };
        
        // Resource-level where() should select obs2 (entry index 2)
        var path = "Observation.where(code.coding.code='HS').subject.reference";

        // Act
        var jsonPointer = await _service.ResolvePathAsync(bundle, path);

        // Assert - should resolve to entry[2] (obs-002)
        Assert.Equal("/entry/2/resource/subject/reference", jsonPointer);
    }
}
