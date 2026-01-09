namespace Pss.FhirProcessor.Application.Projects.Import.Errors;

/// <summary>
/// Exception thrown when project import fails.
/// Import MUST fail fast with explicit error messages.
/// </summary>
public sealed class ProjectImportException : Exception
{
    /// <summary>
    /// The error code categorizing the import failure.
    /// </summary>
    public string ErrorCode { get; }

    /// <summary>
    /// Additional context about the failure.
    /// </summary>
    public Dictionary<string, object>? Context { get; }

    public ProjectImportException(string errorCode, string message)
        : base(message)
    {
        ErrorCode = errorCode;
    }

    public ProjectImportException(string errorCode, string message, Exception innerException)
        : base(message, innerException)
    {
        ErrorCode = errorCode;
    }

    public ProjectImportException(string errorCode, string message, Dictionary<string, object> context)
        : base(message)
    {
        ErrorCode = errorCode;
        Context = context;
    }

    public ProjectImportException(string errorCode, string message, Dictionary<string, object> context, Exception innerException)
        : base(message, innerException)
    {
        ErrorCode = errorCode;
        Context = context;
    }
}

/// <summary>
/// Well-known error codes for import failures.
/// </summary>
public static class ImportErrorCodes
{
    public const string EmptyZip = "IMPORT_EMPTY_ZIP";
    public const string InvalidZipStructure = "IMPORT_INVALID_ZIP_STRUCTURE";
    public const string MissingPackageJson = "IMPORT_MISSING_PACKAGE_JSON";
    public const string InvalidPackageJson = "IMPORT_INVALID_PACKAGE_JSON";
    public const string UnsupportedFhirVersion = "IMPORT_UNSUPPORTED_FHIR_VERSION";
    public const string InvalidJsonFile = "IMPORT_INVALID_JSON_FILE";
    public const string UnknownResourceType = "IMPORT_UNKNOWN_RESOURCE_TYPE";
    public const string MissingCanonicalUrl = "IMPORT_MISSING_CANONICAL_URL";
    public const string DuplicateCanonicalUrl = "IMPORT_DUPLICATE_CANONICAL_URL";
    public const string DatabaseError = "IMPORT_DATABASE_ERROR";
}
