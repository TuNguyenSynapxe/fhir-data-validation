using Hl7.Fhir.Model;
using Hl7.Fhir.Specification;
using Hl7.Fhir.Specification.Source;
using System.Collections.Generic;
using System.Linq;

namespace Pss.FhirProcessor.Engine.Firely;

/// <summary>
/// In-memory StructureDefinition provider for profile-based validation.
/// Holds parsed StructureDefinition POCOs indexed by canonical URL and resource type.
/// 
/// ⚠️ This provider is request-scoped (lifetime = single validation request).
/// It does NOT cache globally or persist to disk.
/// </summary>
internal sealed class InMemoryStructureDefinitionProvider : IStructureDefinitionSummaryProvider
{
    private readonly StructureDefinitionSummaryProvider _summaryProvider;

    /// <summary>
    /// Creates an in-memory provider with the specified StructureDefinitions.
    /// </summary>
    /// <param name="structureDefinitions">Parsed StructureDefinition POCOs to index</param>
    public InMemoryStructureDefinitionProvider(IEnumerable<StructureDefinition> structureDefinitions)
    {
        // Create an in-memory resolver that can provide the StructureDefinitions
        var resolver = new InMemoryResourceResolver(structureDefinitions);
        
        // Create a summary provider from the resolver using Firely SDK
        // This converts POCO StructureDefinitions into summaries for efficient validation
        _summaryProvider = new StructureDefinitionSummaryProvider(resolver);
    }

    /// <summary>
    /// Provides a StructureDefinition summary by canonical URL.
    /// This is the primary resolution mechanism used by Firely validation.
    /// </summary>
    public IStructureDefinitionSummary? Provide(string canonical)
    {
        if (string.IsNullOrWhiteSpace(canonical))
        {
            return null;
        }

        // Delegate to Firely's summary provider
        return _summaryProvider.Provide(canonical);
    }

    /// <summary>
    /// In-memory resource resolver for StructureDefinitions.
    /// Implements ISyncOrAsyncResourceResolver required by StructureDefinitionSummaryProvider.
    /// </summary>
    private sealed class InMemoryResourceResolver : ISyncOrAsyncResourceResolver
    {
        private readonly Dictionary<string, Resource> _resourcesByCanonicalUrl;

        public InMemoryResourceResolver(IEnumerable<StructureDefinition> structureDefinitions)
        {
            _resourcesByCanonicalUrl = new Dictionary<string, Resource>();

            foreach (var sd in structureDefinitions)
            {
                if (!string.IsNullOrWhiteSpace(sd.Url))
                {
                    _resourcesByCanonicalUrl[sd.Url] = sd;
                }
            }
        }

        public Resource? ResolveByCanonicalUri(string uri)
        {
            if (string.IsNullOrWhiteSpace(uri))
            {
                return null;
            }

            // Strip version suffix if present
            var canonicalWithoutVersion = uri.Split('|')[0];

            return _resourcesByCanonicalUrl.TryGetValue(canonicalWithoutVersion, out var resource)
                ? resource
                : null;
        }

        public Resource? ResolveByUri(string uri)
        {
            return ResolveByCanonicalUri(uri);
        }
    }
}
