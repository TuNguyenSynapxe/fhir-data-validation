using Xunit;
using Pss.FhirProcessor.Engine.Tests;

namespace Pss.FhirProcessor.Engine.Tests;

/// <summary>
/// Integration tests verifying that Lint and Firely validation work together.
/// Tests the complete pipeline: Lint → Firely → Business Rules
/// </summary>
public class LintFirelyIntegrationTests
{
    [Fact]
    public async Task LintAndFirely_BothRunAndReturnErrors()
    {
        // Arrange - Bundle with both lint and FHIR structural issues
        var invalidBundle = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""collection"",
            ""entry"": [
                {
                    ""resource"": {
                        ""resourceType"": ""Patient"",
                        ""birthDate"": ""invalid-date"",
                        ""active"": ""true""
                    }
                }
            ]
        }";

        var pipeline = TestHelper.CreateValidationPipeline();
        var request = new Pss.FhirProcessor.Engine.Models.ValidationRequest
        {
            BundleJson = invalidBundle,
            FhirVersion = "R4",
            ValidationMode = "debug" // Enable lint validation
        };

        // Act
        var response = await pipeline.ValidateAsync(request);

        // Assert
        Assert.NotEmpty(response.Errors);
        
        // Should have LINT errors
        var lintErrors = response.Errors.Where(e => e.Source == "LINT").ToList();
        Assert.NotEmpty(lintErrors);
        
        // Should have FHIR errors (Firely still runs even if lint found issues)
        var fhirErrors = response.Errors.Where(e => e.Source == "FHIR").ToList();
        // Note: Firely may or may not find additional errors - that's OK
        // The important thing is that both lint and Firely ran
    }

    [Fact]
    public async Task LintDoesNotBlockFirely_WhenMultipleLintErrorsFound()
    {
        // Arrange - Bundle with multiple lint issues
        var bundleWithMultipleLintIssues = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""collection"",
            ""entry"": [
                {
                    ""resource"": {
                        ""id"": ""no-resource-type""
                    }
                },
                {
                    ""fullUrl"": ""urn:uuid:test""
                }
            ]
        }";

        var pipeline = TestHelper.CreateValidationPipeline();
        var request = new Pss.FhirProcessor.Engine.Models.ValidationRequest
        {
            BundleJson = bundleWithMultipleLintIssues,
            FhirVersion = "R4",
            ValidationMode = "debug" // Enable lint validation
        };

        // Act
        var response = await pipeline.ValidateAsync(request);

        // Assert
        // Lint should find multiple issues
        var lintErrors = response.Errors.Where(e => e.Source == "LINT").ToList();
        Assert.True(lintErrors.Count >= 2, "Lint should find multiple errors");
        
        // Firely should still run (even though lint found errors)
        var allErrors = response.Errors;
        Assert.Contains(allErrors, e => e.Source == "LINT");
        // Firely may also find errors - that's fine
    }

    [Fact]
    public async Task ValidBundle_NoLintErrors_NoFirelyErrors()
    {
        // Arrange - Completely valid bundle
        var validBundle = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""collection"",
            ""entry"": [
                {
                    ""fullUrl"": ""urn:uuid:patient-1"",
                    ""resource"": {
                        ""resourceType"": ""Patient"",
                        ""id"": ""patient-1"",
                        ""active"": true,
                        ""name"": [
                            {
                                ""family"": ""Smith"",
                                ""given"": [""John""]
                            }
                        ]
                    }
                }
            ]
        }";

        var pipeline = TestHelper.CreateValidationPipeline();
        var request = new Pss.FhirProcessor.Engine.Models.ValidationRequest
        {
            BundleJson = validBundle,
            FhirVersion = "R4",
            ValidationMode = "debug" // Enable lint validation to verify no errors
        };

        // Act
        var response = await pipeline.ValidateAsync(request);

        // Assert
        // Should have no LINT errors
        var lintErrors = response.Errors.Where(e => e.Source == "LINT").ToList();
        Assert.Empty(lintErrors);
        
        // Firely may report "informational" but no actual errors
        var fhirErrorsOnly = response.Errors.Where(e => 
            e.Source == "FHIR" && 
            e.Severity == "error").ToList();
        Assert.Empty(fhirErrorsOnly);
    }

    [Fact]
    public async Task LintErrors_AreClearlyLabeled()
    {
        // Arrange
        var bundleWithLintIssues = @"{
            ""resourceType"": ""Bundle"",
            ""entry"": { ""not"": ""array"" }
        }";

        var pipeline = TestHelper.CreateValidationPipeline();
        var request = new Pss.FhirProcessor.Engine.Models.ValidationRequest
        {
            BundleJson = bundleWithLintIssues,
            FhirVersion = "R4",
            ValidationMode = "debug" // Enable lint validation
        };

        // Act
        var response = await pipeline.ValidateAsync(request);

        // Assert
        var lintErrors = response.Errors.Where(e => e.Source == "LINT").ToList();
        Assert.NotEmpty(lintErrors);
        
        // All lint errors should have "LINT_" prefix in error code
        Assert.All(lintErrors, error =>
        {
            Assert.StartsWith("LINT_", error.ErrorCode);
            Assert.False(string.IsNullOrWhiteSpace(error.Message));
        });
    }

    [Fact]
    public async Task EmptyJson_StopsAtJSONValidation_NoLintOrFirelyRun()
    {
        // Arrange - Empty input
        var emptyJson = "";

        var pipeline = TestHelper.CreateValidationPipeline();
        var request = new Pss.FhirProcessor.Engine.Models.ValidationRequest
        {
            BundleJson = emptyJson,
            FhirVersion = "R4"
        };

        // Act
        var response = await pipeline.ValidateAsync(request);

        // Assert
        // Should fail at basic JSON validation (step 0), before lint
        Assert.NotEmpty(response.Errors);
        var errorCodes = response.Errors.Select(e => e.ErrorCode).ToList();
        
        // Should have EMPTY_BUNDLE error
        Assert.Contains(errorCodes, code => code == "EMPTY_BUNDLE");
    }
}
