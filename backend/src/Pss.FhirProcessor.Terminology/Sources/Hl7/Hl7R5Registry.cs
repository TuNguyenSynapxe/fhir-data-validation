using Pss.FhirProcessor.Terminology.Domain;

namespace Pss.FhirProcessor.Terminology.Sources.Hl7;

/// <summary>
/// HL7 R5 ValueSet registry (delegates to Hl7R5RegistryV2).
/// </summary>
internal sealed class Hl7R5Registry
{
    private readonly Hl7R5RegistryV2 _registry;
    
    public Hl7R5Registry()
    {
        _registry = new Hl7R5RegistryV2();
    }
    
    public IReadOnlyList<ValueSetSummary> Search(string? query)
    {
        return _registry.SearchValueSets(query);
    }
    
    public bool Contains(string url)
    {
        return _registry.ContainsValueSet(url);
    }
    
    public ValueSetPreview? Preview(string url, int maxItems)
    {
        return _registry.PreviewValueSet(url, maxItems);
    }
}
