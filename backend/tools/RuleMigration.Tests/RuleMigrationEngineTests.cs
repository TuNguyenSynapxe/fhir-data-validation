using Xunit;
using Pss.FhirProcessor.RuleMigration;

namespace RuleMigration.Tests;

/// <summary>
/// PHASE 5 ENFORCEMENT TESTS
/// These tests ensure that legacy rule migration is deterministic and safe
/// </summary>
public class RuleMigrationEngineTests
{
    [Fact]
    public void LegacyRules_CannotExecute_WithoutErrorCode()
    {
        // PHASE 5: Legacy rules without errorCode must not pass through unchanged
        var inputRuleSet = new RuleSet
        {
            ProjectId = "test",
            Rules = new List<RuleDefinition>
            {
                new RuleDefinition
                {
                    Id = "legacy-rule-1",
                    Type = "QuestionAnswer",  // Ambiguous type
                    ResourceType = "Observation",
                    Path = "Observation.value",
                    Severity = "error",
                    Message = "Legacy message text"
                    // No ErrorCode
                }
            }
        };

        var engine = new RuleMigrationEngine();
        var (migratedRuleSet, report) = engine.Migrate(inputRuleSet);

        // Rule should be excluded from output
        Assert.Empty(migratedRuleSet.Rules);
        
        // Report should show manual review required
        Assert.Equal(1, report.Summary.ManualReviewRequired);
        Assert.Equal(0, report.Summary.Unchanged);
        Assert.Equal(0, report.Summary.AutoMigrated);
    }

    [Fact]
    public void DeterministicRules_MigrateCorrectly()
    {
        // PHASE 5: Deterministic rule types get default errorCode
        var inputRuleSet = new RuleSet
        {
            ProjectId = "test",
            Rules = new List<RuleDefinition>
            {
                new RuleDefinition
                {
                    Id = "required-rule-1",
                    Type = "Required",
                    ResourceType = "Observation",
                    Path = "Observation.value",
                    Severity = "error",
                    Message = "Value is required"  // Legacy message
                }
            }
        };

        var engine = new RuleMigrationEngine();
        var (migratedRuleSet, report) = engine.Migrate(inputRuleSet);

        // Rule should be in output with errorCode
        Assert.Single(migratedRuleSet.Rules);
        var migratedRule = migratedRuleSet.Rules[0];
        Assert.Equal("FIELD_REQUIRED", migratedRule.ErrorCode);
        Assert.Null(migratedRule.Message);  // Message stripped

        // Report should show auto-migrated
        Assert.Equal(1, report.Summary.AutoMigrated);
        Assert.Equal(0, report.Summary.ManualReviewRequired);
        
        var reportEntry = report.Rules[0];
        Assert.Equal("AUTO_MIGRATED_BY_TYPE", reportEntry.Status);
        Assert.Equal("FIELD_REQUIRED", reportEntry.AssignedErrorCode);
    }

    [Fact]
    public void AmbiguousRules_RequireManualReview()
    {
        // PHASE 5: Ambiguous rule types are rejected
        var ambiguousTypes = new[] { "QuestionAnswer", "CustomFHIRPath", "CodeMaster", "Custom" };

        foreach (var ruleType in ambiguousTypes)
        {
            var inputRuleSet = new RuleSet
            {
                ProjectId = "test",
                Rules = new List<RuleDefinition>
                {
                    new RuleDefinition
                    {
                        Id = $"ambiguous-{ruleType}",
                        Type = ruleType,
                        ResourceType = "Observation",
                        Path = "Observation.value",
                        Severity = "error",
                        Message = "Some message"
                    }
                }
            };

            var engine = new RuleMigrationEngine();
            var (migratedRuleSet, report) = engine.Migrate(inputRuleSet);

            // Rule should be excluded
            Assert.Empty(migratedRuleSet.Rules);
            
            // Report should show manual review required
            Assert.Equal(1, report.Summary.ManualReviewRequired);
            Assert.Equal("REQUIRES_MANUAL_REVIEW", report.Rules[0].Status);
        }
    }

