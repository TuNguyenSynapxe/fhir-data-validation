using Pss.FhirProcessor.Terminology.Abstractions;
using Pss.FhirProcessor.Terminology.Domain;

namespace Pss.FhirProcessor.Terminology.Engine;

/// <summary>
/// Core terminology orchestration engine.
/// Aggregates multiple ValueSet sources with layer-based precedence.
/// No Firely references - delegates to adapters.
/// </summary>
public sealed class TerminologyService : ITerminologyService
{
    private readonly IReadOnlyList<IValueSetSource> _sources;
    
    public TerminologyService(IEnumerable<IValueSetSource> sources)
    {
        // Order sources by layer descending (highest priority first)
        _sources = sources
            .OrderByDescending(s => s.Layer)
            .ToList();
    }
    
    /// <summary>
    /// Search across all sources, merge results, deduplicate by URL.
    /// Higher-priority sources take precedence for duplicate URLs.
    /// Results sorted deterministically by Name then URL.
    /// </summary>
    public async Task<IReadOnlyList<ValueSetSummary>> SearchAsync(
        ValueSetSearchRequest request,
        CancellationToken cancellationToken = default)
    {
        // Gather results from all sources in parallel
        var searchTasks = _sources
            .Select(source => source.SearchAsync(request, cancellationToken))
            .ToList();
        
        var allResults = await Task.WhenAll(searchTasks);
        
        // Flatten and deduplicate by URL (first occurrence wins = highest priority)
        var deduplicated = allResults
            .SelectMany(results => results)
            .GroupBy(vs => vs.Url)
            .Select(group => group.First())
            .OrderBy(vs => vs.Name)
            .ThenBy(vs => vs.Url)
            .ToList();
        
        return deduplicated;
    }
    
    /// <summary>
    /// Preview from first source that has the ValueSet.
    /// Sources are already ordered by priority.
    /// </summary>
    public async Task<ValueSetPreview?> PreviewAsync(
        string url,
        int maxItems = 50,
        CancellationToken cancellationToken = default)
    {
        foreach (var source in _sources)
        {
            var preview = await source.PreviewAsync(url, maxItems, cancellationToken);
            if (preview != null)
            {
                return preview;
            }
        }
        
        return null;
    }
    
    /// <summary>
    /// Check if ValueSet exists in any source.
    /// </summary>
    public async Task<bool> ExistsAsync(
        string url,
        CancellationToken cancellationToken = default)
    {
        foreach (var source in _sources)
        {
            if (await source.ExistsAsync(url, cancellationToken))
            {
                return true;
            }
        }
        
        return false;
    }
}
