using Pss.FhirProcessor.Terminology.Domain;
using Pss.FhirProcessor.Terminology.Utils;

namespace Pss.FhirProcessor.Terminology.Sources.Hl7;

/// <summary>
/// HL7 R5 ValueSet registry with embedded JSON resources.
/// 
/// ARCHITECTURE:
/// - Immutable in-memory registry loaded from embedded JSON
/// - Canonical URL normalization (strips |version for lookup)
/// - CodeSystem → ValueSet resolution for compose-based expansions
/// - Deterministic ordering
/// - No Firely SDK dependencies
/// - No runtime network calls
/// 
/// IMPLEMENTATION:
/// - Loads hl7-r5-codesystems.json, hl7-r5-valuesets.json, hl7-r5-index.json
/// - Supports ExplicitCodes and ComposeIncludes expansion strategies
/// - Version metadata preserved but not used for lookup
/// </summary>
internal sealed class Hl7R5RegistryV2
{
    private readonly IReadOnlyDictionary<string, CodeSystemRegistryEntry> _codeSystems;
    private readonly IReadOnlyDictionary<string, ValueSetRegistryEntry> _valueSets;
    private readonly IReadOnlyList<IndexEntry> _index;
    
    public Hl7R5RegistryV2()
    {
        _codeSystems = RegistryLoader.LoadCodeSystems();
        _valueSets = RegistryLoader.LoadValueSets();
        _index = RegistryLoader.LoadIndex();
    }
    
    #region Search
    
    /// <summary>
    /// Search ValueSets by name, title, publisher, or description.
    /// Uses pre-built search index for performance.
    /// </summary>
    public IReadOnlyList<ValueSetSummary> SearchValueSets(string? query)
    {
        var results = _index.Where(e => e.ResourceType == "ValueSet").AsEnumerable();
        
        if (!string.IsNullOrWhiteSpace(query))
        {
            var queryLower = query.ToLowerInvariant();
            results = results.Where(idx =>
                idx.Name.Contains(queryLower, StringComparison.OrdinalIgnoreCase) ||
                (idx.Title?.Contains(queryLower, StringComparison.OrdinalIgnoreCase) ?? false) ||
                (idx.Publisher?.Contains(queryLower, StringComparison.OrdinalIgnoreCase) ?? false) ||
                (idx.Description?.Contains(queryLower, StringComparison.OrdinalIgnoreCase) ?? false));
        }
        
        return results.Select(idx => new ValueSetSummary
        {
            Url = idx.Url,
            Name = idx.Name,
            Publisher = idx.Publisher ?? "Unknown",
            Description = idx.Description
        }).ToList();
    }
    
    #endregion
    
    #region Existence Check
    
    /// <summary>
    /// Check if a ValueSet exists (canonical normalization applied).
    /// </summary>
    public bool ContainsValueSet(string canonicalUrl)
    {
        var identity = CanonicalParser.GetIdentity(canonicalUrl);
        return _valueSets.ContainsKey(identity);
    }
    
    #endregion
    
    #region Preview
    
    /// <summary>
    /// Preview a ValueSet by expanding its codes (up to maxItems).
    /// Applies canonical normalization, resolves compose includes from CodeSystems.
    /// </summary>
    public ValueSetPreview? PreviewValueSet(string canonicalUrl, int maxItems)
    {
        var identity = CanonicalParser.GetIdentity(canonicalUrl);
        
        if (!_valueSets.TryGetValue(identity, out var valueSet))
        {
            return null;
        }
        
        var codes = ExpandValueSet(valueSet, maxItems);
        
        return new ValueSetPreview
        {
            Url = valueSet.Url,
            Name = valueSet.Name,
            Codes = codes
        };
    }
    
    #endregion
    
    #region Expansion
    
    private IReadOnlyList<ValueSetCode> ExpandValueSet(ValueSetRegistryEntry valueSet, int maxItems)
    {
        return valueSet.ExpansionStrategy switch
        {
            ExpansionStrategyType.ExplicitCodes => ExpandFromExplicitCodes(valueSet, maxItems),
            ExpansionStrategyType.ComposeIncludes => ExpandFromComposeIncludes(valueSet, maxItems),
            ExpansionStrategyType.Unsupported => Array.Empty<ValueSetCode>(),
            _ => Array.Empty<ValueSetCode>()
        };
    }
    
    private IReadOnlyList<ValueSetCode> ExpandFromExplicitCodes(ValueSetRegistryEntry valueSet, int maxItems)
    {
        if (valueSet.ExplicitCodes == null || valueSet.ExplicitCodes.Count == 0)
        {
            return Array.Empty<ValueSetCode>();
        }
        
        return valueSet.ExplicitCodes
            .Take(maxItems)
            .Select(c => new ValueSetCode
            {
                Code = c.Code,
                Display = c.Display
            })
            .ToList();
    }
    
    private IReadOnlyList<ValueSetCode> ExpandFromComposeIncludes(ValueSetRegistryEntry valueSet, int maxItems)
    {
        if (valueSet.ComposeIncludes == null || valueSet.ComposeIncludes.Count == 0)
        {
            return Array.Empty<ValueSetCode>();
        }
        
        var allCodes = new List<ValueSetCode>();
        
        foreach (var include in valueSet.ComposeIncludes)
        {
            var systemIdentity = CanonicalParser.GetIdentity(include.System);
            
            if (!_codeSystems.TryGetValue(systemIdentity, out var codeSystem))
            {
                continue; // CodeSystem not found - skip
            }
            
            if (include.IncludeAll)
            {
                // Include all concepts from CodeSystem
                allCodes.AddRange(codeSystem.Concepts.Select(c => new ValueSetCode
                {
                    Code = c.Code,
                    Display = c.Display
                }));
            }
            else if (include.Concepts != null)
            {
                // Include specific concepts only
                foreach (var conceptCode in include.Concepts)
                {
                    var concept = codeSystem.Concepts.FirstOrDefault(c => c.Code == conceptCode);
                    if (concept != null)
                    {
                        allCodes.Add(new ValueSetCode
                        {
                            Code = concept.Code,
                            Display = concept.Display
                        });
                    }
                }
            }
            
            // Stop if we've collected enough codes
            if (allCodes.Count >= maxItems)
            {
                break;
            }
        }
        
        return allCodes.Take(maxItems).ToList();
    }
    
    #endregion
}
