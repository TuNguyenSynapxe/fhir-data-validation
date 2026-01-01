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
    /// Phase B.1: Dynamically extracts enum values from Firely SDK's ModelInfo.
    /// This uses the SDK's built-in knowledge of FHIR enumerations without requiring
    /// external ValueSet files or terminology servers.
    /// </summary>
    private List<string> ExtractCodesFromBinding(
        ElementDefinition.ElementDefinitionBindingComponent binding,
        string resourceType,
        string elementName)
    {
        var valueSetUrl = binding.ValueSet;
        if (string.IsNullOrEmpty(valueSetUrl))
        {
            return new List<string>();
        }

        // Try to extract enum values from Firely SDK's type information
        // The SDK includes enum definitions for standard FHIR value sets
        try
        {
            // For elements with enum bindings, Firely SDK provides the allowed values
            // through the StructureDefinition snapshot element constraints
            var structureDefinition = _modelResolver.GetStructureDefinition(resourceType);
            if (structureDefinition?.Snapshot == null)
            {
                return new List<string>();
            }

            // Find the element that matches our path
            var elementPath = $"{resourceType}.{elementName}";
            var element = structureDefinition.Snapshot.Element
                .FirstOrDefault(e => e.Path == elementPath);

            if (element?.Type == null || !element.Type.Any())
            {
                return new List<string>();
            }

            // For 'code' type elements, check if there's an enum constraint
            var codeType = element.Type.FirstOrDefault(t => t.Code == "code");
            if (codeType == null)
            {
                return new List<string>();
            }

            // Extract codes from fixed values or constraints if present
            // Firely SDK includes enum values in element constraints for required bindings
            var codes = new List<string>();

            // Check for fixed value pattern (less common but possible)
            if (element.Fixed != null)
            {
                if (element.Fixed is Code code && !string.IsNullOrEmpty(code.Value))
                {
                    codes.Add(code.Value);
                }
            }

            // Check for pattern constraints
            if (element.Pattern != null)
            {
                if (element.Pattern is Code code && !string.IsNullOrEmpty(code.Value))
                {
                    codes.Add(code.Value);
                }
            }

            // For most FHIR enums, we rely on the SDK's internal enum types
            // Try to find the corresponding C# enum type in the SDK
            var fhirTypeName = GetFhirEnumTypeName(resourceType, elementName, valueSetUrl);
            if (!string.IsNullOrEmpty(fhirTypeName))
            {
                codes = GetEnumValuesFromFirelyType(fhirTypeName);
            }

            return codes;
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Could not extract enum values for {ResourceType}.{ElementName}", resourceType, elementName);
            return new List<string>();
        }
    }

    /// <summary>
    /// Maps FHIR ValueSet URLs to Firely SDK enum type names.
    /// </summary>
    private string? GetFhirEnumTypeName(string resourceType, string elementName, string valueSetUrl)
    {
        // Map well-known ValueSet URLs to their Firely SDK enum type names
        return valueSetUrl switch
        {
            "http://hl7.org/fhir/ValueSet/administrative-gender" => "Hl7.Fhir.Model.AdministrativeGender",
            "http://hl7.org/fhir/ValueSet/observation-status" => "Hl7.Fhir.Model.ObservationStatus",
            "http://hl7.org/fhir/ValueSet/encounter-status" => "Hl7.Fhir.Model.Encounter+EncounterStatus",
            "http://hl7.org/fhir/ValueSet/bundle-type" => "Hl7.Fhir.Model.Bundle+BundleType",
            "http://hl7.org/fhir/ValueSet/publication-status" => "Hl7.Fhir.Model.PublicationStatus",
            "http://hl7.org/fhir/ValueSet/request-status" => "Hl7.Fhir.Model.RequestStatus",
            "http://hl7.org/fhir/ValueSet/medication-request-status" => "Hl7.Fhir.Model.MedicationRequest+MedicationrequestStatus",
            "http://hl7.org/fhir/ValueSet/condition-clinical" => "Hl7.Fhir.Model.Condition+ConditionClinicalStatusCodes",
            "http://hl7.org/fhir/ValueSet/allergyintolerance-clinical" => "Hl7.Fhir.Model.AllergyIntolerance+AllergyIntoleranceClinicalStatus",
            "http://hl7.org/fhir/ValueSet/allergyintolerance-verification" => "Hl7.Fhir.Model.AllergyIntolerance+AllergyIntoleranceVerificationStatus",
            _ => null
        };
    }

    /// <summary>
    /// Extracts enum string values from a Firely SDK enum type using reflection.
    /// </summary>
    private List<string> GetEnumValuesFromFirelyType(string typeName)
    {
        try
        {
            // Get the type from Firely SDK assembly
            var type = Type.GetType(typeName);
            if (type == null || !type.IsEnum)
            {
                return new List<string>();
            }

            // Use reflection to call EnumUtility.GetLiteral<T> for the correct enum type
            var enumUtilityType = typeof(Hl7.Fhir.Utility.EnumUtility);
            var getLiteralMethod = enumUtilityType.GetMethod("GetLiteral", new[] { type });
            
            if (getLiteralMethod == null)
            {
                // Fallback: convert enum names to lowercase-with-dashes
                var names = Enum.GetNames(type);
                return names.Select(ConvertEnumNameToFhirCode).ToList();
            }

            // Get all enum values and convert to FHIR code strings
            var values = Enum.GetValues(type);
            var codes = new List<string>();

            foreach (var value in values)
            {
                try
                {
                    // Call GetLiteral<T>(value) via reflection
                    var code = getLiteralMethod.Invoke(null, new[] { value }) as string;
                    if (!string.IsNullOrEmpty(code))
                    {
                        codes.Add(code);
                    }
                }
                catch
                {
                    // Fallback: convert enum name to FHIR code format
                    var enumName = value.ToString();
                    if (enumName != null)
                    {
                        codes.Add(ConvertEnumNameToFhirCode(enumName));
                    }
                }
            }

            return codes;
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Could not extract enum values from type {TypeName}", typeName);
            return new List<string>();
        }
    }

    /// <summary>
    /// Converts a C# enum name to FHIR code format.
    /// Example: "InProgress" -> "in-progress", "EnteredInError" -> "entered-in-error"
    /// </summary>
    private string ConvertEnumNameToFhirCode(string enumName)
    {
        if (string.IsNullOrEmpty(enumName))
        {
            return enumName;
        }

        // Convert PascalCase to lowercase-with-dashes
        var result = new System.Text.StringBuilder();
        for (int i = 0; i < enumName.Length; i++)
        {
            var ch = enumName[i];
            if (i > 0 && char.IsUpper(ch))
            {
                result.Append('-');
            }
            result.Append(char.ToLowerInvariant(ch));
        }

        return result.ToString();
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
