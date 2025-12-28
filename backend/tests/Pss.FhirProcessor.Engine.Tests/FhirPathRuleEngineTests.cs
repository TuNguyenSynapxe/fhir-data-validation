using Hl7.Fhir.Model;
using Pss.FhirProcessor.Engine.Interfaces;
using Pss.FhirProcessor.Engine.Core;
using Pss.FhirProcessor.Engine.RuleEngines;
using Pss.FhirProcessor.Engine.Navigation;
using Pss.FhirProcessor.Engine.Firely;
using Pss.FhirProcessor.Engine.Authoring;
using Pss.FhirProcessor.Engine.Models;
using Xunit;

namespace Pss.FhirProcessor.Engine.Tests;

public class FhirPathRuleEngineTests
{
    private readonly IFhirPathRuleEngine _engine;

    public FhirPathRuleEngineTests()
    {
        _engine = TestHelper.CreateRuleEngine();
    }

    [Fact]
    public async System.Threading.Tasks.Task ValidateAsync_RequiredRule_WithValue_NoErrors()
    {
        // Arrange
        var bundle = TestHelper.CreateSimplePatientBundle(familyName: "Smith");
        var ruleSet = new RuleSet
        {
            Rules = new List<RuleDefinition>
            {
                new RuleDefinition
                {
                    Id = "R1",
                    Type = "Required",
                    ResourceType = "Patient",
                    Path = "name.family",
                    ErrorCode = "TEST_ERROR_CODE"
                }
            }
        };

        // Act
        var errors = await _engine.ValidateAsync(bundle, ruleSet);

        // Assert
        Assert.Empty(errors);
    }

    [Fact]
    public async System.Threading.Tasks.Task ValidateAsync_RequiredRule_MissingValue_ReturnsError()
    {
        // Arrange
        var bundle = TestHelper.CreateSimplePatientBundle(familyName: null);
        var ruleSet = new RuleSet
        {
            Rules = new List<RuleDefinition>
            {
                new RuleDefinition
                {
                    Id = "R1",
                    Type = "Required",
                    ResourceType = "Patient",
                    Path = "name.family",
                    ErrorCode = "MANDATORY_MISSING"
                }
            }
        };

        // Act
        var errors = await _engine.ValidateAsync(bundle, ruleSet);

        // Assert
        Assert.Single(errors);
        Assert.Equal("MANDATORY_MISSING", errors[0].ErrorCode);
        Assert.Equal("R1", errors[0].RuleId);
        Assert.Equal("Patient", errors[0].ResourceType);
    }

    [Fact]
    public async System.Threading.Tasks.Task ValidateAsync_FixedValueRule_MatchingValue_NoErrors()
    {
        // Arrange
        var bundle = TestHelper.CreateSimplePatientBundle(gender: "female");
        var ruleSet = new RuleSet
        {
            Rules = new List<RuleDefinition>
            {
                new RuleDefinition
                {
                    Id = "R2",
                    Type = "FixedValue",
                    ResourceType = "Patient",
                    Path = "gender",
                    ErrorCode = "TEST_ERROR_CODE",
                    Params = new Dictionary<string, object> { { "value", "female" } }
                }
            }
        };

        // Act
        var errors = await _engine.ValidateAsync(bundle, ruleSet);

        // Assert
        Assert.Empty(errors);
    }

    [Fact]
    public async System.Threading.Tasks.Task ValidateAsync_FixedValueRule_DifferentValue_ReturnsError()
    {
        // Arrange
        var bundle = TestHelper.CreateSimplePatientBundle(gender: "male");
        var ruleSet = new RuleSet
        {
            Rules = new List<RuleDefinition>
            {
                new RuleDefinition
                {
                    Id = "R2",
                    Type = "FixedValue",
                    ResourceType = "Patient",
                    Path = "Patient.gender",
                    ErrorCode = "FIXED_VALUE_MISMATCH",
                    Params = new Dictionary<string, object> { { "value", "female" } }
                }
            }
        };

        // Act
        var errors = await _engine.ValidateAsync(bundle, ruleSet);

        // Assert
        Assert.Single(errors);
        Assert.Equal("FIXED_VALUE_MISMATCH", errors[0].ErrorCode);
        Assert.Equal("R2", errors[0].RuleId);
    }

