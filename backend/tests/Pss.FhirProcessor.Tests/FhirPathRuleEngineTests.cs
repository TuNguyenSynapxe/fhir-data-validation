using Xunit;
using Hl7.Fhir.Model;
using Pss.FhirProcessor.Engine.Services;
using Pss.FhirProcessor.Engine.Core;
using Pss.FhirProcessor.Engine.RuleEngines;
using Pss.FhirProcessor.Engine.Navigation;
using Pss.FhirProcessor.Engine.Firely;
using Pss.FhirProcessor.Engine.Authoring;
using Pss.FhirProcessor.Engine.Models;
using Pss.FhirProcessor.Engine.Interfaces;
using Pss.FhirProcessor.Engine.Core;
using Pss.FhirProcessor.Engine.RuleEngines;
using Pss.FhirProcessor.Engine.Navigation;
using Pss.FhirProcessor.Engine.Firely;
using Pss.FhirProcessor.Engine.Authoring;

namespace Pss.FhirProcessor.Tests;

public class FhirPathRuleEngineTests
{
    [Fact]
    public async System.Threading.Tasks.Task Invalid_FHIRPath_Should_Produce_RuleDefinitionError()
    {
        // Arrange
        var logger = Microsoft.Extensions.Logging.Abstractions.NullLogger<FhirR4ModelResolverService>.Instance;
        var modelResolver = new FhirR4ModelResolverService(logger);
        var engineLogger = Microsoft.Extensions.Logging.Abstractions.NullLogger<FhirPathRuleEngine>.Instance;
        var engine = new FhirPathRuleEngine(modelResolver, engineLogger);
        
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
        Assert.Contains("FHIRPath evaluation failed", error.Message);
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
        var logger = Microsoft.Extensions.Logging.Abstractions.NullLogger<FhirR4ModelResolverService>.Instance;
        var modelResolver = new FhirR4ModelResolverService(logger);
        var engineLogger = Microsoft.Extensions.Logging.Abstractions.NullLogger<FhirPathRuleEngine>.Instance;
        var engine = new FhirPathRuleEngine(modelResolver, engineLogger);
        
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
        Assert.Contains("FHIRPath evaluation failed", definitionError.Message);
        
        // Second error should be the actual validation error (missing gender)
        var validationError = errors.First(e => e.RuleId == "R2");
        Assert.Equal("MISSING_GENDER", validationError.ErrorCode);
        Assert.Equal("Gender is required", validationError.Message);
    }
    
