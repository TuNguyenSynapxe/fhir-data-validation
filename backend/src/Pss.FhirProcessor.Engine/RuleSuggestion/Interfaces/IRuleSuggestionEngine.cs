using Pss.FhirProcessor.Engine.RuleSuggestion.Models;

namespace Pss.FhirProcessor.Engine.RuleSuggestion.Interfaces;

/// <summary>
/// Base interface for rule detectors
/// Each detector analyzes path observations and produces rule suggestions
/// </summary>
public interface IRuleDetector
{
    /// <summary>
    /// Detector name for logging and debugging
    /// </summary>
    string DetectorName { get; }
    
    /// <summary>
    /// Analyze a path classification and produce rule suggestions
    /// </summary>
    /// <param name="classification">Observed path characteristics</param>
    /// <returns>Zero or more rule suggestion candidates</returns>
    IEnumerable<Models.RuleSuggestion> Detect(PathClassification classification);
}

/// <summary>
/// Service for flattening bundles into path observations
/// </summary>
public interface IBundleFlattener
{
    /// <summary>
    /// Extract all FHIRPaths and their observed values from a bundle
    /// </summary>
    /// <param name="bundle">FHIR Bundle to analyze</param>
    /// <returns>Map of FHIRPath to observed values</returns>
    Dictionary<string, List<object>> FlattenBundle(object bundle);
    
    /// <summary>
    /// Classify observed paths for rule detection
    /// </summary>
    /// <param name="flattenedData">Path to values mapping</param>
    /// <returns>List of classified paths</returns>
    List<PathClassification> ClassifyPaths(Dictionary<string, List<object>> flattenedData);
}

/// <summary>
/// Service for calculating confidence scores
/// </summary>
public interface IConfidenceScorer
{
    /// <summary>
    /// Calculate confidence score for a rule suggestion
    /// </summary>
    /// <param name="suggestion">Rule suggestion to score</param>
    /// <param name="classification">Path classification</param>
    /// <param name="existingRules">Existing project rules</param>
    /// <returns>Confidence score breakdown</returns>
    ConfidenceScoreBreakdown CalculateScore(
        Models.RuleSuggestion suggestion,
        PathClassification classification,
        IEnumerable<object> existingRules);
}

/// <summary>
/// Main rule suggestion engine interface
/// </summary>
public interface IRuleSuggestionEngine
{
    /// <summary>
    /// Generate rule suggestions based on bundle analysis
    /// </summary>
    /// <param name="bundle">FHIR Bundle to analyze</param>
    /// <param name="existingRules">Current project rules</param>
    /// <param name="minConfidenceScore">Minimum confidence score threshold (default 50)</param>
    /// <returns>List of rule suggestions sorted by confidence</returns>
    Task<List<Models.RuleSuggestion>> GenerateSuggestionsAsync(
        object bundle,
        IEnumerable<object> existingRules,
        double minConfidenceScore = 50.0);
}