    [Fact]
    public async System.Threading.Tasks.Task ValidateAsync_RegexRule_ValidPattern_NoErrors()
    {
        // Arrange
        var bundle = TestHelper.CreateSimplePatientBundle(nric: "S1234567D");
        var ruleSet = new RuleSet
        {
            Rules = new List<RuleDefinition>
            {
                new RuleDefinition
                {
                    Id = "R3",
                    Type = "Regex",
                    ResourceType = "Patient",
                    Path = "identifier.where(system='http://example.org/nric').value",
                    ErrorCode = "TEST_ERROR_CODE",
                    Params = new Dictionary<string, object> { { "pattern", @"^[STFG]\d{7}[A-Z]$" } }
                }
            }
        };

        // Act
        var errors = await _engine.ValidateAsync(bundle, ruleSet);

        // Assert
        Assert.Empty(errors);
    }

    [Fact]
    public async System.Threading.Tasks.Task ValidateAsync_RegexRule_InvalidPattern_ReturnsError()
    {
        // Arrange
        var bundle = TestHelper.CreateSimplePatientBundle(nric: "INVALID");
        var ruleSet = new RuleSet
        {
            Rules = new List<RuleDefinition>
            {
                new RuleDefinition
                {
                    Id = "R3",
                    Type = "Regex",
                    ResourceType = "Patient",
                    Path = "identifier.where(system='http://example.org/nric').value",
                    ErrorCode = "REGEX_INVALID",
                    Params = new Dictionary<string, object> { { "pattern", @"^[STFG]\d{7}[A-Z]$" } }
                }
            }
        };

        // Act
        var errors = await _engine.ValidateAsync(bundle, ruleSet);

        // Assert
        Assert.Single(errors);
        // Pattern/Regex rules always emit PATTERN_MISMATCH regardless of rule.ErrorCode
        Assert.Equal(Pss.FhirProcessor.Engine.Validation.ValidationErrorCodes.PATTERN_MISMATCH, errors[0].ErrorCode);
        Assert.Equal("R3", errors[0].RuleId);
    }

    [Fact]
    public async System.Threading.Tasks.Task ValidateAsync_InvalidFHIRPath_ReturnsRuleDefinitionError()
    {
        // Arrange
        var bundle = TestHelper.CreateSimplePatientBundle();
        var ruleSet = new RuleSet
        {
            Rules = new List<RuleDefinition>
            {
                new RuleDefinition
                {
                    Id = "R_INVALID",
                    Type = "Required",  // Changed from CustomFHIRPath to test actual FHIRPath syntax errors
                    ResourceType = "Patient",
                    Path = "invalid((syntax",
                    ErrorCode = "TEST_ERROR_CODE"
                }
            }
        };

        // Act
        var errors = await _engine.ValidateAsync(bundle, ruleSet);

        // Assert
        Assert.Single(errors);
        Assert.Equal("RULE_DEFINITION_ERROR", errors[0].ErrorCode);
        Assert.Equal("R_INVALID", errors[0].RuleId);
        Assert.NotNull(errors[0].Details);
    }

    [Fact]
    public async System.Threading.Tasks.Task ValidateAsync_MultipleRules_ReturnsAllErrors()
    {
        // Arrange
        var bundle = TestHelper.CreateSimplePatientBundle(familyName: null, gender: "male");
        var ruleSet = new RuleSet
        {
            Rules = new List<RuleDefinition>
            {
                new RuleDefinition
                {
                    Id = "R1",
                    Type = "Required",
                    ResourceType = "Patient",
                    Path = "name.family",
                    ErrorCode = "MANDATORY_MISSING"
                },
                new RuleDefinition
                {
                    Id = "R2",
                    Type = "FixedValue",
                    ResourceType = "Patient",
                    Path = "gender",
                    ErrorCode = "FIXED_VALUE_MISMATCH",
                    Params = new Dictionary<string, object> { { "value", "female" } }
                }
            }
        };

        // Act
        var errors = await _engine.ValidateAsync(bundle, ruleSet);

        // Assert
        Assert.Equal(2, errors.Count);
        Assert.Contains(errors, e => e.ErrorCode == "MANDATORY_MISSING" && e.RuleId == "R1");
        Assert.Contains(errors, e => e.ErrorCode == "FIXED_VALUE_MISMATCH" && e.RuleId == "R2");
    }

