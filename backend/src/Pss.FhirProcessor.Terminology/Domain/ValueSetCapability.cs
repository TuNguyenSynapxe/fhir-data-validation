namespace Pss.FhirProcessor.Terminology.Domain;

/// <summary>
/// Structural classification of ValueSet capabilities.
/// Determines how codes can be resolved and displayed in the UI.
/// </summary>
public enum ValueSetCapability
{
    /// <summary>
    /// ValueSet has finite, explicit codes available locally.
    /// UI can display preview.
    /// </summary>
    Previewable,
    
    /// <summary>
    /// ValueSet references large external terminology systems (SNOMED, LOINC, etc.).
    /// Codes exist but are not stored locally.
    /// UI explains external system, no preview.
    /// </summary>
    ExternalSystem,
    
    /// <summary>
    /// ValueSet uses filters or imports to dynamically compute codes.
    /// Expansion requires runtime evaluation.
    /// UI explains computed nature, no preview.
    /// </summary>
    Computed
}
