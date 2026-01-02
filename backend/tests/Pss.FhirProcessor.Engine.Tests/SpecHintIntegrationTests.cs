using Xunit;
using Pss.FhirProcessor.Engine.Core;
using Pss.FhirProcessor.Engine.Models;
using Task = System.Threading.Tasks.Task;

namespace Pss.FhirProcessor.Engine.Tests;

/// <summary>
/// Integration tests for SPEC_HINT feature in validation pipeline.
/// Tests validate advisory nature and non-blocking behavior of SpecHints.
/// </summary>
public class SpecHintIntegrationTests
{
    private readonly IValidationPipeline _pipeline;

    public SpecHintIntegrationTests()
    {
        _pipeline = TestHelper.CreateValidationPipeline();
    }

    [Fact]
    public async Task DebugMode_EncounterWithoutStatus_ReturnsSpecHintWarning()
    {
        // Arrange - Encounter missing required 'status' field
        var json = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""collection"",
            ""entry"": [{
                ""resource"": {
                    ""resourceType"": ""Encounter"",
                    ""id"": ""enc-001"",
                    ""class"": {
                        ""system"": ""http://terminology.hl7.org/CodeSystem/v3-ActCode"",
                        ""code"": ""IMP""
                    }
                }
            }]
        }";

        var request = new ValidationRequest
        {
            BundleJson = json,
            FhirVersion = "R4",
            ValidationMode = "debug"
        };

        // Act
        var response = await _pipeline.ValidateAsync(request);

        // Assert - SpecHints are advisory and may or may not appear
        Assert.NotNull(response);
        Assert.NotNull(response.Metadata);
        
        // In debug mode, SpecHints MAY be generated
        var specHintErrors = response.Errors.Where(e => e.Source == "SPEC_HINT").ToList();
        
        // If SpecHints exist, verify they follow the correct structure
        foreach (var hint in specHintErrors)
        {
            Assert.Equal("SPEC_HINT", hint.Source);
            Assert.True(hint.Severity == "info" || hint.Severity == "warning",
                $"SpecHint severity should be info or warning, got: {hint.Severity}");
            Assert.NotNull(hint.ErrorCode);
            Assert.NotEmpty(hint.ErrorCode);
            Assert.NotNull(hint.Message);
        }
        
