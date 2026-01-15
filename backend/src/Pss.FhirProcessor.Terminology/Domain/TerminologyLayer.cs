namespace Pss.FhirProcessor.Terminology.Domain;

/// <summary>
/// Terminology source layer enumeration.
/// Defines precedence order (higher = higher priority).
/// Project-specific ValueSets override PSS, which override HL7.
/// </summary>
public enum TerminologyLayer
{
    /// <summary>HL7 FHIR standard ValueSets (lowest priority)</summary>
    Hl7 = 1,
    
    /// <summary>PSS-curated ValueSets (medium priority)</summary>
    Pss = 2,
    
    /// <summary>Project-specific ValueSets (highest priority)</summary>
    Project = 3
}
