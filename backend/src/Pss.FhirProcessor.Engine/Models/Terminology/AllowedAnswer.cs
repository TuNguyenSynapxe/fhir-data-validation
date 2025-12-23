using System.Text.Json.Serialization;

namespace Pss.FhirProcessor.Engine.Models.Terminology;

/// <summary>
/// Project-specific model for representing an allowed code in a terminology constraint.
/// References a CodeSystem concept by system + code (FHIR identity pattern).
/// No internal IDs - identity is always system + code.
/// 
/// Usage: Part of TerminologyConstraint to specify which codes are valid.
/// If the referenced code is renamed/deleted in the CodeSystem, Rule Advisory should flag it.
/// </summary>
public class AllowedAnswer
{
    /// <summary>
    /// The code system URL (e.g., "http://terminology.hl7.org/CodeSystem/observation-category")
    /// This + Code uniquely identifies the concept
    /// </summary>
    [JsonPropertyName("system")]
    public required string System { get; set; }

    /// <summary>
    /// The concept code within the system (e.g., "social-history")
    /// This + System uniquely identifies the concept
    /// IMPORTANT: If this code is changed in the CodeSystem, the constraint becomes orphaned
    /// and must be reported via Rule Advisory
    /// </summary>
    [JsonPropertyName("code")]
    public required string Code { get; set; }

    /// <summary>
    /// Display text for the code (optional, for human readability)
    /// This should match the display from the CodeSystem but is not used for identity
    /// </summary>
    [JsonPropertyName("display")]
    public string? Display { get; set; }

    /// <summary>
    /// Optional version of the code system being referenced
    /// </summary>
    [JsonPropertyName("version")]
    public string? Version { get; set; }

    /// <summary>
    /// Additional context or notes about why this answer is allowed
    /// </summary>
    [JsonPropertyName("note")]
    public string? Note { get; set; }
}
