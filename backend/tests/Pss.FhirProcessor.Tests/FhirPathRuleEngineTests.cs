using Xunit;
using Hl7.Fhir.Model;
using Pss.FhirProcessor.Engine.Services;
using Pss.FhirProcessor.Engine.Models;

namespace Pss.FhirProcessor.Tests;

public class FhirPathRuleEngineTests
{
    [Fact]
    public async System.Threading.Tasks.Task Invalid_FHIRPath_Should_Produce_RuleDefinitionError()
    {
        // Arrange
        var engine = new FhirPathRuleEngine();
        
        var bundle = new Bundle
        {
            Type = Bundle.BundleType.Collection,
            Entry = new List<Bundle.EntryComponent>
            {
                new Bundle.EntryComponent
                {
                    FullUrl = "urn:uuid:patient-001",
                    Resource = new Patient
                    {
                        Id = "patient-001",
                        Name = new List<HumanName>
                        {
                            new HumanName
                            {
                                Family = "Doe",
                                Given = new List<string> { "John" }
                            }
                        }
                    }
                }
            }
        };
        
        var ruleSet = new RuleSet
        {
            Version = "1.0",
            FhirVersion = "4.0.1",
            Rules = new List<RuleDefinition>
            {
                new RuleDefinition
                {
                    Id = "R25",
                    Type = "Required",
                    ResourceType = "Patient",
                    Path = "Patient.name.wrongMethod()",
                    Severity = "error",
                    ErrorCode = "TEST_ERROR",
                    Message = "This rule has an invalid FHIRPath"
                }
            }
        };
        
        // Act
        var errors = await engine.ValidateAsync(bundle, ruleSet, CancellationToken.None);
        
        // Assert
        Assert.NotEmpty(errors);
        var error = errors.First();
        
        Assert.Equal("RULE_DEFINITION_ERROR", error.ErrorCode);
        Assert.Equal("R25", error.RuleId);
        Assert.Equal("Required", error.RuleType);
        Assert.Equal("Patient", error.ResourceType);
        Assert.Equal("patient-001", error.ResourceId);
        Assert.Equal(0, error.EntryIndex);
        Assert.Equal("Patient.name.wrongMethod()", error.Path);
        Assert.Contains("FHIRPath compilation failed", error.Message);
        Assert.Contains("Patient.name.wrongMethod()", error.Message);
        
        // Verify details are present
        Assert.NotNull(error.Details);
        Assert.True(error.Details.ContainsKey("fhirPath"));
        Assert.Equal("Patient.name.wrongMethod()", error.Details["fhirPath"]);
        Assert.True(error.Details.ContainsKey("exceptionType"));
        Assert.True(error.Details.ContainsKey("exceptionMessage"));
    }
    
    [Fact]
    public async System.Threading.Tasks.Task Invalid_FHIRPath_Should_Not_Stop_Other_Rules()
    {
        // Arrange
        var engine = new FhirPathRuleEngine();
        
        var bundle = new Bundle
        {
            Type = Bundle.BundleType.Collection,
            Entry = new List<Bundle.EntryComponent>
            {
                new Bundle.EntryComponent
                {
                    FullUrl = "urn:uuid:patient-001",
                    Resource = new Patient
                    {
                        Id = "patient-001",
                        Name = new List<HumanName>
                        {
                            new HumanName
                            {
                                Family = "Doe",
                                Given = new List<string> { "John" }
                            }
                        }
                    }
                }
            }
        };
        
        var ruleSet = new RuleSet
        {
            Version = "1.0",
            FhirVersion = "4.0.1",
            Rules = new List<RuleDefinition>
            {
                new RuleDefinition
                {
                    Id = "R1",
                    Type = "Required",
                    ResourceType = "Patient",
                    Path = "Patient.name.invalidFunction()",
                    Severity = "error",
                    ErrorCode = "TEST_ERROR_1",
                    Message = "Invalid rule 1"
                },
                new RuleDefinition
                {
                    Id = "R2",
                    Type = "Required",
                    ResourceType = "Patient",
                    Path = "Patient.gender",
                    Severity = "error",
                    ErrorCode = "MISSING_GENDER",
                    Message = "Gender is required"
                }
            }
        };
        
        // Act
        var errors = await engine.ValidateAsync(bundle, ruleSet, CancellationToken.None);
        
        // Assert
        Assert.Equal(2, errors.Count);
        
        // First error should be RULE_DEFINITION_ERROR for invalid FHIRPath
        var definitionError = errors.First(e => e.RuleId == "R1");
        Assert.Equal("RULE_DEFINITION_ERROR", definitionError.ErrorCode);
        Assert.Contains("FHIRPath compilation failed", definitionError.Message);
        
        // Second error should be the actual validation error (missing gender)
        var validationError = errors.First(e => e.RuleId == "R2");
        Assert.Equal("MISSING_GENDER", validationError.ErrorCode);
        Assert.Equal("Gender is required", validationError.Message);
    }
    
    [Fact]
    public async System.Threading.Tasks.Task Valid_FHIRPath_Should_Work_Normally()
    {
        // Arrange
        var engine = new FhirPathRuleEngine();
        
        var bundle = new Bundle
        {
            Type = Bundle.BundleType.Collection,
            Entry = new List<Bundle.EntryComponent>
            {
                new Bundle.EntryComponent
                {
                    FullUrl = "urn:uuid:patient-001",
                    Resource = new Patient
                    {
                        Id = "patient-001",
                        Name = new List<HumanName>
                        {
                            new HumanName
                            {
                                Family = "Doe",
                                Given = new List<string> { "John" }
                            }
                        }
                    }
                }
            }
        };
        
        var ruleSet = new RuleSet
        {
            Version = "1.0",
            FhirVersion = "4.0.1",
            Rules = new List<RuleDefinition>
            {
                new RuleDefinition
                {
                    Id = "R3",
                    Type = "Required",
                    ResourceType = "Patient",
                    Path = "Patient.name.family",
                    Severity = "error",
                    ErrorCode = "MISSING_FAMILY",
                    Message = "Family name is required"
                }
            }
        };
        
        // Act
        var errors = await engine.ValidateAsync(bundle, ruleSet, CancellationToken.None);
        
        // Assert - should be empty because family name exists
        Assert.Empty(errors);
    }
}
