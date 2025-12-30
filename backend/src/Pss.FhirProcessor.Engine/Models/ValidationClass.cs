using System.Text.Json.Serialization;

namespace Pss.FhirProcessor.Engine.Models;

/// <summary>
/// Classification of validation rules to determine whether severity downgrading is permitted.
/// This enum enables explicit control over severity resolution logic:
/// - Contract validations enforce data mapping contracts (never downgrade)
/// - Structural validations enforce FHIR specification compliance (never downgrade)
/// - Advisory validations provide guidance and may be downgraded based on confidence
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum ValidationClass
{
    /// <summary>
    /// Deterministic contract validation (e.g., QuestionAnswer system/code mapping).
    /// These rules enforce explicit data contracts and MUST NOT be downgraded.
    /// Intent: System/code mismatches are hard errors indicating broken mappings,
    /// not uncertain heuristics.
    /// </summary>
    Contract,

    /// <summary>
    /// FHIR structural validation (e.g., required fields, cardinality, data types).
    /// These rules enforce HL7 FHIR specification compliance and MUST NOT be downgraded.
    /// Intent: Structural violations break FHIR interoperability.
    /// </summary>
    Structural,

    /// <summary>
    /// Advisory validation (e.g., SpecHint, heuristic suggestions).
    /// These rules provide guidance and MAY be downgraded when confidence is low.
    /// Intent: Allow heuristic-based or low-confidence suggestions to be warnings.
    /// </summary>
    Advisory
}