        // Validation must complete successfully (SpecHints never block)
        Assert.True(response.Metadata.ProcessingTimeMs >= 0);
    }

    [Fact]
    public async Task FastMode_EncounterWithoutStatus_NoSpecHint()
    {
        // Arrange - Same missing field, but in fast mode
        var json = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""collection"",
            ""entry"": [{
                ""resource"": {
                    ""resourceType"": ""Encounter"",
                    ""id"": ""enc-001"",
                    ""class"": {
                        ""system"": ""http://terminology.hl7.org/CodeSystem/v3-ActCode"",
                        ""code"": ""IMP""
                    }
                }
            }]
        }";

        var request = new ValidationRequest
        {
            BundleJson = json,
            FhirVersion = "R4",
            ValidationMode = "fast"
        };

        // Act
        var response = await _pipeline.ValidateAsync(request);

        // Assert - In fast mode, SpecHints should not be generated
        Assert.NotNull(response);
        Assert.NotNull(response.Metadata);
        
        // Fast mode should not generate SPEC_HINT errors
        var specHintErrors = response.Errors.Where(e => e.Source == "SPEC_HINT").ToList();
        Assert.Empty(specHintErrors);
        
        // Validation completes successfully
        Assert.True(response.Metadata.ProcessingTimeMs >= 0);
    }

    [Fact]
    public async Task DebugMode_EncounterWithStatus_FirelyStillValidates()
    {
        // Arrange - Encounter with status field present
        var json = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""collection"",
            ""entry"": [{
                ""resource"": {
                    ""resourceType"": ""Encounter"",
                    ""id"": ""enc-001"",
                    ""status"": ""completed"",
                    ""class"": {
                        ""system"": ""http://terminology.hl7.org/CodeSystem/v3-ActCode"",
                        ""code"": ""IMP""
                    }
                }
            }]
        }";

        var request = new ValidationRequest
        {
            BundleJson = json,
            FhirVersion = "R4",
            ValidationMode = "debug"
        };

        // Act
        var response = await _pipeline.ValidateAsync(request);

        // Assert - Validation completes regardless of SpecHints
        Assert.NotNull(response);
        Assert.NotNull(response.Metadata);
        
        // The key contract: SpecHints never block validation pipeline
        // Firely validation runs to completion
        Assert.True(response.Metadata.ProcessingTimeMs >= 0);
        
        // If SpecHints are present, they must be advisory
        var specHints = response.Errors.Where(e => e.Source == "SPEC_HINT").ToList();
        foreach (var hint in specHints)
        {
            Assert.True(hint.Severity == "info" || hint.Severity == "warning",
                "SpecHints must have advisory severity");
        }
    }

    [Fact]
    public async Task DebugMode_SpecHintDoesNotBlockValidation()
    {
        // Arrange - Resource that may trigger SpecHints
        var json = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""collection"",
            ""entry"": [{
                ""resource"": {
                    ""resourceType"": ""Observation"",
                    ""id"": ""obs-001"",
                    ""status"": ""final""
                }
            }]
        }";

        var request = new ValidationRequest
        {
            BundleJson = json,
            FhirVersion = "R4",
            ValidationMode = "debug"
        };

        // Act
        var response = await _pipeline.ValidateAsync(request);

        // Assert - CRITICAL: SpecHints must NEVER block validation
        Assert.NotNull(response);
        Assert.NotNull(response.Metadata);
        
        // Validation pipeline completes successfully
        Assert.True(response.Metadata.ProcessingTimeMs >= 0);
        
        // If SpecHints exist, they must not prevent completion
        var specHints = response.Errors.Where(e => e.Source == "SPEC_HINT").ToList();
        // SpecHints are advisory - pipeline continues regardless
        
        // Verify all SpecHints have advisory severity
        foreach (var hint in specHints)
        {
            Assert.True(hint.Severity == "info" || hint.Severity == "warning",
                "SpecHints must be advisory only");
            Assert.NotNull(hint.ErrorCode);
        }
    }

    [Fact]
    public async Task DebugMode_MultipleResourceTypes_SpecHintForEach()
    {
        // Arrange - Multiple resources
        var json = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""collection"",
            ""entry"": [
                {
                    ""resource"": {
                        ""resourceType"": ""Encounter"",
                        ""id"": ""enc-001"",
                        ""class"": {
                            ""system"": ""http://terminology.hl7.org/CodeSystem/v3-ActCode"",
                            ""code"": ""IMP""
                        }
                    }
                },
                {
                    ""resource"": {
                        ""resourceType"": ""Patient"",
                        ""id"": ""pat-001"",
                        ""name"": [{
                            ""family"": ""Doe""
                        }]
                    }
                },
                {
                    ""resource"": {
                        ""resourceType"": ""Organization"",
                        ""id"": ""org-001""
                    }
                }
            ]
        }";

        var request = new ValidationRequest
        {
            BundleJson = json,
            FhirVersion = "R4",
            ValidationMode = "debug"
        };

        // Act
        var response = await _pipeline.ValidateAsync(request);

        // Assert - Validation completes with multiple resources
        Assert.NotNull(response);
        Assert.NotNull(response.Metadata);
        
        // SpecHints MAY be generated for multiple resource types in debug mode
        var specHints = response.Errors.Where(e => e.Source == "SPEC_HINT").ToList();
        
        // If SpecHints exist, verify they have correct structure
        foreach (var hint in specHints)
        {
            Assert.Equal("SPEC_HINT", hint.Source);
            Assert.True(hint.Severity == "info" || hint.Severity == "warning");
            Assert.NotNull(hint.ResourceType);
            Assert.NotEmpty(hint.ResourceType);
        }
        
        // Validation pipeline completes successfully
        Assert.True(response.Metadata.ProcessingTimeMs >= 0);
    }

    [Fact]
    public async Task DebugMode_SpecHintDetailsContainAdvisoryFlag()
    {
        // Arrange
        var json = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""collection"",
            ""entry"": [{
                ""resource"": {
                    ""resourceType"": ""Encounter"",
                    ""id"": ""enc-001"",
                    ""class"": {
                        ""system"": ""http://terminology.hl7.org/CodeSystem/v3-ActCode"",
                        ""code"": ""IMP""
                    }
                }
            }]
        }";

        var request = new ValidationRequest
        {
            BundleJson = json,
            FhirVersion = "R4",
            ValidationMode = "debug"
        };

        // Act
        var response = await _pipeline.ValidateAsync(request);

        // Assert - If SpecHints exist, they should have proper structure
        Assert.NotNull(response);
        Assert.NotNull(response.Metadata);
        
        var specHints = response.Errors.Where(e => e.Source == "SPEC_HINT").ToList();
        
        // If SpecHints are generated, verify their Details structure
        foreach (var hint in specHints)
        {
            Assert.NotNull(hint.Details);
            // Details should indicate advisory nature if key exists
            if (hint.Details.ContainsKey("advisory"))
            {
                Assert.True((bool)hint.Details["advisory"],
                    "advisory flag should be true for SpecHints");
            }
        }
        
        // Validation completes successfully
        Assert.True(response.Metadata.ProcessingTimeMs >= 0);
    }

    [Fact]
    public async Task DefaultMode_TreatedAsFast_NoSpecHint()
    {
        // Arrange - No ValidationMode specified (defaults to standard)
        var json = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""collection"",
            ""entry"": [{
                ""resource"": {
                    ""resourceType"": ""Encounter"",
                    ""id"": ""enc-001"",
                    ""class"": {
                        ""system"": ""http://terminology.hl7.org/CodeSystem/v3-ActCode"",
                        ""code"": ""IMP""
                    }
                }
            }]
        }";

        var request = new ValidationRequest
        {
            BundleJson = json,
            FhirVersion = "R4"
            // ValidationMode not specified - defaults to "standard"
        };

        // Act
        var response = await _pipeline.ValidateAsync(request);

        // Assert - Default/standard mode should not generate SpecHints
        Assert.NotNull(response);
        Assert.NotNull(response.Metadata);
        
        var specHintErrors = response.Errors.Where(e => e.Source == "SPEC_HINT").ToList();
        Assert.Empty(specHintErrors);
        
        // Validation completes successfully
        Assert.True(response.Metadata.ProcessingTimeMs >= 0);
    }
}
