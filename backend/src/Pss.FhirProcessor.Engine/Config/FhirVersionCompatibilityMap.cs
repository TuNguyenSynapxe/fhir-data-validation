namespace Pss.FhirProcessor.Engine.Config;

/// <summary>
/// Maps FHIR fields that have version-specific availability or deprecation.
/// This is a best-effort configuration for compatibility lint checks.
/// </summary>
public static class FhirVersionCompatibilityMap
{
    /// <summary>
    /// Fields that are ONLY available in R5 (error if used in R4)
    /// Key: Resource.field path (e.g., "Encounter.actualPeriod")
    /// Value: Suggested R4 alternative or explanation
    /// </summary>
    public static readonly Dictionary<string, string> R5OnlyFields = new()
    {
        // Encounter
        { "Encounter.actualPeriod", "Use 'Encounter.period' in R4" },
        
        // Patient
        { "Patient.link.type", "Use 'Patient.link' without explicit type in R4" },
        
        // Observation
        { "Observation.triggeredBy", "Not available in R4, use extensions if needed" },
        
        // Add more R5-only fields as discovered
    };

    /// <summary>
    /// Fields that are deprecated in R5 (warning if used in R5)
    /// Key: Resource.field path (e.g., "Encounter.period")
    /// Value: Suggested R5 replacement
    /// </summary>
    public static readonly Dictionary<string, string> DeprecatedInR5Fields = new()
    {
        // Encounter
        { "Encounter.period", "Use 'Encounter.actualPeriod' in R5" },
        
        // Add more deprecated fields as discovered
    };

    /// <summary>
    /// Checks if a field path is R5-only
    /// </summary>
    public static bool IsR5OnlyField(string resourceType, string fieldPath)
    {
        var fullPath = $"{resourceType}.{fieldPath}";
        return R5OnlyFields.ContainsKey(fullPath);
    }

    /// <summary>
    /// Checks if a field is deprecated in R5
    /// </summary>
    public static bool IsDeprecatedInR5(string resourceType, string fieldPath)
    {
        var fullPath = $"{resourceType}.{fieldPath}";
        return DeprecatedInR5Fields.ContainsKey(fullPath);
    }

    /// <summary>
    /// Gets the suggestion/alternative for an R5-only field
    /// </summary>
    public static string? GetR5FieldAlternative(string resourceType, string fieldPath)
    {
        var fullPath = $"{resourceType}.{fieldPath}";
        return R5OnlyFields.TryGetValue(fullPath, out var alternative) ? alternative : null;
    }

    /// <summary>
    /// Gets the R5 replacement for a deprecated field
    /// </summary>
    public static string? GetR5Replacement(string resourceType, string fieldPath)
    {
        var fullPath = $"{resourceType}.{fieldPath}";
        return DeprecatedInR5Fields.TryGetValue(fullPath, out var replacement) ? replacement : null;
    }
}
