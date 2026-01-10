namespace Pss.FhirProcessor.Application.Projects.BundleProfiles;

/// <summary>
/// Phase 8.3: Error codes for bundle profile resolution failures.
/// </summary>
public static class BundleProfileResolutionErrorCodes
{
    public const string BundleNotFound = "BUNDLE_NOT_FOUND";
    public const string StructureDefinitionNotFound = "STRUCTURE_DEFINITION_NOT_FOUND";
    public const string StructureDefinitionNotBundleType = "STRUCTURE_DEFINITION_NOT_BUNDLE_TYPE";
    public const string MultipleMatches = "MULTIPLE_MATCHES";
    public const string InvalidProfileReference = "INVALID_PROFILE_REFERENCE";
}
