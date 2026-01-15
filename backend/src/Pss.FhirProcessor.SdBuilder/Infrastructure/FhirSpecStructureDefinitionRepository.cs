using System.Threading;
using System.Threading.Tasks;
using Hl7.Fhir.Specification.Source;
using Hl7.Fhir.ElementModel;
using Hl7.Fhir.Serialization;
using Hl7.Fhir.Model;
using Pss.FhirProcessor.SdBuilder.Abstractions;

namespace Pss.FhirProcessor.SdBuilder.Infrastructure;

/// <summary>
/// Repository that loads base FHIR StructureDefinitions from Firely SDK ZipSource.
/// Used for SD Builder to access core FHIR specs.
/// 
/// WORKAROUND: R5 spec ZIP contains deprecated R4 elements (constraint.xpath) that trigger
/// StructuralTypeException. We fall back to HTTP fetch from official FHIR registry.
/// </summary>
public sealed class FhirSpecStructureDefinitionRepository : IStructureDefinitionRepository
{
    private readonly IAsyncResourceResolver _resolver;
    private readonly HttpClient _httpClient;
    private readonly FhirJsonParser _parser;
    private readonly Dictionary<string, StructureDefinition> _cache;

    public FhirSpecStructureDefinitionRepository()
    {
        _resolver = ZipSource.CreateValidationSource();
        _httpClient = new HttpClient
        {
            BaseAddress = new Uri("http://hl7.org/fhir/"),
            Timeout = TimeSpan.FromSeconds(10)
        };
        _parser = new FhirJsonParser(new ParserSettings
        {
            AcceptUnknownMembers = true,
            AllowUnrecognizedEnums = true
        });
        _cache = new Dictionary<string, StructureDefinition>();
    }

    /// <summary>
    /// Finds a StructureDefinition by canonical URL from FHIR spec.
    /// Falls back to HTTP if local ZIP source fails due to deprecated elements.
    /// </summary>
    public async System.Threading.Tasks.Task<object?> FindByUrlAsync(string url, CancellationToken ct)
    {
        // Check cache first
        if (_cache.TryGetValue(url, out var cached))
        {
            return cached;
        }

        // Try local ZipSource first
        try
        {
            var result = await _resolver.ResolveByCanonicalUriAsync(url);
            if (result is StructureDefinition sd)
            {
                _cache[url] = sd;
                return sd;
            }
        }
        catch (StructuralTypeException ex) when (ex.Message.Contains("unknown element"))
        {
            Console.WriteLine($"[FhirSpec] Local ZIP failed for {url}: {ex.Message}");
            Console.WriteLine($"[FhirSpec] Attempting HTTP fallback...");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[FhirSpec] Local ZIP failed for {url}: {ex.Message}");
        }

        // Fallback: Fetch from official FHIR registry
        try
        {
            var resourceName = url.Split('/').LastOrDefault();
            if (string.IsNullOrEmpty(resourceName))
            {
                Console.WriteLine($"[FhirSpec] Invalid URL format: {url}");
                return null;
            }

            var jsonUrl = $"StructureDefinition/{resourceName}.json";
            Console.WriteLine($"[FhirSpec] Fetching from HTTP: {_httpClient.BaseAddress}{jsonUrl}");
            
            var response = await _httpClient.GetAsync(jsonUrl, ct);
            
            if (!response.IsSuccessStatusCode)
            {
                Console.WriteLine($"[FhirSpec] HTTP fetch failed: {response.StatusCode}");
                return null;
            }

            var json = await response.Content.ReadAsStringAsync(ct);
            var sd = _parser.Parse<StructureDefinition>(json);
            
            Console.WriteLine($"[FhirSpec] Successfully fetched {url} from HTTP");
            _cache[url] = sd;
            return sd;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[FhirSpec] HTTP fallback failed for {url}: {ex.Message}");
            return null;
        }
    }
}
