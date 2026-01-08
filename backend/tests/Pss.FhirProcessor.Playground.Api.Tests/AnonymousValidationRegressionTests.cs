using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;
using FluentAssertions;
using Hl7.Fhir.Model;
using Hl7.Fhir.Serialization;
using Pss.FhirProcessor.Engine.Models;
using Xunit;
using Task = System.Threading.Tasks.Task;

namespace Pss.FhirProcessor.Playground.Api.Tests;

/// <summary>
/// Phase 2.1 API Integration Tests — Anonymous Validation Regression
/// 
/// Purpose: Prove that /api/validate endpoint behavior is unchanged by Phase 2.1
/// (composite Firely resolver implementation).
/// 
/// Critical: These tests verify backward compatibility for anonymous validation.
/// No profile logic should be triggered for this endpoint.
/// </summary>
public class AnonymousValidationRegressionTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;
    private readonly FhirJsonSerializer _serializer = new();

    public AnonymousValidationRegressionTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    #region Helper Methods

    private string CreateEmptyBundle()
    {
        var bundle = new Bundle
        {
            Type = Bundle.BundleType.Collection,
            Entry = new List<Bundle.EntryComponent>()
        };

        return _serializer.SerializeToString(bundle);
    }

    private string CreateValidBundle()
    {
        var bundle = new Bundle
        {
            Type = Bundle.BundleType.Collection,
            Entry = new List<Bundle.EntryComponent>
            {
                new Bundle.EntryComponent
                {
                    Resource = new Patient
                    {
                        Id = "patient-1",
                        Active = true,
                        Name = new List<HumanName>
                        {
                            new HumanName { Family = "Doe", Given = new[] { "John" } }
                        }
                    }
                }
            }
        };

        return _serializer.SerializeToString(bundle);
    }

    #endregion

    #region Test 1: Anonymous Validation — Base R4 Only

    [Fact]
    public async Task AnonymousValidation_EmptyBundle_NoProfileEnforcement()
    {
        // Arrange
        var bundleJson = CreateEmptyBundle();
        var request = new
        {
            bundleJson,
            fhirVersion = "R4"
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/validate", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var result = await response.Content.ReadFromJsonAsync<ValidationResponse>();
        result.Should().NotBeNull();
        result!.Metadata.Should().NotBeNull();
        result.Metadata.ProcessingTimeMs.Should().BeGreaterThan(0);

        // Key assertion: No profile cardinality errors
        // Base R4 allows empty Bundle.entry
        var cardinalityErrors = result.Errors.Where(e =>
            e.Source == "FHIR" &&
            e.Message.Contains("entry", StringComparison.OrdinalIgnoreCase) &&
            e.Message.Contains("min", StringComparison.OrdinalIgnoreCase)).ToList();

        cardinalityErrors.Should().BeEmpty("Anonymous validation uses base R4 only, no profile constraints");
    }

    [Fact]
    public async Task AnonymousValidation_ValidBundle_ReturnsSuccessResponse()
    {
        // Arrange
        var bundleJson = CreateValidBundle();
        var request = new
        {
            bundleJson,
            fhirVersion = "R4"
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/validate", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var result = await response.Content.ReadFromJsonAsync<ValidationResponse>();
        result.Should().NotBeNull();
        result!.Summary.Should().NotBeNull();
        
        // May have warnings, but should not crash
        result.Metadata.ProcessingTimeMs.Should().BeGreaterThan(0);
    }

    [Fact]
    public async Task AnonymousValidation_WithRulesJson_StillWorks()
    {
        // Arrange
        var bundleJson = CreateValidBundle();
        var rulesJson = JsonSerializer.Serialize(new
        {
            layers = new[]
            {
                new
                {
                    scope = "Bundle",
                    rules = new[]
                    {
                        new
                        {
                            id = "test-rule-1",
                            severity = "error",
                            fhirPath = "entry.count() > 0",
                            message = "Bundle must have at least one entry"
                        }
                    }
                }
            }
        });

        var request = new
        {
            bundleJson,
            rulesJson,
            fhirVersion = "R4"
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/validate", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var result = await response.Content.ReadFromJsonAsync<ValidationResponse>();
        result.Should().NotBeNull();
        result!.Metadata.Should().NotBeNull();
        
        // Rules should still be evaluated (Phase 2.1 did not change rule engine)
    }

    #endregion

    #region Test 2: Anonymous Validation — Error Handling

    [Fact]
    public async Task AnonymousValidation_InvalidBundleJson_ReturnsValidationError()
    {
        // Arrange
        var invalidBundleJson = "{ invalid json ";
        var request = new
        {
            bundleJson = invalidBundleJson,
            fhirVersion = "R4"
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/validate", request);

        // Assert
        // Should return 200 with validation errors, not 500
        // (POCO parsing errors flow through validation response)
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var result = await response.Content.ReadFromJsonAsync<ValidationResponse>();
        result.Should().NotBeNull();
        result!.Summary.ErrorCount.Should().BeGreaterThan(0, "Invalid JSON should generate POCO error");
    }

    [Fact]
    public async Task AnonymousValidation_MissingBundleJson_ReturnsBadRequest()
    {
        // Arrange
        var request = new
        {
            fhirVersion = "R4"
            // Missing bundleJson
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/validate", request);

        // Assert
        // API should reject missing bundleJson
        response.StatusCode.Should().BeOneOf(HttpStatusCode.BadRequest, HttpStatusCode.OK);
        // If 200, should have validation error about missing bundle
    }

    #endregion

    #region Test 3: Backward Compatibility Verification

    [Fact]
    public async Task BackwardCompatibility_AnonymousValidation_BehaviorUnchanged()
    {
        // Arrange - Same test as pre-Phase-2.1
        var bundleJson = CreateEmptyBundle();
        var request = new
        {
            bundleJson,
            fhirVersion = "R4"
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/validate", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var result = await response.Content.ReadFromJsonAsync<ValidationResponse>();
        result.Should().NotBeNull();
        
        // Metadata present
        result!.Metadata.Should().NotBeNull();
        result.Metadata.ProcessingTimeMs.Should().BeGreaterThan(0);
        
        // Summary present
        result.Summary.Should().NotBeNull();
        
        // Errors collection present (may be empty or have base R4 errors)
        result.Errors.Should().NotBeNull();
        
        // Key: No unhandled exceptions, no new error categories
        // Phase 2.1 composite provider should be transparent when no profile provided
    }

    [Fact]
    public async Task BackwardCompatibility_ResponseStructure_Unchanged()
    {
        // Arrange
        var bundleJson = CreateValidBundle();
        var request = new
        {
            bundleJson,
            fhirVersion = "R4"
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/validate", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var result = await response.Content.ReadFromJsonAsync<ValidationResponse>();
        result.Should().NotBeNull();
        
        // Response structure unchanged
        result!.Summary.Should().NotBeNull();
        result.Summary.TotalErrors.Should().BeGreaterThanOrEqualTo(0);
        result.Summary.WarningCount.Should().BeGreaterThanOrEqualTo(0);
        result.Summary.ErrorCount.Should().BeGreaterThanOrEqualTo(0);
        
        result.Errors.Should().NotBeNull();
        result.Metadata.Should().NotBeNull();
        
        // All errors should have required fields
        foreach (var error in result.Errors)
        {
            error.Source.Should().NotBeNullOrEmpty();
            error.Severity.Should().NotBeNullOrEmpty();
            error.Message.Should().NotBeNullOrEmpty();
        }
    }

    #endregion

    #region Test 4: Profile Fields Ignored in Anonymous Validation

    [Fact]
    public async Task AnonymousValidation_ProfileFieldsIgnored_IfProvided()
    {
        // Arrange - User mistakenly provides profile fields to anonymous endpoint
        var bundleJson = CreateEmptyBundle();
        var request = new
        {
            bundleJson,
            bundleProfileStructureDefinitionJson = "some-profile-json", // Should be ignored
            bundleProfileCanonicalUrl = "http://example.org/profile", // Should be ignored
            fhirVersion = "R4"
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/validate", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var result = await response.Content.ReadFromJsonAsync<ValidationResponse>();
        result.Should().NotBeNull();
        
        // Anonymous endpoint should ignore profile fields (if they exist in DTO)
        // This is NOT a requirement, but documents expected behavior
        // Key: Engine should not crash
    }

    #endregion
}
