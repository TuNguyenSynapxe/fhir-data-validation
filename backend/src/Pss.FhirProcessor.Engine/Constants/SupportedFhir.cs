namespace Pss.FhirProcessor.Engine.Constants;

/// <summary>
/// FHIR version constants for MVP scope.
/// 
/// MVP (R5 Only): This system validates FHIR R5 bundles exclusively.
/// R4 support is out of scope for MVP.
/// 
/// Usage: Reference this constant for version checks, logging, and validation.
/// Do NOT hardcode "R4" or "R5" strings elsewhere in the codebase.
/// </summary>
public static class SupportedFhir
{
    /// <summary>
    /// The FHIR version supported by this MVP.
    /// Value: "R5" (corresponds to FHIR version 5.0.0)
    /// </summary>
    public const string MvpFhirVersion = "R5";

    /// <summary>
    /// Human-readable description of supported versions for error messages.
    /// </summary>
    public const string SupportedVersionsDescription = "FHIR R5 (5.0.0) only";

    /// <summary>
    /// Canonical FHIR version code as it appears in package.json.
    /// </summary>
    public const string PackageFhirVersion = "5.0.0";
}
