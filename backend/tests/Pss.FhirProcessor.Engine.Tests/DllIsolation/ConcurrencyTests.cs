using System.Text.Json;
using Hl7.Fhir.Model;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Pss.FhirProcessor.Engine.Core;
using Pss.FhirProcessor.Engine.DependencyInjection;
using Pss.FhirProcessor.Engine.Models.Questions;
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
    private readonly IServiceProvider _serviceProvider;
    
    public ConcurrencyTests()
    {
        var services = new ServiceCollection();
        
        // Use only runtime validation services (DLL-distributable subset)
        services.AddRuntimeValidation();
        
        // Add NullLoggerFactory for tests
        services.AddLogging(builder => 
        {
            builder.AddProvider(NullLoggerProvider.Instance);
        });
        
        _serviceProvider = services.BuildServiceProvider();
    }

    [Fact]
    public async System.Threading.Tasks.Task ValidationPipeline_100_ConcurrentCalls_ShouldNotInterfere()
    {
        // Arrange - Create a simple valid bundle
        var testBundleJson = CreateTestBundle();
        var request = new ValidationRequest
        {
            BundleJson = testBundleJson,
            FhirVersion = "R4",
            ValidationMode = ValidationMode.RuntimeOnly, // No authoring services needed
            RuleSet = new RuleSet
            {
                FhirPathRules = new List<FhirPathRule>(),
                Questions = new Question[0],
                CodeSystems = new CodeSystem[0]
            }
        };
        
        // Get a single ValidationPipeline instance (simulates DLL usage)
        var pipeline = _serviceProvider.GetRequiredService<IValidationPipeline>();
        
        // Act - Run 100 concurrent validations on the SAME pipeline instance
        var tasks = Enumerable.Range(0, 100)
            .Select(_ => pipeline.ValidateAsync(request, CancellationToken.None))
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
            Assert.NotNull(result.Metadata.Timestamp);
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
            FhirVersion = "R4",
            ValidationMode = ValidationMode.RuntimeOnly,
            RuleSet = new RuleSet
            {
                FhirPathRules = new List<FhirPathRule>(),
                Questions = new Question[0],
                CodeSystems = new CodeSystem[0]
            }
        };
        
        var invalidRequest = new ValidationRequest
        {
            BundleJson = invalidBundleJson,
            FhirVersion = "R4",
            ValidationMode = ValidationMode.RuntimeOnly,
            RuleSet = new RuleSet
            {
                FhirPathRules = new List<FhirPathRule>(),
                Questions = new Question[0],
                CodeSystems = new CodeSystem[0]
            }
        };
        
        var pipeline = _serviceProvider.GetRequiredService<IValidationPipeline>();
        
        // Act - Run 50 valid + 50 invalid validations concurrently
        var validTasks = Enumerable.Range(0, 50)
            .Select(_ => pipeline.ValidateAsync(validRequest, CancellationToken.None));
        var invalidTasks = Enumerable.Range(0, 50)
            .Select(_ => pipeline.ValidateAsync(invalidRequest, CancellationToken.None));
        
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
        // Arrange - Test that stateless singleton services are thread-safe
        var testBundleJson = CreateTestBundle();
        var request = new ValidationRequest
        {
            BundleJson = testBundleJson,
            FhirVersion = "R4",
            ValidationMode = ValidationMode.RuntimeOnly,
            RuleSet = new RuleSet
            {
                FhirPathRules = new List<FhirPathRule>
                {
                    new FhirPathRule
                    {
                        Id = "test-rule",
                        Expression = "Bundle.entry.count() > 0",
                        Severity = Severity.Error,
                        Message = "Bundle must have entries"
                    }
                },
                Questions = new Question[0],
                CodeSystems = new CodeSystem[0]
            }
        };
        
        // Create multiple scopes to simulate concurrent requests
        var scopes = Enumerable.Range(0, 50)
            .Select(_ => _serviceProvider.CreateScope())
            .ToArray();
        
        try
        {
            // Act - Get ValidationPipeline from each scope and run concurrently
            var tasks = scopes.Select(scope =>
            {
                var pipeline = scope.ServiceProvider.GetRequiredService<IValidationPipeline>();
                return pipeline.ValidateAsync(request, CancellationToken.None);
            }).ToArray();
            
            var results = await System.Threading.Tasks.Task.WhenAll(tasks);
            
            // Assert - All results should be identical (singleton services shared, but stateless)
            var firstResult = results[0];
            foreach (var result in results)
            {
                Assert.Equal(firstResult.Errors.Count, result.Errors.Count);
                Assert.Equal(firstResult.Metadata.FhirVersion, result.Metadata.FhirVersion);
            }
        }
        finally
        {
            // Cleanup scopes
            foreach (var scope in scopes)
            {
                scope.Dispose();
            }
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
            FhirVersion = "R4",
            ValidationMode = ValidationMode.RuntimeOnly,
            RuleSet = new RuleSet
            {
                FhirPathRules = new List<FhirPathRule>(),
                Questions = new Question[0],
                CodeSystems = new CodeSystem[0]
            }
        };
        
        var pipeline = _serviceProvider.GetRequiredService<IValidationPipeline>();
        
        // Act - 200 concurrent validations
        var tasks = Enumerable.Range(0, 200)
            .Select(_ => pipeline.ValidateAsync(request, CancellationToken.None))
            .ToArray();
        
        var results = await System.Threading.Tasks.Task.WhenAll(tasks);
        
        // Assert - All results should be identical
        var firstResult = results[0];
        Assert.All(results, result =>
        {
            Assert.Equal(firstResult.Errors.Count, result.Errors.Count);
            Assert.Equal(firstResult.Metadata.FhirVersion, result.Metadata.FhirVersion);
            Assert.NotNull(result.Metadata.Timestamp);
        });
    }

    private string CreateTestBundle()
    {
        // Minimal valid Bundle
        return """
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [
            {
              "resource": {
                "resourceType": "Patient",
                "id": "test-patient",
                "identifier": [
                  {
                    "system": "http://test.org",
                    "value": "12345"
                  }
                ]
              }
            }
          ]
        }
        """;
    }

    private string CreateInvalidTestBundle()
    {
        // Bundle with structural errors (missing resourceType)
        return """
        {
          "type": "collection",
          "entry": [
            {
              "resource": {
                "id": "test-patient"
              }
            }
          ]
        }
        """;
    }
}
