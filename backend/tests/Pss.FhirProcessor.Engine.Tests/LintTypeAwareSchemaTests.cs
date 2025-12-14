using Xunit;
using Pss.FhirProcessor.Engine.Services;
using Microsoft.Extensions.Logging.Abstractions;

namespace Pss.FhirProcessor.Engine.Tests;

/// <summary>
/// Tests for type-aware schema validation in UNKNOWN_ELEMENT lint rule.
/// Verifies that complex datatypes (Reference, Period, HumanName, etc.) are correctly resolved.
/// </summary>
public class LintTypeAwareSchemaTests
{
    private readonly LintValidationService _lintService;

    public LintTypeAwareSchemaTests()
    {
        var schemaService = TestHelper.CreateFhirSchemaService();
        _lintService = new LintValidationService(
            NullLogger<LintValidationService>.Instance,
            schemaService);
    }

    [Fact]
    public async Task Reference_ValidProperty_NoLintIssue()
    {
        // Arrange - Encounter.serviceProvider.reference is VALID (Reference datatype has 'reference' property)
        var json = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""collection"",
            ""entry"": [{
                ""resource"": {
                    ""resourceType"": ""Encounter"",
                    ""id"": ""enc-001"",
                    ""status"": ""finished"",
                    ""class"": {
                        ""system"": ""http://terminology.hl7.org/CodeSystem/v3-ActCode"",
                        ""code"": ""IMP""
                    },
                    ""serviceProvider"": {
                        ""reference"": ""Organization/123"",
                        ""display"": ""Test Hospital""
                    }
                }
            }]
        }";

        // Act
        var issues = await _lintService.ValidateAsync(json, "R4");