    [Fact]
    public void MessageText_IsNeverCopied()
    {
        // PHASE 5: Message text must never be used to generate errorCode
        var inputRuleSet = new RuleSet
        {
            ProjectId = "test",
            Rules = new List<RuleDefinition>
            {
                new RuleDefinition
                {
                    Id = "rule-1",
                    Type = "Required",
                    ResourceType = "Observation",
                    Path = "Observation.value",
                    Severity = "error",
                    Message = "This specific wording should never appear in errorCode"
                }
            }
        };

        var engine = new RuleMigrationEngine();
        var (migratedRuleSet, report) = engine.Migrate(inputRuleSet);

        var migratedRule = migratedRuleSet.Rules[0];
        
        // ErrorCode should be from static mapping, NOT from message
        Assert.Equal("FIELD_REQUIRED", migratedRule.ErrorCode);
        Assert.DoesNotContain("specific", migratedRule.ErrorCode);
        Assert.DoesNotContain("wording", migratedRule.ErrorCode);
        
        // Message should be stripped
        Assert.Null(migratedRule.Message);
    }

    [Fact]
    public void ErrorCode_AlwaysPresent_PostMigration()
    {
        // PHASE 5: All migrated rules must have errorCode
        var inputRuleSet = new RuleSet
        {
            ProjectId = "test",
            Rules = new List<RuleDefinition>
            {
                new RuleDefinition
                {
                    Id = "rule-1",
                    Type = "Required",
                    ResourceType = "Observation",
                    Path = "Observation.value",
                    Severity = "error"
                },
                new RuleDefinition
                {
                    Id = "rule-2",
                    Type = "Pattern",
                    ResourceType = "Observation",
                    Path = "Observation.code",
                    Severity = "error"
                }
            }
        };

        var engine = new RuleMigrationEngine();
        var (migratedRuleSet, report) = engine.Migrate(inputRuleSet);

        // Every migrated rule must have errorCode
        foreach (var rule in migratedRuleSet.Rules)
        {
            Assert.False(string.IsNullOrWhiteSpace(rule.ErrorCode), 
                $"Rule {rule.Id} is missing errorCode after migration");
        }
    }

    [Fact]
    public void RulesWithErrorCode_PassThroughUnchanged()
    {
        // PHASE 5: Rules with errorCode should not be modified
        var inputRuleSet = new RuleSet
        {
            ProjectId = "test",
            Rules = new List<RuleDefinition>
            {
                new RuleDefinition
                {
                    Id = "modern-rule",
                    Type = "Required",
                    ResourceType = "Observation",
                    Path = "Observation.value",
                    Severity = "error",
                    ErrorCode = "FIELD_REQUIRED",
                    UserHint = "Blood pressure",
                    Message = "Should be stripped"  // Legacy message coexisting with errorCode
                }
            }
        };

        var engine = new RuleMigrationEngine();
        var (migratedRuleSet, report) = engine.Migrate(inputRuleSet);

        // Rule should pass through with errorCode unchanged
        Assert.Single(migratedRuleSet.Rules);
        var migratedRule = migratedRuleSet.Rules[0];
        Assert.Equal("FIELD_REQUIRED", migratedRule.ErrorCode);
        Assert.Equal("Blood pressure", migratedRule.UserHint);
        Assert.Null(migratedRule.Message);  // Message stripped even when errorCode present

        // Report should show unchanged
        Assert.Equal(1, report.Summary.Unchanged);
        Assert.Equal("UNCHANGED", report.Rules[0].Status);
    }

    [Fact]
    public void MigrationIsIdempotent()
    {
        // PHASE 5: Running migration multiple times produces same result
        var inputRuleSet = new RuleSet
        {
            ProjectId = "test",
            Rules = new List<RuleDefinition>
            {
                new RuleDefinition
                {
                    Id = "rule-1",
                    Type = "Required",
                    ResourceType = "Observation",
                    Path = "Observation.value",
                    Severity = "error",
                    Message = "Legacy message"
                }
            }
        };

        var engine1 = new RuleMigrationEngine();
        var (migratedRuleSet1, report1) = engine1.Migrate(inputRuleSet);

        // Run migration again on the output
        var engine2 = new RuleMigrationEngine();
        var (migratedRuleSet2, report2) = engine2.Migrate(migratedRuleSet1);

        // Second migration should show rule as unchanged
        Assert.Equal(1, report2.Summary.Unchanged);
        Assert.Equal(0, report2.Summary.AutoMigrated);
        Assert.Equal("UNCHANGED", report2.Rules[0].Status);
        
        // ErrorCode should remain the same
        Assert.Equal(migratedRuleSet1.Rules[0].ErrorCode, migratedRuleSet2.Rules[0].ErrorCode);
    }

