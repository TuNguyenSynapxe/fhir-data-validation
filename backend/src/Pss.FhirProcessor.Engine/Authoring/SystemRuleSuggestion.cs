using System.Text.Json.Serialization;

namespace Pss.FhirProcessor.Engine.Authoring;

/// <summary>
/// Semantic classification of FHIR fields for intelligent rule suggestions.
/// Used to determine what types of rules are appropriate for a field.
/// </summary>
public enum SemanticType
{
    /// <summary>
    /// Field has a ValueSet binding (e.g., Observation.category)
    /// </summary>
    TerminologyBoundField,
    
    /// <summary>
    /// Reference field (.reference or type = Reference)
    /// </summary>
    ReferenceField,
    
    /// <summary>
    /// Status or lifecycle field (e.g., Observation.status, MedicationRequest.status)
    /// </summary>
    StatusOrLifecycleField,
    
    /// <summary>
    /// Identifier value (identifier.value, reference.id)
    /// </summary>
    IdentifierField,
    
    /// <summary>
    /// Free text field (string, markdown, address.line, display)
    /// </summary>
    FreeTextField,
    
    /// <summary>
    /// Coded answer field (component.valueCodeableConcept, etc.)
    /// </summary>
    CodedAnswerField,
    
    /// <summary>
    /// Unknown or unclassified field
    /// </summary>
    Unknown
}

/// <summary>
/// Refined sub-classification for better explanation and guidance.
/// Used to generate specific, contextual rationale instead of generic messages.
/// </summary>
public enum SemanticSubType
{
    /// <summary>
    /// Not applicable or not further classified
    /// </summary>
    None,
    
    /// <summary>
    /// Identifier namespace/system URI (identifier.system)
    /// </summary>
    IdentifierNamespace,
    
    /// <summary>
    /// Identifier value (identifier.value)
    /// </summary>
    IdentifierValue,
    
    /// <summary>
    /// Contact or address data (telecom.value, address.line)
    /// </summary>
    InstanceContactData,
    
    /// <summary>
    /// Human-readable labels (coding.display, reference.display)
    /// </summary>
    HumanReadableLabel,
    
    /// <summary>
    /// Text derived from structured elements (name.text when structured name exists)
    /// </summary>
    DerivedText,
    
    /// <summary>
    /// Free narrative (markdown, narrative.text)
    /// </summary>
    FreeNarrative,
    
    /// <summary>
    /// CodeableConcept display text
    /// </summary>
    CodedConceptDisplay,
    
    /// <summary>
    /// Reference display text
    /// </summary>
    ReferenceDisplay
}

/// <summary>
/// Type of data pattern observation detected in the sample bundle.
/// Observations are NOT rules until explicitly converted by the user.
/// </summary>
public enum ObservationType
{
    /// <summary>
    /// All values are identical (potential FixedValue candidate)
    /// </summary>
    ConstantValue,
    
    /// <summary>
    /// Small set of distinct values (potential AllowedValues candidate)
    /// </summary>
    SmallValueSet,
    
    /// <summary>
    /// Field present in all resources (potential Required candidate)
    /// </summary>
    AlwaysPresent,
    
    /// <summary>
    /// Detectable pattern (regex, format, structure)
    /// </summary>
    PatternDetected,
    
    /// <summary>
    /// Reference target consistency detected
    /// </summary>
    ReferenceTargetConsistent,
    
    /// <summary>
    /// Array length consistency detected
    /// </summary>
    ArrayLengthConsistent,
    
    /// <summary>
    /// Instance-specific data (should NOT become a rule)
    /// </summary>
    InstanceData,
    
    /// <summary>
    /// No clear pattern detected
    /// </summary>
    NoPattern
}

/// <summary>
/// Suggested alternative validation approach when no direct rule is appropriate.
/// Guides users toward FHIR-appropriate validation methods.
/// </summary>
public enum BetterRuleCandidate
{
    /// <summary>
    /// No reasonable alternative exists
    /// </summary>
    None,
    
    /// <summary>
    /// Pattern/regex validation would be appropriate
    /// </summary>
    Regex,
    
    /// <summary>
    /// ValueSet binding validation
    /// </summary>
    ValueSetBinding,
    
