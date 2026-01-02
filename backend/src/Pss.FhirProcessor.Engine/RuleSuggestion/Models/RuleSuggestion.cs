namespace Pss.FhirProcessor.Engine.RuleSuggestion.Models;

/// <summary>
/// Represents a suggested rule configuration that can be applied to the project.
/// Each suggestion is deterministic, explainable, and includes confidence scoring.
/// </summary>
public class RuleSuggestion
{
    /// <summary>
    /// Type of rule being suggested (Regex, AllowedValues, FixedValue, CodeSystem, QuestionAnswer, Resource)
    /// </summary>
    public string RuleType { get; set; } = string.Empty;
    
    /// <summary>
    /// Target FHIRPath where the rule should be applied
    /// </summary>
    public string TargetPath { get; set; } = string.Empty;
    
    /// <summary>
    /// Resource type this rule applies to
    /// </summary>
    public string ResourceType { get; set; } = string.Empty;
    
    /// <summary>
    /// Full rule configuration (apply-ready parameters)
    /// </summary>
    public Dictionary<string, object> Parameters { get; set; } = new();
    
    /// <summary>
    /// Numeric confidence score (0-100)
    /// </summary>
    public double ConfidenceScore { get; set; }
    
    /// <summary>
    /// Categorical confidence level derived from score
    /// </summary>
    public ConfidenceLevel ConfidenceLevel { get; set; }
    
    /// <summary>
    /// Plain-English explanation of why this rule is suggested
    /// </summary>
    public string Rationale { get; set; } = string.Empty;
    
    /// <summary>
    /// Optional sample values observed in the bundle that led to this suggestion
    /// </summary>
    public List<object>? SampleEvidence { get; set; }
    
    /// <summary>
    /// Number of values observed that support this suggestion
    /// </summary>
    public int SampleSize { get; set; }
    
    /// <summary>
    /// Percentage of values that match the suggested pattern/constraint
    /// </summary>
    public double Coverage { get; set; }
}

/// <summary>
/// Confidence level categories
/// </summary>
public enum ConfidenceLevel
{
    Low,    // Score < 60
    Medium, // Score 60-79
    High    // Score >= 80
}

/// <summary>
/// Classification of observed path characteristics
/// </summary>
public class PathClassification
{
    public string Path { get; set; } = string.Empty;
    public string ResourceType { get; set; } = string.Empty;
    public PrimitiveType PrimitiveType { get; set; }
    public bool IsArray { get; set; }
    public int DistinctValueCount { get; set; }
    public bool HasSystemAndCode { get; set; }
    public bool HasValueX { get; set; }
    public bool HasConsistentFormat { get; set; }
    public List<object> ObservedValues { get; set; } = new();
}

/// <summary>
/// Primitive type categories for FHIR elements
/// </summary>
public enum PrimitiveType
{
    String,
    Number,
    Date,
    Code,
    Boolean,
    Object,
    Unknown
}

/// <summary>
/// Confidence score breakdown components
/// </summary>
public class ConfidenceScoreBreakdown
{
    public double CoverageScore { get; set; }      // 0-30
    public double ConsistencyScore { get; set; }   // 0-25
    public double SampleSizeScore { get; set; }    // 0-20
    public double RiskWeight { get; set; }         // 0-15
    public double ConflictPenalty { get; set; }    // 0-30
    public double TotalScore { get; set; }         // 0-100
}