    [Fact]
    public async System.Threading.Tasks.Task Valid_FHIRPath_Should_Work_Normally()
    {
        // Arrange
        var logger = Microsoft.Extensions.Logging.Abstractions.NullLogger<FhirR4ModelResolverService>.Instance;
        var modelResolver = new FhirR4ModelResolverService(logger);
        var engineLogger = Microsoft.Extensions.Logging.Abstractions.NullLogger<FhirPathRuleEngine>.Instance;
        var engine = new FhirPathRuleEngine(modelResolver, engineLogger);
        
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

    [Fact]
    public async System.Threading.Tasks.Task FixedValue_MissingParam_ReturnsConfigurationError()
    {
        // Arrange
        var logger = Microsoft.Extensions.Logging.Abstractions.NullLogger<FhirR4ModelResolverService>.Instance;
        var modelResolver = new FhirR4ModelResolverService(logger);
        var engineLogger = Microsoft.Extensions.Logging.Abstractions.NullLogger<FhirPathRuleEngine>.Instance;
        var engine = new FhirPathRuleEngine(modelResolver, engineLogger);

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
                        Gender = AdministrativeGender.Male
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
                    Id = "FV1",
                    Type = "FixedValue",
                    ResourceType = "Patient",
                    Path = "Patient.gender",
                    Severity = "error",
                    ErrorCode = "INVALID_GENDER",
                    Message = "Gender must be fixed value",
                    Params = new Dictionary<string, object>() // Missing "value" param
                }
            }
        };

        // Act
        var errors = await engine.ValidateAsync(bundle, ruleSet, CancellationToken.None);

        // Assert
        Assert.Single(errors);
        var error = errors[0];
        Assert.Equal("RULE_CONFIGURATION_ERROR", error.ErrorCode);
        Assert.Equal("FV1", error.RuleId);
        Assert.Equal("FixedValue", error.RuleType);
        Assert.Contains("missing required parameter 'value'", error.Message);
        Assert.NotNull(error.Details);
        Assert.True(error.Details.ContainsKey("missingParams"));
    }

    [Fact]
    public async System.Threading.Tasks.Task AllowedValues_MissingParam_ReturnsConfigurationError()
    {
        // Arrange
        var logger = Microsoft.Extensions.Logging.Abstractions.NullLogger<FhirR4ModelResolverService>.Instance;
        var modelResolver = new FhirR4ModelResolverService(logger);
        var engineLogger = Microsoft.Extensions.Logging.Abstractions.NullLogger<FhirPathRuleEngine>.Instance;
        var engine = new FhirPathRuleEngine(modelResolver, engineLogger);

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
                        Gender = AdministrativeGender.Male
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
                    Id = "AV1",
                    Type = "AllowedValues",
                    ResourceType = "Patient",
                    Path = "Patient.gender",
                    Severity = "error",
                    ErrorCode = "INVALID_GENDER",
                    Message = "Gender must be in allowed list",
                    Params = new Dictionary<string, object>() // Missing "values" param
                }
            }
        };

        // Act
        var errors = await engine.ValidateAsync(bundle, ruleSet, CancellationToken.None);

        // Assert
        Assert.Single(errors);
        var error = errors[0];
        Assert.Equal("RULE_CONFIGURATION_ERROR", error.ErrorCode);
        Assert.Equal("AV1", error.RuleId);
        Assert.Equal("AllowedValues", error.RuleType);
        Assert.Contains("missing required parameter 'values'", error.Message);
        Assert.NotNull(error.Details);
        Assert.True(error.Details.ContainsKey("missingParams"));
    }

    [Fact]
    public async System.Threading.Tasks.Task Regex_MissingParam_ReturnsConfigurationError()
    {
        // Arrange
        var logger = Microsoft.Extensions.Logging.Abstractions.NullLogger<FhirR4ModelResolverService>.Instance;
        var modelResolver = new FhirR4ModelResolverService(logger);
        var engineLogger = Microsoft.Extensions.Logging.Abstractions.NullLogger<FhirPathRuleEngine>.Instance;
        var engine = new FhirPathRuleEngine(modelResolver, engineLogger);

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
                            new HumanName { Family = "Test123" }
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
                    Id = "RX1",
                    Type = "Regex",
                    ResourceType = "Patient",
                    Path = "Patient.name.family",
                    Severity = "error",
                    ErrorCode = "INVALID_FAMILY_FORMAT",
                    Message = "Family name format is invalid",
                    Params = new Dictionary<string, object>() // Missing "pattern" param
                }
            }
        };

        // Act
        var errors = await engine.ValidateAsync(bundle, ruleSet, CancellationToken.None);

        // Assert
        Assert.Single(errors);
        var error = errors[0];
        Assert.Equal("RULE_CONFIGURATION_ERROR", error.ErrorCode);
        Assert.Equal("RX1", error.RuleId);
        Assert.Equal("Regex", error.RuleType);
        Assert.Contains("missing required parameter 'pattern'", error.Message);
        Assert.NotNull(error.Details);
        Assert.True(error.Details.ContainsKey("missingParams"));
    }

    [Fact]
    public async System.Threading.Tasks.Task ArrayLength_MissingBothParams_ReturnsConfigurationError()
    {
        // Arrange
        var logger = Microsoft.Extensions.Logging.Abstractions.NullLogger<FhirR4ModelResolverService>.Instance;
        var modelResolver = new FhirR4ModelResolverService(logger);
        var engineLogger = Microsoft.Extensions.Logging.Abstractions.NullLogger<FhirPathRuleEngine>.Instance;
        var engine = new FhirPathRuleEngine(modelResolver, engineLogger);

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
                            new HumanName { Given = new List<string> { "John" } }
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
                    Id = "AL1",
                    Type = "ArrayLength",
                    ResourceType = "Patient",
                    Path = "Patient.name.given",
                    Severity = "error",
                    ErrorCode = "INVALID_GIVEN_COUNT",
                    Message = "Given name count is invalid",
                    Params = new Dictionary<string, object>() // Missing both "min" and "max" params
                }
            }
        };

        // Act
        var errors = await engine.ValidateAsync(bundle, ruleSet, CancellationToken.None);

        // Assert
        Assert.Single(errors);
        var error = errors[0];
        Assert.Equal("RULE_CONFIGURATION_ERROR", error.ErrorCode);
        Assert.Equal("AL1", error.RuleId);
        Assert.Equal("ArrayLength", error.RuleType);
        Assert.Contains("missing required parameters", error.Message);
        Assert.NotNull(error.Details);
        Assert.True(error.Details.ContainsKey("missingParams"));
    }

    [Fact]
    public async System.Threading.Tasks.Task CodeSystem_MissingParam_ReturnsConfigurationError()
    {
        // Arrange
        var logger = Microsoft.Extensions.Logging.Abstractions.NullLogger<FhirR4ModelResolverService>.Instance;
        var modelResolver = new FhirR4ModelResolverService(logger);
        var engineLogger = Microsoft.Extensions.Logging.Abstractions.NullLogger<FhirPathRuleEngine>.Instance;
        var engine = new FhirPathRuleEngine(modelResolver, engineLogger);

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
                        MaritalStatus = new CodeableConcept
                        {
                            Coding = new List<Coding>
                            {
                                new Coding("http://terminology.hl7.org/CodeSystem/v3-MaritalStatus", "M")
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
                    Id = "CS1",
                    Type = "CodeSystem",
                    ResourceType = "Patient",
                    Path = "Patient.maritalStatus",
                    Severity = "error",
                    ErrorCode = "INVALID_MARITAL_SYSTEM",
                    Message = "Marital status must use correct system",
                    Params = new Dictionary<string, object>() // Missing "system" param
                }
            }
        };

        // Act
        var errors = await engine.ValidateAsync(bundle, ruleSet, CancellationToken.None);

        // Assert
        Assert.Single(errors);
        var error = errors[0];
        Assert.Equal("RULE_CONFIGURATION_ERROR", error.ErrorCode);
        Assert.Equal("CS1", error.RuleId);
        Assert.Equal("CodeSystem", error.RuleType);
        Assert.Contains("missing required parameter 'system'", error.Message);
        Assert.NotNull(error.Details);
        Assert.True(error.Details.ContainsKey("missingParams"));
    }
}
