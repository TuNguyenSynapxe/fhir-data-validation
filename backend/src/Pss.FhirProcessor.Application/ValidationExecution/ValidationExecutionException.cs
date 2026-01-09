namespace Pss.FhirProcessor.Application.ValidationExecution;

/// <summary>
/// Phase 8.1: Validation execution exception with specific error codes.
/// NO partial results. NO best-effort mode. Fail-fast.
/// </summary>
public sealed class ValidationExecutionException : Exception
{
    public string Code { get; }

    public ValidationExecutionException(string code, string message)
        : base(message)
    {
        Code = code;
    }

    public ValidationExecutionException(string code, string message, Exception innerException)
        : base(message, innerException)
    {
        Code = code;
    }

    // Error codes as per Phase 8.1 specification
    public static class ErrorCodes
    {
        public const string PROJECT_NOT_FOUND = "PROJECT_NOT_FOUND";
        public const string BUNDLE_NOT_FOUND = "BUNDLE_NOT_FOUND";
        public const string INVALID_BUNDLE_JSON = "INVALID_BUNDLE_JSON";
        public const string NO_STRUCTURE_DEFINITIONS = "NO_STRUCTURE_DEFINITIONS";
        public const string VALIDATION_ENGINE_FAILURE = "VALIDATION_ENGINE_FAILURE";
        public const string CANCELLED = "CANCELLED";
    }
}
