namespace Pss.FhirProcessor.Terminology.Domain;

/// <summary>
/// Runtime-derived previewability of a ValueSet.
/// Indicates whether codes can actually be previewed with current engine capabilities.
/// 
/// DISTINCTION FROM CAPABILITY:
/// - Capability: HL7 metadata about ValueSet structure (import-time)
/// - Previewability: Runtime determination of whether preview is actually possible
/// 
/// EXAMPLES:
/// - all-languages: Capability=Previewable, Previewability=External
/// - administrative-gender: Capability=Previewable, Previewability=Explicit
/// </summary>
public enum ValueSetPreviewability
{
    /// <summary>
    /// Explicit codes are available locally.
    /// Preview will return actual codes.
    /// Example: administrative-gender (4 codes embedded in expansion)
    /// </summary>
    Explicit,
    
    /// <summary>
    /// Codes are derived from local CodeSystems via compose rules.
    /// Preview can be computed on-demand.
    /// Example: ValueSet referencing a local CodeSystem with concept list
    /// </summary>
    Computed,
    
    /// <summary>
    /// Defined by external standard (BCP-47, IANA, MIME, etc.).
    /// Codes cannot be enumerated without external service.
    /// Example: all-languages (BCP-47), MimeType (IANA)
    /// </summary>
    External,
    
    /// <summary>
    /// Not expandable by this engine (filters, unsupported features).
    /// Example: ValueSet with complex SNOMED filters
    /// </summary>
    Unsupported
}
