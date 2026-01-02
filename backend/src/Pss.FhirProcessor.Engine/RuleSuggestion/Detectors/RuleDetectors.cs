using System.Text.RegularExpressions;
using Pss.FhirProcessor.Engine.RuleSuggestion.Interfaces;
using Pss.FhirProcessor.Engine.RuleSuggestion.Models;
using Pss.FhirProcessor.Engine.RuleSuggestion.Services;

namespace Pss.FhirProcessor.Engine.RuleSuggestion.Detectors;

/// <summary>
/// Detects patterns that can be enforced with regex rules.
/// Uses RegexPatternRegistry for domain-aware, curated patterns with eligibility rules.
/// Triggers when ≥80% of values match a detectable pattern and sampleSize ≥ 3.
/// </summary>
public class RegexDetector : IRuleDetector
{
    public string DetectorName => "RegexDetector";
    
    private const double MinCoverageThreshold = 0.80; // 80%
    private const int MinSampleSize = 3;
    
    public IEnumerable<Models.RuleSuggestion> Detect(PathClassification classification)
    {
        if (classification.PrimitiveType != Models.PrimitiveType.String) yield break;
        if (classification.ObservedValues.Count < MinSampleSize) yield break;
        
        var stringValues = classification.ObservedValues
            .OfType<string>()
            .Where(s => !string.IsNullOrWhiteSpace(s))
            .ToList();
        
        if (stringValues.Count == 0) yield break;
        
        // Get full path for eligibility checking
        var fullPath = $"{classification.ResourceType}.{classification.Path}";
        
        // Get eligible patterns from registry
        var eligiblePatterns = RegexPatternRegistry.GetEligiblePatterns(fullPath, classification);
        
        foreach (var pattern in eligiblePatterns)
        {
            var matches = stringValues.Count(v => pattern.Matches(v, RegexOptions.IgnoreCase));
            var coverage = (double)matches / stringValues.Count;
            
            // Only emit suggestion if coverage threshold met
            if (coverage >= MinCoverageThreshold)
            {
                // Get matching values for evidence
                var matchingValues = stringValues
                    .Where(v => pattern.Matches(v, RegexOptions.IgnoreCase))
                    .Take(3)
                    .Cast<object>()
                    .ToList();
                
                yield return new Models.RuleSuggestion
                {
                    RuleType = "Regex",
                    TargetPath = RemoveResourceType(classification.Path, classification.ResourceType),
                    ResourceType = classification.ResourceType,
                    Parameters = new Dictionary<string, object>
                    {
                        { "pattern", pattern.Pattern },
                        { "patternName", pattern.PatternName }
                    },
                    Rationale = $"{matches}/{stringValues.Count} observed values match {pattern.PatternName} format",
                    SampleEvidence = matchingValues,
                    SampleSize = stringValues.Count,
                    Coverage = coverage
                };
            }
        }
    }
    
    private string RemoveResourceType(string path, string resourceType)
    {
        if (path.StartsWith(resourceType + "."))
        {
            return path.Substring(resourceType.Length + 1);
        }
        return path;
    }
}

/// <summary>
/// Detects small closed value sets suitable for AllowedValues rules
/// Triggers when there are ≤5 distinct stable values
/// </summary>
public class AllowedValuesDetector : IRuleDetector
{
    public string DetectorName => "AllowedValuesDetector";
    
    public IEnumerable<Models.RuleSuggestion> Detect(PathClassification classification)
    {
        if (classification.ObservedValues.Count < 3) yield break;
        if (classification.DistinctValueCount > 5) yield break;
        if (classification.DistinctValueCount < 2) yield break; // Use FixedValue instead
        
        var distinctValues = classification.ObservedValues.Distinct().ToList();
        
        var suggestion = new Models.RuleSuggestion
        {
            RuleType = "AllowedValues",
            TargetPath = RemoveResourceType(classification.Path, classification.ResourceType),
            ResourceType = classification.ResourceType,
            Parameters = new Dictionary<string, object>
            {
                { "allowedValues", distinctValues }
            },
            Rationale = $"Observed {classification.DistinctValueCount} distinct values across {classification.ObservedValues.Count} samples - likely a closed value set",
            SampleEvidence = distinctValues.Take(5).ToList(),
            SampleSize = classification.ObservedValues.Count,
            Coverage = 1.0 // All values are allowed
        };
        
        yield return suggestion;
    }
    
