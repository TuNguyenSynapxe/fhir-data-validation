namespace Pss.FhirProcessor.Application.Public.Dtos;

/// <summary>
/// Request for validating a bundle via public link.
/// Phase 9.5a: Public endpoint does NOT allow policy override (must be policy-stable).
/// </summary>
public sealed class PublicExecuteValidationRequestDto
{
    // Empty for Phase 9.5a.
    // Future: May allow selecting rule sets, etc., but NO policy override.
}
