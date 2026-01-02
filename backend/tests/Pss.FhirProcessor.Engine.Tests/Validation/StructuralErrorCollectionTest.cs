using FluentAssertions;
using Pss.FhirProcessor.Engine.Models;
using Xunit;

namespace Pss.FhirProcessor.Engine.Tests.Validation;

/// <summary>
/// Explicit test to verify JsonNodeStructuralValidator collects ALL errors in one run.
/// Addresses requirement: Remove early exit logic that prevents full error collection.
/// </summary>
public class StructuralErrorCollectionTest
{
    [Fact]
    public async Task ValidateAsync_ThreeErrorTypes_ReturnsAllThreeInOneRun()
    {
        // Arrange - Resource with exactly 3 STRUCTURE errors:
        // 1. Invalid enum (gender)
        // 2. Invalid primitive (birthDate)
        // 3. Array expected but got string (identifier)
        var bundleJson = """
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [{
            "resource": {
              "resourceType": "Patient",
              "gender": "InvalidEnumValue",
              "birthDate": "not-a-valid-date",
              "identifier": "not-an-array"
            }
          }]
        }
        """;

        var pipeline = TestHelper.CreateValidationPipeline();
        var request = new ValidationRequest
        {
            BundleJson = bundleJson,
            FhirVersion = "R4"
        };

        // Act - Single validation run
        var result = await pipeline.ValidateAsync(request);

        // Assert - Must return all 3 STRUCTURE errors in one run
        var structureErrors = result.Errors
            .Where(e => e.Source == "STRUCTURE")
            .ToList();

        structureErrors.Should().HaveCountGreaterOrEqualTo(3, 
            "should collect invalid enum, invalid primitive, and array shape error");

        // Verify we have the specific error types
        var errorCodes = structureErrors.Select(e => e.ErrorCode).ToList();
        
        errorCodes.Should().Contain("INVALID_ENUM_VALUE", 
            "invalid gender enum should be detected");
        
        errorCodes.Should().Contain("FHIR_INVALID_PRIMITIVE", 
            "invalid birthDate format should be detected");
        
        errorCodes.Should().Contain("FHIR_ARRAY_EXPECTED", 
            "array type mismatch should be detected");

        // All errors must have jsonPointer for navigation
        structureErrors.Should().OnlyContain(e => !string.IsNullOrEmpty(e.JsonPointer),
            "all STRUCTURE errors must have jsonPointer");

        // All errors must have ERROR severity
        structureErrors.Should().OnlyContain(e => e.Severity == "error",
            "all STRUCTURE errors must have ERROR severity");
    }

    [Fact]
    public async Task ValidateAsync_ErrorsInMultipleResources_CollectsAllErrors()
    {
        // Arrange - Multiple resources, each with errors
        var bundleJson = """
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [
            {
              "resource": {
                "resourceType": "Patient",
                "gender": "InvalidValue1"
              }
            },
            {
              "resource": {
                "resourceType": "Patient",
                "gender": "InvalidValue2",
                "birthDate": "bad-date"
              }
            }
          ]
        }
        """;

        var pipeline = TestHelper.CreateValidationPipeline();
        var request = new ValidationRequest
        {
            BundleJson = bundleJson,
            FhirVersion = "R4"
        };

        // Act
        var result = await pipeline.ValidateAsync(request);

        // Assert - Should collect errors from BOTH resources
        var structureErrors = result.Errors
            .Where(e => e.Source == "STRUCTURE")
            .ToList();

        structureErrors.Should().HaveCountGreaterOrEqualTo(3, 
            "should collect errors from both Patient resources");

        // Verify errors from different resources (different jsonPointers)
        var jsonPointers = structureErrors
            .Select(e => e.JsonPointer)
            .Distinct()
            .ToList();

        jsonPointers.Should().Contain(p => p!.Contains("/entry/0/"), 
            "should have errors from first resource");
        
        jsonPointers.Should().Contain(p => p!.Contains("/entry/1/"), 
            "should have errors from second resource");
    }

    [Fact]
    public async Task ValidateAsync_ErrorsInSameResource_CollectsAllErrors()
    {
        // Arrange - Single resource with multiple field errors
        var bundleJson = """
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [{
            "resource": {
              "resourceType": "Patient",
              "gender": "InvalidGender",
              "birthDate": "9999-99-99",
              "identifier": "should-be-array",
              "active": 123
            }
          }]
        }
        """;

        var pipeline = TestHelper.CreateValidationPipeline();
        var request = new ValidationRequest
        {
            BundleJson = bundleJson,
            FhirVersion = "R4"
        };

        // Act
        var result = await pipeline.ValidateAsync(request);

        // Assert - Should collect errors from different fields in same resource
        var structureErrors = result.Errors
            .Where(e => e.Source == "STRUCTURE")
            .ToList();

        structureErrors.Should().HaveCountGreaterOrEqualTo(3, 
            "should collect all field errors from same resource");

        // Verify we have errors from different fields
        var fieldPaths = structureErrors
            .Select(e => e.JsonPointer)
            .Where(p => !string.IsNullOrEmpty(p))
            .ToList();

        fieldPaths.Should().Contain(p => p!.Contains("gender"), 
            "should have gender error");
        
        fieldPaths.Should().Contain(p => p!.Contains("birthDate"), 
            "should have birthDate error");
        
        fieldPaths.Should().Contain(p => p!.Contains("identifier"), 
            "should have identifier error");
    }
}
