using Hl7.Fhir.Model;
using Hl7.Fhir.Serialization;
using Pss.FhirProcessor.Engine.Services;
using System.Text.Json;
using Xunit;

namespace Pss.FhirProcessor.Engine.Tests;

/// <summary>
/// Tests for tolerant object-vs-array handling in SmartPathNavigationService.
/// These tests verify that navigation works even when FHIR data has objects where arrays should be.
/// This is NAVIGATION-ONLY tolerance - validation must still report errors elsewhere.
/// </summary>
public class SmartPathNavigationService_TolerantObjectTests
{
    private readonly SmartPathNavigationService _service = new();

    [Fact]
    public async System.Threading.Tasks.Task PerformerAsObject_NotArray_NavigatesToDisplay()
    {
        // Arrange: Bundle with performer as OBJECT (FHIR spec violation, but common in real data)
        // This simulates the exact structure from the user's project JSON
        var bundleJson = """
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [
            {
              "fullUrl": "urn:uuid:obs-001",
              "resource": {
                "resourceType": "Observation",
                "id": "obs-001",
                "status": "final",
                "code": {
                  "coding": [
                    {
                      "system": "https://fhir.synapxe.sg/CodeSystem/screening-type",
                      "code": "HS"
                    }
                  ]
                },
                "performer": {
                  "reference": "urn:uuid:org-001",
                  "display": ""
                }
              }
            }
          ]
        }
        """;

        var parser = new FhirJsonParser();
        var bundle = parser.Parse<Bundle>(bundleJson);
        var path = "Observation.where(code.coding.code='HS').performer.display";

        // Act
        var jsonPointer = await _service.ResolvePathAsync(bundle, path, "Observation", null, CancellationToken.None);

        // Assert: Should navigate successfully and return pointer to display
        // The tolerant handler treats the object as array[0]
        Assert.NotNull(jsonPointer);
        Assert.Equal("/entry/0/resource/performer/0/display", jsonPointer);
    }

    [Fact]
    public async System.Threading.Tasks.Task PerformerAsObject_NotArray_NavigatesToReference()
    {
        // Arrange
        var bundleJson = """
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [
            {
              "fullUrl": "urn:uuid:obs-001",
              "resource": {
                "resourceType": "Observation",
                "id": "obs-001",
                "status": "final",
                "code": {
                  "coding": [
                    {
                      "system": "https://fhir.synapxe.sg/CodeSystem/screening-type",
                      "code": "HS"
                    }
                  ]
                },
                "performer": {
                  "reference": "urn:uuid:org-001",
                  "display": "ABC Clinic"
                }
              }
            }
          ]
        }
        """;

        var parser = new FhirJsonParser();
        var bundle = parser.Parse<Bundle>(bundleJson);
        var path = "Observation.where(code.coding.code='HS').performer.reference";

        // Act
        var jsonPointer = await _service.ResolvePathAsync(bundle, path, "Observation", null, CancellationToken.None);

        // Assert
        Assert.NotNull(jsonPointer);
        Assert.Equal("/entry/0/resource/performer/0/reference", jsonPointer);
    }

    [Fact]
    public async System.Threading.Tasks.Task PerformerAsObject_LastSegment_ReturnsPointerWithoutIndex()
    {
        // Arrange
        var bundleJson = """
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [
            {
              "fullUrl": "urn:uuid:obs-001",
              "resource": {
                "resourceType": "Observation",
                "id": "obs-001",
                "status": "final",
                "code": {
                  "coding": [
                    {
                      "code": "HS"
                    }
                  ]
                },
                "performer": {
                  "reference": "urn:uuid:org-001"
                }
              }
            }
          ]
        }
        """;

        var parser = new FhirJsonParser();
        var bundle = parser.Parse<Bundle>(bundleJson);
        var path = "performer";

        // Act
        var jsonPointer = await _service.ResolvePathAsync(bundle, path, "Observation", null, CancellationToken.None);

        // Assert: When performer is last segment, don't append /0
        Assert.NotNull(jsonPointer);
        Assert.Equal("/entry/0/resource/performer", jsonPointer);
    }

    [Fact]
    public async System.Threading.Tasks.Task AddressAsObject_NotArray_NavigatesToCity()
    {
        // Arrange: Patient.address as single object instead of array
        var bundleJson = """
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [
            {
              "fullUrl": "urn:uuid:pat-001",
              "resource": {
                "resourceType": "Patient",
                "id": "pat-001",
                "address": {
                  "line": ["123 Main St"],
                  "city": "Singapore"
                }
              }
            }
          ]
        }
        """;

        var parser = new FhirJsonParser();
        var bundle = parser.Parse<Bundle>(bundleJson);
        var path = "address.city";

        // Act
        var jsonPointer = await _service.ResolvePathAsync(bundle, path, "Patient", null, CancellationToken.None);

        // Assert: Navigate through object-as-array to city
        Assert.NotNull(jsonPointer);
        Assert.Equal("/entry/0/resource/address/0/city", jsonPointer);
    }

    [Fact]
    public async System.Threading.Tasks.Task MixedScenario_ArraysAndObjects_NavigatesCorrectly()
    {
        // Arrange: coding is proper array, performer is object - mixed valid/invalid structure
        var bundleJson = """
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [
            {
              "fullUrl": "urn:uuid:obs-001",
              "resource": {
                "resourceType": "Observation",
                "id": "obs-001",
                "status": "final",
                "code": {
                  "coding": [
                    {
                      "system": "http://loinc.org",
                      "code": "1234-5"
                    }
                  ]
                },
                "performer": {
                  "display": "Dr. Smith"
                }
              }
            }
          ]
        }
        """;

        var parser = new FhirJsonParser();
        var bundle = parser.Parse<Bundle>(bundleJson);
        var path = "code.coding.code";

        // Act
        var jsonPointer = await _service.ResolvePathAsync(bundle, path, "Observation", null, CancellationToken.None);

        // Assert: Arrays still work normally - existing behavior unchanged
        Assert.NotNull(jsonPointer);
        Assert.Equal("/entry/0/resource/code/coding/0/code", jsonPointer);
    }
}
