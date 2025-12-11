using Hl7.Fhir.Model;
using Pss.FhirProcessor.Engine.Interfaces;
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
                    Message = "Family name is required"
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
                    ErrorCode = "MANDATORY_MISSING",
                    Message = "Family name is required"
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
                    Message = "Gender must be female",
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
                    Message = "Gender must be female",
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
                    Message = "Invalid NRIC format",
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
                    Message = "Invalid NRIC format",
                    Params = new Dictionary<string, object> { { "pattern", @"^[STFG]\d{7}[A-Z]$" } }
                }
            }
        };

        // Act
        var errors = await _engine.ValidateAsync(bundle, ruleSet);

        // Assert
        Assert.Single(errors);
        Assert.Equal("REGEX_INVALID", errors[0].ErrorCode);
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
                    Type = "CustomFHIRPath",
                    ResourceType = "Patient",
                    Path = "invalid((syntax",
                    Message = "Invalid FHIRPath"
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
                    ErrorCode = "MANDATORY_MISSING",
                    Message = "Family name required"
                },
                new RuleDefinition
                {
                    Id = "R2",
                    Type = "FixedValue",
                    ResourceType = "Patient",
                    Path = "gender",
                    ErrorCode = "FIXED_VALUE_MISMATCH",
                    Message = "Gender must be female",
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
                    Message = "Family name required"
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
}
