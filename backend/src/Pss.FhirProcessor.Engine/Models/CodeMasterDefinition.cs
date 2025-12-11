using System.Text.Json.Serialization;

namespace Pss.FhirProcessor.Engine.Models;

/// <summary>
/// CodeMaster definition for Observation.component validation
/// </summary>
public class CodeMasterDefinition
{
    [JsonPropertyName("version")]
    public string Version { get; set; } = "1.0";
    
    [JsonPropertyName("screeningTypes")]
    public List<ScreeningType> ScreeningTypes { get; set; } = new();
}

public class ScreeningType
{
    [JsonPropertyName("code")]
    public required string Code { get; set; }
    
    [JsonPropertyName("display")]
    public string? Display { get; set; }
    
    [JsonPropertyName("questions")]
    public List<QuestionDefinition> Questions { get; set; } = new();
}

public class QuestionDefinition
{
    [JsonPropertyName("code")]
    public required string Code { get; set; }
    
    [JsonPropertyName("display")]
    public string? Display { get; set; }
    
    [JsonPropertyName("allowedAnswers")]
    public List<AnswerDefinition> AllowedAnswers { get; set; } = new();
    
    [JsonPropertyName("multiValue")]
    public bool MultiValue { get; set; }
    
    [JsonPropertyName("dataType")]
    public string? DataType { get; set; }
}

public class AnswerDefinition
{
    [JsonPropertyName("code")]
    public string? Code { get; set; }
    
    [JsonPropertyName("display")]
    public string? Display { get; set; }
    
    [JsonPropertyName("system")]
    public string? System { get; set; }
}
