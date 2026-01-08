namespace Pss.FhirProcessor.Playground.Api.Dtos.Validation;

/// <summary>
/// Request DTO for anonymous validation (no project context).
/// Also used for project-based validation with optional bundle profile selection.
/// </summary>
public sealed record ValidateRequest
{
    /// <summary>
    /// Raw FHIR Bundle JSON string to validate.
    /// </summary>
    public required string BundleJson { get; init; }

    /// <summary>
    /// FHIR version (e.g., "R4"). Defaults to "R4" if not specified.
    /// </summary>
    public string FhirVersion { get; init; } = "R4";

    /// <summary>
    /// Validation mode: "standard" (runtime-friendly) or "full" (authoring-focused with SpecHints).
    /// Defaults to "standard".
    /// </summary>
    public string ValidationMode { get; init; } = "standard";

    /// <summary>
    /// Optional bundle profile ID for project-based validation.
    /// If null, uses the default profile for the project.
    /// Ignored for anonymous validation.
    /// </summary>
    public Guid? BundleProfileId { get; init; }
}