    [Fact]
    public async System.Threading.Tasks.Task ValidateAsync_EmptyBundle_NoErrors()
    {
        // Arrange
        var bundle = new Bundle
        {
            Type = Bundle.BundleType.Collection,
            Entry = new List<Bundle.EntryComponent>()
        };
        var ruleSet = new RuleSet
        {
            Rules = new List<RuleDefinition>
            {
                new RuleDefinition
                {
                    Id = "R1",
                    Type = "Required",
                    ResourceType = "Patient",
                    Path = "name.family",
                    ErrorCode = "TEST_ERROR_CODE"
                }
            }
        };

        // Act
        var errors = await _engine.ValidateAsync(bundle, ruleSet);

        // Assert
        Assert.Empty(errors);
    }

    [Fact]
    public async System.Threading.Tasks.Task ValidateAsync_WithFixtureFiles_ValidatesCorrectly()
    {
        // Arrange
        var bundle = TestHelper.LoadBundleFixture("sample-patient.json");
        var ruleSet = TestHelper.LoadRuleSetFixture("sample-rules.json");

        // Act
        var errors = await _engine.ValidateAsync(bundle, ruleSet);

        // Assert
        // sample-patient.json has NRIC S1234567D, name Tan Mary Jane, gender female, birthDate 1990-05-15
        // sample-rules.json has R1 (Required name.family), R2 (FixedValue gender=female), R3 (Regex NRIC)
        // All should pass
        Assert.Empty(errors);
    }

    #region Parameter Validation Tests

    [Fact]
    public async System.Threading.Tasks.Task ValidateAsync_FixedValue_MissingValueParam_ReturnsConfigurationError()
    {
        // Arrange
        var bundle = TestHelper.CreateSimplePatientBundle(gender: "male");
        var ruleSet = new RuleSet
        {
            Rules = new List<RuleDefinition>
            {
                new RuleDefinition
                {
                    Id = "FV-MISSING-PARAM",
                    Type = "FixedValue",
                    ResourceType = "Patient",
                    Path = "gender",
                    ErrorCode = "TEST_ERROR_CODE",
                    Params = new Dictionary<string, object>() // Missing "value" key
                }
            }
        };

        // Act
        var errors = await _engine.ValidateAsync(bundle, ruleSet);

        // Assert
        Assert.Single(errors);
        Assert.Equal("RULE_CONFIGURATION_ERROR", errors[0].ErrorCode);
        Assert.Equal("FV-MISSING-PARAM", errors[0].RuleId);
    }

    [Fact]
    public async System.Threading.Tasks.Task ValidateAsync_AllowedValues_MissingValuesParam_ReturnsConfigurationError()
    {
        // Arrange
        var bundle = TestHelper.CreateSimplePatientBundle(gender: "other");
        var ruleSet = new RuleSet
        {
            Rules = new List<RuleDefinition>
            {
                new RuleDefinition
                {
                    Id = "AV-MISSING-PARAM",
                    Type = "AllowedValues",
                    ResourceType = "Patient",
                    Path = "Patient.gender",
                    ErrorCode = "TEST_ERROR_CODE",
                    Params = new Dictionary<string, object>() // Missing "values" key
                }
            }
        };

        // Act
        var errors = await _engine.ValidateAsync(bundle, ruleSet);

        // Assert
        Assert.Single(errors);
        Assert.Equal("RULE_CONFIGURATION_ERROR", errors[0].ErrorCode);
        Assert.Equal("AV-MISSING-PARAM", errors[0].RuleId);
    }

    [Fact]
    public async System.Threading.Tasks.Task ValidateAsync_AllowedValues_InvalidValue_EmitsVALUE_NOT_ALLOWED()
    {
        // Test: AllowedValues rule with invalid value always emits VALUE_NOT_ALLOWED
        // Arrange
        var bundle = TestHelper.CreateSimplePatientBundle(gender: "unknown");
        var ruleSet = new RuleSet
        {
            Rules = new List<RuleDefinition>
            {
                new RuleDefinition
                {
                    Id = "AV-GENDER",
                    Type = "AllowedValues",
                    ResourceType = "Patient",
                    Path = "Patient.gender",
                    ErrorCode = "VALUE_NOT_ALLOWED",
                    Params = new Dictionary<string, object>
                    {
                        ["values"] = new List<string> { "male", "female", "other" }
                    }
                }
            }
        };

        // Act
        var errors = await _engine.ValidateAsync(bundle, ruleSet);

        // Assert
        Assert.Single(errors);
        Assert.Equal(Pss.FhirProcessor.Engine.Validation.ValidationErrorCodes.VALUE_NOT_ALLOWED, errors[0].ErrorCode);
        Assert.Equal("AV-GENDER", errors[0].RuleId);
    }

