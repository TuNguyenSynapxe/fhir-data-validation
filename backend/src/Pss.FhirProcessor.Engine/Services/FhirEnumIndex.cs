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

        // Get all common resource types
        var resourceTypes = GetCommonResourceTypes();

        foreach (var resourceType in resourceTypes)
        {
            try
            {
                var structureDefinition = _modelResolver.GetStructureDefinition(resourceType);
                if (structureDefinition?.Snapshot == null)
                {
                    _logger.LogDebug("No snapshot found for {ResourceType}", resourceType);
                    continue;
                }

                // Extract enum bindings from all elements
                foreach (var element in structureDefinition.Snapshot.Element)
                {
                    if (element.Binding == null || string.IsNullOrEmpty(element.Binding.ValueSet))
                    {
                        continue;
                    }

                    // Extract element name (last part of path)
                    var elementName = element.Path.Split('.').Last();
                    var key = $"{resourceType}.{elementName}";

                    // Get binding strength
                    var bindingStrength = element.Binding.Strength?.ToString() ?? "required";

                    // Try to extract codes from ValueSet
                    var allowedValues = ExtractCodesFromBinding(element.Binding, resourceType, elementName);

                    if (allowedValues.Count > 0)
                    {
                        var binding = new EnumBinding
                        {
                            AllowedValues = allowedValues,
                            BindingStrength = bindingStrength,
                            ValueSetUrl = element.Binding.ValueSet
                        };

                        versionCache.TryAdd(key, binding);
                        
                        _logger.LogDebug("Added enum binding for {Key}: {Count} values, strength={Strength}",
                            key, allowedValues.Count, bindingStrength);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error processing {ResourceType} for enum index", resourceType);
            }
        }

        _indexByVersion[fhirVersion] = versionCache;        _builtVersions[fhirVersion] = true;        
        _logger.LogInformation("Enum index built for FHIR {Version}: {Count} bindings", 
            fhirVersion, versionCache.Count);

        await System.Threading.Tasks.Task.CompletedTask;
    }

    /// <summary>
    /// Extracts codes from ElementDefinition.Binding.
    /// Uses well-known FHIR R4 bindings where possible.
    /// </summary>
    private List<string> ExtractCodesFromBinding(
        ElementDefinition.ElementDefinitionBindingComponent binding,
        string resourceType,
        string elementName)
    {
        // Phase B: Use well-known R4 enum values
        // In future phases, this could be enhanced to:
        // 1. Parse ValueSet from StructureDefinition contained resources
        // 2. Load ValueSet files from filesystem
        // 3. Call terminology server (if needed)

        var valueSetUrl = binding.ValueSet;

        // Map well-known ValueSets to codes
        return valueSetUrl switch
        {
            "http://hl7.org/fhir/ValueSet/administrative-gender" => 
                new List<string> { "male", "female", "other", "unknown" },
            
            "http://hl7.org/fhir/ValueSet/observation-status" => 
                new List<string> { "registered", "preliminary", "final", "amended", "corrected", "cancelled", "entered-in-error", "unknown" },
            
            "http://hl7.org/fhir/ValueSet/encounter-status" => 
                new List<string> { "planned", "arrived", "triaged", "in-progress", "onleave", "finished", "cancelled", "entered-in-error", "unknown" },
            
            "http://hl7.org/fhir/ValueSet/bundle-type" => 
                new List<string> { "document", "message", "transaction", "transaction-response", "batch", "batch-response", "history", "searchset", "collection" },
            
            "http://hl7.org/fhir/ValueSet/publication-status" => 
                new List<string> { "draft", "active", "retired", "unknown" },
            
            "http://hl7.org/fhir/ValueSet/request-status" => 
                new List<string> { "draft", "active", "on-hold", "revoked", "completed", "entered-in-error", "unknown" },
            
            "http://hl7.org/fhir/ValueSet/medication-request-status" => 
                new List<string> { "active", "on-hold", "cancelled", "completed", "entered-in-error", "stopped", "draft", "unknown" },
            
            "http://hl7.org/fhir/ValueSet/condition-clinical" => 
                new List<string> { "active", "recurrence", "relapse", "inactive", "remission", "resolved" },
            
            "http://hl7.org/fhir/ValueSet/allergyintolerance-clinical" => 
                new List<string> { "active", "inactive", "resolved" },
            
            "http://hl7.org/fhir/ValueSet/allergyintolerance-verification" => 
                new List<string> { "unconfirmed", "confirmed", "refuted", "entered-in-error" },

            _ => new List<string>() // Unknown ValueSet - no enum validation
        };
    }

    /// <summary>
    /// Returns list of common FHIR R4 resource types for indexing.
    /// </summary>
    private List<string> GetCommonResourceTypes()
    {
        return new List<string>
        {
            "Patient", "Observation", "Condition", "Procedure", "Medication",
            "MedicationRequest", "Encounter", "AllergyIntolerance", "Immunization",
            "DiagnosticReport", "Organization", "Practitioner", "PractitionerRole",
            "Location", "Coverage", "Claim", "CarePlan", "Goal", "ServiceRequest",
            "Specimen", "Device", "DocumentReference", "Bundle", "Composition",
            "Questionnaire", "QuestionnaireResponse"
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