    /// <summary>
    /// Reference existence validation
    /// </summary>
    ReferenceExists,
    
    /// <summary>
    /// Array length validation
    /// </summary>
    ArrayLength,
    
    /// <summary>
    /// Non-empty string validation
    /// </summary>
    NonEmptyString,
    
    /// <summary>
    /// FixedValue in Implementation Guide (not inferred)
    /// </summary>
    FixedValueIGDefined,
    
    /// <summary>
    /// Terminology binding validation
    /// </summary>
    TerminologyBinding
}

/// <summary>
/// Represents a system-generated rule suggestion based on deterministic pattern analysis.
/// Suggestions are NOT enforced until explicitly accepted by the user.
/// </summary>
public class SystemRuleSuggestion
{
    /// <summary>
    /// Unique identifier for this suggestion
    /// </summary>
    [JsonPropertyName("suggestionId")]
    public string SuggestionId { get; set; } = Guid.NewGuid().ToString();
    
    /// <summary>
    /// Semantic classification of the FHIR field
    /// </summary>
    [JsonPropertyName("semanticType")]
    public SemanticType SemanticType { get; set; } = SemanticType.Unknown;
    
    /// <summary>
    /// Refined sub-classification for specific guidance
    /// </summary>
    [JsonPropertyName("semanticSubType")]
    public SemanticSubType SemanticSubType { get; set; } = SemanticSubType.None;
    
    /// <summary>
    /// Type of observation detected in the data
    /// </summary>
    [JsonPropertyName("observationType")]
    public ObservationType ObservationType { get; set; } = ObservationType.NoPattern;
    
    /// <summary>
    /// Suggested alternative validation approach (when no direct rule is appropriate)
    /// </summary>
    [JsonPropertyName("betterRuleCandidate")]
    public BetterRuleCandidate? BetterRuleCandidate { get; set; }
    
    /// <summary>
    /// Type of rule being suggested (Required, FixedValue, AllowedValues, etc.)
    /// May be null if observation should NOT become a rule (e.g., InstanceData)
    /// </summary>
    [JsonPropertyName("ruleType")]
    public string? RuleType { get; set; }
    
    /// <summary>
    /// FHIRPath expression for the field
    /// </summary>
    [JsonPropertyName("path")]
    public string Path { get; set; } = string.Empty;
    
    /// <summary>
    /// Resource type this suggestion applies to
    /// </summary>
    [JsonPropertyName("resourceType")]
    public string ResourceType { get; set; } = string.Empty;
    
    /// <summary>
    /// Rule parameters (varies by rule type)
    /// </summary>
    [JsonPropertyName("params")]
    public Dictionary<string, object> Params { get; set; } = new();
    
    /// <summary>
    /// Confidence level: "high", "medium", or "low"
    /// </summary>
    [JsonPropertyName("confidence")]
    public string Confidence { get; set; } = "medium";
    
    /// <summary>
    /// Human-readable explanation of why this rule is suggested
    /// </summary>
    [JsonPropertyName("reasoning")]
    public string Reasoning { get; set; } = string.Empty;
    
    /// <summary>
    /// Evidence from sample data supporting this suggestion
    /// </summary>
    [JsonPropertyName("sampleEvidence")]
    public SuggestionEvidence SampleEvidence { get; set; } = new();
    
    /// <summary>
    /// Source of suggestion (always "SYSTEM" for deterministic suggestions)
    /// </summary>
    [JsonPropertyName("source")]
    public string Source { get; set; } = "SYSTEM";
}

/// <summary>
/// Evidence supporting a rule suggestion
/// </summary>
public class SuggestionEvidence
{
    /// <summary>
    /// Number of resources analyzed
    /// </summary>
    [JsonPropertyName("resourceCount")]
    public int ResourceCount { get; set; }
    
    /// <summary>
    /// Example values observed in the sample
    /// </summary>
    [JsonPropertyName("exampleValues")]
    public List<string> ExampleValues { get; set; } = new();
    
    /// <summary>
    /// Additional context about the pattern detected
    /// </summary>
    [JsonPropertyName("context")]
    public Dictionary<string, object> Context { get; set; } = new();
}
