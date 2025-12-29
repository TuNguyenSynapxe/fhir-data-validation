using Xunit;
using Moq;
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
        var mockTerminologyService = new Mock<ITerminologyService>();
        var engine = new FhirPathRuleEngine(modelResolver, engineLogger, mockTerminologyService.Object);
        
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
                    ErrorCode = "TEST_ERROR"
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
        Assert.Equal("RULE_DEFINITION_ERROR", error.ErrorCode);
        
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
        var mockTerminologyService = new Mock<ITerminologyService>();
        var engine = new FhirPathRuleEngine(modelResolver, engineLogger, mockTerminologyService.Object);
        
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
                    ErrorCode = "TEST_ERROR_1"
                },
                new RuleDefinition
                {
                    Id = "R2",
                    Type = "Required",
                    ResourceType = "Patient",
                    Path = "Patient.gender",
                    Severity = "error",
                    ErrorCode = "MISSING_GENDER"
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
        Assert.NotNull(definitionError.Details);
        Assert.True(definitionError.Details.ContainsKey("fhirPath") || definitionError.Details.ContainsKey("exceptionMessage"));
        
        // Second error should be the actual validation error (missing gender)
        var validationError = errors.First(e => e.RuleId == "R2");
        Assert.Equal("MISSING_GENDER", validationError.ErrorCode);
        Assert.Equal("Required", validationError.RuleType);
    }
    
    [Fact]
    public async System.Threading.Tasks.Task Valid_FHIRPath_Should_Work_Normally()
    {
        // Arrange
        var logger = Microsoft.Extensions.Logging.Abstractions.NullLogger<FhirR4ModelResolverService>.Instance;
        var modelResolver = new FhirR4ModelResolverService(logger);
        var engineLogger = Microsoft.Extensions.Logging.Abstractions.NullLogger<FhirPathRuleEngine>.Instance;
        var mockTerminologyService = new Mock<ITerminologyService>();
        var engine = new FhirPathRuleEngine(modelResolver, engineLogger, mockTerminologyService.Object);
        
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
                    ErrorCode = "MISSING_FAMILY"
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
        var mockTerminologyService = new Mock<ITerminologyService>();
        var engine = new FhirPathRuleEngine(modelResolver, engineLogger, mockTerminologyService.Object);

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
        var mockTerminologyService = new Mock<ITerminologyService>();
        var engine = new FhirPathRuleEngine(modelResolver, engineLogger, mockTerminologyService.Object);

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
        var mockTerminologyService = new Mock<ITerminologyService>();
        var engine = new FhirPathRuleEngine(modelResolver, engineLogger, mockTerminologyService.Object);

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
        var mockTerminologyService = new Mock<ITerminologyService>();
        var engine = new FhirPathRuleEngine(modelResolver, engineLogger, mockTerminologyService.Object);

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
        var mockTerminologyService = new Mock<ITerminologyService>();
        var engine = new FhirPathRuleEngine(modelResolver, engineLogger, mockTerminologyService.Object);

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
        Assert.NotNull(error.Details);
        Assert.True(error.Details.ContainsKey("missingParams"));
    }

    [Fact]
    public async System.Threading.Tasks.Task ValidateAsync_CodeSystem_SystemMismatch_Emits_CODESYSTEM_VIOLATION()
    {
        // Arrange
        var logger = Microsoft.Extensions.Logging.Abstractions.NullLogger<FhirR4ModelResolverService>.Instance;
        var modelResolver = new FhirR4ModelResolverService(logger);
        var engineLogger = Microsoft.Extensions.Logging.Abstractions.NullLogger<FhirPathRuleEngine>.Instance;
        var mockTerminologyService = new Mock<ITerminologyService>();
        var engine = new FhirPathRuleEngine(modelResolver, engineLogger, mockTerminologyService.Object);

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
                                new Coding("http://wrong-system.org/MaritalStatus", "M")
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
                    Path = "Patient.maritalStatus.coding",
                    Severity = "error",
                    ErrorCode = "CODESYSTEM_VIOLATION",
                    Params = new Dictionary<string, object>
                    {
                        ["system"] = "http://terminology.hl7.org/CodeSystem/v3-MaritalStatus"
                    }
                }
            }
        };

        // Act
        var errors = await engine.ValidateAsync(bundle, ruleSet, CancellationToken.None);

        // Assert
        Assert.Single(errors);
        var error = errors[0];
        Assert.Equal("CODESYSTEM_VIOLATION", error.ErrorCode);
        Assert.Equal("CS1", error.RuleId);
        Assert.Equal("CodeSystem", error.RuleType);
        Assert.NotNull(error.Details);
        Assert.Equal("system", error.Details["violation"]);
        Assert.Equal("http://terminology.hl7.org/CodeSystem/v3-MaritalStatus", error.Details["expectedSystem"]);
        Assert.Equal("http://wrong-system.org/MaritalStatus", error.Details["actualSystem"]);
    }

    [Fact]
    public async System.Threading.Tasks.Task ValidateAsync_CodeSystem_CodeNotAllowed_Emits_CODESYSTEM_VIOLATION()
    {
        // Arrange
        var logger = Microsoft.Extensions.Logging.Abstractions.NullLogger<FhirR4ModelResolverService>.Instance;
        var modelResolver = new FhirR4ModelResolverService(logger);
        var engineLogger = Microsoft.Extensions.Logging.Abstractions.NullLogger<FhirPathRuleEngine>.Instance;
        var mockTerminologyService = new Mock<ITerminologyService>();
        var engine = new FhirPathRuleEngine(modelResolver, engineLogger, mockTerminologyService.Object);

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
                                new Coding("http://terminology.hl7.org/CodeSystem/v3-MaritalStatus", "INVALID_CODE")
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
                    Id = "CS2",
                    Type = "CodeSystem",
                    ResourceType = "Patient",
                    Path = "Patient.maritalStatus.coding",
                    Severity = "error",
                    ErrorCode = "CODESYSTEM_VIOLATION",
                    Params = new Dictionary<string, object>
                    {
                        ["system"] = "http://terminology.hl7.org/CodeSystem/v3-MaritalStatus",
                        ["codes"] = new List<string> { "M", "S", "D", "W" }
                    }
                }
            }
        };

        // Act
        var errors = await engine.ValidateAsync(bundle, ruleSet, CancellationToken.None);

        // Assert
        Assert.Single(errors);
        var error = errors[0];
        Assert.Equal("CODESYSTEM_VIOLATION", error.ErrorCode);
        Assert.Equal("CS2", error.RuleId);
        Assert.Equal("CodeSystem", error.RuleType);
        Assert.NotNull(error.Details);
        Assert.Equal("code", error.Details["violation"]);
        Assert.Equal("INVALID_CODE", error.Details["actualCode"]);
        Assert.True(error.Details.ContainsKey("allowedCodes"));
    }

    [Fact]
    public async System.Threading.Tasks.Task ValidateAsync_CodeSystem_ValidSystemAndCode_NoErrors()
    {
        // Arrange
        var logger = Microsoft.Extensions.Logging.Abstractions.NullLogger<FhirR4ModelResolverService>.Instance;
        var modelResolver = new FhirR4ModelResolverService(logger);
        var engineLogger = Microsoft.Extensions.Logging.Abstractions.NullLogger<FhirPathRuleEngine>.Instance;
        var mockTerminologyService = new Mock<ITerminologyService>();
        var engine = new FhirPathRuleEngine(modelResolver, engineLogger, mockTerminologyService.Object);

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
                    Id = "CS3",
                    Type = "CodeSystem",
                    ResourceType = "Patient",
                    Path = "Patient.maritalStatus.coding",
                    Severity = "error",
                    ErrorCode = "CODESYSTEM_VIOLATION",
                    Params = new Dictionary<string, object>
                    {
                        ["system"] = "http://terminology.hl7.org/CodeSystem/v3-MaritalStatus",
                        ["codes"] = new List<string> { "M", "S", "D", "W" }
                    }
                }
            }
        };

        // Act
        var errors = await engine.ValidateAsync(bundle, ruleSet, CancellationToken.None);

        // Assert
        Assert.Empty(errors);
    }
}
