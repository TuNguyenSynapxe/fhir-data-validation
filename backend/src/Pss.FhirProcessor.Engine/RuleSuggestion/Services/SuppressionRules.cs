using Pss.FhirProcessor.Engine.RuleSuggestion.Models;

namespace Pss.FhirProcessor.Engine.RuleSuggestion.Services;

/// <summary>
/// Semantic suppression rules to prevent identity leakage and inappropriate suggestions.
/// These are HARD RULES that block suggestions regardless of confidence score.
/// </summary>
public static class SuppressionRules
{
    /// <summary>
    /// Check if a suggestion should be suppressed based on semantic rules
    /// </summary>
    public static bool ShouldSuppress(Models.RuleSuggestion suggestion, PathCategory category, List<object> observedValues)
    {
        // Rule 1: No FixedValue or AllowedValues on identity fields
        if (category == PathCategory.Identifier)
        {
            if (suggestion.RuleType is "FixedValue" or "AllowedValues")
            {
                return true; // SUPPRESSED: Identity leakage risk
            }
        }
        
        // Rule 2: No FixedValue or AllowedValues on references
        if (category == PathCategory.Reference)
        {
            if (suggestion.RuleType is "FixedValue" or "AllowedValues")
            {
                return true; // SUPPRESSED: Reference leakage risk
            }
        }
        
        // Rule 3: No suggestions on UUID references
        if (HasUuidReferences(observedValues))
        {
            if (suggestion.RuleType is "FixedValue" or "AllowedValues")
            {
                return true; // SUPPRESSED: UUID identity leakage
            }
        }
        
        // Rule 4: No suggestions on free-text fields
        if (category is PathCategory.FreeText or PathCategory.AddressFreeText)
        {
            return true; // SUPPRESSED: Free text should not be constrained
        }
        
        // Rule 5: No AllowedValues or FixedValue on extension URLs
        if (category == PathCategory.ExtensionMetadata)
        {
            if (suggestion.RuleType is "FixedValue" or "AllowedValues")
            {
                return true; // SUPPRESSED: Extension URLs are metadata
            }
        }
        
        // Rule 6: No suggestions on display/text fields
        if (category == PathCategory.FreeText)
        {
            return true; // SUPPRESSED: Free text
        }
        
        return false; // Not suppressed
    }
    
    /// <summary>
    /// Check if observed values contain UUID patterns (urn:uuid:...)
    /// </summary>
    private static bool HasUuidReferences(List<object> values)
    {
        return values
            .OfType<string>()
            .Any(v => v.StartsWith("urn:uuid:", StringComparison.OrdinalIgnoreCase));
    }
    
    /// <summary>
    /// Get suppression reason for logging/debugging
    /// </summary>
    public static string GetSuppressionReason(Models.RuleSuggestion suggestion, PathCategory category, List<object> observedValues)
    {
        if (category == PathCategory.Identifier && suggestion.RuleType is "FixedValue" or "AllowedValues")
            return "Identity leakage risk - identifier fields should not be constrained";
        
        if (category == PathCategory.Reference && suggestion.RuleType is "FixedValue" or "AllowedValues")
            return "Reference leakage risk - reference fields should not be constrained";
        
        if (HasUuidReferences(observedValues) && suggestion.RuleType is "FixedValue" or "AllowedValues")
            return "UUID identity leakage - UUID references should not be constrained";
        
        if (category is PathCategory.FreeText or PathCategory.AddressFreeText)
            return "Free text field - should not be constrained";
        
        if (category == PathCategory.ExtensionMetadata && suggestion.RuleType is "FixedValue" or "AllowedValues")
            return "Extension metadata - URLs should not be constrained";
        
        return "Suppressed by semantic rules";
    }
}
