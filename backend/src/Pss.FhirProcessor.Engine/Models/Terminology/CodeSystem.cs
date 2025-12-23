using System.Text.Json.Serialization;

namespace Pss.FhirProcessor.Engine.Models.Terminology;

/// <summary>
/// FHIR-aligned CodeSystem model for terminology authoring.
/// Represents a complete code system with its concepts.
/// Identity: system URL
/// Scope: Authoring only - no lifecycle, locking, or versioning
/// </summary>
public class CodeSystem
{
    /// <summary>
    /// Canonical URL that uniquely identifies this code system (e.g., "http://terminology.hl7.org/CodeSystem/v3-MaritalStatus")
    /// This is the primary identity for the CodeSystem.
    /// </summary>
    [JsonPropertyName("url")]
    public required string Url { get; set; }

    /// <summary>
    /// Business version of the code system (e.g., "1.0.0", "2023-01")
    /// This is metadata only - no version control enforcement
    /// </summary>
    [JsonPropertyName("version")]
    public string? Version { get; set; }

    /// <summary>
    /// Human-readable name for the code system (e.g., "Marital Status Codes")
    /// </summary>
    [JsonPropertyName("name")]
    public string? Name { get; set; }

    /// <summary>
    /// Short title for display purposes (e.g., "Marital Status")
    /// </summary>
    [JsonPropertyName("title")]
    public string? Title { get; set; }

    /// <summary>
    /// Publication status: draft | active | retired | unknown
    /// Authoring-only: No enforcement, just metadata
    /// </summary>
    [JsonPropertyName("status")]
    public string Status { get; set; } = "draft";

    /// <summary>
    /// Natural language description of the code system
    /// </summary>
    [JsonPropertyName("description")]
    public string? Description { get; set; }

    /// <summary>
    /// Name of the publisher (organization or individual)
    /// </summary>
    [JsonPropertyName("publisher")]
    public string? Publisher { get; set; }

    /// <summary>
    /// Content mode: complete | example | fragment | supplement
    /// </summary>
    [JsonPropertyName("content")]
    public string Content { get; set; } = "complete";

    /// <summary>
    /// Total number of concepts defined (can be computed or explicit)
    /// </summary>
    [JsonPropertyName("count")]
    public int? Count { get; set; }

    /// <summary>
    /// Concepts defined in this code system
    /// Each concept is identified by its code within this system
    /// </summary>
    [JsonPropertyName("concept")]
    public List<CodeSystemConcept> Concept { get; set; } = new();

    /// <summary>
    /// Additional metadata as key-value pairs
    /// </summary>
    [JsonPropertyName("meta")]
    public Dictionary<string, object>? Meta { get; set; }
}
