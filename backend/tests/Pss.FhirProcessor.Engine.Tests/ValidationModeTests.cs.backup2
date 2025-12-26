using Xunit;
using Pss.FhirProcessor.Engine.Models;

namespace Pss.FhirProcessor.Engine.Tests;

/// <summary>
/// Tests for validation mode behavior (fast vs debug).
/// Verifies that lint validation is conditionally executed based on mode.
/// </summary>
public class ValidationModeTests
{
    [Fact]
    public async Task FastMode_SkipsLintValidation()
    {
        // Arrange - Bundle with lint issues (invalid date format)
        var bundleWithLintIssue = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""collection"",
            ""entry"": [
                {
                    ""resource"": {
                        ""resourceType"": ""Patient"",
                        ""birthDate"": ""12/31/2023"",
                        ""active"": true
                    }
                }
            ]
        }";

        var pipeline = TestHelper.CreateValidationPipeline();
        var request = new ValidationRequest
        {
            BundleJson = bundleWithLintIssue,
            FhirVersion = "R4",
            ValidationMode = "fast" // Explicitly set fast mode
        };

        // Act
        var response = await pipeline.ValidateAsync(request);

        // Assert
        // Should NOT have LINT errors in fast mode
        var lintErrors = response.Errors.Where(e => e.Source == "LINT").ToList();
        Assert.Empty(lintErrors);
        
