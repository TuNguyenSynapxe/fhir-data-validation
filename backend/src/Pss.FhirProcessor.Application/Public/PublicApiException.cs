namespace Pss.FhirProcessor.Application.Public;

/// <summary>
/// Exception thrown by public validation service for access control and validation errors.
/// Phase 9.5a: Thin wrapper for deterministic error mapping.
/// </summary>
public sealed class PublicApiException : Exception
{
    public string Code { get; }

    public PublicApiException(string code, string message) : base(message)
    {
        Code = code;
    }

    public PublicApiException(string code, string message, Exception innerException) 
        : base(message, innerException)
    {
        Code = code;
    }

    // Error codes
    public const string PublicLinkNotFound = "PUBLIC_LINK_NOT_FOUND";
    public const string PublicLinkDisabled = "PUBLIC_LINK_DISABLED";
    public const string BundleNotFound = "BUNDLE_NOT_FOUND";
    public const string InvalidBundleJson = "INVALID_BUNDLE_JSON";
    public const string ValidationEngineFailed = "VALIDATION_ENGINE_FAILURE";
}