    [Fact]
    public void RuleLogic_PreservedDuringMigration()
    {
        // PHASE 5: Rule semantics must not change during migration
        var inputRuleSet = new RuleSet
        {
            ProjectId = "test",
            Rules = new List<RuleDefinition>
            {
                new RuleDefinition
                {
                    Id = "complex-rule",
                    Type = "ArrayLength",
                    ResourceType = "Observation",
                    Path = "Observation.component",
                    Severity = "warning",
                    Params = new Dictionary<string, object>
                    {
                        ["min"] = 2,
                        ["max"] = 10
                    }
                }
            }
        };

        var engine = new RuleMigrationEngine();
        var (migratedRuleSet, report) = engine.Migrate(inputRuleSet);

        var migratedRule = migratedRuleSet.Rules[0];
        
        // All rule properties preserved
        Assert.Equal("complex-rule", migratedRule.Id);
        Assert.Equal("ArrayLength", migratedRule.Type);
        Assert.Equal("Observation", migratedRule.ResourceType);
        Assert.Equal("Observation.component", migratedRule.Path);
        Assert.Equal("warning", migratedRule.Severity);
        
        // Params preserved
        Assert.NotNull(migratedRule.Params);
        Assert.Equal(2, migratedRule.Params["min"]);
        Assert.Equal(10, migratedRule.Params["max"]);
        
        // ErrorCode added
        Assert.Equal("ARRAY_LENGTH_VIOLATION", migratedRule.ErrorCode);
    }

    [Fact]
    public void MigrationReport_ContainsAllRules()
    {
        // PHASE 5: Report must include every rule processed
        var inputRuleSet = new RuleSet
        {
            ProjectId = "test",
            Rules = new List<RuleDefinition>
            {
                new RuleDefinition { Id = "rule-1", Type = "Required", ResourceType = "Observation", Path = "Observation.value", Severity = "error", ErrorCode = "FIELD_REQUIRED" },
                new RuleDefinition { Id = "rule-2", Type = "Pattern", ResourceType = "Observation", Path = "Observation.code", Severity = "error" },
                new RuleDefinition { Id = "rule-3", Type = "QuestionAnswer", ResourceType = "Observation", Path = "Observation.component", Severity = "error" }
            }
        };

        var engine = new RuleMigrationEngine();
        var (migratedRuleSet, report) = engine.Migrate(inputRuleSet);

        // Report should have entry for every rule
        Assert.Equal(3, report.Rules.Count);
        Assert.Equal(3, report.Summary.TotalRules);
        
        // Each rule should have correct status
        Assert.Equal("UNCHANGED", report.Rules[0].Status);
        Assert.Equal("AUTO_MIGRATED_BY_TYPE", report.Rules[1].Status);
        Assert.Equal("REQUIRES_MANUAL_REVIEW", report.Rules[2].Status);
    }

    [Fact]
    public void StaticMappingTable_CoversCommonRuleTypes()
    {
        // PHASE 5: All common deterministic rule types should have mappings
        var commonRuleTypes = new[] { "Required", "Pattern", "Regex", "FixedValue", "AllowedValues", "ArrayLength", "Reference" };

        foreach (var ruleType in commonRuleTypes)
        {
            Assert.True(ErrorCodeMappings.IsDeterministic(ruleType), 
                $"Rule type '{ruleType}' should be deterministic but is not in mapping table");
            
            var errorCode = ErrorCodeMappings.GetDefaultErrorCode(ruleType);
            Assert.NotNull(errorCode);
            Assert.NotEmpty(errorCode);
        }
    }
}