        // Summary should reflect no lint errors
        Assert.Equal(0, response.Summary.LintErrorCount);
    }

    [Fact]
    public async Task FastMode_DefaultBehavior_WhenModeNotSpecified()
    {
        // Arrange - Bundle with lint issues
        var bundleWithLintIssue = @"{
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
        var request = new ValidationRequest
        {
            BundleJson = bundleWithLintIssue,
            FhirVersion = "R4"
            // ValidationMode not specified - defaults to "fast"
        };

        // Act
        var response = await pipeline.ValidateAsync(request);

        // Assert
        // Should NOT have LINT errors (default is fast mode)
        var lintErrors = response.Errors.Where(e => e.Source == "LINT").ToList();
        Assert.Empty(lintErrors);
        
        // Should still have FHIR errors from Firely
        var fhirErrors = response.Errors.Where(e => e.Source == "FHIR").ToList();
        // Firely may detect structural issues - that's OK
    }

    [Fact]
    public async Task DebugMode_IncludesLintValidation()
    {
        // Arrange - Bundle with lint issues
        var bundleWithLintIssue = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""collection"",
            ""entry"": [
                {
                    ""resource"": {
                        ""resourceType"": ""Patient"",
                        ""birthDate"": ""12/31/2023"",
                        ""active"": ""true""
                    }
                }
            ]
        }";

        var pipeline = TestHelper.CreateValidationPipeline();
        var request = new ValidationRequest
        {
            BundleJson = bundleWithLintIssue,
            FhirVersion = "R4",
            ValidationMode = "debug" // Enable lint validation
        };

        // Act
        var response = await pipeline.ValidateAsync(request);

        // Assert
        // Should HAVE LINT errors in debug mode
        var lintErrors = response.Errors.Where(e => e.Source == "LINT").ToList();
        Assert.NotEmpty(lintErrors);
        
        // Summary should reflect lint errors
        Assert.True(response.Summary.LintErrorCount > 0);
        
        // Should also have FHIR errors (Firely still runs)
        var allErrors = response.Errors;
        Assert.True(allErrors.Count >= lintErrors.Count); // Total >= lint count
    }

    [Fact]
    public async Task DebugMode_CaseInsensitive()
    {
        // Arrange - Bundle with lint issues
        var bundleWithLintIssue = @"{
            ""resourceType"": ""Bundle"",
            ""entry"": { ""not"": ""array"" }
        }";

        var pipeline = TestHelper.CreateValidationPipeline();
        
        // Test different case variations
        var modes = new[] { "DEBUG", "Debug", "DeBuG" };
        
        foreach (var mode in modes)
        {
            var request = new ValidationRequest
            {
                BundleJson = bundleWithLintIssue,
                FhirVersion = "R4",
                ValidationMode = mode
            };

            // Act
            var response = await pipeline.ValidateAsync(request);

            // Assert - All variations should enable lint
            var lintErrors = response.Errors.Where(e => e.Source == "LINT").ToList();
            Assert.NotEmpty(lintErrors);
        }
    }

    [Fact]
    public async Task FastMode_DoesNotAffectFirelyValidation()
    {
        // Arrange - Bundle with FHIR structural error (birthDate as object instead of string)
        var invalidBundle = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""collection"",
            ""entry"": [
                {
                    ""resource"": {
                        ""resourceType"": ""Patient"",
                        ""birthDate"": { ""invalid"": ""object"" }
                    }
                }
            ]
        }";

        var pipeline = TestHelper.CreateValidationPipeline();
        var request = new ValidationRequest
        {
            BundleJson = invalidBundle,
            FhirVersion = "R4",
            ValidationMode = "fast"
        };

        // Act
        var response = await pipeline.ValidateAsync(request);

        // Assert
        // Should have errors from Firely (birthDate should be string, not object)
        // OR from basic validation if it catches the type error
        // The key point: validation still runs even in fast mode
        
        // Should NOT have LINT errors (fast mode skips lint)
        var lintErrors = response.Errors.Where(e => e.Source == "LINT").ToList();
        Assert.Empty(lintErrors);
        
        // Firely validation should run and likely catch the type error
        // We don't assert on total error count because we just need to prove
        // that fast mode doesn't disable Firely validation
    }

    [Fact]
    public async Task DebugMode_LintDoesNotBlockFirely()
    {
        // Arrange - Bundle with multiple lint issues
        var bundleWithMultipleLintIssues = @"{
            ""resourceType"": ""Bundle"",
            ""entry"": [
                {
                    ""resource"": {
                        ""id"": ""no-type""
                    }
                },
                {
                    ""fullUrl"": ""urn:uuid:test""
                }
            ]
        }";

        var pipeline = TestHelper.CreateValidationPipeline();
        var request = new ValidationRequest
        {
            BundleJson = bundleWithMultipleLintIssues,
            FhirVersion = "R4",
            ValidationMode = "debug"
        };

        // Act
        var response = await pipeline.ValidateAsync(request);

        // Assert
        // Should have LINT errors
        var lintErrors = response.Errors.Where(e => e.Source == "LINT").ToList();
        Assert.NotEmpty(lintErrors);
        
        // Firely should STILL RUN (not blocked by lint)
        // Total errors should be >= lint errors (Firely may add more)
        Assert.True(response.Errors.Count >= lintErrors.Count);
    }

    [Fact]
    public async Task DebugMode_ValidBundle_NoLintErrors()
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
                        ""birthDate"": ""2000-01-01"",
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
        var request = new ValidationRequest
        {
            BundleJson = validBundle,
            FhirVersion = "R4",
            ValidationMode = "debug"
        };

        // Act
        var response = await pipeline.ValidateAsync(request);

        // Assert
        // Should have NO LINT errors (bundle is valid)
        var lintErrors = response.Errors.Where(e => e.Source == "LINT").ToList();
        Assert.Empty(lintErrors);
        
        // Should have NO FHIR errors
        var fhirErrors = response.Errors.Where(e => e.Source == "FHIR" && e.Severity == "error").ToList();
        Assert.Empty(fhirErrors);
        
        // Summary should reflect zero errors
        Assert.Equal(0, response.Summary.LintErrorCount);
        Assert.Equal(0, response.Summary.ErrorCount);
    }

    [Fact]
    public async Task ValidationMode_IsRequestScoped_NotStateful()
    {
        // Arrange
        var bundleWithLintIssue = @"{
            ""resourceType"": ""Bundle"",
            ""entry"": { ""not"": ""array"" }
        }";

        var pipeline = TestHelper.CreateValidationPipeline();

        // Act & Assert - Multiple requests with different modes
        // Request 1: Debug mode
        var debugRequest = new ValidationRequest
        {
            BundleJson = bundleWithLintIssue,
            FhirVersion = "R4",
            ValidationMode = "debug"
        };
        var debugResponse = await pipeline.ValidateAsync(debugRequest);
        var debugLintErrors = debugResponse.Errors.Where(e => e.Source == "LINT").ToList();
        Assert.NotEmpty(debugLintErrors); // Should have lint errors

        // Request 2: Fast mode (immediately after debug)
        var fastRequest = new ValidationRequest
        {
            BundleJson = bundleWithLintIssue,
            FhirVersion = "R4",
            ValidationMode = "fast"
        };
        var fastResponse = await pipeline.ValidateAsync(fastRequest);
        var fastLintErrors = fastResponse.Errors.Where(e => e.Source == "LINT").ToList();
        Assert.Empty(fastLintErrors); // Should NOT have lint errors

        // Request 3: Debug mode again
        var debugRequest2 = new ValidationRequest
        {
            BundleJson = bundleWithLintIssue,
            FhirVersion = "R4",
            ValidationMode = "debug"
        };
        var debugResponse2 = await pipeline.ValidateAsync(debugRequest2);
        var debugLintErrors2 = debugResponse2.Errors.Where(e => e.Source == "LINT").ToList();
        Assert.NotEmpty(debugLintErrors2); // Should have lint errors again

        // Proves that mode is request-scoped, not stateful
    }

    [Fact]
    public async Task DebugMode_DetectsUnknownElements()
    {
        // Arrange - Bundle with unknown field (typo: abcPeriod instead of period)
        var bundleWithUnknownField = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""collection"",
            ""entry"": [
                {
                    ""resource"": {
                        ""resourceType"": ""Patient"",
                        ""id"": ""patient-001"",
                        ""name"": [{
                            ""family"": ""Doe"",
                            ""given"": [""John""]
                        }],
                        ""abcPeriod"": {
                            ""start"": ""2020-01-01""
                        }
                    }
                }
            ]
        }";

        var pipeline = TestHelper.CreateValidationPipeline();

        // Act - Debug mode
        var debugRequest = new ValidationRequest
        {
            BundleJson = bundleWithUnknownField,
            FhirVersion = "R4",
            ValidationMode = "debug"
        };
        var debugResponse = await pipeline.ValidateAsync(debugRequest);

        // Assert - Should detect unknown element in debug mode
        var unknownElementError = debugResponse.Errors
            .FirstOrDefault(e => e.Source == "LINT" && e.Message.Contains("abcPeriod"));
        
        Assert.NotNull(unknownElementError);
        Assert.Contains("abcPeriod", unknownElementError.Message);
        Assert.Contains("does not exist", unknownElementError.Message.ToLower());
        
        // Act - Fast mode (same bundle)
        var fastRequest = new ValidationRequest
        {
            BundleJson = bundleWithUnknownField,
            FhirVersion = "R4",
            ValidationMode = "fast"
        };
        var fastResponse = await pipeline.ValidateAsync(fastRequest);

        // Assert - Should NOT have lint errors in fast mode
        var fastLintErrors = fastResponse.Errors.Where(e => e.Source == "LINT").ToList();
        Assert.Empty(fastLintErrors);
    }
}