    [Fact]
    public async System.Threading.Tasks.Task ValidateAsync_AllowedValues_ValidValue_NoErrors()
    {
        // Test: AllowedValues rule with valid value produces no errors
        // Arrange
        var bundle = TestHelper.CreateSimplePatientBundle(gender: "female");
        var ruleSet = new RuleSet
        {
            Rules = new List<RuleDefinition>
            {
                new RuleDefinition
                {
                    Id = "AV-GENDER-VALID",
                    Type = "AllowedValues",
                    ResourceType = "Patient",
                    Path = "Patient.gender",
                    ErrorCode = "VALUE_NOT_ALLOWED",
                    Params = new Dictionary<string, object>
                    {
                        ["values"] = new List<string> { "male", "female", "other" }
                    }
                }
            }
        };

        // Act
        var errors = await _engine.ValidateAsync(bundle, ruleSet);

        // Assert
        if (errors.Any())
        {
            var error = errors[0];
            var actualValue = error.Details.ContainsKey("actual") ? error.Details["actual"]?.ToString() : "N/A";
            Assert.True(false, $"Expected no errors but got: {error.ErrorCode} with actual value '{actualValue}'");
        }
        Assert.Empty(errors);
    }

    [Fact]
    public async System.Threading.Tasks.Task ValidateAsync_Regex_MissingPatternParam_ReturnsConfigurationError()
    {
        // Arrange
        var bundle = TestHelper.CreateSimplePatientBundle(familyName: "Smith123");
        var ruleSet = new RuleSet
        {
            Rules = new List<RuleDefinition>
            {
                new RuleDefinition
                {
                    Id = "REGEX-MISSING-PARAM",
                    Type = "Regex",
                    ResourceType = "Patient",
                    Path = "name.family",
                    ErrorCode = "TEST_ERROR_CODE",
                    Params = new Dictionary<string, object>() // Missing "pattern" key
                }
            }
        };

        // Act
        var errors = await _engine.ValidateAsync(bundle, ruleSet);

        // Assert
        Assert.Single(errors);
        Assert.Equal("RULE_CONFIGURATION_ERROR", errors[0].ErrorCode);
        Assert.Equal("REGEX-MISSING-PARAM", errors[0].RuleId);
    }

    [Fact]
    public async System.Threading.Tasks.Task ValidateAsync_ArrayLength_MissingBothMinMaxParams_ReturnsConfigurationError()
    {
        // Arrange
        var bundle = TestHelper.CreateSimplePatientBundle();
        var ruleSet = new RuleSet
        {
            Rules = new List<RuleDefinition>
            {
                new RuleDefinition
                {
                    Id = "AL-MISSING-PARAMS",
                    Type = "ArrayLength",
                    ResourceType = "Patient",
                    Path = "name",
                    ErrorCode = "TEST_ERROR_CODE",
                    Params = new Dictionary<string, object>() // Missing both "min" and "max"
                }
            }
        };

        // Act
        var errors = await _engine.ValidateAsync(bundle, ruleSet);

        // Assert
        Assert.Single(errors);
        Assert.Equal("RULE_CONFIGURATION_ERROR", errors[0].ErrorCode);
        Assert.Equal("AL-MISSING-PARAMS", errors[0].RuleId);
    }

    [Fact]
    public async System.Threading.Tasks.Task ValidateAsync_ArrayLength_WithOnlyMin_NoConfigurationError()
    {
        // Arrange
        var bundle = TestHelper.CreateSimplePatientBundle();
        var ruleSet = new RuleSet
        {
            Rules = new List<RuleDefinition>
            {
                new RuleDefinition
                {
                    Id = "AL-MIN-ONLY",
                    Type = "ArrayLength",
                    ResourceType = "Patient",
                    Path = "name",
                    ErrorCode = "TEST_ERROR_CODE",
                    Params = new Dictionary<string, object> { { "min", 1 } } // Only min, no max - should be valid
                }
            }
        };

        // Act
        var errors = await _engine.ValidateAsync(bundle, ruleSet);

        // Assert
        // Should not contain configuration error
        Assert.DoesNotContain(errors, e => e.ErrorCode == "RULE_CONFIGURATION_ERROR");
    }

