namespace Pss.FhirProcessor.Engine.Models;

/// <summary>
/// Represents a node in the FHIR R5 schema tree
/// Contains element path, type information, cardinality, and child elements
/// </summary>
public class FhirSchemaNode
{
    /// <summary>
    /// Full FHIRPath (e.g., "Patient.name.family")
    /// </summary>
    public string Path { get; set; } = string.Empty;

    /// <summary>
    /// Element name without parent prefix (e.g., "family")
    /// </summary>
    public string ElementName { get; set; } = string.Empty;

    /// <summary>
    /// FHIR data type (e.g., "string", "HumanName", "code")
    /// For choice types, this will be the base type (e.g., "value[x]")
    /// </summary>
    public string Type { get; set; } = string.Empty;

    /// <summary>
    /// List of possible types for choice elements (e.g., ["string", "Coding", "Reference"])
    /// Empty for non-choice types
    /// </summary>
    public List<string> ChoiceTypes { get; set; } = new();

    /// <summary>
    /// True if this element can have multiple values (max cardinality = "*")
    /// </summary>
    public bool IsArray { get; set; }

    /// <summary>
    /// True if this is a choice type element (e.g., value[x])
    /// </summary>
    public bool IsChoice { get; set; }

    /// <summary>
    /// Minimum cardinality (0 or 1 typically)
    /// </summary>
    public int Min { get; set; }

    /// <summary>
    /// Maximum cardinality ("1", "*", or specific number as string)
    /// </summary>
    public string Max { get; set; } = "1";

    /// <summary>
    /// Element description from StructureDefinition
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// Short description for display
    /// </summary>
    public string? Short { get; set; }

    /// <summary>
    /// True if this is a backbone element (complex type defined inline)
    /// </summary>
    public bool IsBackbone { get; set; }

    /// <summary>
    /// True if this element is required (min >= 1)
    /// </summary>
    public bool IsRequired { get; set; }

    /// <summary>
    /// Child elements (for complex types and backbone elements)
    /// </summary>
    public List<FhirSchemaNode> Children { get; set; } = new();
}
