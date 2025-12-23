using System.Text.Json.Serialization;

namespace Pss.FhirProcessor.Engine.Models.Terminology;

/// <summary>
/// FHIR-aligned Concept within a CodeSystem.
/// Identity: code (unique within parent CodeSystem)
/// No internal IDs - identity is system + code
/// Fully editable including code value
/// </summary>
public class CodeSystemConcept
{
    /// <summary>
    /// Code that identifies this concept within the CodeSystem.
    /// This is the primary identity for the concept.
    /// IMPORTANT: Fully editable. If changed, rules referencing this code will be flagged via Rule Advisory.
    /// </summary>
    [JsonPropertyName("code")]
    public required string Code { get; set; }

    /// <summary>
    /// Human-readable display text for this concept (e.g., "Married", "Single")
    /// </summary>
    [JsonPropertyName("display")]
    public string? Display { get; set; }

    /// <summary>
    /// Formal definition or explanation of the concept
    /// </summary>
    [JsonPropertyName("definition")]
    public string? Definition { get; set; }

    /// <summary>
    /// Additional representations of the same concept (e.g., different languages)
    /// </summary>
    [JsonPropertyName("designation")]
    public List<ConceptDesignation>? Designation { get; set; }

    /// <summary>
    /// Properties of this concept (e.g., status, effectiveDate, parent)
    /// </summary>
    [JsonPropertyName("property")]
    public List<ConceptProperty>? Property { get; set; }

    /// <summary>
    /// Child concepts (for hierarchical code systems)
    /// Each child is also a full CodeSystemConcept
    /// </summary>
    [JsonPropertyName("concept")]
    public List<CodeSystemConcept>? Concept { get; set; }
}

/// <summary>
/// Additional representation of a concept (e.g., translations, abbreviations)
/// </summary>
public class ConceptDesignation
{
    /// <summary>
    /// Language code (e.g., "en", "es", "zh")
    /// </summary>
    [JsonPropertyName("language")]
    public string? Language { get; set; }

    /// <summary>
    /// Type of designation (e.g., preferred, synonym, abbreviation)
    /// </summary>
    [JsonPropertyName("use")]
    public Coding? Use { get; set; }

    /// <summary>
    /// The text value for this designation
    /// </summary>
    [JsonPropertyName("value")]
    public required string Value { get; set; }
}

/// <summary>
/// A property assigned to a concept
/// </summary>
public class ConceptProperty
{
    /// <summary>
    /// Reference to the property code (defined elsewhere in CodeSystem.property)
    /// </summary>
    [JsonPropertyName("code")]
    public required string Code { get; set; }

    /// <summary>
    /// Value of the property (type depends on property definition)
    /// Can be string, integer, boolean, dateTime, code, or Coding
    /// </summary>
    [JsonPropertyName("valueString")]
    public string? ValueString { get; set; }

    [JsonPropertyName("valueInteger")]
    public int? ValueInteger { get; set; }

    [JsonPropertyName("valueBoolean")]
    public bool? ValueBoolean { get; set; }

    [JsonPropertyName("valueDateTime")]
    public string? ValueDateTime { get; set; }

    [JsonPropertyName("valueCode")]
    public string? ValueCode { get; set; }

    [JsonPropertyName("valueCoding")]
    public Coding? ValueCoding { get; set; }
}

/// <summary>
/// Simple coding structure (system + code + display)
/// </summary>
public class Coding
{
    [JsonPropertyName("system")]
    public string? System { get; set; }

    [JsonPropertyName("code")]
    public string? Code { get; set; }

    [JsonPropertyName("display")]
    public string? Display { get; set; }
}
