using System.Text.Json;

namespace Pss.FhirProcessor.RuleMigration;

/// <summary>
/// PHASE 5: Legacy rule migration engine
/// STRICT: No guessing, no inference, no prose inspection
/// </summary>
public class RuleMigrationEngine
{
    private readonly List<MigrationReportEntry> _reportEntries = new();
    private int _unchangedCount = 0;
    private int _autoMigratedCount = 0;
    private int _manualReviewCount = 0;

    /// <summary>
    /// Migrate a RuleSet from legacy format to ErrorCode-First format
    /// </summary>
    public (RuleSet migratedRuleSet, MigrationReport report) Migrate(RuleSet inputRuleSet)
    {
        _reportEntries.Clear();
        _unchangedCount = 0;
        _autoMigratedCount = 0;
        _manualReviewCount = 0;

        var migratedRules = new List<RuleDefinition>();

        foreach (var rule in inputRuleSet.Rules)
        {
            var (migratedRule, reportEntry) = MigrateRule(rule);

            // Only add rule to output if it doesn't require manual review
            if (reportEntry.Status != "REQUIRES_MANUAL_REVIEW")
            {
                migratedRules.Add(migratedRule);
            }

            _reportEntries.Add(reportEntry);

            // Update counters
            switch (reportEntry.Status)
            {
                case "UNCHANGED":
                    _unchangedCount++;
                    break;
                case "AUTO_MIGRATED_BY_TYPE":
                    _autoMigratedCount++;
                    break;
                case "REQUIRES_MANUAL_REVIEW":
                    _manualReviewCount++;
                    break;
            }
        }

        var migratedRuleSet = new RuleSet
        {
            ProjectId = inputRuleSet.ProjectId,
            Rules = migratedRules
        };

        var report = new MigrationReport
        {
            Summary = new MigrationSummary
            {
                TotalRules = inputRuleSet.Rules.Count,
                Unchanged = _unchangedCount,
                AutoMigrated = _autoMigratedCount,
                ManualReviewRequired = _manualReviewCount
            },
            Rules = _reportEntries
        };

        return (migratedRuleSet, report);
    }

    /// <summary>
    /// Migrate a single rule using deterministic logic
    /// </summary>
    private (RuleDefinition migratedRule, MigrationReportEntry reportEntry) MigrateRule(RuleDefinition rule)
    {
        // ✅ CASE A: Rule already has errorCode
        if (!string.IsNullOrWhiteSpace(rule.ErrorCode))
        {
            var cleanedRule = CloneRuleWithoutMessage(rule);
            return (cleanedRule, new MigrationReportEntry
            {
                RuleId = rule.Id,
                RuleType = rule.Type,
                Status = "UNCHANGED",
                Reason = "Rule already has errorCode",
                AssignedErrorCode = rule.ErrorCode,
                OriginalMessage = rule.Message
            });
        }

        // ⚠️ CASE B: Rule has NO errorCode BUT rule type is deterministic
        if (ErrorCodeMappings.IsDeterministic(rule.Type))
        {
            var defaultErrorCode = ErrorCodeMappings.GetDefaultErrorCode(rule.Type)!;
            var migratedRule = CloneRuleWithoutMessage(rule);
            migratedRule.ErrorCode = defaultErrorCode;

            return (migratedRule, new MigrationReportEntry
            {
                RuleId = rule.Id,
                RuleType = rule.Type,
                Status = "AUTO_MIGRATED_BY_TYPE",
                Reason = $"Assigned default errorCode for rule type '{rule.Type}'",
                AssignedErrorCode = defaultErrorCode,
                OriginalMessage = rule.Message
            });
        }

        // ❌ CASE C: Rule type has multiple possible meanings
        if (ErrorCodeMappings.IsAmbiguous(rule.Type))
        {
            return (rule, new MigrationReportEntry
            {
                RuleId = rule.Id,
                RuleType = rule.Type,
                Status = "REQUIRES_MANUAL_REVIEW",
                Reason = $"Rule type '{rule.Type}' requires explicit errorCode selection. Multiple error codes are possible.",
                OriginalMessage = rule.Message
            });
        }

        // Unknown rule type - treat as ambiguous
        return (rule, new MigrationReportEntry
        {
            RuleId = rule.Id,
            RuleType = rule.Type,
            Status = "REQUIRES_MANUAL_REVIEW",
            Reason = $"Unknown rule type '{rule.Type}'. Cannot determine appropriate errorCode.",
            OriginalMessage = rule.Message
        });
    }

    /// <summary>
    /// Clone a rule and strip the legacy message field
    /// </summary>
    private RuleDefinition CloneRuleWithoutMessage(RuleDefinition rule)
    {
        return new RuleDefinition
        {
            Id = rule.Id,
            Type = rule.Type,
            ResourceType = rule.ResourceType,
            Path = rule.Path,
            Severity = rule.Severity,
            ErrorCode = rule.ErrorCode,
            UserHint = rule.UserHint,
            Message = null,  // PHASE 5: Strip legacy message field
            Params = rule.Params != null ? new Dictionary<string, object>(rule.Params) : null
        };
    }

    /// <summary>
    /// Load RuleSet from JSON file
    /// </summary>
    public static RuleSet LoadFromFile(string filePath)
    {
        var json = File.ReadAllText(filePath);
        var options = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true,
            WriteIndented = true
        };

        var ruleSet = JsonSerializer.Deserialize<RuleSet>(json, options);
        if (ruleSet == null)
        {
            throw new InvalidOperationException($"Failed to deserialize RuleSet from {filePath}");
        }

        return ruleSet;
    }

    /// <summary>
    /// Save RuleSet to JSON file
    /// </summary>
    public static void SaveToFile(RuleSet ruleSet, string filePath)
    {
        var options = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true,
            WriteIndented = true,
            DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
        };

        var json = JsonSerializer.Serialize(ruleSet, options);
        File.WriteAllText(filePath, json);
    }

    /// <summary>
    /// Save migration report to JSON file
    /// </summary>
    public static void SaveReportToFile(MigrationReport report, string filePath)
    {
        var options = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true,
            WriteIndented = true
        };

        var json = JsonSerializer.Serialize(report, options);
        File.WriteAllText(filePath, json);
    }
}
