namespace Pss.FhirProcessor.Engine.Authoring;

/// <summary>
/// Represents a hint about HL7 FHIR required fields.
/// This is advisory only and does NOT enforce validation.
/// Behavior is fully metadata-driven - no implicit inference.
/// </summary>
public class SpecHint
{
    /// <summary>
    /// FHIRPath to the required field (relative to resource root)
    /// </summary>
    public required string Path { get; set; }
    
    /// <summary>
    /// Explanation of why this field is required according to HL7 spec
    /// </summary>
    public required string Reason { get; set; }
    
    /// <summary>
    /// Severity level (warning | info)
    /// </summary>
    public required string Severity { get; set; }
    
    /// <summary>
    /// Source of this hint (always "HL7" for spec hints)
    /// </summary>
    public required string Source { get; set; }
    
    /// <summary>
    /// EXPLICIT FLAG: If true, this hint has conditional behavior.
    /// If false or null, hint always applies (simple required field).
    /// This flag drives execution - no path-based inference is performed.
    /// Default: false
    /// </summary>
    public bool IsConditional { get; set; } = false;
    
    /// <summary>
    /// FHIRPath condition that must evaluate to true for this hint to apply.
    /// Only used when IsConditional=true.
    /// If condition evaluates to false, hint is skipped.
    /// Example: "communication.exists()" means hint only applies when communication is present.
    /// </summary>
    public string? Condition { get; set; }
    
    /// <summary>
    /// If true, applies validation to each item in the collection.
    /// Only used when IsConditional=true.
    /// Example: For Patient.communication.language with condition "communication.exists()",
    /// this would check that EACH communication entry has a language.
    /// Default: false (validate once at resource level)
    /// </summary>
    public bool AppliesToEach { get; set; } = false;
}

/// <summary>
/// Container for all spec hints for a given FHIR version
/// </summary>
public class SpecHintCatalog
{
    /// <summary>
    /// FHIR version (e.g., "4.0.1" for R4)
    /// </summary>
    public required string Version { get; set; }
    
    /// <summary>
    /// Description of the catalog
    /// </summary>
    public string? Description { get; set; }
    
    /// <summary>
    /// Dictionary mapping resource type to list of required field hints
    /// </summary>
    public Dictionary<string, List<SpecHint>> Hints { get; set; } = new();
}
