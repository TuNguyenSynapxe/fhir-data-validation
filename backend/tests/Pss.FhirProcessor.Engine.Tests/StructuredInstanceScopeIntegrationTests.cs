using Xunit;
using Hl7.Fhir.Model;
using Pss.FhirProcessor.Engine.Models;
using Pss.FhirProcessor.Engine.Services;
using Microsoft.Extensions.Logging.Abstractions;

namespace Pss.FhirProcessor.Engine.Tests;

/// <summary>
/// Integration tests for structured InstanceScope validation.
/// Tests the complete flow: resource selection → field evaluation → error generation.
/// </summary>
public class StructuredInstanceScopeIntegrationTests
{
    private readonly ResourceSelector _selector;
    private readonly FieldPathValidator _validator;

    public StructuredInstanceScopeIntegrationTests()
    {
        _selector = new ResourceSelector(NullLogger<ResourceSelector>.Instance);
        _validator = new FieldPathValidator();
    }

    [Fact]
    public void Validate_RequiredGender_AllInstances_FailsOnlyForPatientsMissingGender()
    {
        // Arrange
        var bundle = new Bundle { Type = Bundle.BundleType.Collection };
        
        bundle.Entry.Add(new Bundle.EntryComponent
        {
            Resource = new Patient
            {
                Id = "patient-1",
                Gender = AdministrativeGender.Male
            }
        });
        
        bundle.Entry.Add(new Bundle.EntryComponent
        {
            Resource = new Patient
            {
                Id = "patient-2"
                // Missing gender
            }
        });
        
        bundle.Entry.Add(new Bundle.EntryComponent
        {
            Resource = new Patient
            {
                Id = "patient-3",
                Gender = AdministrativeGender.Female
            }
        });

        var rule = new RuleDefinition
        {
            Id = "test-rule-gender",
            Type = "Required",
            ResourceType = "Patient",
            InstanceScope = new AllInstances(),
            FieldPath = "gender",
            ErrorCode = "FIELD_REQUIRED",
            Severity = "error"
        };

        // Act
        var resources = _selector.SelectResources(bundle, rule.ResourceType, rule.InstanceScope!).ToList();
        
        // Validate field path
        _validator.ValidateFieldPath(rule.FieldPath!, rule.ResourceType);
        
        // Simulate validation (checking if field exists)
        var errors = new List<(int EntryIndex, string FieldPath)>();
        foreach (var (resource, entryIndex) in resources)
        {
            var patient = (Patient)resource;
            if (patient.Gender == null)
            {
                errors.Add((entryIndex, rule.FieldPath!));
            }
        }

        // Assert
        Assert.Equal(3, resources.Count); // All instances selected
        Assert.Single(errors); // Only patient-2 fails
        Assert.Equal(1, errors[0].EntryIndex);
        Assert.Equal("gender", errors[0].FieldPath);
    }

    [Fact]
    public void Validate_RequiredBirthDate_FirstInstance_ValidatesOnlyFirstPatient()
    {
        // Arrange
        var bundle = new Bundle { Type = Bundle.BundleType.Collection };
        
        bundle.Entry.Add(new Bundle.EntryComponent
        {
            Resource = new Patient
            {
                Id = "patient-1"
                // Missing birthDate
            }
        });
        
        bundle.Entry.Add(new Bundle.EntryComponent
        {
            Resource = new Patient
            {
                Id = "patient-2",
                BirthDate = "1990-01-01"
            }
        });

        var rule = new RuleDefinition
        {
            Id = "test-rule-birthdate",
            Type = "Required",
            ResourceType = "Patient",
            InstanceScope = new FirstInstance(),
            FieldPath = "birthDate",
            ErrorCode = "FIELD_REQUIRED",
            Severity = "error"
        };

        // Act
        var resources = _selector.SelectResources(bundle, rule.ResourceType, rule.InstanceScope!).ToList();

        // Assert
        Assert.Single(resources); // Only first instance selected
        Assert.Equal(0, resources[0].EntryIndex);
        Assert.Null(((Patient)resources[0].Resource).BirthDate);
    }

