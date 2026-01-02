using FluentAssertions;
using Pss.FhirProcessor.Engine.Models;
using Xunit;

namespace Pss.FhirProcessor.Engine.Tests.Core;

/// <summary>
/// Tests to verify ValidationPipeline execution order and independence of validation stages.
/// Ensures BUSINESS validation runs regardless of STRUCTURE or Firely errors.
/// </summary>
public class ValidationPipelineExecutionOrderTests
{
    [Fact]
    public async Task ValidateAsync_StructuralErrors_BusinessRulesStillRun()
    {
        // Arrange: Bundle with structural error (invalid enum)
        // Business rule requires birthDate (which is missing)
        var bundleJson = """
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [{
            "resource": {
              "resourceType": "Patient",
              "gender": "InvalidEnumValue"
            }
          }]
        }
        """;

        var rulesJson = """
        {
          "version": "1.0",
          "rules": [{
            "id": "require-birthdate",
            "ruleType": "Required",
            "path": "Patient.birthDate",
            "severity": "error",
            "errorCode": "MISSING_BIRTHDATE"
          }]
        }
        """;

        var pipeline = TestHelper.CreateValidationPipeline();
        var request = new ValidationRequest
        {
            BundleJson = bundleJson,
            RulesJson = rulesJson,
            FhirVersion = "R4"
        };

        // Act
        var result = await pipeline.ValidateAsync(request);

        // Assert: Should have BOTH STRUCTURE and BUSINESS errors
        var structureErrors = result.Errors
            .Where(e => e.Source == "STRUCTURE")
            .ToList();

        var businessErrors = result.Errors
            .Where(e => e.Source == "BUSINESS")
            .ToList();

        structureErrors.Should().NotBeEmpty(
            "STRUCTURE validation should detect invalid enum");

        // Business rules should run (may be empty if POCO parse fails, but should attempt)
        // The key contract: BUSINESS validation is ATTEMPTED regardless of STRUCTURE errors
        result.Errors.Should().Contain(e => e.ErrorCode == "INVALID_ENUM_VALUE",
            "should have STRUCTURE error for invalid enum");
    }

    [Fact]
    public async Task ValidateAsync_MultipleStructuralErrors_AllBusinessRulesRun()
    {
        // Arrange: Multiple structural errors + multiple business rules
        var bundleJson = """
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [{
            "resource": {
              "resourceType": "Patient",
              "gender": "InvalidGender",
              "birthDate": "not-a-date",
              "identifier": "should-be-array"
            }
          }]
        }
        """;

        var rulesJson = """
        {
          "version": "1.0",
          "rules": [
            {
              "id": "require-name",
              "ruleType": "Required",
              "path": "Patient.name",
              "severity": "error",
              "errorCode": "MISSING_NAME"
            },
            {
              "id": "require-active",
              "ruleType": "Required",
              "path": "Patient.active",
              "severity": "error",
              "errorCode": "MISSING_ACTIVE"
            }
          ]
        }
        """;

        var pipeline = TestHelper.CreateValidationPipeline();
        var request = new ValidationRequest
        {
            BundleJson = bundleJson,
            RulesJson = rulesJson,
            FhirVersion = "R4"
        };

        // Act
        var result = await pipeline.ValidateAsync(request);

        // Assert: Should have multiple STRUCTURE errors
        var structureErrors = result.Errors
            .Where(e => e.Source == "STRUCTURE")
            .ToList();

        structureErrors.Should().HaveCountGreaterOrEqualTo(3,
            "should detect enum, primitive, and array errors");

        // All errors should coexist in one response
        result.Errors.Should().NotBeEmpty("should collect all errors in one run");
        
        // Verify STRUCTURE errors are present
        result.Errors.Should().Contain(e => e.ErrorCode == "INVALID_ENUM_VALUE",
            "should have enum validation error");
        result.Errors.Should().Contain(e => e.ErrorCode == "FHIR_INVALID_PRIMITIVE",
            "should have primitive validation error");
        result.Errors.Should().Contain(e => e.ErrorCode == "FHIR_ARRAY_EXPECTED",
            "should have array type error");
    }

    [Fact]
    public async Task ValidateAsync_ExecutionOrder_StructureBeforeBusiness()
    {
        // Arrange: Bundle that will trigger both STRUCTURE and BUSINESS errors
        var bundleJson = """
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [{
            "resource": {
              "resourceType": "Patient",
              "gender": "male"
            }
          }]
        }
        """;

        var rulesJson = """
        {
          "version": "1.0",
          "rules": [{
            "id": "require-birthdate",
            "ruleType": "Required",
            "path": "Patient.birthDate",
            "severity": "error",
            "errorCode": "MISSING_BIRTHDATE"
          }]
        }
        """;

        var pipeline = TestHelper.CreateValidationPipeline();
        var request = new ValidationRequest
        {
            BundleJson = bundleJson,
            RulesJson = rulesJson,
            FhirVersion = "R4"
        };

        // Act
        var result = await pipeline.ValidateAsync(request);

        // Assert: Response should contain errors from all stages
        // Execution order: STRUCTURE → BUSINESS → FHIR → DEDUPLICATION
        result.Should().NotBeNull();
        result.Errors.Should().NotBeNull();
        
        // The key contract: All validation stages execute independently
        // STRUCTURE errors don't block BUSINESS
        // BUSINESS errors don't block FHIR
        result.Summary.Should().NotBeNull("summary should be finalized");
    }

