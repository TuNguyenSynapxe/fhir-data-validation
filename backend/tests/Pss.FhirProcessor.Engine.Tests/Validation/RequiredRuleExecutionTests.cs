using FluentAssertions;
using Hl7.Fhir.Model;
using Pss.FhirProcessor.Engine.Models;
using Pss.FhirProcessor.Engine.RuleEngines;
using Pss.FhirProcessor.Engine.Validation;
using Xunit;
using Task = System.Threading.Tasks.Task;

namespace Pss.FhirProcessor.Engine.Tests.Validation;

/// <summary>
/// Critical tests for Required rule type ErrorCode normalization
/// Ensures Required rules ALWAYS emit FIELD_REQUIRED error code
/// </summary>
public class RequiredRuleExecutionTests
{
    private readonly IFhirPathRuleEngine _engine;

    public RequiredRuleExecutionTests()
    {
        _engine = TestHelper.CreateRuleEngine();
    }

    [Fact]
    public async Task Required_MissingField_EmitsFieldRequired()
    {
        // Arrange - Patient without birthDate
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
                            new HumanName { Family = "Doe", Given = new List<string> { "John" } }
                        }
                        // Missing birthDate
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
                    Id = "REQ_BIRTHDATE",
                    Type = "Required",
                    ResourceType = "Patient",
                    FieldPath = "birthDate",
                    InstanceScope = new AllInstances(),
                    Severity = "error",
                    ErrorCode = ValidationErrorCodes.FIELD_REQUIRED
                }
            }
        };

        // Act
        var errors = await _engine.ValidateAsync(bundle, ruleSet, CancellationToken.None);

        // Assert
        errors.Should().HaveCount(1);
        var error = errors[0];
        error.ErrorCode.Should().Be(ValidationErrorCodes.FIELD_REQUIRED);
        error.RuleId.Should().Be("REQ_BIRTHDATE");
        error.RuleType.Should().Be("Required");
        error.ResourceType.Should().Be("Patient");
        // Phase5: Changed to FieldPath (engine-level validation errors use FieldPath)
        error.FieldPath.Should().Be("birthDate");
    }

    [Fact]
    public async Task Required_EmptyArray_EmitsFieldRequired()
    {
        // Arrange - Patient with empty telecom array
        var bundle = new Bundle
        {
            Type = Bundle.BundleType.Collection,
            Entry = new List<Bundle.EntryComponent>
            {
                new Bundle.EntryComponent
                {
                    FullUrl = "urn:uuid:patient-002",
                    Resource = new Patient
                    {
                        Id = "patient-002",
                        Name = new List<HumanName>
                        {
                            new HumanName { Family = "Smith" }
                        },
                        Telecom = new List<ContactPoint>() // Empty array
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
                    Id = "REQ_TELECOM",
                    Type = "Required",
                    ResourceType = "Patient",
                    FieldPath = "telecom",
                    InstanceScope = new AllInstances(),
                    Severity = "error",
                    ErrorCode = ValidationErrorCodes.FIELD_REQUIRED
                }
            }
        };

        // Act
        var errors = await _engine.ValidateAsync(bundle, ruleSet, CancellationToken.None);

        // Assert
        errors.Should().HaveCount(1);
        var error = errors[0];
        error.ErrorCode.Should().Be(ValidationErrorCodes.FIELD_REQUIRED);
        error.RuleId.Should().Be("REQ_TELECOM");
        error.Details.Should().ContainKey("isMissing");
    }

    [Fact]
    public async Task Required_WhitespaceString_EmitsFieldRequired()
    {
        // Arrange - Patient with whitespace-only family name
        var bundle = new Bundle
        {
            Type = Bundle.BundleType.Collection,
            Entry = new List<Bundle.EntryComponent>
            {
                new Bundle.EntryComponent
                {
                    FullUrl = "urn:uuid:patient-003",
                    Resource = new Patient
                    {
                        Id = "patient-003",
                        Name = new List<HumanName>
                        {
                            new HumanName { Family = "   " } // Whitespace only
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
                    Id = "REQ_FAMILY",
                    Type = "Required",
                    ResourceType = "Patient",
                    FieldPath = "name.family",
                    InstanceScope = new AllInstances(),
                    Severity = "error",
                    ErrorCode = ValidationErrorCodes.FIELD_REQUIRED
                }
            }
        };

        // Act
        var errors = await _engine.ValidateAsync(bundle, ruleSet, CancellationToken.None);

        // Assert
        errors.Should().HaveCount(1);
        var error = errors[0];
        error.ErrorCode.Should().Be(ValidationErrorCodes.FIELD_REQUIRED);
        error.RuleId.Should().Be("REQ_FAMILY");
        error.Details.Should().ContainKey("isAllEmpty");
        error.Details!["isAllEmpty"].Should().Be(true);
    }

    [Fact]
    public async Task Required_MultipleResources_AllInstancesValidated()
    {
        // Arrange - Bundle with 2 Patients, one missing required field
        var bundle = new Bundle
        {
            Type = Bundle.BundleType.Collection,
            Entry = new List<Bundle.EntryComponent>
            {
                new Bundle.EntryComponent
                {
                    FullUrl = "urn:uuid:patient-004",
                    Resource = new Patient
                    {
                        Id = "patient-004",
                        Name = new List<HumanName>
                        {
                            new HumanName { Family = "Jones" }
                        }
                        // Missing gender
                    }
                },
                new Bundle.EntryComponent
                {
                    FullUrl = "urn:uuid:patient-005",
                    Resource = new Patient
                    {
                        Id = "patient-005",
                        Name = new List<HumanName>
                        {
                            new HumanName { Family = "Brown" }
                        },
                        Gender = AdministrativeGender.Female // Has gender
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
                    Id = "REQ_GENDER",
                    Type = "Required",
                    ResourceType = "Patient",
                    FieldPath = "gender",
                    InstanceScope = new AllInstances(),
                    Severity = "error",
                    ErrorCode = ValidationErrorCodes.FIELD_REQUIRED
                }
            }
        };

        // Act
        var errors = await _engine.ValidateAsync(bundle, ruleSet, CancellationToken.None);

        // Assert - Should have exactly 1 error for the first patient
        errors.Should().HaveCount(1);
        var error = errors[0];
        error.ErrorCode.Should().Be(ValidationErrorCodes.FIELD_REQUIRED);
        error.RuleId.Should().Be("REQ_GENDER");
        error.ResourceId.Should().Be("patient-004");
        error.EntryIndex.Should().Be(0);
    }

    [Fact]
    public async Task RequiredRule_MustAlwaysEmit_FieldRequired()
    {
        // Arrange - Multiple Required rules with different scenarios
        var bundle = new Bundle
        {
            Type = Bundle.BundleType.Collection,
            Entry = new List<Bundle.EntryComponent>
            {
                new Bundle.EntryComponent
                {
                    FullUrl = "urn:uuid:patient-006",
                    Resource = new Patient
                    {
                        Id = "patient-006"
                        // Missing name, birthDate, gender
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
                    Id = "REQ_NAME",
                    Type = "Required",
                    ResourceType = "Patient",
                    FieldPath = "name",
                    InstanceScope = new AllInstances(),
                    Severity = "error",
                    ErrorCode = ValidationErrorCodes.FIELD_REQUIRED
                },
                new RuleDefinition
                {
                    Id = "REQ_BIRTHDATE_2",
                    Type = "Required",
                    ResourceType = "Patient",
                    FieldPath = "birthDate",
                    InstanceScope = new AllInstances(),
                    Severity = "warning",
                    ErrorCode = ValidationErrorCodes.FIELD_REQUIRED
                },
                new RuleDefinition
                {
                    Id = "REQ_GENDER_2",
                    Type = "Required",
                    ResourceType = "Patient",
                    FieldPath = "gender",
                    InstanceScope = new AllInstances(),
                    Severity = "information",
                    ErrorCode = ValidationErrorCodes.FIELD_REQUIRED
                }
            }
        };

        // Act
        var errors = await _engine.ValidateAsync(bundle, ruleSet, CancellationToken.None);

        // Assert - All errors must be FIELD_REQUIRED
        errors.Should().HaveCount(3);
        errors.Should().OnlyContain(e => e.ErrorCode == ValidationErrorCodes.FIELD_REQUIRED);
        errors.Should().NotContain(e => e.ErrorCode == "MANDATORY_MISSING");
        errors.Should().OnlyContain(e => e.RuleType == "Required");
        
        // Verify different severity levels are preserved
        errors.Should().Contain(e => e.Severity == "error");
        errors.Should().Contain(e => e.Severity == "warning");
        errors.Should().Contain(e => e.Severity == "information");
    }
}
