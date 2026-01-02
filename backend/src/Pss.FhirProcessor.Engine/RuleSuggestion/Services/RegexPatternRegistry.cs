using System.Text.RegularExpressions;
using Pss.FhirProcessor.Engine.RuleSuggestion.Models;

namespace Pss.FhirProcessor.Engine.RuleSuggestion.Services;

/// <summary>
/// Registry of curated, domain-aware regex patterns with eligibility rules.
/// Supports deterministic, non-AI detection of Singapore identifiers and common formats.
/// </summary>
public static class RegexPatternRegistry
{
    /// <summary>
    /// All registered regex patterns with eligibility predicates
    /// </summary>
    public static readonly List<NamedRegexPattern> Patterns = new()
    {
        // Singapore NRIC / FIN
        new NamedRegexPattern
        {
            PatternName = "NRIC / FIN",
            Pattern = @"^[STFG]\d{7}[A-Z]$",
            Description = "Singapore NRIC/FIN identifier format",
            IsEligible = (path, classification) =>
            {
                // Only applies to identifier values
                var lowerPath = path.ToLowerInvariant();
                return lowerPath.Contains("identifier") && lowerPath.Contains("value");
            }
        },
        
        // Singapore Postal Code
        new NamedRegexPattern
        {
            PatternName = "SG Postal Code",
            Pattern = @"^\d{6}$",
            Description = "Singapore 6-digit postal code",
            IsEligible = (path, classification) =>
            {
                var lowerPath = path.ToLowerInvariant();
                return lowerPath.Contains("address") && lowerPath.Contains("postalcode");
            }
        },
        
        // Singapore Phone Number
        new NamedRegexPattern
        {
            PatternName = "SG Phone Number",
            Pattern = @"^(\+65)?[689]\d{7}$",
            Description = "Singapore phone number (with optional +65 prefix)",
            IsEligible = (path, classification) =>
            {
                var lowerPath = path.ToLowerInvariant();
                
                // Must be telecom.value
                if (!lowerPath.Contains("telecom") || !lowerPath.Contains("value"))
                    return false;
                
                // Check if sibling telecom.system == "phone"
                // This would require checking parent structure, but for now
                // we rely on path name containing telecom.value
                return true;
            }
        },
        
        // Email (general)
        new NamedRegexPattern
        {
            PatternName = "Email",
            Pattern = @"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$",
            Description = "Email address format",
            IsEligible = (path, classification) =>
            {
                var lowerPath = path.ToLowerInvariant();
                return lowerPath.Contains("telecom") && lowerPath.Contains("value");
            }
        },
        
        // International Phone (E.164)
        new NamedRegexPattern
        {
            PatternName = "Phone (E.164)",
            Pattern = @"^\+[1-9]\d{1,14}$",
            Description = "International phone number (E.164 format)",
            IsEligible = (path, classification) =>
            {
                var lowerPath = path.ToLowerInvariant();
                return lowerPath.Contains("telecom") && lowerPath.Contains("value");
            }
        },
        
        // ISO Date
        new NamedRegexPattern
        {
            PatternName = "Date (ISO)",
            Pattern = @"^\d{4}-\d{2}-\d{2}$",
            Description = "ISO date format (YYYY-MM-DD)",
            IsEligible = (path, classification) =>
            {
                // Only for string dates (not FHIR date primitives)
                return classification.PrimitiveType == PrimitiveType.String &&
                       !path.ToLowerInvariant().Contains("reference");
            }
        },
        
        // ISO DateTime
        new NamedRegexPattern
        {
            PatternName = "DateTime (ISO)",
            Pattern = @"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}",
            Description = "ISO datetime format",
            IsEligible = (path, classification) =>
            {
                return classification.PrimitiveType == PrimitiveType.String &&
                       !path.ToLowerInvariant().Contains("reference");
            }
        },
        
        // UUID
        new NamedRegexPattern
        {
            PatternName = "UUID",
            Pattern = @"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
            Description = "UUID format",
            IsEligible = (path, classification) =>
            {
                var lowerPath = path.ToLowerInvariant();
                // Do NOT suggest UUID regex for references (identity leakage risk)
                return !lowerPath.Contains("reference") &&
                       !lowerPath.Contains(".id");
            }
        },
        
        // US ZIP Code
        new NamedRegexPattern
        {
            PatternName = "Postal Code (US)",
            Pattern = @"^\d{5}(-\d{4})?$",
            Description = "US ZIP code",
            IsEligible = (path, classification) =>
            {
                var lowerPath = path.ToLowerInvariant();
                return lowerPath.Contains("address") && lowerPath.Contains("postalcode");
            }
        },
        
        // Generic Alphanumeric Identifier
        new NamedRegexPattern
        {
            PatternName = "Identifier",
            Pattern = @"^[A-Z0-9]{6,20}$",
            Description = "Uppercase alphanumeric identifier",
            IsEligible = (path, classification) =>
            {
                var lowerPath = path.ToLowerInvariant();
                
                // Avoid applying to identity fields
                if (lowerPath.Contains("reference") || lowerPath.Contains(".id"))
                    return false;
                
                // Only for identifier values or code fields
                return lowerPath.Contains("identifier") || lowerPath.Contains("code");
            }
        }
    };
    
    /// <summary>
    /// Find all eligible patterns for a given path classification
    /// </summary>
    public static IEnumerable<NamedRegexPattern> GetEligiblePatterns(string fullPath, PathClassification classification)
    {
        return Patterns.Where(p => p.IsEligible(fullPath, classification));
    }
}

/// <summary>
/// Represents a named regex pattern with domain-specific eligibility rules
/// </summary>
public class NamedRegexPattern
{
    /// <summary>
    /// Human-readable name for this pattern
    /// </summary>
    public required string PatternName { get; init; }
    
    /// <summary>
    /// The actual regex pattern
    /// </summary>
    public required string Pattern { get; init; }
    
    /// <summary>
    /// Description of what this pattern validates
    /// </summary>
    public required string Description { get; init; }
    
    /// <summary>
    /// Predicate that determines if this pattern is eligible for a given path
    /// </summary>
    public required Func<string, PathClassification, bool> IsEligible { get; init; }
    
    /// <summary>
    /// Check if a value matches this pattern
    /// </summary>
    public bool Matches(string value, RegexOptions options = RegexOptions.IgnoreCase)
    {
        try
        {
            return Regex.IsMatch(value, Pattern, options);
        }
        catch
        {
            return false;
        }
    }
}