    [Fact]
    public void Validate_FixedValueGender_FilteredInstances_AppliesOnlyToMatchingResources()
    {
        // Arrange
        var bundle = new Bundle { Type = Bundle.BundleType.Collection };
        
        bundle.Entry.Add(new Bundle.EntryComponent
        {
            Resource = new Patient
            {
                Id = "patient-male-1",
                Gender = AdministrativeGender.Male,
                Active = true
            }
        });
        
        bundle.Entry.Add(new Bundle.EntryComponent
        {
            Resource = new Patient
            {
                Id = "patient-inactive",
                Gender = AdministrativeGender.Female,
                Active = false // Should be skipped by filter
            }
        });
        
        bundle.Entry.Add(new Bundle.EntryComponent
        {
            Resource = new Patient
            {
                Id = "patient-male-2",
                Gender = AdministrativeGender.Male,
                Active = true
            }
        });

        var rule = new RuleDefinition
        {
            Id = "test-rule-active-patients",
            Type = "FixedValue",
            ResourceType = "Patient",
            InstanceScope = new FilteredInstances { ConditionFhirPath = "active = true" },
            FieldPath = "gender",
            ErrorCode = "INVALID_VALUE",
            Severity = "error"
        };

        // Act
        var resources = _selector.SelectResources(bundle, rule.ResourceType, rule.InstanceScope!).ToList();

        // Assert
        Assert.Equal(2, resources.Count); // Only active patients
        Assert.Equal(0, resources[0].EntryIndex);
        Assert.Equal(2, resources[1].EntryIndex);
        Assert.All(resources, r => Assert.True(((Patient)r.Resource).Active));
    }

    [Fact]
    public void Validate_MultipleRules_SameResourceType_EachRuleSelectsIndependently()
    {
        // Arrange
        var bundle = new Bundle { Type = Bundle.BundleType.Collection };
        
        bundle.Entry.Add(new Bundle.EntryComponent
        {
            Resource = new Patient
            {
                Id = "patient-1",
                Gender = AdministrativeGender.Male,
                BirthDate = "1990-01-01"
            }
        });
        
        bundle.Entry.Add(new Bundle.EntryComponent
        {
            Resource = new Patient
            {
                Id = "patient-2",
                Gender = AdministrativeGender.Female
                // Missing birthDate
            }
        });

        var rule1 = new RuleDefinition
        {
            Id = "rule-gender-all",
            Type = "Required",
            ResourceType = "Patient",
            InstanceScope = new AllInstances(),
            FieldPath = "gender",
            ErrorCode = "FIELD_REQUIRED",
            Severity = "error"
        };

        var rule2 = new RuleDefinition
        {
            Id = "rule-birthdate-first",
            Type = "Required",
            ResourceType = "Patient",
            InstanceScope = new FirstInstance(),
            FieldPath = "birthDate",
            ErrorCode = "FIELD_REQUIRED",
            Severity = "error"
        };

        // Act
        var resources1 = _selector.SelectResources(bundle, rule1.ResourceType, rule1.InstanceScope!).ToList();
        var resources2 = _selector.SelectResources(bundle, rule2.ResourceType, rule2.InstanceScope!).ToList();

        // Assert
        Assert.Equal(2, resources1.Count); // Rule 1: all instances
        Assert.Single(resources2); // Rule 2: first instance only
    }