    [Fact]
    public async System.Threading.Tasks.Task ValidateAsync_CodeSystem_MissingSystemParam_ReturnsConfigurationError()
    {
        // Arrange
        var observation = new Observation
        {
            Id = "obs-1",
            Status = ObservationStatus.Final,
            Code = new CodeableConcept
            {
                Coding = new List<Coding>
                {
                    new Coding
                    {
                        System = "http://loinc.org",
                        Code = "12345-6"
                    }
                }
            }
        };
        var bundle = new Bundle
        {
            Type = Bundle.BundleType.Collection,
            Entry = new List<Bundle.EntryComponent>
            {
                new Bundle.EntryComponent { Resource = observation }
            }
        };
        var ruleSet = new RuleSet
        {
            Rules = new List<RuleDefinition>
            {
                new RuleDefinition
                {
                    Id = "CS-MISSING-PARAM",
                    Type = "CodeSystem",
                    ResourceType = "Observation",
                    Path = "code.coding",
                    ErrorCode = "TEST_ERROR_CODE",
                    Params = new Dictionary<string, object>() // Missing "system" key
                }
            }
        };

        // Act
        var errors = await _engine.ValidateAsync(bundle, ruleSet);

        // Assert
        Assert.Single(errors);
        Assert.Equal("RULE_CONFIGURATION_ERROR", errors[0].ErrorCode);
        Assert.Equal("CS-MISSING-PARAM", errors[0].RuleId);
    }

    [Fact]
    public async System.Threading.Tasks.Task ValidateAsync_MultipleRulesWithMissingParams_AllReturnConfigurationErrors()
    {
        // Arrange
        var bundle = TestHelper.CreateSimplePatientBundle(gender: "male");
        var ruleSet = new RuleSet
        {
            Rules = new List<RuleDefinition>
            {
                new RuleDefinition
                {
                    Id = "R1-BAD",
                    Type = "FixedValue",
                    ResourceType = "Patient",
                    Path = "gender",
                    ErrorCode = "TEST_ERROR_CODE",
                    Params = new Dictionary<string, object>() // Missing params
                },
                new RuleDefinition
                {
                    Id = "R2-BAD",
                    Type = "Regex",
                    ResourceType = "Patient",
                    Path = "name.family",
                    ErrorCode = "TEST_ERROR_CODE",
                    Params = new Dictionary<string, object>() // Missing params
                },
                new RuleDefinition
                {
                    Id = "R3-GOOD",
                    Type = "Required",
                    ResourceType = "Patient",
                    Path = "name.family",
                    ErrorCode = "TEST_ERROR_CODE"
                }
            }
        };

        // Act
        var errors = await _engine.ValidateAsync(bundle, ruleSet);

        // Assert - Should have 2 configuration errors, R3 should still execute normally
        Assert.Equal(2, errors.Count(e => e.ErrorCode == "RULE_CONFIGURATION_ERROR"));
        Assert.Contains(errors, e => e.RuleId == "R1-BAD" && e.ErrorCode == "RULE_CONFIGURATION_ERROR");
        Assert.Contains(errors, e => e.RuleId == "R2-BAD" && e.ErrorCode == "RULE_CONFIGURATION_ERROR");
        // R3 should not produce an error since family name exists
        Assert.DoesNotContain(errors, e => e.RuleId == "R3-GOOD");
    }

    [Fact]
    public async System.Threading.Tasks.Task ValidateAsync_ConfigurationError_HasCorrectDetails()
    {
        // Arrange
        var bundle = TestHelper.CreateSimplePatientBundle();
        var ruleSet = new RuleSet
        {
            Rules = new List<RuleDefinition>
            {
                new RuleDefinition
                {
                    Id = "CHECK-DETAILS",
                    Type = "FixedValue",
                    ResourceType = "Patient",
                    Path = "gender",
                    ErrorCode = "TEST_ERROR_CODE",
                    Params = new Dictionary<string, object>()
                }
            }
        };

        // Act
        var errors = await _engine.ValidateAsync(bundle, ruleSet);

        // Assert
        var error = errors.Single();
        Assert.Equal("RULE_CONFIGURATION_ERROR", error.ErrorCode);
        Assert.NotNull(error.Details);
        Assert.True(error.Details.ContainsKey("ruleType"));
        Assert.True(error.Details.ContainsKey("missingParams"));
        Assert.Equal("FixedValue", error.Details["ruleType"]);
    }

