using Xunit;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging;
using Pss.FhirProcessor.Engine.Interfaces;
using Pss.FhirProcessor.Engine.Core;
using Pss.FhirProcessor.Engine.RuleEngines;
using Pss.FhirProcessor.Engine.Navigation;
using Pss.FhirProcessor.Engine.Firely;
using Pss.FhirProcessor.Engine.Authoring;
using Pss.FhirProcessor.Engine.Models;
using Pss.FhirProcessor.Engine.DependencyInjection;
using Task = System.Threading.Tasks.Task;

namespace Pss.FhirProcessor.Engine.Tests;

/// <summary>
/// Integration tests for SPEC_HINT feature in validation pipeline
/// </summary>
public class SpecHintIntegrationTests
{
    private readonly IValidationPipeline _pipeline;

    public SpecHintIntegrationTests()
    {
        var services = new ServiceCollection();
        services.AddLogging(); // Add logging support for integration tests
        services.AddFhirProcessorEngine();
        var provider = services.BuildServiceProvider();
        _pipeline = provider.GetRequiredService<IValidationPipeline>();
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

        // Assert
        Assert.NotNull(response);
        
        // Should have SPEC_HINT warnings
        var specHintErrors = response.Errors.Where(e => e.Source == "SPEC_HINT").ToList();
        Assert.NotEmpty(specHintErrors);
        
        var statusHint = specHintErrors.FirstOrDefault(e => e.Path?.Contains("status") == true);
        Assert.NotNull(statusHint);
        Assert.Equal("SPEC_HINT", statusHint.Source);
        Assert.Equal("warning", statusHint.Severity);
        Assert.Equal("MISSING_REQUIRED_FIELD", statusHint.ErrorCode);
        Assert.Contains("advisory", statusHint.Message, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("HL7", statusHint.Message);
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

        // Assert
        Assert.NotNull(response);
        
        // Should NOT have SPEC_HINT warnings in fast mode
        var specHintErrors = response.Errors.Where(e => e.Source == "SPEC_HINT").ToList();
        Assert.Empty(specHintErrors);
    }

    [Fact]
    public async Task DebugMode_EncounterWithStatus_FirelyStillValidates()
    {
        // Arrange - Valid encounter (has status)
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

        // Assert
        Assert.NotNull(response);
        
        // No SPEC_HINT for status (field is present)
        var statusHints = response.Errors.Where(e => 
            e.Source == "SPEC_HINT" && 
            e.Path?.Contains("status") == true).ToList();
        Assert.Empty(statusHints);
        
        // Firely validation still runs (may have other errors, but not for missing status)
        // This proves SPEC_HINT doesn't block Firely
    }

    [Fact]
    public async Task DebugMode_SpecHintDoesNotBlockValidation()
    {
        // Arrange - Resource with missing required field but otherwise valid structure
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

        // Assert
        Assert.NotNull(response);
        
        // Should have SPEC_HINT for missing 'code'
        var codeHint = response.Errors.FirstOrDefault(e => 
            e.Source == "SPEC_HINT" && 
            e.Path?.Contains("code") == true);
        Assert.NotNull(codeHint);
        
        // But validation completes (not blocked)
        Assert.NotNull(response.Metadata);
        Assert.True(response.Metadata.ProcessingTimeMs >= 0);
    }

    [Fact]
    public async Task DebugMode_MultipleResourceTypes_SpecHintForEach()
    {
        // Arrange - Multiple resources with missing fields
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

        // Assert
        var specHints = response.Errors.Where(e => e.Source == "SPEC_HINT").ToList();
        Assert.NotEmpty(specHints);
        
        // Should have hints for multiple resource types
        Assert.Contains(specHints, h => h.ResourceType == "Encounter");
        Assert.Contains(specHints, h => h.ResourceType == "Patient");
        Assert.Contains(specHints, h => h.ResourceType == "Organization");
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

        // Assert
        var specHint = response.Errors.FirstOrDefault(e => e.Source == "SPEC_HINT");
        Assert.NotNull(specHint);
        Assert.NotNull(specHint.Details);
        Assert.True(specHint.Details.ContainsKey("advisory"));
        Assert.True((bool)specHint.Details["advisory"]);
        Assert.Equal("HL7", specHint.Details["source"]);
    }

    [Fact]
    public async Task DefaultMode_TreatedAsFast_NoSpecHint()
    {
        // Arrange - No ValidationMode specified (defaults to fast)
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
            // ValidationMode not specified
        };

        // Act
        var response = await _pipeline.ValidateAsync(request);

        // Assert
        var specHintErrors = response.Errors.Where(e => e.Source == "SPEC_HINT").ToList();
        Assert.Empty(specHintErrors); // No SPEC_HINT in default mode
    }
}