    [Fact]
    public void Validate_MixedResourceTypes_EachRuleTargetsCorrectType()
    {
        // Arrange
        var bundle = new Bundle { Type = Bundle.BundleType.Collection };
        
        bundle.Entry.Add(new Bundle.EntryComponent
        {
            Resource = new Patient { Id = "patient-1" }
        });
        
        bundle.Entry.Add(new Bundle.EntryComponent
        {
            Resource = new Observation
            {
                Id = "obs-1",
                Code = new CodeableConcept
                {
                    Coding = new List<Coding>
                    {
                        new Coding("http://loinc.org", "HEARING")
                    }
                }
            }
        });
        
        bundle.Entry.Add(new Bundle.EntryComponent
        {
            Resource = new Patient { Id = "patient-2" }
        });

        var patientRule = new RuleDefinition
        {
            Id = "rule-patient",
            Type = "Required",
            ResourceType = "Patient",
            InstanceScope = new AllInstances(),
            FieldPath = "gender",
            ErrorCode = "FIELD_REQUIRED",
            Severity = "error"
        };

        var observationRule = new RuleDefinition
        {
            Id = "rule-observation",
            Type = "Required",
            ResourceType = "Observation",
            InstanceScope = new AllInstances(),
            FieldPath = "performer.display",
            ErrorCode = "FIELD_REQUIRED",
            Severity = "error"
        };

        // Act
        var patients = _selector.SelectResources(bundle, patientRule.ResourceType, patientRule.InstanceScope!).ToList();
        var observations = _selector.SelectResources(bundle, observationRule.ResourceType, observationRule.InstanceScope!).ToList();

        // Assert
        Assert.Equal(2, patients.Count);
        Assert.Equal(0, patients[0].EntryIndex);
        Assert.Equal(2, patients[1].EntryIndex);
        
        Assert.Single(observations);
        Assert.Equal(1, observations[0].EntryIndex);
    }

    [Fact]
    public void Validate_FilterWithNestedArrayPath_MatchesCorrectResources()
    {
        // Arrange
        var bundle = new Bundle { Type = Bundle.BundleType.Collection };
        
        bundle.Entry.Add(new Bundle.EntryComponent
        {
            Resource = new Observation
            {
                Id = "obs-hearing",
                Code = new CodeableConcept
                {
                    Coding = new List<Coding>
                    {
                        new Coding("http://loinc.org", "HEARING", "Hearing screening")
                    }
                }
            }
        });
        
        bundle.Entry.Add(new Bundle.EntryComponent
        {
            Resource = new Observation
            {
                Id = "obs-vision",
                Code = new CodeableConcept
                {
                    Coding = new List<Coding>
                    {
                        new Coding("http://loinc.org", "VISION", "Vision screening")
                    }
                }
            }
        });

        var rule = new RuleDefinition
        {
            Id = "rule-hearing-obs",
            Type = "Required",
            ResourceType = "Observation",
            InstanceScope = new FilteredInstances { ConditionFhirPath = "code.coding.code = 'HEARING'" },
            FieldPath = "performer.display",
            ErrorCode = "FIELD_REQUIRED",
            Severity = "error"
        };

        // Act
        var resources = _selector.SelectResources(bundle, rule.ResourceType, rule.InstanceScope!).ToList();

        // Assert
        Assert.Single(resources);
        Assert.Equal(0, resources[0].EntryIndex);
        Assert.Equal("obs-hearing", resources[0].Resource.Id);
    }

    [Fact]
    public void Validate_EmptyBundle_NoErrorsGenerated()
    {
        // Arrange
        var bundle = new Bundle { Type = Bundle.BundleType.Collection };

        var rule = new RuleDefinition
        {
            Id = "rule-any",
            Type = "Required",
            ResourceType = "Patient",
            InstanceScope = new AllInstances(),
            FieldPath = "gender",
            ErrorCode = "FIELD_REQUIRED",
            Severity = "error"
        };

        // Act
        var resources = _selector.SelectResources(bundle, rule.ResourceType, rule.InstanceScope!).ToList();

        // Assert
        Assert.Empty(resources);
    }

    [Fact]
    public void Validate_InvalidFieldPath_ThrowsBeforeResourceSelection()
    {
        // Arrange
        var rule = new RuleDefinition
        {
            Id = "rule-invalid",
            Type = "Required",
            ResourceType = "Patient",
            InstanceScope = new AllInstances(),
            FieldPath = "Patient[*].gender", // INVALID: contains resource type and [*]
            ErrorCode = "FIELD_REQUIRED",
            Severity = "error"
        };

        // Act & Assert
        var exception = Assert.Throws<ArgumentException>(() =>
            _validator.ValidateFieldPath(rule.FieldPath!, rule.ResourceType));

        // Should catch either the [*] pattern or the resource type prefix
        Assert.True(
            exception.Message.Contains("must not start with resource type") ||
            exception.Message.Contains("must not contain '[*]'"),
            $"Expected validation error, got: {exception.Message}");
    }
}
