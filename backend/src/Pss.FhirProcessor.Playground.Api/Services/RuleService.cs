using System.Text.Json;
using Hl7.Fhir.Model;
using Hl7.Fhir.Serialization;
using Pss.FhirProcessor.Engine.Models;
using Pss.FhirProcessor.Playground.Api.Models;

namespace Pss.FhirProcessor.Playground.Api.Services;

/// <summary>
/// Service for rule management (observed terminology, bulk creation)
/// </summary>
public class RuleService : IRuleService
{
    private readonly IProjectService _projectService;
    private readonly ILogger<RuleService> _logger;
    private readonly FhirJsonParser _fhirParser;

    public RuleService(
        IProjectService projectService,
        ILogger<RuleService> logger)
    {
        _projectService = projectService;
        _logger = logger;
        _fhirParser = new FhirJsonParser();
    }

    /// <summary>
    /// Extract observed terminology values from sample bundle
    /// </summary>
    public async Task<ObservedTerminologyResponse> GetObservedTerminologyAsync(Guid projectId)
    {
        var project = await _projectService.GetProjectAsync(projectId);
        
        if (project == null)
            throw new InvalidOperationException($"Project {projectId} not found");
        
        if (string.IsNullOrWhiteSpace(project.SampleBundleJson))
            return new ObservedTerminologyResponse();

        try
        {
            var bundle = _fhirParser.Parse<Bundle>(project.SampleBundleJson);
            return ExtractObservedTerminology(bundle);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to parse sample bundle for project {ProjectId}", projectId);
            return new ObservedTerminologyResponse();
        }
    }

    /// <summary>
    /// Extract terminology values from bundle - simplified approach
    /// </summary>
    private ObservedTerminologyResponse ExtractObservedTerminology(Bundle bundle)
    {
        var response = new ObservedTerminologyResponse();
        var systemCounts = new Dictionary<string, Dictionary<string, int>>();
        var codeCounts = new Dictionary<string, Dictionary<string, int>>();

        if (bundle.Entry == null)
            return response;

        // Extract codings from each resource
        foreach (var entry in bundle.Entry)
        {
            if (entry.Resource == null)
                continue;

            var resourceType = entry.Resource.TypeName;
            
            // Find all CodeableConcept elements
            if (entry.Resource is DomainResource domainResource)
            {
                ExtractCodingsFromElement(domainResource, resourceType, systemCounts, codeCounts);
            }
        }

        // Convert to response format
        foreach (var (path, values) in systemCounts)
        {
            response.ObservedValues[path] = values
                .Select(kvp => new ObservedValue { Value = kvp.Key, Count = kvp.Value })
                .OrderByDescending(v => v.Count)
                .ThenBy(v => v.Value)
                .ToList();
        }

        foreach (var (path, values) in codeCounts)
        {
            response.ObservedValues[path] = values
                .Select(kvp => new ObservedValue { Value = kvp.Key, Count = kvp.Value })
                .OrderByDescending(v => v.Count)
                .ThenBy(v => v.Value)
                .ToList();
        }

        return response;
    }