    private string RemoveResourceType(string path, string resourceType)
    {
        if (path.StartsWith(resourceType + "."))
        {
            return path.Substring(resourceType.Length + 1);
        }
        return path;
    }
}

/// <summary>
/// Detects fixed/constant values across all observations
/// Triggers when all values are identical with sufficient sample size
/// </summary>
public class FixedValueDetector : IRuleDetector
{
    public string DetectorName => "FixedValueDetector";
    
    private const int MinSampleSize = 3;
    
    public IEnumerable<Models.RuleSuggestion> Detect(PathClassification classification)
    {
        if (classification.ObservedValues.Count < MinSampleSize) yield break;
        if (classification.DistinctValueCount != 1) yield break;
        
        var fixedValue = classification.ObservedValues.First();
        
        var suggestion = new Models.RuleSuggestion
        {
            RuleType = "FixedValue",
            TargetPath = RemoveResourceType(classification.Path, classification.ResourceType),
            ResourceType = classification.ResourceType,
            Parameters = new Dictionary<string, object>
            {
                { "value", fixedValue }
            },
            Rationale = $"All {classification.ObservedValues.Count} observed values are identical - this appears to be a fixed/constant field",
            SampleEvidence = new List<object> { fixedValue },
            SampleSize = classification.ObservedValues.Count,
            Coverage = 1.0
        };
        
        yield return suggestion;
    }
    
    private string RemoveResourceType(string path, string resourceType)
    {
        if (path.StartsWith(resourceType + "."))
        {
            return path.Substring(resourceType.Length + 1);
        }
        return path;
    }
}

/// <summary>
/// Detects CodeSystem patterns (system + code combinations)
/// Triggers when terminology system is detected and resolvable
/// </summary>
public class CodeSystemDetector : IRuleDetector
{
    public string DetectorName => "CodeSystemDetector";
    
    public IEnumerable<Models.RuleSuggestion> Detect(PathClassification classification)
    {
        // Check if path indicates a coding element
        if (!classification.Path.Contains("coding") && 
            !classification.Path.Contains("code") &&
            !classification.HasSystemAndCode)
        {
            yield break;
        }
        
        // For now, this is a placeholder - full implementation requires
        // analyzing parent structure to find system + code pairs
        // This would be enhanced in production with actual terminology service integration
        
        yield break;
    }
}

/// <summary>
/// Detects QuestionAnswer patterns (code + value[x])
/// Triggers when repeated question-answer structure is found
/// </summary>
public class QuestionAnswerDetector : IRuleDetector
{
    public string DetectorName => "QuestionAnswerDetector";
    
    public IEnumerable<Models.RuleSuggestion> Detect(PathClassification classification)
    {
        // Check if this is part of a component/item structure with code + value
        if (!classification.Path.Contains("component") && !classification.Path.Contains("item"))
        {
            yield break;
        }
        
        if (!classification.HasValueX)
        {
            yield break;
        }
        
        // For now, this is a placeholder - full implementation requires
        // analyzing sibling paths to find code + value[x] pairs
        // This would be enhanced in production with question set detection
        
        yield break;
    }
}

/// <summary>
/// Detects consistent bundle structure patterns
/// Triggers when resource counts and composition are stable
/// </summary>
public class BundleStructureDetector : IRuleDetector
{
    public string DetectorName => "BundleStructureDetector";
    
    public IEnumerable<Models.RuleSuggestion> Detect(PathClassification classification)
    {
        // This detector operates at bundle level, not path level
        // It would need to be invoked separately with bundle-level analysis
        // For now, skip in path-based detection
        
        yield break;
    }
}
