using System.Text.Json.Serialization;

namespace Pss.FhirProcessor.Playground.Api.Models;

/// <summary>
/// Request to save codemaster for a project
/// </summary>
public class SaveCodeMasterRequest
{
    [JsonPropertyName("codeMasterJson")]
    public required string CodeMasterJson { get; set; }
}
