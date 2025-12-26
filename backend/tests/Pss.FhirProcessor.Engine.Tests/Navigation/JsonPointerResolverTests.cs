using System.Text.Json;
using Pss.FhirProcessor.Engine.Navigation;
using Pss.FhirProcessor.Engine.Navigation.Structure;
using Xunit;

namespace Pss.FhirProcessor.Engine.Tests.Navigation;

/// <summary>
/// Unit tests for JsonPointerResolver - DLL-SAFE JSON-only navigation.
/// Phase 2 hardening: Lock behavior with explicit tests.
/// </summary>
public class JsonPointerResolverTests
{
    private readonly JsonPointerResolver _resolver;
    
    public JsonPointerResolverTests()
    {
        _resolver = new JsonPointerResolver(new NullFhirStructureHintProvider());
    }
    
    /// <summary>
    /// Test 1: Explicit entryIndex must be deterministic
    /// </summary>
    [Fact]
    public void Resolve_WithExplicitEntryIndex_MustPointToExactEntry()
    {
        // Arrange - Bundle with 3 entries
        var bundleJson = Parse(@"{
            ""resourceType"": ""Bundle"",
            ""entry"": [
                {
                    ""resource"": {
                        ""resourceType"": ""Patient"",
                        ""id"": ""patient-1"",
                        ""name"": [{ ""family"": ""Smith"" }]
                    }
                },
                {
                    ""resource"": {
                        ""resourceType"": ""Observation"",
                        ""id"": ""obs-1"",
                        ""status"": ""final""
                    }
                },
                {
                    ""resource"": {
                        ""resourceType"": ""Observation"",
                        ""id"": ""obs-2"",
                        ""status"": ""preliminary""
                    }
                }
            ]
        }");
        
        // Act - Request entry 2 explicitly
        var result = _resolver.Resolve(bundleJson, "status", entryIndex: 2);
        
        // Assert - Must point to entry[2], not entry[1]
        Assert.Equal("/entry/2/resource/status", result);
    }
    
    /// <summary>
    /// Test 2: Missing property must return null
    /// </summary>
    [Fact]
    public void Resolve_MissingProperty_ReturnsNull()
    {
        // Arrange
        var bundleJson = Parse(@"{
            ""resourceType"": ""Bundle"",
            ""entry"": [
                {
                    ""resource"": {
                        ""resourceType"": ""Observation"",
                        ""id"": ""obs-1"",
                        ""status"": ""final""
                    }
                }
            ]
        }");
        
        // Act - Request non-existent property
        var result = _resolver.Resolve(bundleJson, "nonExistentProperty", entryIndex: 0);
        
        // Assert - Must return null for missing property
        Assert.Null(result);
    }
    
    /// <summary>
    /// Test 3: Empty string value must return a JSON pointer (empty ≠ missing)
    /// </summary>
    [Fact]
    public void Resolve_EmptyStringValue_ReturnsPointer()
    {
        // Arrange - status is empty string ""
        var bundleJson = Parse(@"{
            ""resourceType"": ""Bundle"",
            ""entry"": [
                {
                    ""resource"": {
                        ""resourceType"": ""Observation"",
                        ""id"": ""obs-1"",
                        ""status"": """"
                    }
                }
            ]
        }");
        
        // Act - Request property with empty string value
        var result = _resolver.Resolve(bundleJson, "status", entryIndex: 0);
        
        // Assert - Empty value ≠ missing. Must return pointer.
        Assert.NotNull(result);
        Assert.Equal("/entry/0/resource/status", result);
    }
    
    /// <summary>
    /// Test 4: Array without index must default to index 0
    /// </summary>
    [Fact]
    public void Resolve_ArrayWithoutIndex_DefaultsToZero()
    {
        // Arrange - coding is an array
        var bundleJson = Parse(@"{
            ""resourceType"": ""Bundle"",
            ""entry"": [
                {
                    ""resource"": {
                        ""resourceType"": ""Observation"",
                        ""id"": ""obs-1"",
                        ""code"": {
                            ""coding"": [
                                { ""code"": ""12345"" },
                                { ""code"": ""67890"" }
                            ]
                        }
                    }
                }
            ]
        }");
        
        // Act - Request nested property within array without explicit index
        var result = _resolver.Resolve(bundleJson, "code.coding.code", entryIndex: 0);
        
        // Assert - Must default to coding[0]
        Assert.Equal("/entry/0/resource/code/coding/0/code", result);
    }
    
    /// <summary>
    /// Test 5: Array-level where() clause must work using simple equality
    /// </summary>
    [Fact]
    public void Resolve_ArrayLevelWhere_WorksWithSimpleEquality()
    {
        // Arrange - performer array with where() filter
        var bundleJson = Parse(@"{
            ""resourceType"": ""Bundle"",
            ""entry"": [
                {
                    ""resource"": {
                        ""resourceType"": ""Observation"",
                        ""id"": ""obs-1"",
                        ""performer"": [
                            { ""display"": ""Doctor A"" },
                            { ""display"": ""Doctor B"" },
                            { ""display"": ""Doctor C"" }
                        ]
                    }
                }
            ]
        }");
        
        // Act - Use where() to select performer[1]
        var result = _resolver.Resolve(bundleJson, "performer.where(display='Doctor B').display", entryIndex: 0);
        
        // Assert - Must resolve to performer[1] (second item)
        Assert.Equal("/entry/0/resource/performer/1/display", result);
    }
    
    /// <summary>
    /// Test 6: ResourceType fallback must select the first matching entry
    /// </summary>
    [Fact]
    public void Resolve_ResourceTypeFallback_SelectsFirstMatch()
    {
        // Arrange - Multiple Observation resources
        var bundleJson = Parse(@"{
            ""resourceType"": ""Bundle"",
            ""entry"": [
                {
                    ""resource"": {
                        ""resourceType"": ""Patient"",
                        ""id"": ""patient-1""
                    }
                },
                {
                    ""resource"": {
                        ""resourceType"": ""Observation"",
                        ""id"": ""obs-1"",
                        ""status"": ""final""
                    }
                },
                {
                    ""resource"": {
                        ""resourceType"": ""Observation"",
                        ""id"": ""obs-2"",
                        ""status"": ""preliminary""
                    }
                }
            ]
        }");
        
        // Act - Request Observation.status without explicit index
        var result = _resolver.Resolve(bundleJson, "Observation.status", entryIndex: null, resourceType: null);
        
        // Assert - Must select first Observation (entry[1])
        Assert.Equal("/entry/1/resource/status", result);
    }
    
    // Helper method
    private JsonElement Parse(string json)
    {
        return JsonDocument.Parse(json).RootElement;
    }
}
