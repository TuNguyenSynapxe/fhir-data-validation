using Pss.FhirProcessor.Engine.Models;

namespace Pss.FhirProcessor.Engine.Interfaces;

/// <summary>
/// Phase B: Dynamic Enum Index Service
/// 
/// Provides cached access to enum values extracted from FHIR StructureDefinitions.
/// This service builds an in-memory index of all enum bindings for efficient validation.
/// 
/// Key Features:
/// - Version-aware (R4/R5 separate caches)
/// - Binding strength aware (required/extensible/preferred/example)
/// - Thread-safe cached lookups
/// - NO terminology server calls
/// - NO code system membership validation
/// 
/// Scope:
/// - Returns allowed values from ValueSet expansions embedded in StructureDefinitions
/// - Does NOT validate terminology correctness (that's Firely's job)
/// </summary>
public interface IFhirEnumIndex
{
    /// <summary>
    /// Gets allowed enum values for a specific element.
    /// Returns null if no enum binding exists.
    /// </summary>
    /// <param name="fhirVersion">FHIR version (R4 or R5)</param>
    /// <param name="resourceType">Resource type (e.g., "Patient")</param>
    /// <param name="elementName">Element name (e.g., "gender")</param>
    /// <returns>List of allowed values or null if not an enum</returns>
    IReadOnlyList<string>? GetAllowedValues(
        string fhirVersion,
        string resourceType,
        string elementName);

    /// <summary>
    /// Gets binding strength for a specific element.
    /// Returns null if no binding exists.
    /// </summary>
    /// <param name="fhirVersion">FHIR version (R4 or R5)</param>
    /// <param name="resourceType">Resource type (e.g., "Patient")</param>
    /// <param name="elementName">Element name (e.g., "gender")</param>
    /// <returns>Binding strength or null</returns>
    string? GetBindingStrength(
        string fhirVersion,
        string resourceType,
        string elementName);

    /// <summary>
    /// Builds or rebuilds the enum index for a specific FHIR version.
    /// Should be called during service initialization.
    /// </summary>
    /// <param name="fhirVersion">FHIR version to build index for</param>
    /// <param name="cancellationToken">Cancellation token</param>
    Task BuildIndexAsync(string fhirVersion, CancellationToken cancellationToken = default);
}
