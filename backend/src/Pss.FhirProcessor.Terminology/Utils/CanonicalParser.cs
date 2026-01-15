namespace Pss.FhirProcessor.Terminology.Utils;

/// <summary>
/// Utility for parsing FHIR canonical URLs with version suffixes.
/// 
/// FHIR canonical URLs may include a version suffix using pipe notation:
/// http://hl7.org/fhir/ValueSet/administrative-gender|5.0.0
/// 
/// This parser splits the URL into:
/// - Identity: The canonical URL without version (used for lookup)
/// - Version: Optional version metadata (preserved but not used for resolution)
/// 
/// ARCHITECTURAL RULES:
/// - Identity is ALWAYS used for lookup/resolution
/// - Version is metadata only (future-proofing for multi-version support)
/// - Version NEVER affects whether a ValueSet is found
/// - No Firely SDK dependencies
/// </summary>
internal static class CanonicalParser
{
    /// <summary>
    /// Parses a canonical URL into identity and optional version.
    /// </summary>
    /// <param name="canonical">Full canonical URL (may include |version)</param>
    /// <returns>Tuple of (Identity, Version)</returns>
    /// <exception cref="ArgumentException">If canonical is null or whitespace</exception>
    /// <example>
    /// Parse("http://hl7.org/fhir/ValueSet/administrative-gender|5.0.0")
    /// // Returns: ("http://hl7.org/fhir/ValueSet/administrative-gender", "5.0.0")
    /// 
    /// Parse("http://hl7.org/fhir/ValueSet/administrative-gender")
    /// // Returns: ("http://hl7.org/fhir/ValueSet/administrative-gender", null)
    /// </example>
    public static (string Identity, string? Version) Parse(string canonical)
    {
        if (string.IsNullOrWhiteSpace(canonical))
        {
            throw new ArgumentException("Canonical URL cannot be null or whitespace", nameof(canonical));
        }

        var pipeIndex = canonical.IndexOf('|');
        
        if (pipeIndex == -1)
        {
            // No version suffix
            return (Identity: canonical, Version: null);
        }

        if (pipeIndex == 0)
        {
            throw new ArgumentException("Canonical URL cannot start with '|'", nameof(canonical));
        }

        if (pipeIndex == canonical.Length - 1)
        {
            // Trailing pipe with no version
            return (Identity: canonical[..^1], Version: null);
        }

        return (
            Identity: canonical[..pipeIndex],
            Version: canonical[(pipeIndex + 1)..]
        );
    }

    /// <summary>
    /// Extracts the identity (canonical without version) from a canonical URL.
    /// Convenience method for common use case.
    /// </summary>
    /// <param name="canonical">Full canonical URL</param>
    /// <returns>Identity portion only</returns>
    public static string GetIdentity(string canonical)
    {
        var (identity, _) = Parse(canonical);
        return identity;
    }
}