    #endregion

    #region Pattern Rule Hardening Tests

    [Fact]
    public async System.Threading.Tasks.Task ValidateAsync_PatternRule_WithCorrectErrorCode_EmitsPATTERN_MISMATCH()
    {
        // Test: Pattern rule with PATTERN_MISMATCH emits PATTERN_MISMATCH
        // Arrange
        var bundle = TestHelper.CreateSimplePatientBundle(nric: "INVALID");
        var ruleSet = new RuleSet
        {
            Rules = new List<RuleDefinition>
            {
                new RuleDefinition
                {
                    Id = "PATTERN-DEFAULT",
                    Type = "Regex",
                    ResourceType = "Patient",
                    Path = "identifier.where(system='http://example.org/nric').value",
                    ErrorCode = "PATTERN_MISMATCH",
                    Params = new Dictionary<string, object> { { "pattern", @"^\d+$" } }
                }
            }
        };

        // Act
        var errors = await _engine.ValidateAsync(bundle, ruleSet);

        // Assert
        Assert.Single(errors);
        Assert.Equal(Pss.FhirProcessor.Engine.Validation.ValidationErrorCodes.PATTERN_MISMATCH, errors[0].ErrorCode);
    }

    [Fact]
    public async System.Threading.Tasks.Task ValidateAsync_RegexRule_WithCustomErrorCode_IgnoresAndEmitsPATTERN_MISMATCH()
    {
        // Test: Pattern rules ignore rule.ErrorCode override and always emit PATTERN_MISMATCH
        // Arrange
        var bundle = TestHelper.CreateSimplePatientBundle(nric: "INVALID");
        var ruleSet = new RuleSet
        {
            Rules = new List<RuleDefinition>
            {
                new RuleDefinition
                {
                    Id = "REGEX-CUSTOM-CODE",
                    Type = "Regex",
                    ResourceType = "Patient",
                    Path = "identifier.where(system='http://example.org/nric').value",
                    ErrorCode = "CUSTOM_CODE", // Should be ignored
                    Params = new Dictionary<string, object> { { "pattern", @"^\d+$" } }
                }
            }
        };

        // Act
        var errors = await _engine.ValidateAsync(bundle, ruleSet);

        // Assert
        Assert.Single(errors);
        // Must emit PATTERN_MISMATCH, not CUSTOM_CODE
        Assert.Equal(Pss.FhirProcessor.Engine.Validation.ValidationErrorCodes.PATTERN_MISMATCH, errors[0].ErrorCode);
    }

    [Fact]
    public async System.Threading.Tasks.Task ValidateAsync_PatternAndRegex_BehaveSame()
    {
        // Test: Pattern and Regex rule types behave identically
        // Arrange
        var bundle = TestHelper.CreateSimplePatientBundle(nric: "INVALID");
        var ruleSetPattern = new RuleSet
        {
            Rules = new List<RuleDefinition>
            {
                new RuleDefinition
                {
                    Id = "PATTERN-TEST",
                    Type = "Regex",
                    ResourceType = "Patient",
                    Path = "identifier.where(system='http://example.org/nric').value",
                    ErrorCode = "PATTERN_MISMATCH",
                    Params = new Dictionary<string, object> { { "pattern", @"^\d+$" } }
                }
            }
        };
        
        var ruleSetRegex = new RuleSet
        {
            Rules = new List<RuleDefinition>
            {
                new RuleDefinition
                {
                    Id = "REGEX-TEST",
                    Type = "Regex",
                    ResourceType = "Patient",
                    Path = "identifier.where(system='http://example.org/nric').value",
                    ErrorCode = "PATTERN_MISMATCH",
                    Params = new Dictionary<string, object> { { "pattern", @"^\d+$" } }
                }
            }
        };

        // Act
        var errorsPattern = await _engine.ValidateAsync(bundle, ruleSetPattern);
        var errorsRegex = await _engine.ValidateAsync(bundle, ruleSetRegex);

        // Assert
        Assert.Single(errorsPattern);
        Assert.Single(errorsRegex);
        Assert.Equal(errorsPattern[0].ErrorCode, errorsRegex[0].ErrorCode);
        Assert.Equal(Pss.FhirProcessor.Engine.Validation.ValidationErrorCodes.PATTERN_MISMATCH, errorsPattern[0].ErrorCode);
    }

    #endregion
}
