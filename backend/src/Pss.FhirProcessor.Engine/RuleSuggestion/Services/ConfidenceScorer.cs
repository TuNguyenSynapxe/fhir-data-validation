using System.Text.Json;
using Pss.FhirProcessor.Engine.RuleSuggestion.Interfaces;
using Pss.FhirProcessor.Engine.RuleSuggestion.Models;

namespace Pss.FhirProcessor.Engine.RuleSuggestion.Services;

/// <summary>
/// Service for calculating confidence scores for rule suggestions
/// </summary>
public class ConfidenceScorer : IConfidenceScorer
{
    public ConfidenceScoreBreakdown CalculateScore(
        Models.RuleSuggestion suggestion,
        PathClassification classification,
        IEnumerable<object> existingRules)
    {
        var breakdown = new ConfidenceScoreBreakdown();
        
        // 1. Coverage Score (0-30)
        breakdown.CoverageScore = CalculateCoverageScore(suggestion.Coverage);
        
        // 2. Consistency Score (0-25)
        breakdown.ConsistencyScore = CalculateConsistencyScore(
            suggestion.RuleType, 
            classification.DistinctValueCount,
            classification.ObservedValues.Count);
        
        // 3. Sample Size Score (0-20)
        breakdown.SampleSizeScore = CalculateSampleSizeScore(suggestion.SampleSize);
        
        // 4. Risk Weight (0-15)
        breakdown.RiskWeight = CalculateRiskWeight(
            suggestion.RuleType,
            classification.Path,
            classification.PrimitiveType);
        
        // 5. Conflict Penalty (0-30)
        breakdown.ConflictPenalty = CalculateConflictPenalty(
            suggestion,
            classification,
            existingRules);
        
        // Calculate total
        breakdown.TotalScore = Math.Max(0, 
            breakdown.CoverageScore +
            breakdown.ConsistencyScore +
            breakdown.SampleSizeScore +
            breakdown.RiskWeight -
            breakdown.ConflictPenalty);
        
        // Cap at 100
        breakdown.TotalScore = Math.Min(100, breakdown.TotalScore);
        
        return breakdown;
    }
    
    private double CalculateCoverageScore(double coverage)
    {
        // Coverage Score: coverage * 30
        return coverage * 30.0;
    }
    
    private double CalculateConsistencyScore(string ruleType, int distinctCount, int totalCount)
    {
        return ruleType switch
        {
            "FixedValue" => 25.0,                          // Single fixed value
            "AllowedValues" when distinctCount <= 3 => 20.0,  // Small enum set
            "AllowedValues" when distinctCount <= 5 => 18.0,  // Medium enum set
            "Regex" => 15.0,                               // Regex-matchable pattern
            "CodeSystem" => 20.0,                          // Terminology-based
            "QuestionAnswer" => 18.0,                      // Structured Q&A
            "Resource" => 15.0,                            // Bundle structure
            _ => 0.0
        };
    }
    
    private double CalculateSampleSizeScore(int sampleSize)
    {
        return sampleSize switch
        {
            >= 20 => 20.0,
            >= 10 => 15.0,
            >= 5 => 10.0,
            _ => 5.0
        };
    }
    
    private double CalculateRiskWeight(string ruleType, string path, PrimitiveType primitiveType)
    {
        // High-risk paths (identity, terminology)
        if (path.Contains("identifier") || 
            path.Contains("id") ||
            ruleType == "CodeSystem" ||
            path.Contains("coding") ||
            path.Contains("system"))
        {
            return 15.0;
        }
        
        // Medium-risk paths (dates, codes)
        if (primitiveType == Models.PrimitiveType.Date ||
            primitiveType == Models.PrimitiveType.Code ||
            path.Contains("date") ||
            path.Contains("code"))
        {
            return 10.0;
        }
        
        // Low-risk (formatting only)
        if (ruleType == "Regex" && primitiveType == Models.PrimitiveType.String)
        {
            return 5.0;
        }
        
        return 5.0;
    }
    
    private double CalculateConflictPenalty(
        Models.RuleSuggestion suggestion,
        PathClassification classification,
        IEnumerable<object> existingRules)
    {
        double penalty = 0.0;
        
        var rulesList = existingRules.ToList();
        
        // Check for overlapping rules on same path
        foreach (var existingRule in rulesList)
        {
            if (!TryExtractRuleInfo(existingRule, out var existingType, out var existingPath))
                continue;
            
            var suggestedPath = $"{classification.ResourceType}.{suggestion.TargetPath}";
            
            // Exact path + type match = already exists (should have been filtered)
            if (existingType == suggestion.RuleType && 
                NormalizePath(existingPath) == NormalizePath(suggestedPath))
            {
                penalty += 30.0; // Maximum penalty - duplicate
                continue;
            }
            
            // Same path, different type = potential conflict
            if (NormalizePath(existingPath) == NormalizePath(suggestedPath))
            {
                penalty += 15.0; // Moderate penalty
                continue;
            }
            
            // Parent/child path relationship
            if (IsRelatedPath(existingPath, suggestedPath))
            {
                penalty += 5.0; // Minor penalty
            }
        }
        
        // Inconsistent values penalty
        var inconsistencyRate = 1.0 - suggestion.Coverage;
        if (inconsistencyRate > 0.2) // More than 20% inconsistency
        {
            penalty += inconsistencyRate * 20.0;
        }
        
        return Math.Min(30.0, penalty);
    }
    
    private bool TryExtractRuleInfo(object rule, out string ruleType, out string path)
    {
        ruleType = string.Empty;
        path = string.Empty;
        
        try
        {
            if (rule is JsonElement jsonRule)
            {
                if (jsonRule.TryGetProperty("type", out var typeElement))
                {
                    ruleType = typeElement.GetString() ?? string.Empty;
                }
                
                if (jsonRule.TryGetProperty("path", out var pathElement))
                {
                    path = pathElement.GetString() ?? string.Empty;
                }
                else if (jsonRule.TryGetProperty("resourceType", out var resourceTypeElement) &&
                         jsonRule.TryGetProperty("fieldPath", out var fieldPathElement))
                {
                    var resourceType = resourceTypeElement.GetString() ?? string.Empty;
                    var fieldPath = fieldPathElement.GetString() ?? string.Empty;
                    path = $"{resourceType}.{fieldPath}";
                }
                
                return !string.IsNullOrEmpty(ruleType) && !string.IsNullOrEmpty(path);
            }
        }
        catch
        {
            // Ignore parse errors
        }
        
        return false;
    }
    
    private string NormalizePath(string path)
    {
        // Remove array indices for comparison
        return path.Replace("[*]", "").Replace("[0]", "").Replace("[1]", "");
    }
    
    private bool IsRelatedPath(string path1, string path2)
    {
        var normalized1 = NormalizePath(path1);
        var normalized2 = NormalizePath(path2);
        
        return normalized1.StartsWith(normalized2) || normalized2.StartsWith(normalized1);
    }
}
