using System.Text.Json;
using Hl7.Fhir.Model;
using Pss.FhirProcessor.Engine.Core;
using Pss.FhirProcessor.Engine.Models;
using Xunit;

namespace Pss.FhirProcessor.Engine.Tests.DllIsolation;

/// <summary>
/// Tests that verify the Engine can safely handle concurrent validation requests
/// without race conditions or state interference.
/// 
/// These tests ensure that:
/// - Multiple validations can run concurrently on the same ValidationPipeline instance
/// - Singleton services are truly stateless and thread-safe
/// - Scoped services don't leak state between requests
/// - Results are deterministic (same input produces same output)
/// </summary>
public class ConcurrencyTests
{
    private readonly IValidationPipeline _pipeline;
    
    public ConcurrencyTests()
    {
        // Use TestHelper to create a fully-wired ValidationPipeline
        _pipeline = TestHelper.CreateValidationPipeline();
    }

    [Fact]
    public async System.Threading.Tasks.Task ValidationPipeline_100_ConcurrentCalls_ShouldNotInterfere()
    {
        // Arrange - Create a simple valid bundle
        var testBundleJson = CreateTestBundle();
        var request = new ValidationRequest
        {
            BundleJson = testBundleJson,
            FhirVersion = "R4"
        };
        
        // Act - Run 100 concurrent validations on the SAME pipeline instance
        var tasks = Enumerable.Range(0, 100)
            .Select(_ => System.Threading.Tasks.Task.Run(() => _pipeline.ValidateAsync(request, CancellationToken.None)))
            .ToArray();
        
        var results = await System.Threading.Tasks.Task.WhenAll(tasks);
        
        // Assert - All validations should produce identical results
        var firstResult = results[0];
        
        // Verify all results have the same structure
        foreach (var result in results)
        {
            // All should have same number of errors (deterministic)
            Assert.Equal(firstResult.Errors.Count, result.Errors.Count);
            
            // Verify metadata is populated consistently
            Assert.NotNull(result.Metadata);
            Assert.True(result.Metadata.Timestamp != default);
            Assert.Equal(firstResult.Metadata.FhirVersion, result.Metadata.FhirVersion);
        }
        
        // No race conditions should have occurred
        Assert.All(results, result =>
        {
            Assert.NotNull(result);
            Assert.NotNull(result.Metadata);
        });
    }

    [Fact]
    public async System.Threading.Tasks.Task ValidationPipeline_ConcurrentCallsWithDifferentInputs_ShouldIsolateProperly()
    {
        // Arrange - Create two different bundles
        var validBundleJson = CreateTestBundle();
        var invalidBundleJson = CreateInvalidTestBundle();
        
        var validRequest = new ValidationRequest
        {
            BundleJson = validBundleJson,
            FhirVersion = "R4"
        };
        
        var invalidRequest = new ValidationRequest
        {
            BundleJson = invalidBundleJson,
            FhirVersion = "R4"
        };
        
        // Act - Run 50 valid + 50 invalid validations concurrently
        var validTasks = Enumerable.Range(0, 50)
            .Select(_ => System.Threading.Tasks.Task.Run(() => _pipeline.ValidateAsync(validRequest, CancellationToken.None)));
        var invalidTasks = Enumerable.Range(0, 50)
            .Select(_ => System.Threading.Tasks.Task.Run(() => _pipeline.ValidateAsync(invalidRequest, CancellationToken.None)));
        
        var allTasks = validTasks.Concat(invalidTasks).ToArray();
        var results = await System.Threading.Tasks.Task.WhenAll(allTasks);
        
        // Assert - First 50 should be identical (valid), last 50 should be identical (invalid)
        var validResults = results.Take(50).ToArray();
        var invalidResults = results.Skip(50).ToArray();
        
        // All valid results should match
        var firstValid = validResults[0];
        foreach (var result in validResults)
        {
            Assert.Equal(firstValid.Errors.Count, result.Errors.Count);
        }
        
        // All invalid results should match
        var firstInvalid = invalidResults[0];
        foreach (var result in invalidResults)
        {
            Assert.Equal(firstInvalid.Errors.Count, result.Errors.Count);
        }
        
        // Invalid should have MORE errors than valid
        Assert.True(firstInvalid.Errors.Count > firstValid.Errors.Count,
            $"Invalid bundle should have more errors. Valid: {firstValid.Errors.Count}, Invalid: {firstInvalid.Errors.Count}");
    }

    [Fact]
    public async System.Threading.Tasks.Task SingletonServices_ShouldNotCauseRaceConditions()
    {
        // Arrange - Test that stateless services are thread-safe with business rules
        var testBundleJson = CreateTestBundle();
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
                            id = "test-rule",
                            severity = "error",
                            fhirPath = "entry.count() > 0",
                            message = "Bundle must have entries"
                        }
                    }
                }
            }
        });
        
        var request = new ValidationRequest
        {
            BundleJson = testBundleJson,
            RulesJson = rulesJson,
            FhirVersion = "R4"
        };
        
        // Act - Run 50 concurrent validations using Task.Run for real thread-safety test
        var tasks = Enumerable.Range(0, 50)
            .Select(_ => System.Threading.Tasks.Task.Run(() => _pipeline.ValidateAsync(request, CancellationToken.None)))
            .ToArray();
        
        var results = await System.Threading.Tasks.Task.WhenAll(tasks);
        
        // Assert - All results should be identical (services are stateless)
        var firstResult = results[0];
        foreach (var result in results)
        {
            Assert.Equal(firstResult.Errors.Count, result.Errors.Count);
            Assert.Equal(firstResult.Metadata.FhirVersion, result.Metadata.FhirVersion);
        }
    }

    [Fact]
    public async System.Threading.Tasks.Task ValidationPipeline_HighLoadConcurrency_ShouldRemainDeterministic()
    {
        // Arrange - Stress test with 200 concurrent validations
        var testBundleJson = CreateTestBundle();
        var request = new ValidationRequest
        {
            BundleJson = testBundleJson,
            FhirVersion = "R4"
        };
        
        // Act - 200 concurrent validations using Task.Run for real concurrency
        var tasks = Enumerable.Range(0, 200)
            .Select(_ => System.Threading.Tasks.Task.Run(() => _pipeline.ValidateAsync(request, CancellationToken.None)))
            .ToArray();
        
        var results = await System.Threading.Tasks.Task.WhenAll(tasks);
        
        // Assert - All results should be identical
        var firstResult = results[0];
        Assert.All(results, result =>
        {
            Assert.Equal(firstResult.Errors.Count, result.Errors.Count);
            Assert.Equal(firstResult.Metadata.FhirVersion, result.Metadata.FhirVersion);
            Assert.True(result.Metadata.Timestamp != default);
        });
    }

    private string CreateTestBundle()
    {
        // Minimal valid Bundle
        return @"{
  ""resourceType"": ""Bundle"",
  ""type"": ""collection"",
  ""entry"": [
    {
      ""resource"": {
        ""resourceType"": ""Patient"",
        ""id"": ""test-patient"",
        ""identifier"": [
          {
            ""system"": ""http://test.org"",
            ""value"": ""12345""
          }
        ]
      }
    }
  ]
}";
    }

    private string CreateInvalidTestBundle()
    {
        // Bundle with structural errors (missing resourceType)
        return @"{
  ""type"": ""collection"",
  ""entry"": [
    {
      ""resource"": {
        ""id"": ""test-patient""
      }
    }
  ]
}";
    }
}
