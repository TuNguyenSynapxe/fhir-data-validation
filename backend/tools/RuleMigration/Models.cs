using System.Text.Json.Serialization;

namespace Pss.FhirProcessor.RuleMigration;

/// <summary>
/// Simplified RuleSet model for migration purposes
/// Mirrors backend/src/Pss.FhirProcessor.Engine/Models/RuleSet.cs
/// </summary>
public class RuleSet
{
    [JsonPropertyName("projectId")]
    public string? ProjectId { get; set; }

    [JsonPropertyName("rules")]
    public List<RuleDefinition> Rules { get; set; } = new();
}

/// <summary>
/// Simplified RuleDefinition model for migration purposes
/// </summary>
public class RuleDefinition
{
    [JsonPropertyName("id")]
    public required string Id { get; set; }

    [JsonPropertyName("type")]
    public required string Type { get; set; }

    [JsonPropertyName("resourceType")]
    public required string ResourceType { get; set; }

    [JsonPropertyName("path")]
    public required string Path { get; set; }

    [JsonPropertyName("severity")]
    public required string Severity { get; set; }

    [JsonPropertyName("errorCode")]
    public string? ErrorCode { get; set; }

    [JsonPropertyName("userHint")]
    public string? UserHint { get; set; }

    [JsonPropertyName("message")]
    public string? Message { get; set; }  // Legacy field - will be stripped

    [JsonPropertyName("params")]
    public Dictionary<string, object>? Params { get; set; }
}

/// <summary>
/// Migration report entry for a single rule
/// </summary>
public class MigrationReportEntry
{
    [JsonPropertyName("ruleId")]
    public required string RuleId { get; set; }

    [JsonPropertyName("ruleType")]
    public required string RuleType { get; set; }

    [JsonPropertyName("status")]
    public required string Status { get; set; }  // UNCHANGED, AUTO_MIGRATED_BY_TYPE, REQUIRES_MANUAL_REVIEW

    [JsonPropertyName("reason")]
    public string? Reason { get; set; }

    [JsonPropertyName("assignedErrorCode")]
    public string? AssignedErrorCode { get; set; }

    [JsonPropertyName("originalMessage")]
    public string? OriginalMessage { get; set; }  // For audit purposes only
}

/// <summary>
/// Complete migration report
/// </summary>
public class MigrationReport
{
    [JsonPropertyName("summary")]
    public required MigrationSummary Summary { get; set; }

    [JsonPropertyName("rules")]
    public required List<MigrationReportEntry> Rules { get; set; }

    [JsonPropertyName("timestamp")]
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    [JsonPropertyName("inputFile")]
    public string? InputFile { get; set; }

    [JsonPropertyName("outputFile")]
    public string? OutputFile { get; set; }
}

/// <summary>
/// Summary statistics for migration
/// </summary>
public class MigrationSummary
{
    [JsonPropertyName("totalRules")]
    public int TotalRules { get; set; }

    [JsonPropertyName("unchanged")]
    public int Unchanged { get; set; }

    [JsonPropertyName("autoMigrated")]
    public int AutoMigrated { get; set; }

    [JsonPropertyName("manualReviewRequired")]
    public int ManualReviewRequired { get; set; }
}
