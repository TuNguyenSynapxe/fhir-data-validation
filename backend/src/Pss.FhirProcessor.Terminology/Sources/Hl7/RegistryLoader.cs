using System.Reflection;
using System.Text.Json;

namespace Pss.FhirProcessor.Terminology.Sources.Hl7;

/// <summary>
/// Loads HL7 R5 registry from embedded JSON resources.
/// </summary>
internal static class RegistryLoader
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        Converters = { new System.Text.Json.Serialization.JsonStringEnumConverter() }
    };

    public static Dictionary<string, CodeSystemRegistryEntry> LoadCodeSystems()
    {
        var json = LoadEmbeddedResource("hl7-r5-codesystems.json");
        var dictionary = JsonSerializer.Deserialize<Dictionary<string, CodeSystemRegistryEntry>>(json, JsonOptions);
        return dictionary ?? new Dictionary<string, CodeSystemRegistryEntry>();
    }

    public static Dictionary<string, ValueSetRegistryEntry> LoadValueSets()
    {
        var json = LoadEmbeddedResource("hl7-r5-valuesets.json");
        var dictionary = JsonSerializer.Deserialize<Dictionary<string, ValueSetRegistryEntry>>(json, JsonOptions);
        return dictionary ?? new Dictionary<string, ValueSetRegistryEntry>();
    }

    public static List<IndexEntry> LoadIndex()
    {
        var json = LoadEmbeddedResource("hl7-r5-index.json");
        var list = JsonSerializer.Deserialize<List<IndexEntry>>(json, JsonOptions);
        return list ?? new List<IndexEntry>();
    }

    private static string LoadEmbeddedResource(string fileName)
    {
        var assembly = Assembly.GetExecutingAssembly();
        var resourceName = $"Pss.FhirProcessor.Terminology.Registry.{fileName}";

        using var stream = assembly.GetManifestResourceStream(resourceName);
        if (stream == null)
        {
            throw new FileNotFoundException($"Embedded resource not found: {resourceName}");
        }

        using var reader = new StreamReader(stream);
        return reader.ReadToEnd();
    }
}

/// <summary>
/// Serializable CodeSystem entry from registry JSON.
/// </summary>
internal sealed class CodeSystemRegistryEntry
{
    public required string Url { get; init; }
    public string? Version { get; init; }
    public required string Name { get; init; }
    public string? Title { get; init; }
    public string? Description { get; init; }
    public string? Publisher { get; init; }
    public required List<ConceptEntry> Concepts { get; init; }
}

/// <summary>
/// Serializable Concept entry from registry JSON.
/// </summary>
internal sealed class ConceptEntry
{
    public required string Code { get; init; }
    public string? Display { get; init; }
}

/// <summary>
/// Serializable ValueSet entry from registry JSON.
/// </summary>
internal sealed class ValueSetRegistryEntry
{
    public required string Url { get; init; }
    public string? Version { get; init; }
    public required string Name { get; init; }
    public string? Title { get; init; }
    public string? Description { get; init; }
    public string? Publisher { get; init; }
    public required ExpansionStrategyType ExpansionStrategy { get; init; }
    public required ValueSetCapabilityType Capability { get; init; }
    public List<ExplicitCodeEntry>? ExplicitCodes { get; init; }
    public List<ComposeIncludeEntry>? ComposeIncludes { get; init; }
}

internal enum ExpansionStrategyType
{
    ExplicitCodes,
    ComposeIncludes,
    Unsupported
}

internal enum ValueSetCapabilityType
{
    Previewable,
    ExternalSystem,
    Computed
}

internal sealed class ExplicitCodeEntry
{
    public string? System { get; init; }
    public required string Code { get; init; }
    public string? Display { get; init; }
}

internal sealed class ComposeIncludeEntry
{
    public required string System { get; init; }
    public bool IncludeAll { get; init; }
    public List<string>? Concepts { get; init; }
}

/// <summary>
/// Serializable search index entry from registry JSON.
/// </summary>
internal sealed class IndexEntry
{
    public required string Url { get; init; }
    public required string ResourceType { get; init; }
    public required string Name { get; init; }
    public string? Title { get; init; }
    public string? Publisher { get; init; }
    public string? Description { get; init; }
}
