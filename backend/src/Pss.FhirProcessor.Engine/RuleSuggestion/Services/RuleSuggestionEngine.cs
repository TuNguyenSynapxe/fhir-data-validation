using System.Text.Json;
using Microsoft.Extensions.Logging;
using Pss.FhirProcessor.Engine.RuleSuggestion.Detectors;
using Pss.FhirProcessor.Engine.RuleSuggestion.Interfaces;
using Pss.FhirProcessor.Engine.RuleSuggestion.Models;

namespace Pss.FhirProcessor.Engine.RuleSuggestion.Services;

/// <summary>
/// Main orchestrator for deterministic rule suggestion engine
/// Analyzes FHIR bundles and suggests enforceable rules
/// </summary>
public class RuleSuggestionEngine : IRuleSuggestionEngine
{
    private readonly IBundleFlattener _bundleFlattener;
    private readonly IConfidenceScorer _confidenceScorer;
    private readonly ILogger<RuleSuggestionEngine> _logger;
    private readonly List<IRuleDetector> _detectors;
    
    public RuleSuggestionEngine(
        IBundleFlattener bundleFlattener,
        IConfidenceScorer confidenceScorer,
        ILogger<RuleSuggestionEngine> logger)
    {
        _bundleFlattener = bundleFlattener;
        _confidenceScorer = confidenceScorer;
        _logger = logger;
        
        // Register all detectors
        _detectors = new List<IRuleDetector>
        {
            new RegexDetector(),
            new AllowedValuesDetector(),
            new FixedValueDetector(),
            new CodeSystemDetector(),
            new QuestionAnswerDetector(),
            new BundleStructureDetector()
        };
    }
    
    public async Task<List<Models.RuleSuggestion>> GenerateSuggestionsAsync(
        object bundle,
        IEnumerable<object> existingRules,
        double minConfidenceScore = 50.0)
    {
        try
        {
            _logger.LogInformation("Starting rule suggestion generation");
            
            // Step 0: Preprocess - Flatten bundle
            var flattenedData = _bundleFlattener.FlattenBundle(bundle);
            _logger.LogInformation($"Flattened bundle into {flattenedData.Count} distinct paths");
            
            // Classify paths
            var classifications = _bundleFlattener.ClassifyPaths(flattenedData);
            _logger.LogInformation($"Classified {classifications.Count} paths");
            
            // Step 1: Exclusion Guard - Build existing rule index
            var existingRuleIndex = BuildExistingRuleIndex(existingRules);
            _logger.LogInformation($"Indexed {existingRuleIndex.Count} existing rules");
            
            // Step 2-3: Run detectors on each path classification
            var candidateSuggestions = new List<Models.RuleSuggestion>();
            
            foreach (var classification in classifications)
            {
                foreach (var detector in _detectors)
                {
                    var suggestions = detector.Detect(classification);
                    
                    foreach (var suggestion in suggestions)
                    {
                        // Apply exclusion guard
                        if (ShouldExclude(suggestion, existingRuleIndex))
                        {
                            _logger.LogDebug($"Excluded duplicate suggestion: {suggestion.RuleType} on {suggestion.TargetPath}");
                            continue;
                        }
                        
                        // Step 4: Calculate confidence score
                        var scoreBreakdown = _confidenceScorer.CalculateScore(
                            suggestion,
                            classification,
                            existingRules);
                        
                        suggestion.ConfidenceScore = scoreBreakdown.TotalScore;
                        suggestion.ConfidenceLevel = MapConfidenceLevel(scoreBreakdown.TotalScore);
                        
                        candidateSuggestions.Add(suggestion);
                    }
                }
            }
            
            _logger.LogInformation($"Generated {candidateSuggestions.Count} candidate suggestions");
            
            // Step 5: Filter by minimum score
            var filteredSuggestions = candidateSuggestions
                .Where(s => s.ConfidenceScore >= minConfidenceScore)
                .ToList();
            
            _logger.LogInformation($"Filtered to {filteredSuggestions.Count} suggestions above threshold {minConfidenceScore}");
            
            // Step 6: Sort by priority
            var sortedSuggestions = filteredSuggestions
                .OrderByDescending(s => s.ConfidenceScore)
                .ThenBy(s => GetRuleImpact(s.RuleType))
                .ThenBy(s => GetPathDepth(s.TargetPath))
                .ToList();
            
            _logger.LogInformation($"Returning {sortedSuggestions.Count} final suggestions");
            
            return await Task.FromResult(sortedSuggestions);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating rule suggestions");
            return new List<Models.RuleSuggestion>();
        }
    }
    
    private Dictionary<string, HashSet<string>> BuildExistingRuleIndex(IEnumerable<object> existingRules)
    {
        // Index: Path -> Set of RuleTypes on that path
        var index = new Dictionary<string, HashSet<string>>();
        
        foreach (var rule in existingRules)
        {
            if (!TryExtractRuleInfo(rule, out var ruleType, out var path))
                continue;
            
            var normalizedPath = NormalizePath(path);
            
            if (!index.ContainsKey(normalizedPath))
            {
                index[normalizedPath] = new HashSet<string>();
            }
            
            index[normalizedPath].Add(ruleType);
        }
        
        return index;
    }
    
    private bool ShouldExclude(Models.RuleSuggestion suggestion, Dictionary<string, HashSet<string>> existingRuleIndex)
    {
        var fullPath = $"{suggestion.ResourceType}.{suggestion.TargetPath}";
        var normalizedPath = NormalizePath(fullPath);
        
        if (existingRuleIndex.TryGetValue(normalizedPath, out var existingTypes))
        {
            return existingTypes.Contains(suggestion.RuleType);
        }
        
        return false;
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
    
    private ConfidenceLevel MapConfidenceLevel(double score)
    {
        return score switch
        {
            >= 80.0 => ConfidenceLevel.High,
            >= 60.0 => ConfidenceLevel.Medium,
            _ => ConfidenceLevel.Low
        };
    }
    
    private int GetRuleImpact(string ruleType)
    {
        // Lower number = higher priority
        return ruleType switch
        {
            "Resource" => 1,         // Bundle-level rules
            "CodeSystem" => 2,       // Terminology rules
            "QuestionAnswer" => 3,   // Structured data rules
            "FixedValue" => 4,       // Constant rules
            "AllowedValues" => 5,    // Enumeration rules
            "Regex" => 6,            // Format rules
            _ => 99
        };
    }
    
    private int GetPathDepth(string path)
    {
        return path.Count(c => c == '.');
    }
    
    private string NormalizePath(string path)
    {
        // Remove array indices for comparison
        return path.Replace("[*]", "").Replace("[0]", "").Replace("[1]", "");
    }
}