        // Assert - Should NOT flag 'reference' as unknown (it's valid in Reference datatype)
        var referenceIssue = issues.FirstOrDefault(i => 
            i.RuleId == "UNKNOWN_ELEMENT" && 
            i.Message.Contains("reference"));
        Assert.Null(referenceIssue);
    }

    [Fact]
    public async Task Reference_Display_ValidProperty_NoLintIssue()
    {
        // Arrange - Reference.display is VALID
        var json = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""collection"",
            ""entry"": [{
                ""resource"": {
                    ""resourceType"": ""Encounter"",
                    ""id"": ""enc-001"",
                    ""status"": ""finished"",
                    ""class"": {
                        ""system"": ""http://terminology.hl7.org/CodeSystem/v3-ActCode"",
                        ""code"": ""IMP""
                    },
                    ""serviceProvider"": {
                        ""display"": ""Test Hospital""
                    }
                }
            }]
        }";

        // Act
        var issues = await _lintService.ValidateAsync(json, "R4");

        // Assert
        var displayIssue = issues.FirstOrDefault(i => 
            i.RuleId == "UNKNOWN_ELEMENT" && 
            i.Message.Contains("display"));
        Assert.Null(displayIssue);
    }

    [Fact]
    public async Task Reference_InvalidProperty_DetectedCorrectly()
    {
        // Arrange - Reference.invalidProp is INVALID
        var json = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""collection"",
            ""entry"": [{
                ""resource"": {
                    ""resourceType"": ""Encounter"",
                    ""id"": ""enc-001"",
                    ""status"": ""finished"",
                    ""class"": {
                        ""system"": ""http://terminology.hl7.org/CodeSystem/v3-ActCode"",
                        ""code"": ""IMP""
                    },
                    ""serviceProvider"": {
                        ""reference"": ""Organization/123"",
                        ""invalidProp"": ""test""
                    }
                }
            }]
        }";

        // Act
        var issues = await _lintService.ValidateAsync(json, "R4");

        // Assert - Should flag 'invalidProp' as unknown in Reference datatype
        var invalidIssue = issues.FirstOrDefault(i => 
            i.RuleId == "UNKNOWN_ELEMENT" && 
            i.Message.Contains("invalidProp"));
        Assert.NotNull(invalidIssue);
        Assert.Contains("Reference", invalidIssue.Message);
    }

    [Fact]
    public async Task Period_ValidProperties_NoLintIssue()
    {
        // Arrange - Period.start and Period.end are VALID
        var json = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""collection"",
            ""entry"": [{
                ""resource"": {
                    ""resourceType"": ""Encounter"",
                    ""id"": ""enc-001"",
                    ""status"": ""finished"",
                    ""class"": {
                        ""system"": ""http://terminology.hl7.org/CodeSystem/v3-ActCode"",
                        ""code"": ""IMP""
                    },
                    ""period"": {
                        ""start"": ""2023-01-01T10:00:00Z"",
                        ""end"": ""2023-01-01T12:00:00Z""
                    }
                }
            }]
        }";

        // Act
        var issues = await _lintService.ValidateAsync(json, "R4");

        // Assert - Should NOT flag 'start' or 'end' as unknown
        var periodIssues = issues.Where(i => 
            i.RuleId == "UNKNOWN_ELEMENT" && 
            (i.Message.Contains("start") || i.Message.Contains("end"))).ToList();
        Assert.Empty(periodIssues);
    }

    [Fact]
    public async Task Period_InvalidProperty_DetectedCorrectly()
    {
        // Arrange - Period.reference is INVALID
        var json = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""collection"",
            ""entry"": [{
                ""resource"": {
                    ""resourceType"": ""Encounter"",
                    ""id"": ""enc-001"",
                    ""status"": ""finished"",
                    ""class"": {
                        ""system"": ""http://terminology.hl7.org/CodeSystem/v3-ActCode"",
                        ""code"": ""IMP""
                    },
                    ""period"": {
                        ""start"": ""2023-01-01T10:00:00Z"",
                        ""invalidField"": ""test""
                    }
                }
            }]
        }";

        // Act
        var issues = await _lintService.ValidateAsync(json, "R4");

        // Assert
        var invalidIssue = issues.FirstOrDefault(i => 
            i.RuleId == "UNKNOWN_ELEMENT" && 
            i.Message.Contains("invalidField"));
        Assert.NotNull(invalidIssue);
        Assert.Contains("Period", invalidIssue.Message);
    }

    [Fact]
    public async Task HumanName_ValidProperties_NoLintIssue()
    {
        // Arrange - HumanName.family and HumanName.given are VALID
        var json = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""collection"",
            ""entry"": [{
                ""resource"": {
                    ""resourceType"": ""Patient"",
                    ""id"": ""patient-001"",
                    ""name"": [{
                        ""family"": ""Doe"",
                        ""given"": [""John""]
                    }]
                }
            }]
        }";

        // Act
        var issues = await _lintService.ValidateAsync(json, "R4");

        // Assert - Should NOT flag 'family' or 'given' as unknown
        var nameIssues = issues.Where(i => 
            i.RuleId == "UNKNOWN_ELEMENT" && 
            (i.Message.Contains("family") || i.Message.Contains("given"))).ToList();
        Assert.Empty(nameIssues);
    }

    [Fact]
    public async Task HumanName_InvalidProperty_DetectedCorrectly()
    {
        // Arrange - HumanName.reference is INVALID (name is HumanName, not Reference)
        var json = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""collection"",
            ""entry"": [{
                ""resource"": {
                    ""resourceType"": ""Patient"",
                    ""id"": ""patient-001"",
                    ""name"": [{
                        ""family"": ""Doe"",
                        ""reference"": ""invalid""
                    }]
                }
            }]
        }";

        // Act
        var issues = await _lintService.ValidateAsync(json, "R4");

        // Assert - Should flag 'reference' as unknown in HumanName datatype
        var referenceIssue = issues.FirstOrDefault(i => 
            i.RuleId == "UNKNOWN_ELEMENT" && 
            i.Message.Contains("reference"));
        Assert.NotNull(referenceIssue);
        Assert.Contains("HumanName", referenceIssue.Message);
    }

    [Fact]
    public async Task Coding_ValidProperties_NoLintIssue()
    {
        // Arrange - Coding.system, Coding.code, Coding.display are VALID
        var json = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""collection"",
            ""entry"": [{
                ""resource"": {
                    ""resourceType"": ""Observation"",
                    ""id"": ""obs-001"",
                    ""status"": ""final"",
                    ""code"": {
                        ""coding"": [{
                            ""system"": ""http://loinc.org"",
                            ""code"": ""15074-8"",
                            ""display"": ""Glucose""
                        }]
                    }
                }
            }]
        }";

        // Act
        var issues = await _lintService.ValidateAsync(json, "R4");

        // Assert - Should NOT flag Coding properties as unknown
        var codingIssues = issues.Where(i => 
            i.RuleId == "UNKNOWN_ELEMENT" && 
            (i.Message.Contains("system") || i.Message.Contains("code") || i.Message.Contains("display"))).ToList();
        Assert.Empty(codingIssues);
    }

    [Fact]
    public async Task CodeableConcept_ValidProperties_NoLintIssue()
    {
        // Arrange - CodeableConcept.coding and CodeableConcept.text are VALID
        var json = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""collection"",
            ""entry"": [{
                ""resource"": {
                    ""resourceType"": ""Observation"",
                    ""id"": ""obs-001"",
                    ""status"": ""final"",
                    ""code"": {
                        ""coding"": [{
                            ""system"": ""http://loinc.org"",
                            ""code"": ""15074-8""
                        }],
                        ""text"": ""Glucose""
                    }
                }
            }]
        }";

        // Act
        var issues = await _lintService.ValidateAsync(json, "R4");

        // Assert
        var codeableConceptIssues = issues.Where(i => 
            i.RuleId == "UNKNOWN_ELEMENT" && 
            (i.Message.Contains("coding") || i.Message.Contains("text"))).ToList();
        Assert.Empty(codeableConceptIssues);
    }

    [Fact]
    public async Task Identifier_ValidProperties_NoLintIssue()
    {
        // Arrange - Identifier.system, Identifier.value are VALID
        var json = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""collection"",
            ""entry"": [{
                ""resource"": {
                    ""resourceType"": ""Patient"",
                    ""id"": ""patient-001"",
                    ""identifier"": [{
                        ""system"": ""http://hospital.org/identifiers"",
                        ""value"": ""12345""
                    }]
                }
            }]
        }";

        // Act
        var issues = await _lintService.ValidateAsync(json, "R4");

        // Assert
        var identifierIssues = issues.Where(i => 
            i.RuleId == "UNKNOWN_ELEMENT" && 
            (i.Message.Contains("system") || i.Message.Contains("value"))).ToList();
        Assert.Empty(identifierIssues);
    }

    [Fact]
    public async Task NestedComplexTypes_ValidProperties_NoLintIssue()
    {
        // Arrange - CodeableConcept contains Coding, both have valid properties
        var json = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""collection"",
            ""entry"": [{
                ""resource"": {
                    ""resourceType"": ""Condition"",
                    ""id"": ""cond-001"",
                    ""clinicalStatus"": {
                        ""coding"": [{
                            ""system"": ""http://terminology.hl7.org/CodeSystem/condition-clinical"",
                            ""code"": ""active""
                        }]
                    },
                    ""code"": {
                        ""coding"": [{
                            ""system"": ""http://snomed.info/sct"",
                            ""code"": ""386661006"",
                            ""display"": ""Fever""
                        }],
                        ""text"": ""Fever""
                    },
                    ""subject"": {
                        ""reference"": ""Patient/123""
                    }
                }
            }]
        }";

        // Act
        var issues = await _lintService.ValidateAsync(json, "R4");

        // Assert - No unknown element errors for valid nested complex types
        var unknownIssues = issues.Where(i => i.RuleId == "UNKNOWN_ELEMENT").ToList();
        Assert.Empty(unknownIssues);
    }

    [Fact]
    public async Task MultipleResourceTypes_TypeAwareValidation()
    {
        // Arrange - Multiple resources with different complex types
        var json = @"{
            ""resourceType"": ""Bundle"",
            ""type"": ""collection"",
            ""entry"": [
                {
                    ""resource"": {
                        ""resourceType"": ""Patient"",
                        ""id"": ""patient-001"",
                        ""name"": [{
                            ""family"": ""Smith""
                        }]
                    }
                },
                {
                    ""resource"": {
                        ""resourceType"": ""Encounter"",
                        ""id"": ""enc-001"",
                        ""status"": ""finished"",
                        ""class"": {
                            ""system"": ""http://terminology.hl7.org/CodeSystem/v3-ActCode"",
                            ""code"": ""IMP""
                        },
                        ""serviceProvider"": {
                            ""reference"": ""Organization/456""
                        },
                        ""period"": {
                            ""start"": ""2023-01-01"",
                            ""end"": ""2023-01-02""
                        }
                    }
                }
            ]
        }";

        // Act
        var issues = await _lintService.ValidateAsync(json, "R4");

        // Assert - All valid properties across different resource types
        var unknownIssues = issues.Where(i => i.RuleId == "UNKNOWN_ELEMENT").ToList();
        Assert.Empty(unknownIssues);
    }
}
