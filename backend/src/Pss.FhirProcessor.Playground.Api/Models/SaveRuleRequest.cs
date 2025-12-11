using System.Text.Json.Serialization;

namespace Pss.FhirProcessor.Playground.Api.Models;

/// <summary>
/// Request to save rules for a project
/// </summary>
public class SaveRuleRequest
{
    [JsonPropertyName("rulesJson")]
    public required string RulesJson { get; set; }
}
