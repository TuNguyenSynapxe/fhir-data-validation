namespace Pss.FhirProcessor.Terminology.Abstractions;

/// <summary>
/// FHIR terminology version enumeration.
/// R5 only for MVP, R4/R4B placeholders for future.
/// </summary>
public enum TerminologyVersion
{
    /// <summary>FHIR R5</summary>
    R5 = 5,
    
    // Future versions:
    // R4 = 4,
    // R4B = 41,
}
