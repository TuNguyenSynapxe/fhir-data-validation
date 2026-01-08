namespace Pss.FhirProcessor.Engine.SdValidation;

/// <summary>
/// Phase 2.4: Reasons for SD constraint violations.
/// Used by policy to determine severity based on enforcement mode.
/// </summary>
public enum SdViolationReason
{
    /// <summary>
    /// ValueSet includes entire CodeSystem without explicit concepts.
    /// Cannot validate deterministically without CodeSystem expansion.
    /// </summary>
    EntireSystemValueSet,

    /// <summary>
    /// ValueSet imports other ValueSets via compose.include.valueSet.
    /// Cannot resolve transitively without terminology server.
    /// </summary>
    ImportedValueSet,

    /// <summary>
    /// ValueSet uses filters (e.g., is-a, concept, descendants).
    /// Cannot evaluate filters without CodeSystem knowledge.
    /// </summary>
    FilteredInclude,

    /// <summary>
    /// ValueSet cannot be resolved from resource resolver.
    /// Missing from FHIR package or resource bundle.
    /// </summary>
    UnresolvableValueSet
}