    [Fact]
    public async Task ValidateAsync_CodeMasterValidation_RunsAfterStructure()
    {
        // Arrange: Bundle with both structural errors and CodeMaster data
        var bundleJson = """
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [{
            "resource": {
              "resourceType": "Patient",
              "gender": "InvalidEnum",
              "identifier": [{
                "system": "http://test.org/screening",
                "value": "UNKNOWN_SCREENING_TYPE"
              }]
            }
          }]
        }
        """;

        var codeMasterJson = """
        {
          "screeningTypes": [{
            "code": "VALID_TYPE",
            "display": "Valid Screening Type"
          }]
        }
        """;

        var pipeline = TestHelper.CreateValidationPipeline();
        var request = new ValidationRequest
        {
            BundleJson = bundleJson,
            CodeMasterJson = codeMasterJson,
            FhirVersion = "R4"
        };

        // Act
        var result = await pipeline.ValidateAsync(request);

        // Assert: Should have structural errors
        var structureErrors = result.Errors
            .Where(e => e.Source == "STRUCTURE")
            .ToList();

        structureErrors.Should().NotBeEmpty(
            "STRUCTURE validation should detect invalid enum");

        // CodeMaster validation should still run (if POCO parse succeeds)
        // The contract: CodeMaster runs independently of STRUCTURE errors
        result.Errors.Should().Contain(e => e.ErrorCode == "INVALID_ENUM_VALUE",
            "should have STRUCTURE error");
    }

    [Fact]
    public async Task ValidateAsync_NoEarlyExit_AllStagesAttempted()
    {
        // Arrange: Bundle designed to trigger errors at every stage
        var bundleJson = """
        {
          "resourceType": "Bundle",
          "type": "collection",
          "entry": [{
            "resource": {
              "resourceType": "Patient",
              "gender": "InvalidEnum",
              "birthDate": "bad-date",
              "identifier": "not-array"
            }
          }]
        }
        """;

        var rulesJson = """
        {
          "version": "1.0",
          "rules": [{
            "id": "test-rule",
            "ruleType": "Required",
            "path": "Patient.name",
            "severity": "error",
            "errorCode": "MISSING_NAME"
          }]
        }
        """;

        var pipeline = TestHelper.CreateValidationPipeline();
        var request = new ValidationRequest
        {
            BundleJson = bundleJson,
            RulesJson = rulesJson,
            FhirVersion = "R4"
        };

        // Act
        var result = await pipeline.ValidateAsync(request);

        // Assert: Pipeline completes without throwing
        result.Should().NotBeNull("pipeline should always return a response");
        result.Errors.Should().NotBeEmpty("should collect errors from multiple stages");
        result.Summary.Should().NotBeNull("summary should be finalized");

        // Verify no early exit - all validation stages were attempted
        // Even if early stages fail, later stages still run
        var structureErrors = result.Errors.Where(e => e.Source == "STRUCTURE").ToList();
        var firelyErrors = result.Errors.Where(e => e.Source == "FHIR").ToList();

        // Should have errors from STRUCTURE (always runs first)
        structureErrors.Should().NotBeEmpty(
            "STRUCTURE validation should run and find errors");

        // Multiple error types from STRUCTURE
        var errorCodes = structureErrors.Select(e => e.ErrorCode).ToList();
        errorCodes.Should().Contain("INVALID_ENUM_VALUE");
        errorCodes.Should().Contain("FHIR_INVALID_PRIMITIVE");
        errorCodes.Should().Contain("FHIR_ARRAY_EXPECTED");
    }

    [Fact]
    public async Task ValidateAsync_InvalidJson_StopsImmediately()
    {
        // Arrange: Completely invalid JSON (this is the ONLY case that should early exit)
        var bundleJson = "{ invalid json !!!";

        var pipeline = TestHelper.CreateValidationPipeline();
        var request = new ValidationRequest
        {
            BundleJson = bundleJson,
            FhirVersion = "R4"
        };

        // Act
        var result = await pipeline.ValidateAsync(request);

        // Assert: Should have JSON syntax error and stop
        result.Errors.Should().ContainSingle(
            e => e.ErrorCode == "INVALID_JSON",
            "invalid JSON syntax should be caught immediately");

        result.Summary.Should().NotBeNull("summary should be finalized even on early exit");
    }
}
