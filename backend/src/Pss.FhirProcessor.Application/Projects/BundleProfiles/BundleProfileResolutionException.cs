namespace Pss.FhirProcessor.Application.Projects.BundleProfiles;

/// <summary>
/// Phase 8.3: Exception thrown when bundle profile resolution fails.
/// Fail-fast exception for deterministic error handling.
/// </summary>
public sealed class BundleProfileResolutionException : Exception
{
    /// <summary>
    /// Machine-readable error code.
    /// </summary>
    public string ErrorCode { get; }

    /// <summary>
    /// Optional context data for error details.
    /// </summary>
    public IReadOnlyDictionary<string, object>? Details { get; }

    public BundleProfileResolutionException(
        string errorCode,
        string message,
        IReadOnlyDictionary<string, object>? details = null)
        : base(message)
    {
        ErrorCode = errorCode;
        Details = details;
    }

    public BundleProfileResolutionException(
        string errorCode,
        string message,
        Exception innerException,
        IReadOnlyDictionary<string, object>? details = null)
        : base(message, innerException)
    {
        ErrorCode = errorCode;
        Details = details;
    }
}