    /// <summary>
    /// Recursively extract codings from FHIR element
    /// </summary>
    private void ExtractCodingsFromElement(
        Base element,
        string path,
        Dictionary<string, Dictionary<string, int>> systemCounts,
        Dictionary<string, Dictionary<string, int>> codeCounts)
    {
        if (element == null)
            return;

        // Check if this is a Coding element
        if (element is Coding coding)
        {
            // Track system
            if (!string.IsNullOrWhiteSpace(coding.System))
            {
                var systemPath = $"{path}.system";
                if (!systemCounts.ContainsKey(systemPath))
                    systemCounts[systemPath] = new Dictionary<string, int>();
                
                if (!systemCounts[systemPath].ContainsKey(coding.System))
                    systemCounts[systemPath][coding.System] = 0;
                
                systemCounts[systemPath][coding.System]++;
            }

            // Track code
            if (!string.IsNullOrWhiteSpace(coding.Code))
            {
                var codePath = $"{path}.code";
                if (!codeCounts.ContainsKey(codePath))
                    codeCounts[codePath] = new Dictionary<string, int>();
                
                if (!codeCounts[codePath].ContainsKey(coding.Code))
                    codeCounts[codePath][coding.Code] = 0;
                
                codeCounts[codePath][coding.Code]++;
            }
            return;
        }

        // Check if this is a CodeableConcept
        if (element is CodeableConcept codeableConcept && codeableConcept.Coding != null)
        {
            foreach (var codingElement in codeableConcept.Coding)
            {
                ExtractCodingsFromElement(codingElement, $"{path}.coding", systemCounts, codeCounts);
            }
            return;
        }

        // Recursively process all child elements
        try
        {
            var properties = element.GetType().GetProperties();
            foreach (var property in properties)
            {
                // Skip non-FHIR properties
                if (property.Name == "TypeName" || property.Name == "Children")
                    continue;

                var value = property.GetValue(element);
                if (value == null)
                    continue;

                var propertyName = char.ToLower(property.Name[0]) + property.Name.Substring(1);
                var childPath = $"{path}.{propertyName}";

                // Handle lists
                if (value is System.Collections.IEnumerable enumerable && !(value is string))
                {
                    foreach (var item in enumerable)
                    {
                        if (item is Base baseItem)
                        {
                            ExtractCodingsFromElement(baseItem, childPath, systemCounts, codeCounts);
                        }
                    }
                }
                // Handle single Base objects
                else if (value is Base baseValue)
                {
                    ExtractCodingsFromElement(baseValue, childPath, systemCounts, codeCounts);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Error extracting codings from {Path}", path);
        }
    }

    /// <summary>
    /// Create rules in bulk from intents
    /// </summary>
    public async Task<BulkCreateRulesResponse> BulkCreateRulesAsync(Guid projectId, BulkCreateRulesRequest request)
    {
        var project = await _projectService.GetProjectAsync(projectId);
        
        if (project == null)
            throw new InvalidOperationException($"Project {projectId} not found");

        var response = new BulkCreateRulesResponse();
        
        // Load existing rules
        var existingRules = LoadExistingRules(project.RulesJson);

        // Process each intent
        for (int i = 0; i < request.Intents.Count; i++)
        {
            var intent = request.Intents[i];
            
            try
            {
                // Validate intent
                var validationError = ValidateIntent(intent);
                if (validationError != null)
                {
                    response.Errors.Add(new RuleCreationError
                    {
                        Index = i,
                        Path = intent.Path,
                        Reason = validationError
                    });
                    continue;
                }

                // Check for duplicates
                if (IsDuplicateRule(existingRules, intent))
                {
                    response.Errors.Add(new RuleCreationError
                    {
                        Index = i,
                        Path = intent.Path,
                        Reason = $"Rule already exists for path {intent.Path} with type {intent.Type}"
                    });
                    continue;
                }

                // Create rule
                var rule = CreateRuleFromIntent(intent);
                response.Created.Add(rule);
                existingRules.Add(rule);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating rule from intent {Index}", i);
                response.Errors.Add(new RuleCreationError
                {
                    Index = i,
                    Path = intent.Path,
                    Reason = $"Internal error: {ex.Message}"
                });
            }
        }

        // Persist rules if any were created
        if (response.Created.Count > 0)
        {
            var updatedRulesJson = SerializeRules(existingRules);
            await _projectService.UpdateRulesAsync(projectId, updatedRulesJson);
        }

        return response;
    }

    /// <summary>
    /// Validate a rule intent
    /// </summary>
    private string? ValidateIntent(RuleIntent intent)
    {
        if (string.IsNullOrWhiteSpace(intent.Path))
            return "Path is required";

        if (string.IsNullOrWhiteSpace(intent.ResourceType))
            return "ResourceType is required";

        switch (intent.Type)
        {
            case "REQUIRED":
                // No additional validation needed
                break;

            case "ARRAY_LENGTH":
                var arrayParams = DeserializeParams<ArrayLengthParams>(intent.Params);
                if (arrayParams == null)
                    return "Array length params are required";

                if (arrayParams.Min.HasValue && arrayParams.Min < 0)
                    return "Min must be >= 0";

                if (arrayParams.Max.HasValue && arrayParams.Max < 0)
                    return "Max must be >= 0";

                if (arrayParams.Min.HasValue && arrayParams.Max.HasValue && arrayParams.Max < arrayParams.Min)
                    return "Max must be >= Min";

                if (!arrayParams.Min.HasValue && !arrayParams.Max.HasValue && !arrayParams.NonEmpty.HasValue)
                    return "At least one constraint (min, max, or nonEmpty) must be set";
                break;

            case "CODE_SYSTEM":
                var codeSystemParams = DeserializeParams<CodeSystemParams>(intent.Params);
                if (codeSystemParams == null || string.IsNullOrWhiteSpace(codeSystemParams.System))
                    return "Code system URI must be specified";
                break;

            case "ALLOWED_CODES":
                var allowedCodesParams = DeserializeParams<AllowedCodesParams>(intent.Params);
                if (allowedCodesParams == null || allowedCodesParams.Codes == null || allowedCodesParams.Codes.Count == 0)
                    return "At least one allowed code must be specified";

                if (allowedCodesParams.Codes.Any(c => string.IsNullOrWhiteSpace(c)))
                    return "Allowed codes cannot be empty";
                break;

            default:
                return $"Unknown intent type: {intent.Type}";
        }

        return null;
    }

    /// <summary>
    /// Check if rule already exists (Phase 2A-4: FieldPath + InstanceScope identity)
    /// Two rules are duplicates if they have:
    /// - Same Type
    /// - Same FieldPath
    /// - Same InstanceScope (structural equality via RuleIdentity)
    /// </summary>
    private bool IsDuplicateRule(List<DraftRule> existingRules, RuleIntent intent)
    {
        var ruleType = MapIntentTypeToRuleType(intent.Type);
        
        // Phase 2A-4: Use FieldPath + InstanceScope for duplicate detection
        // Skip rules without FieldPath (legacy rules)
        if (string.IsNullOrWhiteSpace(intent.FieldPath))
            return false;
        
        // Phase 2A-4: Use centralized identity helper
        var intentIdentityKey = RuleIdentity.GetIdentityKey(ruleType, intent.FieldPath, intent.InstanceScope);
        
        return existingRules.Any(r =>
        {
            if (string.IsNullOrWhiteSpace(r.FieldPath))
                return false;
                
            var existingIdentityKey = RuleIdentity.GetIdentityKey(r.Type, r.FieldPath, r.InstanceScope);
            return existingIdentityKey == intentIdentityKey;
        });
    }
    
    /// <summary>
    /// Create a rule entity from intent (Phase 2A-4: Copy FieldPath + InstanceScope)
    /// </summary>
    private DraftRule CreateRuleFromIntent(RuleIntent intent)
    {
        var rule = new DraftRule
        {
            Id = Guid.NewGuid().ToString(),
            Type = MapIntentTypeToRuleType(intent.Type),
            ResourceType = intent.ResourceType,
            Path = intent.Path, // Legacy field (optional)
            FieldPath = intent.FieldPath, // Phase 2A-4: Copy structured field
            InstanceScope = intent.InstanceScope, // Phase 2A-4: Copy scope
            Severity = "error",
            Status = "draft",
            Message = GenerateMessage(intent),
            Params = intent.Params
        };

        return rule;
    }

    /// <summary>
    /// Map intent type to rule type
    /// </summary>
    private string MapIntentTypeToRuleType(string intentType)
    {
        return intentType switch
        {
            "REQUIRED" => "Required",
            "ARRAY_LENGTH" => "ArrayLength",
            "CODE_SYSTEM" => "CodeSystem",
            "ALLOWED_CODES" => "AllowedCodes",
            _ => intentType
        };
    }

    /// <summary>
    /// Generate message from intent using templates
    /// </summary>
    private string GenerateMessage(RuleIntent intent)
    {
        switch (intent.Type)
        {
            case "REQUIRED":
                return $"{intent.Path} is required.";

            case "ARRAY_LENGTH":
                var arrayParams = DeserializeParams<ArrayLengthParams>(intent.Params);
                if (arrayParams == null)
                    return $"{intent.Path} array length constraint.";

                var parts = new List<string>();

                if (arrayParams.Min.HasValue && arrayParams.Max.HasValue)
                {
                    parts.Add($"must contain between {arrayParams.Min} and {arrayParams.Max} items");
                }
                else if (arrayParams.Min.HasValue)
                {
                    var itemWord = arrayParams.Min == 1 ? "item" : "items";
                    parts.Add($"must contain at least {arrayParams.Min} {itemWord}");
                }
                else if (arrayParams.Max.HasValue)
                {
                    var itemWord = arrayParams.Max == 1 ? "item" : "items";
                    parts.Add($"must contain at most {arrayParams.Max} {itemWord}");
                }

                if (arrayParams.NonEmpty == true)
                {
                    parts.Add("all items must be non-empty");
                }

                return $"{intent.Path} {string.Join(", ", parts)}.";

            case "CODE_SYSTEM":
                var codeSystemParams = DeserializeParams<CodeSystemParams>(intent.Params);
                if (codeSystemParams == null)
                    return $"{intent.Path} code system constraint.";

                return $"{intent.Path} must use code system: {codeSystemParams.System}";

            case "ALLOWED_CODES":
                var allowedCodesParams = DeserializeParams<AllowedCodesParams>(intent.Params);
                if (allowedCodesParams == null || allowedCodesParams.Codes == null)
                    return $"{intent.Path} allowed codes constraint.";

                return $"{intent.Path} must be one of: {string.Join(", ", allowedCodesParams.Codes)}";

            default:
                return $"{intent.Path} constraint.";
        }
    }

    /// <summary>
    /// Deserialize params to specific type
    /// </summary>
    private T? DeserializeParams<T>(object? paramsObj) where T : class
    {
        if (paramsObj == null)
            return null;

        try
        {
            var json = JsonSerializer.Serialize(paramsObj);
            return JsonSerializer.Deserialize<T>(json, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to deserialize params to {Type}", typeof(T).Name);
            return null;
        }
    }

    /// <summary>
    /// Load existing rules from JSON
    /// </summary>
    private List<DraftRule> LoadExistingRules(string? rulesJson)
    {
        if (string.IsNullOrWhiteSpace(rulesJson))
            return new List<DraftRule>();

        try
        {
            var rulesContainer = JsonSerializer.Deserialize<RulesContainer>(rulesJson, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            return rulesContainer?.Rules ?? new List<DraftRule>();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to deserialize existing rules");
            return new List<DraftRule>();
        }
    }

    /// <summary>
    /// Serialize rules to JSON
    /// </summary>
    private string SerializeRules(List<DraftRule> rules)
    {
        var container = new RulesContainer
        {
            Version = "1.0",
            FhirVersion = "R4",
            Rules = rules
        };

        return JsonSerializer.Serialize(container, new JsonSerializerOptions
        {
            WriteIndented = true,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        });
    }

    /// <summary>
    /// Container for rules JSON structure
    /// </summary>
    private class RulesContainer
    {
        public string Version { get; set; } = "1.0";
        public string FhirVersion { get; set; } = "R4";
        public List<DraftRule> Rules { get; set; } = new();
    }
}
