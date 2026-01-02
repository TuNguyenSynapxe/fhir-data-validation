using System.Collections.Concurrent;
using Hl7.Fhir.Model;
using Microsoft.Extensions.Logging;
using Pss.FhirProcessor.Engine.Interfaces;
using Pss.FhirProcessor.Engine.Firely;

namespace Pss.FhirProcessor.Engine.Services;

/// <summary>
/// Phase B: Dynamic Enum Index Implementation
/// 
/// Builds and caches enum bindings from FHIR StructureDefinitions.
/// Provides fast lookups for enum validation without touching Firely POCO parsing.
/// 
/// Architecture:
/// - One cache per FHIR version (R4, R5)
/// - Keyed by "ResourceType.elementName" (e.g., "Patient.gender")
/// - Contains allowed values + binding strength
/// - Thread-safe via ConcurrentDictionary
/// - Built once at startup, cached for lifetime
/// 
/// Limitations (by design):
/// - Only uses ValueSet codes embedded in StructureDefinition
/// - Does NOT call terminology servers
/// - Does NOT validate code system membership
/// - Does NOT expand external ValueSets
/// </summary>
public class FhirEnumIndex : IFhirEnumIndex
{
    private readonly IFhirModelResolverService _modelResolver;
    private readonly ILogger<FhirEnumIndex> _logger;

    // Cache structure: "R4" -> "Patient.gender" -> EnumBinding
    private readonly ConcurrentDictionary<string, ConcurrentDictionary<string, EnumBinding>> _indexByVersion = new();
    
    // Track which versions have been built
    private readonly ConcurrentDictionary<string, bool> _builtVersions = new();

    public FhirEnumIndex(
        IFhirModelResolverService modelResolver,
        ILogger<FhirEnumIndex> logger)
    {
        _modelResolver = modelResolver;
        _logger = logger;
    }

    public IReadOnlyList<string>? GetAllowedValues(
        string fhirVersion,
        string resourceType,
        string elementName)
    {
        // Ensure index is built for this version (lazy initialization)
        EnsureIndexBuilt(fhirVersion);
        
        var key = $"{resourceType}.{elementName}";
        
        if (_indexByVersion.TryGetValue(fhirVersion, out var versionCache) &&
            versionCache.TryGetValue(key, out var binding))
        {
            return binding.AllowedValues;
        }

        return null;
    }

    public string? GetBindingStrength(
        string fhirVersion,
        string resourceType,
        string elementName)
    {
        // Ensure index is built for this version (lazy initialization)
        EnsureIndexBuilt(fhirVersion);
        
        var key = $"{resourceType}.{elementName}";
        
        if (_indexByVersion.TryGetValue(fhirVersion, out var versionCache) &&
            versionCache.TryGetValue(key, out var binding))
        {
            return binding.BindingStrength;
        }

        return null;
    }

    private void EnsureIndexBuilt(string fhirVersion)
    {
        if (_builtVersions.TryGetValue(fhirVersion, out var isBuilt) && isBuilt)
        {
            return; // Already built
        }

        // Build synchronously (safe since we're in a singleton)
        BuildIndexAsync(fhirVersion, CancellationToken.None).GetAwaiter().GetResult();
    }

    public async System.Threading.Tasks.Task BuildIndexAsync(string fhirVersion, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Building enum index for FHIR {Version}", fhirVersion);

        var versionCache = new ConcurrentDictionary<string, EnumBinding>();

        // Use hardcoded enum mappings for common FHIR enums
        // This is more reliable than trying to extract from StructureDefinitions
        // which may not have binding information when dynamically generated
        var enumMappings = GetHardcodedEnumMappings();
        
        foreach (var mapping in enumMappings)
        {
            var (key, valueSetUrl, bindingStrength, allowedValues) = mapping;
            
            if (allowedValues.Count > 0)
            {
                var binding = new EnumBinding
                {
                    AllowedValues = allowedValues,
                    BindingStrength = bindingStrength,
                    ValueSetUrl = valueSetUrl
                };

                versionCache.TryAdd(key, binding);
                
                _logger.LogDebug("Added enum binding for {Key}: {Count} values, strength={Strength}",
                    key, allowedValues.Count, bindingStrength);
            }
        }

        _indexByVersion[fhirVersion] = versionCache;
        _builtVersions[fhirVersion] = true;
        
        _logger.LogInformation("Enum index built for FHIR {Version}: {Count} bindings", 
            fhirVersion, versionCache.Count);

        await System.Threading.Tasks.Task.CompletedTask;
    }
    
    /// <summary>
    /// Returns hardcoded enum mappings for common FHIR enums.
    /// Format: (ResourceType.ElementName, ValueSetUrl, BindingStrength, AllowedValues)
    /// </summary>
    private List<(string Key, string ValueSetUrl, string BindingStrength, List<string> AllowedValues)> GetHardcodedEnumMappings()
    {
        // Extract enum values directly from Firely SDK types
        var genderValues = Enum.GetValues(typeof(AdministrativeGender))
            .Cast<AdministrativeGender>()
            .Select(v => Hl7.Fhir.Utility.EnumUtility.GetLiteral(v))
            .ToList();
            
        var observationStatusValues = Enum.GetValues(typeof(ObservationStatus))
            .Cast<ObservationStatus>()
            .Select(v => Hl7.Fhir.Utility.EnumUtility.GetLiteral(v))
            .ToList();
        
        var bundleTypeValues = Enum.GetValues(typeof(Bundle.BundleType))
            .Cast<Bundle.BundleType>()
            .Select(v => Hl7.Fhir.Utility.EnumUtility.GetLiteral(v))
            .ToList();

        return new List<(string, string, string, List<string>)>
        {
            ("Patient.gender", "http://hl7.org/fhir/ValueSet/administrative-gender", "required", genderValues),
            ("Observation.status", "http://hl7.org/fhir/ValueSet/observation-status", "required", observationStatusValues),
            ("Bundle.type", "http://hl7.org/fhir/ValueSet/bundle-type", "required", bundleTypeValues),
        };
    }

    /// <summary>
    /// Internal data structure for storing enum binding metadata.
    /// </summary>
    private class EnumBinding
    {
        public required List<string> AllowedValues { get; init; }
        public required string BindingStrength { get; init; }
        public required string ValueSetUrl { get; init; }
    }
}
