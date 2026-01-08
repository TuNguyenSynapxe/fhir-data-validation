using Hl7.Fhir.Specification;
using System.Collections.Generic;

namespace Pss.FhirProcessor.Engine.Firely;

/// <summary>
/// Composite StructureDefinition provider that delegates resolution to multiple underlying providers.
/// Resolution order: profile-specific → base FHIR R4.
/// 
/// This enables profile-based validation by combining:
/// 1. In-memory profile StructureDefinitions (from ValidationRequest)
/// 2. Base FHIR R4 definitions (from Firely SDK)
/// 
/// ⚠️ This provider is request-scoped (lifetime = single validation request).
/// It does NOT introduce global state or caching.
/// </summary>
internal sealed class CompositeStructureDefinitionSummaryProvider : IStructureDefinitionSummaryProvider
{
    private readonly IReadOnlyList<IStructureDefinitionSummaryProvider> _providers;

    /// <summary>
    /// Creates a composite provider with the specified providers.
    /// Providers are queried in the order they are provided (first match wins).
    /// </summary>
    /// <param name="providers">Underlying providers to delegate to (in priority order)</param>
    public CompositeStructureDefinitionSummaryProvider(params IStructureDefinitionSummaryProvider[] providers)
    {
        _providers = providers;
    }

    /// <summary>
    /// Resolves a StructureDefinition summary by canonical URL.
    /// Tries each underlying provider in order until one returns a result.
    /// </summary>
    /// <param name="canonical">Canonical URL of the StructureDefinition to resolve</param>
    /// <returns>StructureDefinition summary if found, otherwise null</returns>
    public IStructureDefinitionSummary? Provide(string canonical)
    {
        if (string.IsNullOrWhiteSpace(canonical))
        {
            return null;
        }

        // Try each provider in order (profile → base)
        foreach (var provider in _providers)
        {
            var summary = provider.Provide(canonical);
            if (summary != null)
            {
                return summary;
            }
        }

        // No provider resolved the canonical URL
        return null;
    }
}
