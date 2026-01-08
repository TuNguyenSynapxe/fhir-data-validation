using Hl7.Fhir.Model;
using Hl7.Fhir.Specification.Source;
using Microsoft.Extensions.Logging;

namespace Pss.FhirProcessor.Engine.Simplifier;

/// <summary>
/// Composite resource resolver for FHIR R5 validation.
/// 
/// Resolution order (first match wins):
/// 1. Simplifier package resources
/// 2. Core R5 specification (from Firely SDK)
/// 
/// Phase 2: NO ambiguity resolution, NO version guessing, NO internet downloads.
/// </summary>
public sealed class CompositeResourceResolver : IResourceResolver
{
    private readonly SimplifierPackage? _package;
    private readonly IResourceResolver _coreResolver;
    private readonly ILogger<CompositeResourceResolver> _logger;

    /// <summary>
    /// Creates a composite resolver with Simplifier package + core R5 spec.
    /// </summary>
    /// <param name="package">Simplifier package (optional - if null, only core R5 is used)</param>
    /// <param name="coreResolver">Core R5 specification resolver from Firely SDK</param>
    /// <param name="logger">Logger</param>
    public CompositeResourceResolver(
        SimplifierPackage? package,
        IResourceResolver coreResolver,
        ILogger<CompositeResourceResolver> logger)
    {
        _package = package;
        _coreResolver = coreResolver ?? throw new ArgumentNullException(nameof(coreResolver));
        _logger = logger;
    }

    public Resource? ResolveByCanonicalUri(string uri)
    {
        _logger.LogTrace("Resolving canonical URI: {Uri}", uri);

        // Step 1: Try package resources first
        if (_package != null)
        {
            var packageResource = ResolveFromPackage(uri);
            if (packageResource != null)
            {
                _logger.LogDebug("Resolved {Uri} from Simplifier package: {Type}", uri, packageResource.TypeName);
                return packageResource;
            }
        }

        // Step 2: Fall back to core R5 spec
        var coreResource = _coreResolver.ResolveByCanonicalUri(uri);
        if (coreResource != null)
        {
            _logger.LogDebug("Resolved {Uri} from core R5 spec: {Type}", uri, coreResource.TypeName);
            return coreResource;
        }

        _logger.LogWarning("Failed to resolve canonical URI: {Uri}", uri);
        return null;
    }

    public Resource? ResolveByUri(string uri)
    {
        // Delegate to ResolveByCanonicalUri - same logic applies
        return ResolveByCanonicalUri(uri);
    }

    private Resource? ResolveFromPackage(string uri)
    {
        if (_package == null)
        {
            return null;
        }

        // Strip version suffix if present (e.g., "url|1.0.0" -> "url")
        var canonicalUrl = StripVersion(uri);

        // Try StructureDefinition
        if (_package.StructureDefinitions.TryGetValue(canonicalUrl, out var sd))
        {
            return sd;
        }

        // Try ValueSet
        if (_package.ValueSets.TryGetValue(canonicalUrl, out var vs))
        {
            return vs;
        }

        // Try CodeSystem
        if (_package.CodeSystems.TryGetValue(canonicalUrl, out var cs))
        {
            return cs;
        }

        return null;
    }

    private static string StripVersion(string uri)
    {
        var pipeIndex = uri.IndexOf('|');
        return pipeIndex >= 0 ? uri.Substring(0, pipeIndex) : uri;
    }
}
