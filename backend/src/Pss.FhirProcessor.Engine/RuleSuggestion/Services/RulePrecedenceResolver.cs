using Pss.FhirProcessor.Engine.RuleSuggestion.Models;

namespace Pss.FhirProcessor.Engine.RuleSuggestion.Services;

/// <summary>
/// Resolves competing rule suggestions by applying strict precedence rules.
/// Ensures only the highest-precedence rule type survives for each path.
/// </summary>
public static class RulePrecedenceResolver
{
    /// <summary>
    /// Rule precedence hierarchy (highest to lowest):
    /// Regex > AllowedValues > FixedValue
    /// </summary>
    private static readonly Dictionary<string, int> Precedence = new()
    {
        { "Regex", 1 },          // Highest precedence
        { "AllowedValues", 2 },
        { "FixedValue", 3 }      // Lowest precedence
    };
    
    /// <summary>
    /// Apply precedence resolution to a list of suggestions.
    /// Groups by (resourceType, path) and keeps only highest-precedence rule.
    /// </summary>
    public static List<Models.RuleSuggestion> ApplyPrecedence(List<Models.RuleSuggestion> suggestions)
    {
        // Group by (resourceType, targetPath)
        var groupedSuggestions = suggestions
            .GroupBy(s => new { s.ResourceType, s.TargetPath })
            .ToList();
        
        var resolvedSuggestions = new List<Models.RuleSuggestion>();
        
        foreach (var group in groupedSuggestions)
        {
            var candidatesInGroup = group.ToList();
            
            // Find highest precedence rule type in this group
            var highestPrecedence = candidatesInGroup
                .Where(s => Precedence.ContainsKey(s.RuleType))
                .OrderBy(s => GetPrecedenceValue(s.RuleType))
                .FirstOrDefault();
            
            if (highestPrecedence != null)
            {
                // Keep only rules with the highest precedence
                var winningPrecedence = GetPrecedenceValue(highestPrecedence.RuleType);
                var winners = candidatesInGroup
                    .Where(s => GetPrecedenceValue(s.RuleType) == winningPrecedence)
                    .ToList();
                
                resolvedSuggestions.AddRange(winners);
            }
            else
            {
                // No precedence rules apply, keep all (e.g., CodeSystem, QuestionAnswer)
                resolvedSuggestions.AddRange(candidatesInGroup);
            }
        }
        
        return resolvedSuggestions;
    }
    
    /// <summary>
    /// Get precedence value for a rule type (lower = higher priority)
    /// </summary>
    private static int GetPrecedenceValue(string ruleType)
    {
        return Precedence.TryGetValue(ruleType, out var value) ? value : 999;
    }
    
    /// <summary>
    /// Check if rule type A has higher precedence than rule type B
    /// </summary>
    public static bool HasHigherPrecedence(string ruleTypeA, string ruleTypeB)
    {
        return GetPrecedenceValue(ruleTypeA) < GetPrecedenceValue(ruleTypeB);
    }
}
