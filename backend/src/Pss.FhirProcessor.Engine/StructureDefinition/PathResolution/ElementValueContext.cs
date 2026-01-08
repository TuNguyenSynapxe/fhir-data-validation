namespace Pss.FhirProcessor.Engine.SdValidation.PathResolution;

/// <summary>
/// Phase 3.1: Represents a resolved element value from a POCO.
/// </summary>
/// <param name="Value">The resolved value (null if missing or null value)</param>
/// <param name="AbsolutePath">The absolute path to this value in the POCO</param>
/// <param name="IsMissing">True if path exists in structure but has no value</param>
public record ElementValueContext(
    object? Value,
    string AbsolutePath,
    bool IsMissing
);
