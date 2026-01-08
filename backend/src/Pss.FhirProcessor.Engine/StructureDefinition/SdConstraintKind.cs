namespace Pss.FhirProcessor.Engine.SdValidation;

/// <summary>
/// Phase 2.2: Explicit SD constraint categories.
/// 
/// Defines which StructureDefinition constraints the engine understands.
/// Each kind maps to a specific validator implementation.
/// 
/// This is a closed set - only these constraint types are recognized.
/// </summary>
public enum SdConstraintKind
{
    /// <summary>
    /// Element cardinality constraints (min/max).
    /// Example: Bundle.entry has min=1
    /// </summary>
    Cardinality,

    /// <summary>
    /// Fixed value constraints (element must equal specific value).
    /// Example: Bundle.type must be "collection"
    /// </summary>
    FixedValue,

    /// <summary>
    /// Required terminology binding (element must use specific ValueSet).
    /// Example: Patient.gender must use http://hl7.org/fhir/ValueSet/administrative-gender
    /// </summary>
    RequiredBinding,

    /// <summary>
    /// Pattern constraints (element must match structure).
    /// Phase 2.2: DEFERRED (not yet implemented)
    /// </summary>
    Pattern,

    /// <summary>
    /// FHIRPath invariants (complex business rules).
    /// Phase 2.2: DEFERRED (handled by FHIRPath rule engine instead)
    /// </summary>
    Invariant
}
