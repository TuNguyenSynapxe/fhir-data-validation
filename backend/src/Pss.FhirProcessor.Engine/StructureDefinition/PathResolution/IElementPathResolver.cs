using Hl7.Fhir.Introspection;

namespace Pss.FhirProcessor.Engine.SdValidation.PathResolution;

/// <summary>
/// Phase 3.1: Resolves StructureDefinition element paths against FHIR POCOs.
/// 
/// Foundation for generic path-based validation.
/// Replaces hardcoded element access in validators.
/// </summary>
public interface IElementPathResolver
{
    /// <summary>
    /// Resolves an element path against a root POCO.
    /// 
    /// Examples:
    /// - "Bundle.type" → single value
    /// - "Bundle.entry" → multiple values (list)
    /// - "Bundle.entry.resource" → nested values
    /// - "Bundle.meta.extension.valueString" → choice type resolution
    /// 
    /// Returns:
    /// - Multiple contexts if path matches multiple values (e.g., repeating elements)
    /// - Single context with IsMissing=true if path resolves to nothing
    /// - Values in deterministic order
    /// </summary>
    /// <param name="rootPoco">The root FHIR POCO to resolve from</param>
    /// <param name="elementPath">SD element path (e.g., "Bundle.entry")</param>
    /// <param name="inspector">Firely ModelInspector for metadata</param>
    /// <returns>Enumerable of resolved value contexts</returns>
    IEnumerable<ElementValueContext> ResolveValues(
        object rootPoco,
        string elementPath,
        ModelInspector inspector);
}
