using System.Text.Json;
using System.Text.RegularExpressions;
using Hl7.Fhir.Model;
using Hl7.FhirPath;
using Hl7.Fhir.Serialization;
using Hl7.Fhir.ElementModel;
using Microsoft.Extensions.Logging;
using Pss.FhirProcessor.Engine.Models;
using Pss.FhirProcessor.Engine.Firely;
using Pss.FhirProcessor.Engine.Services;
using Pss.FhirProcessor.Engine.Validation;
using Pss.FhirProcessor.Engine.Interfaces;

namespace Pss.FhirProcessor.Engine.RuleEngines;

/// <summary>
/// Evaluates FHIRPath-based business rules as per docs/03_rule_dsl_spec.md
/// Uses FHIR R4 specification
/// </summary>
public class FhirPathRuleEngine : IFhirPathRuleEngine
{
    private readonly FhirPathCompiler _compiler;
    private readonly ILogger<FhirPathRuleEngine> _logger;
    private readonly ITerminologyService _terminologyService;
    private readonly IResourceSelector _resourceSelector;
    private readonly IFieldPathValidator _fieldPathValidator;
    
    public FhirPathRuleEngine(
        IFhirModelResolverService modelResolver, 
        ILogger<FhirPathRuleEngine> logger, 
        ITerminologyService terminologyService,
        IResourceSelector resourceSelector,
        IFieldPathValidator fieldPathValidator)
    {
        _compiler = new FhirPathCompiler();
        _logger = logger;
        _terminologyService = terminologyService;
        _resourceSelector = resourceSelector;
        _fieldPathValidator = fieldPathValidator;
    }
    
    public async Task<List<RuleValidationError>> ValidateAsync(Bundle bundle, RuleSet ruleSet, CancellationToken cancellationToken = default)
    {
        var errors = new List<RuleValidationError>();
        
        if (ruleSet?.Rules == null || ruleSet.Rules.Count == 0)
            return errors;
        
        // Extract projectId from RuleSet for terminology resolution
        var projectId = ruleSet.Project;
        
        // Step 1: Validate bundle-level rules (RequiredResources / Resource)
        var bundleLevelRules = ruleSet.Rules
            .Where(r => r.Type.Equals("RequiredResources", StringComparison.OrdinalIgnoreCase) ||
                       r.Type.Equals("Resource", StringComparison.OrdinalIgnoreCase))
            .ToList();
        
        foreach (var rule in bundleLevelRules)
        {
            var bundleErrors = ValidateRequiredResources(bundle, rule);
            errors.AddRange(bundleErrors);
        }
        
        // Step 2: Validate resource-level rules using structured InstanceScope
        // Group rules by resource type (exclude bundle-level rules)
        var rulesByType = ruleSet.Rules
            .Where(r => !r.Type.Equals("RequiredResources", StringComparison.OrdinalIgnoreCase))
            .GroupBy(r => r.ResourceType);
        
        foreach (var resourceGroup in rulesByType)
        {
            var resourceType = resourceGroup.Key;
            var rules = resourceGroup.ToList();
            
            foreach (var rule in rules)
            {
                // Use new structured InstanceScope if present, otherwise fall back to legacy Path parsing
                IEnumerable<(Resource Resource, int EntryIndex)> selectedResources;
                
                if (rule.InstanceScope != null && rule.FieldPath != null)
                {
                    // NEW: Use explicit InstanceScope-based selection
                    try
                    {
                        // Validate field path before processing
                        _fieldPathValidator.ValidateFieldPath(rule.FieldPath, resourceType);
                        
                        // Select resources using structured InstanceScope
                        selectedResources = _resourceSelector.SelectResources(bundle, resourceType, rule.InstanceScope);
                        
                        _logger.LogTrace("ValidateAsync: Selected {Count} resources for rule {RuleId} using InstanceScope {ScopeType}",
                            selectedResources.Count(), rule.Id, rule.InstanceScope.GetType().Name);
                    }
                    catch (ArgumentException ex)
                    {
                        // Field path validation failed - report as error
                        _logger.LogError(ex, "Invalid field path in rule {RuleId}: {Message}", rule.Id, ex.Message);
                        errors.Add(new RuleValidationError
                        {
                            RuleId = rule.Id,
                            RuleType = rule.Type,
                            ResourceType = rule.ResourceType,
                            FieldPath = rule.FieldPath,
                            ErrorCode = "INVALID_FIELD_PATH",
                            Details = new Dictionary<string, object>
                            {
                                ["message"] = $"Rule configuration error: {ex.Message}",
                                ["source"] = "FieldPathValidation"
                            },
                            Severity = "error"
                        });
                        continue;
                    }
                }
                else
                {
                    // LEGACY: Fall back to regex-based selection for backward compatibility
                    // Find all matching resources and filter with legacy ShouldValidateResourcePoco
                    var matchingEntries = bundle.Entry
                        .Where(e => e.Resource != null && e.Resource.TypeName == resourceType)
                        .Select((entry, index) => (Resource: entry.Resource, Index: index))
                        .ToList();
                    
                    selectedResources = matchingEntries
                        .Where(item => ShouldValidateResourcePoco(item.Resource, rule, resourceType))
                        .Select(item => (item.Resource, item.Index));
                    
                    _logger.LogTrace("ValidateAsync: Using legacy Path-based selection for rule {RuleId}", rule.Id);
                }
                
                // Validate each selected resource against the rule
                foreach (var (resource, entryIndex) in selectedResources)
                {
                    var ruleErrors = await ValidateRuleAsync(resource, rule, entryIndex, projectId, cancellationToken);
                    errors.AddRange(ruleErrors);
                }
            }
        }
        
        return errors;
    }
    
    /// <summary>
    /// Validates bundle JSON against business rules using resilient ITypedElement parsing
    /// This method is used when POCO parsing fails due to structural errors (e.g., invalid dates, unknown elements)
    /// It uses Firely's ISourceNode/ITypedElement which can navigate partially-valid JSON
    /// </summary>
    public async System.Threading.Tasks.Task<List<RuleValidationError>> ValidateJsonAsync(string bundleJson, RuleSet ruleSet, CancellationToken cancellationToken = default)
    {
        var errors = new List<RuleValidationError>();
        
        if (ruleSet?.Rules == null || ruleSet.Rules.Count == 0)
        {
            _logger.LogDebug("ValidateJsonAsync: No rules to validate");
            return errors;
        }
        
        _logger.LogDebug("ValidateJsonAsync starting with {RuleCount} rules", ruleSet.Rules.Count);
        
        try
        {
            // Step 1: Validate bundle-level rules (RequiredResources)
            // Try to parse Bundle for RequiredResources validation
            var bundleLevelRules = ruleSet.Rules
                .Where(r => r.Type.Equals("RequiredResources", StringComparison.OrdinalIgnoreCase) ||
                           r.Type.Equals("Resource", StringComparison.OrdinalIgnoreCase))
                .ToList();
            
            if (bundleLevelRules.Any())
            {
                try
                {
                    var parser = new FhirJsonParser(new ParserSettings
                    {
                        AcceptUnknownMembers = true,
                        AllowUnrecognizedEnums = true,
                        PermissiveParsing = true
                    });
                    var bundle = parser.Parse<Bundle>(bundleJson);
                    
                    foreach (var rule in bundleLevelRules)
                    {
                        var bundleErrors = ValidateRequiredResources(bundle, rule);
                        errors.AddRange(bundleErrors);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "ValidateJsonAsync: Failed to parse Bundle for RequiredResources validation, using JSON fallback");
                    
                    // JSON fallback: Validate RequiredResources without POCO
                    using var bundleDocForBundleRules = System.Text.Json.JsonDocument.Parse(bundleJson);
                    var rootForBundleRules = bundleDocForBundleRules.RootElement;
                    
                    if (rootForBundleRules.TryGetProperty("entry", out var entriesForBundleRules))
                    {
                        foreach (var rule in bundleLevelRules)
                        {
                            try
                            {
                                var bundleRuleErrors = ValidateRequiredResourcesOnJson(bundleJson, entriesForBundleRules, rule);
                                _logger.LogTrace("ValidateJsonAsync: RequiredResources rule {RuleId} (JSON fallback) produced {ErrorCount} errors", rule.Id, bundleRuleErrors.Count);
                                errors.AddRange(bundleRuleErrors);
                            }
                            catch (Exception ruleEx)
                            {
                                _logger.LogError("ValidateJsonAsync: Error validating RequiredResources rule {RuleId}: {ErrorMessage}", rule.Id, ruleEx.Message);
                            }
                        }
                    }
                }
            }
            
            // Step 2: Validate resource-level rules
            // Parse bundle JSON using System.Text.Json for simpler navigation
            using var bundleDoc = System.Text.Json.JsonDocument.Parse(bundleJson);
            var root = bundleDoc.RootElement;
            
            if (!root.TryGetProperty("entry", out var entriesArray))
            {
                _logger.LogWarning("ValidateJsonAsync: No 'entry' array in bundle");
                return errors;
            }
            
            var entryCount = entriesArray.GetArrayLength();
            _logger.LogDebug("ValidateJsonAsync found {EntryCount} bundle entries", entryCount);
            
            // Group rules by resource type (exclude bundle-level rules)
            var rulesByType = ruleSet.Rules
                .Where(r => !r.Type.Equals("RequiredResources", StringComparison.OrdinalIgnoreCase) && 
                           !r.Type.Equals("Resource", StringComparison.OrdinalIgnoreCase))
                .GroupBy(r => r.ResourceType)
                .ToDictionary(g => g.Key, g => g.ToList());
            
            // Also parse with ISourceNode for actual rule evaluation
            var sourceNode = FhirJsonNode.Parse(bundleJson);
            var sourceEntries = sourceNode.Children("entry").ToList();
            
            int entryIndex = 0;
            foreach (var entry in entriesArray.EnumerateArray())
            {
                if (!entry.TryGetProperty("resource", out var resourceElement))
                {
                    _logger.LogWarning("ValidateJsonAsync Entry {EntryIndex}: No resource property", entryIndex);
                    entryIndex++;
                    continue;
                }
                
                if (!resourceElement.TryGetProperty("resourceType", out var resourceTypeElement))
                {
                    _logger.LogWarning("ValidateJsonAsync Entry {EntryIndex}: No resourceType in resource", entryIndex);
                    entryIndex++;
                    continue;
                }
                
                var resourceType = resourceTypeElement.GetString();
                if (string.IsNullOrEmpty(resourceType))
                {
                    _logger.LogWarning("ValidateJsonAsync Entry {EntryIndex}: Empty resourceType", entryIndex);
                    entryIndex++;
                    continue;
                }
                
                _logger.LogTrace("ValidateJsonAsync Entry {EntryIndex}: Found resource type {ResourceType}", entryIndex, resourceType);
                
                // Find matching rules for this resource type
                if (!rulesByType.TryGetValue(resourceType, out var matchingRules))
                {
                    _logger.LogTrace("ValidateJsonAsync: No rules for resource type {ResourceType}", resourceType);
                    entryIndex++;
                    continue;
                }
                
                _logger.LogDebug("ValidateJsonAsync: Evaluating {RuleCount} rules for {ResourceType} at entry {EntryIndex}", matchingRules.Count, resourceType, entryIndex);
                
                // Get the corresponding ISourceNode for rule evaluation
                var sourceResourceNode = sourceEntries[entryIndex].Children("resource").FirstOrDefault();
                if (sourceResourceNode == null)
                {
                    _logger.LogWarning("ValidateJsonAsync Entry {EntryIndex}: Could not get ISourceNode for resource", entryIndex);
                    entryIndex++;
                    continue;
                }
                
                foreach (var rule in matchingRules)
                {
                    try
                    {
                        // Check if this resource matches the rule's instance scope filter
                        if (!ShouldValidateResource(sourceResourceNode, rule, resourceType))
                        {
                            _logger.LogTrace("ValidateJsonAsync: Resource at entry {EntryIndex} doesn't match filter for rule {RuleId}, skipping", entryIndex, rule.Id);
                            continue;
                        }
                        
                        var ruleErrors = ValidateRuleOnSourceNode(sourceResourceNode, rule, entryIndex, resourceType);
                        _logger.LogTrace("ValidateJsonAsync: Rule {RuleId} ({RuleType}) produced {ErrorCount} errors", rule.Id, rule.Type, ruleErrors.Count);
                        errors.AddRange(ruleErrors);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError("ValidateJsonAsync: Error validating rule {RuleId}: {ErrorMessage}", rule.Id, ex.Message);
                        // Continue with other rules
                    }
                }
                
                entryIndex++;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError("ValidateJsonAsync: Error parsing JSON: {ErrorMessage}", ex.Message);
            // Return empty list - we've already captured Firely errors
        }
        
        _logger.LogDebug("ValidateJsonAsync returning {TotalErrors} total errors", errors.Count);
        return await System.Threading.Tasks.Task.FromResult(errors);
    }
    
    /// <summary>
    /// Validates a single rule against an ISourceNode resource
    /// Simplified validation that works with partially-valid structures
    /// Note: Instance scope filtering (e.g., .where() clauses) is handled by ShouldValidateResource()
    /// before this method is called, so we only need to validate the field path portion.
    /// </summary>
    private List<RuleValidationError> ValidateRuleOnSourceNode(ISourceNode resource, RuleDefinition rule, int entryIndex, string resourceType)
    {
        var errors = new List<RuleValidationError>();
        
        try
        {
            // Get resource ID for error reporting
            var idNode = resource.Children("id").FirstOrDefault();
            var resourceId = idNode?.Text;
            
            // Get field path (prefers new FieldPath, falls back to extracting from Path)
            var fieldPath = GetFieldPathForRule(rule);
            
            switch (rule.Type.ToUpperInvariant())
            {
                case "REQUIRED":
                    // MVP: Use NavigateToPathInSourceNodeAll to check if field exists
                    var matches = NavigateToPathInSourceNodeAll(resource, fieldPath, entryIndex);
                    
                    if (!matches.Any())
                    {
                        // Field doesn't exist at all
                        var jsonPointer = $"/entry/{entryIndex}/resource/{fieldPath.Replace(".", "/")}";
                        
                        errors.Add(new RuleValidationError
                        {
                            RuleId = rule.Id,
                            RuleType = rule.Type,
                            Severity = rule.Severity,
                            ResourceType = resourceType ?? rule.ResourceType,
                            FieldPath = rule.FieldPath,
                            ErrorCode = ValidationErrorCodes.FIELD_REQUIRED,
                            Details = new Dictionary<string, object>
                            {
                                ["source"] = "ProjectRule",
                                ["resourceType"] = resourceType ?? rule.ResourceType,
                                ["path"] = rule.FieldPath,
                                ["ruleId"] = rule.Id,
                                ["entryIndex"] = entryIndex,
                                ["_precomputedJsonPointer"] = jsonPointer
                            },
                            EntryIndex = entryIndex,
                            ResourceId = resourceId ?? "unknown"
                        });
                    }
                    break;
                
                case "ARRAYLENGTH":
                    // Phase 1: Use FieldPath only - navigate and check array length
                    // InstanceScope determines which resources to check (handled by outer loop)
                    // FieldPath points to the array field relative to resource root
                    
                    _logger.LogTrace("ArrayLength validation: Rule {RuleId}, FieldPath: {FieldPath}", rule.Id, fieldPath);
                    
                    // Navigate to the array using FieldPath
                    var arrayNode = NavigateToPathInSourceNode(resource, fieldPath);
                    
                    if (arrayNode != null)
                    {
                        // For array fields, the node itself represents the array container
                        // Count its children to get array length
                        var pathParts = fieldPath.Split('.');
                        var lastSegment = pathParts.Last();
                        var parentNode = pathParts.Length > 1 
                            ? NavigateToPathInSourceNode(resource, string.Join(".", pathParts.Take(pathParts.Length - 1)))
                            : resource;
                        
                        if (parentNode != null)
                        {
                            var arrayElements = parentNode.Children(lastSegment).ToList();
                            var count = arrayElements.Count;
                            _logger.LogTrace("ArrayLength: FieldPath {FieldPath} has {ElementCount} elements", fieldPath, count);
                            ValidateArrayLengthForNode(count, rule, resourceType, resourceId, entryIndex, errors, fieldPath);
                        }
                    }
                    else
                    {
                        _logger.LogTrace("ArrayLength: FieldPath {FieldPath} not found in resource", fieldPath);
                    }
                    break;
                    
                case "ALLOWEDVALUES":
                    // MVP: Navigate to ALL matching nodes and validate each
                    var allowedMatches = NavigateToPathInSourceNodeAll(resource, fieldPath, entryIndex);
                    
                    if (rule.Params != null && rule.Params.ContainsKey("values"))
                    {
                        var allowedValuesParam = rule.Params["values"];
                        List<string>? allowedValues = null;
                        
                        if (allowedValuesParam is JsonElement jsonElement && jsonElement.ValueKind == JsonValueKind.Array)
                        {
                            allowedValues = jsonElement.EnumerateArray()
                                .Select(e => e.GetString())
                                .Where(s => s != null)
                                .Cast<string>()
                                .ToList();
                        }
                        else if (allowedValuesParam is string[] strArray)
                        {
                            allowedValues = strArray.ToList();
                        }
                        else if (allowedValuesParam is IEnumerable<object> objList)
                        {
                            allowedValues = objList.Select(o => o?.ToString()).Where(s => s != null).Cast<string>().ToList();
                        }
                        
                        if (allowedValues != null)
                        {
                            // MVP: Emit one error per invalid array element
                            foreach (var (node, jsonPointer) in allowedMatches)
                            {
                                var actualValue = node.Text;
                                
                                if (!string.IsNullOrWhiteSpace(actualValue) && !allowedValues.Contains(actualValue))
                                {
                                    // PILOT: VALUE_NOT_ALLOWED canonical schema
                                    var details = new Dictionary<string, object>
                                    {
                                        ["actual"] = actualValue,
                                        ["allowed"] = allowedValues,
                                        ["valueType"] = "string",
                                        ["_precomputedJsonPointer"] = jsonPointer  // Internal hint
                                    };
                                    
                                    errors.Add(new RuleValidationError
                                    {
                                        RuleId = rule.Id,
                                        RuleType = rule.Type,
                                        Severity = rule.Severity,
                                        ResourceType = resourceType ?? rule.ResourceType,
                                        FieldPath = rule.FieldPath,
                                        ErrorCode = ValidationErrorCodes.VALUE_NOT_ALLOWED,
                                        Details = details,
                                        EntryIndex = entryIndex,
                                        ResourceId = resourceId ?? "unknown"
                                    });
                                }
                            }
                        }
                    }
                    break;
                    
                case "REGEX":
                case "PATTERN":
                    // MVP: Navigate to ALL matching nodes and validate each against regex
                    var regexMatches = NavigateToPathInSourceNodeAll(resource, fieldPath, entryIndex);
                    
                    if (rule.Params != null && rule.Params.ContainsKey("pattern"))
                    {
                        var patternObj = rule.Params["pattern"];
                        var pattern = patternObj is JsonElement jsonPattern ? jsonPattern.GetString() : patternObj?.ToString();
                        
                        if (!string.IsNullOrEmpty(pattern))
                        {
                            try
                            {
                                var regex = new System.Text.RegularExpressions.Regex(pattern);
                                
                                // MVP: Emit one error per invalid array element
                                foreach (var (node, jsonPointer) in regexMatches)
                                {
                                    var actualValue = node.Text;
                                    
                                    if (!string.IsNullOrWhiteSpace(actualValue) && !regex.IsMatch(actualValue))
                                    {
                                        // Canonical schema: {actual, pattern}
                                        errors.Add(new RuleValidationError
                                        {
                                            RuleId = rule.Id,
                                            RuleType = rule.Type,
                                            Severity = rule.Severity,
                                            ResourceType = resourceType ?? rule.ResourceType,
                                            FieldPath = rule.FieldPath,
                                            ErrorCode = ValidationErrorCodes.PATTERN_MISMATCH,
                                            Details = new Dictionary<string, object>
                                            {
                                                ["actual"] = actualValue,
                                                ["pattern"] = pattern,
                                                ["_precomputedJsonPointer"] = jsonPointer  // Internal hint
                                            },
                                            EntryIndex = entryIndex,
                                            ResourceId = resourceId ?? "unknown"
                                        });
                                    }
                                }
                            }
                            catch (Exception ex)
                            {
                                _logger.LogError("Invalid regex pattern in rule {RuleId}: {Pattern} - {Error}", rule.Id, pattern, ex.Message);
                            }
                        }
                    }
                    break;
                    
                case "FIXEDVALUE":
                    // MVP: Navigate to ALL matching nodes and validate each
                    var fixedMatches = NavigateToPathInSourceNodeAll(resource, fieldPath, entryIndex);
                    
                    if (rule.Params != null && rule.Params.ContainsKey("value"))
                    {
                        var expectedValueObj = rule.Params["value"];
                        var expectedValue = expectedValueObj is JsonElement jsonValue ? jsonValue.GetString() : expectedValueObj?.ToString();
                        
                        if (expectedValue != null)
                        {
                            // MVP: Emit one error per mismatched array element
                            foreach (var (node, jsonPointer) in fixedMatches)
                            {
                                var actualValue = node.Text ?? "";
                                
                                if (actualValue != expectedValue)
                                {
                                    // Canonical schema: {actual, expected}
                                    errors.Add(new RuleValidationError
                                    {
                                        RuleId = rule.Id,
                                        RuleType = rule.Type,
                                        Severity = rule.Severity,
                                        ResourceType = resourceType ?? rule.ResourceType,
                                        FieldPath = rule.FieldPath,
                                        ErrorCode = ValidationErrorCodes.FIXED_VALUE_MISMATCH,
                                        Details = new Dictionary<string, object>
                                        {
                                            ["actual"] = actualValue,
                                            ["expected"] = expectedValue,
                                            ["_precomputedJsonPointer"] = jsonPointer  // Internal hint
                                        },
                                        EntryIndex = entryIndex,
                                        ResourceId = resourceId ?? "unknown"
                                    });
                                }
                            }
                        }
                    }
                    break;
                    
                // POCO-dependent rule types - skip with diagnostic
                case "QUESTIONANSWER":
                case "CODESYSTEM":
                case "REFERENCE":
                    _logger.LogDebug("ValidateRuleOnSourceNode: Rule type {RuleType} skipped due to structural parsing failure (POCO unavailable)", rule.Type);
                    break;
                    
                // Unknown rule types
                default:
                    _logger.LogWarning("ValidateRuleOnSourceNode: Rule type {RuleType} not yet implemented for JSON fallback", rule.Type);
                    break;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError("Error in ValidateRuleOnSourceNode: {ErrorMessage}", ex.Message);
        }
        
        return errors;
    }
    
    /// <summary>
    /// Navigate to a path in ISourceNode structure
    /// Supports simple dot notation (e.g., "gender", "name.given")
    /// </summary>
    private ISourceNode? NavigateToPathInSourceNode(ISourceNode node, string path)
    {
        var parts = path.Split('.');
        ISourceNode? current = node;
        
        foreach (var part in parts)
        {
            if (current == null)
                return null;
                
            current = current.Children(part).FirstOrDefault();
            
            if (current == null)
                return null;
        }
        
        return current;
    }
    
    /// <summary>
    /// Phase 2: Extracts array index from ITypedElement.Location if available.
    /// Example: "Patient.identifier[2].system" → returns 2
    /// Returns the LAST index found (most specific for nested arrays).
    /// </summary>
    private int? ExtractArrayIndexFromLocation(string? location)
    {
        if (string.IsNullOrEmpty(location))
            return null;
        
        var matches = System.Text.RegularExpressions.Regex.Matches(location, @"\[(\d+)\]");
        if (matches.Count == 0)
            return null;
        
        // Use the LAST index (most specific)
        var lastMatch = matches[matches.Count - 1];
        if (int.TryParse(lastMatch.Groups[1].Value, out var index))
            return index;
        
        return null;
    }
    
    /// <summary>
    /// MVP: Navigates to ALL matching nodes for a fieldPath and returns (node, jsonPointer) pairs.
    /// Supports single-level arrays only. Nested arrays deferred to Phase 2.
    /// </summary>
    private List<(ISourceNode node, string jsonPointer)> NavigateToPathInSourceNodeAll(
        ISourceNode resourceNode,
        string fieldPath,
        int entryIndex)
    {
        var results = new List<(ISourceNode, string)>();
        var parts = fieldPath.Split('.');
        
        NavigateRecursive(
            resourceNode,
            parts,
            0,
            $"/entry/{entryIndex}/resource",
            results
        );
        
        return results;
    }
    
    /// <summary>
    /// Recursive helper for NavigateToPathInSourceNodeAll.
    /// Corrected: Only emit array indices for actual array fields (count > 1 or cardinality 0..*)
    /// </summary>
    private void NavigateRecursive(
        ISourceNode current,
        string[] parts,
        int partIndex,
        string currentPointer,
        List<(ISourceNode, string)> results)
    {
        if (partIndex >= parts.Length)
        {
            // Reached target, add to results
            results.Add((current, currentPointer));
            return;
        }
        
        var part = parts[partIndex];
        var children = current.Children(part).ToList();
        
        if (children.Count == 0)
        {
            // Path doesn't exist - return empty results
            return;
        }
        
        // Only emit array indices for actual arrays (multiple children)
        // For single-value fields, do NOT add /0
        if (children.Count == 1)
        {
            // Single value - scalar field
            var nextPointer = $"{currentPointer}/{part}";
            NavigateRecursive(
                children[0],
                parts,
                partIndex + 1,
                nextPointer,
                results
            );
        }
        else
        {
            // Multiple values - array field
            for (int i = 0; i < children.Count; i++)
            {
                var nextPointer = $"{currentPointer}/{part}/{i}";
                NavigateRecursive(
                    children[i],
                    parts,
                    partIndex + 1,
                    nextPointer,
                    results
                );
            }
        }
    }
    
    /// <summary>
    /// Validates RequiredResources rule against bundle entries (JSON fallback)
    /// </summary>
    private List<RuleValidationError> ValidateRequiredResourcesOnJson(string bundleJson, JsonElement entriesArray, RuleDefinition rule)
    {
        var errors = new List<RuleValidationError>();
        
        if (rule.Params == null || !rule.Params.ContainsKey("allowedResourceTypes"))
        {
            _logger.LogWarning("RequiredResources rule {RuleId} missing allowedResourceTypes param", rule.Id);
            return errors;
        }
        
        var allowedTypesParam = rule.Params["allowedResourceTypes"];
        List<string>? allowedResourceTypes = null;
        
        if (allowedTypesParam is JsonElement jsonElement && jsonElement.ValueKind == JsonValueKind.Array)
        {
            allowedResourceTypes = jsonElement.EnumerateArray()
                .Select(e => e.GetString())
                .Where(s => s != null)
                .Cast<string>()
                .ToList();
        }
        else if (allowedTypesParam is string[] strArray)
        {
            allowedResourceTypes = strArray.ToList();
        }
        else if (allowedTypesParam is IEnumerable<object> objList)
        {
            allowedResourceTypes = objList.Select(o => o?.ToString()).Where(s => s != null).Cast<string>().ToList();
        }
        
        if (allowedResourceTypes == null || !allowedResourceTypes.Any())
        {
            _logger.LogWarning("RequiredResources rule {RuleId} has empty allowedResourceTypes", rule.Id);
            return errors;
        }
        
        _logger.LogDebug("RequiredResources: Checking bundle entries against allowed types: {AllowedTypes}", string.Join(", ", allowedResourceTypes));
        
        int entryIndex = 0;
        foreach (var entry in entriesArray.EnumerateArray())
        {
            if (entry.TryGetProperty("resource", out var resourceElement) && 
                resourceElement.TryGetProperty("resourceType", out var resourceTypeElement))
            {
                var resourceType = resourceTypeElement.GetString();
                
                if (!string.IsNullOrEmpty(resourceType) && !allowedResourceTypes.Contains(resourceType))
                {
                    var jsonPointer = $"/entry/{entryIndex}/resource";
                    
                    errors.Add(new RuleValidationError
                    {
                        RuleId = rule.Id,
                        RuleType = rule.Type,
                        Severity = rule.Severity,
                        ResourceType = resourceType,
                        FieldPath = "resourceType",
                        ErrorCode = ValidationErrorCodes.RESOURCE_REQUIREMENT_VIOLATION,
                        Details = new Dictionary<string, object>
                        {
                            ["source"] = "ProjectRule",
                            ["resourceType"] = resourceType,
                            ["path"] = "Bundle.entry.resource",
                            ["ruleId"] = rule.Id,
                            ["actualResourceType"] = resourceType,
                            ["allowedResourceTypes"] = allowedResourceTypes,
                            ["entryIndex"] = entryIndex,
                            ["_precomputedJsonPointer"] = jsonPointer
                        },
                        EntryIndex = entryIndex,
                        ResourceId = resourceElement.TryGetProperty("id", out var idElem) ? idElem.GetString() : "unknown"
                    });
                }
            }
            
            entryIndex++;
        }
        
        return errors;
    }
    
    /// <summary>
    /// Helper method to validate array length and add errors if constraints are violated
    /// </summary>
    private void ValidateArrayLengthForNode(int count, RuleDefinition rule, string? resourceType, string? resourceId, int entryIndex, List<RuleValidationError> errors, string fieldPath)
    {
        bool hasError = false;
        
        // Canonical schema: { min, max, actual }
        int? min = null;
        int? max = null;
        
        _logger.LogTrace("ArrayLength validation: Count={Count}, Params={Params}", count, rule.Params != null ? string.Join(", ", rule.Params.Select(kv => $"{kv.Key}={kv.Value}")) : "null");
        
        if (rule.Params != null)
        {
            if (rule.Params.ContainsKey("min"))
            {
                var minValue = rule.Params["min"];
                min = minValue is JsonElement jsonMin ? jsonMin.GetInt32() : Convert.ToInt32(minValue);
                _logger.LogTrace("ArrayLength: Min constraint {Min}, Count {Count}, Violation: {Violation}", min, count, count < min);
                
                if (count < min)
                {
                    hasError = true;
                }
            }
            
            if (rule.Params.ContainsKey("max"))
            {
                var maxValue = rule.Params["max"];
                max = maxValue is JsonElement jsonMax ? jsonMax.GetInt32() : Convert.ToInt32(maxValue);
                _logger.LogTrace("ArrayLength: Max constraint {Max}, Count {Count}, Violation: {Violation}", max, count, count > max);
                
                if (count > max)
                {
                    hasError = true;
                }
            }
        }
        
        _logger.LogTrace("ArrayLength validation result: HasError={HasError}", hasError);
        
        if (hasError)
        {
            // Canonical schema: { min, max, actual }
            var details = new Dictionary<string, object>
            {
                ["min"] = min,
                ["max"] = max,
                ["actual"] = count
            };
            
            // Internal hint: Construct jsonPointer for SmartPath navigation
            var jsonPointer = $"/entry/{entryIndex}/resource/{fieldPath.Replace(".", "/")}";
            details["_precomputedJsonPointer"] = jsonPointer;
            
            // Use rule's errorCode if specified, otherwise default to ARRAY_LENGTH_OUT_OF_RANGE
            var errorCode = !string.IsNullOrEmpty(rule.ErrorCode) 
                ? rule.ErrorCode 
                : "ARRAY_LENGTH_OUT_OF_RANGE";
            
            errors.Add(new RuleValidationError
            {
                RuleId = rule.Id,
                RuleType = rule.Type,
                Severity = rule.Severity,
                ResourceType = resourceType ?? rule.ResourceType,
                FieldPath = rule.FieldPath,
                ErrorCode = errorCode,
                Details = details,
                EntryIndex = entryIndex,
                ResourceId = resourceId ?? "unknown"
            });
        }
    }
    
    private async Task<List<RuleValidationError>> ValidateRuleAsync(Resource resource, RuleDefinition rule, int entryIndex, string? projectId, CancellationToken cancellationToken)
    {
        var errors = new List<RuleValidationError>();
        
        _logger.LogInformation("ValidateRuleAsync: Processing rule {RuleId} of type {RuleType} for resource {ResourceType}", 
            rule.Id, rule.Type, resource.TypeName);
        
        try
        {
            switch (rule.Type.ToUpperInvariant())
            {
                case "REQUIRED":
                    errors.AddRange(ValidateRequired(resource, rule, entryIndex));
                    break;
                
                case "FIXEDVALUE":
                    errors.AddRange(ValidateFixedValue(resource, rule, entryIndex));
                    break;
                
                case "ALLOWEDVALUES":
                    errors.AddRange(ValidateAllowedValues(resource, rule, entryIndex));
                    break;
                
                case "REGEX":
                    errors.AddRange(ValidateRegex(resource, rule, entryIndex));
                    break;
                
                case "ARRAYLENGTH":
                    errors.AddRange(ValidateArrayLength(resource, rule, entryIndex));
                    break;
                
                case "CODESYSTEM":
                    errors.AddRange(await ValidateCodeSystemAsync(resource, rule, entryIndex, projectId));
                    break;
                
                case "CUSTOMFHIRPATH":
                    errors.AddRange(ValidateCustomFhirPath(resource, rule, entryIndex));
                    break;
                
                case "FULLURLIDMATCH":
                case "REQUIREDRESOURCES":
                    // These are bundle-level validations, skip here
                    break;
                
                default:
                    // Unknown rule type - log but don't fail
                    break;
            }
        }
        catch (Exception ex)
        {
            errors.Add(new RuleValidationError
            {
                RuleId = rule.Id,
                RuleType = rule.Type,
                Severity = "error",
                ResourceType = rule.ResourceType,
                FieldPath = rule.FieldPath,
                ErrorCode = "RULE_EXECUTION_ERROR",
                Details = new Dictionary<string, object>
                {
                    ["source"] = "ProjectRule",
                    ["resourceType"] = rule.ResourceType,
                    ["path"] = rule.FieldPath,
                    ["ruleType"] = rule.Type,
                    ["ruleId"] = rule.Id,
                    ["exceptionType"] = ex.GetType().Name,
                    ["exceptionMessage"] = ex.Message,
                    ["stackTrace"] = ex.StackTrace ?? "",
                    ["explanation"] = $"An unexpected error occurred while executing this rule. This indicates a potential issue with the rule configuration or an edge case in the validation logic. Exception: {ex.Message}"
                },
                EntryIndex = entryIndex,
                ResourceId = resource.Id
            });
        }
        
        return await System.Threading.Tasks.Task.FromResult(errors);
    }
    
    private List<RuleValidationError> ValidateRequired(Resource resource, RuleDefinition rule, int entryIndex)
    {
        var errors = new List<RuleValidationError>();
        
        // Get field path (prefers new FieldPath, falls back to extracting from Path)
        var fieldPath = GetFieldPathForRule(rule);
        
        var result = EvaluateFhirPath(resource, fieldPath, rule, entryIndex, errors);
        
        _logger.LogTrace("ValidateRequired: Rule {RuleId}, FieldPath {FieldPath}, ResourceType {ResourceType}", rule.Id, fieldPath, rule.ResourceType);
        _logger.LogTrace("ValidateRequired: Result count {ResultCount}", result?.Count() ?? 0);
        
        // Check if result is missing OR if all values are empty/whitespace
        var isMissing = result == null || !result.Any();
        var isAllEmpty = false;
        
        if (!isMissing)
        {
            foreach (var r in result)
            {
                var strValue = GetValueAsString(r);
                _logger.LogTrace("ValidateRequired: Value={Value}, IsEmpty={IsEmpty}", strValue, string.IsNullOrWhiteSpace(strValue));
            }
            
            isAllEmpty = result.All(r => 
            {
                var strValue = GetValueAsString(r);
                return string.IsNullOrWhiteSpace(strValue);
            });
        }
        
        _logger.LogTrace("ValidateRequired: IsMissing={IsMissing}, IsAllEmpty={IsAllEmpty}", isMissing, isAllEmpty);
        
        if (!errors.Any(e => e.ErrorCode == "RULE_DEFINITION_ERROR") && (isMissing || isAllEmpty))
        {
            // Canonical schema: { required: true }
            var details = new Dictionary<string, object>
            {
                ["required"] = true
            };
            
            // Use rule's errorCode if specified, otherwise default to REQUIRED_FIELD_MISSING
            var errorCode = !string.IsNullOrEmpty(rule.ErrorCode) 
                ? rule.ErrorCode 
                : "REQUIRED_FIELD_MISSING";
            
            errors.Add(new RuleValidationError
            {
                RuleId = rule.Id,
                RuleType = rule.Type,
                Severity = rule.Severity,
                ResourceType = rule.ResourceType,
                FieldPath = rule.FieldPath,
                ErrorCode = errorCode,
                Details = details,
                EntryIndex = entryIndex,
                ResourceId = resource.Id
            });
        }
        
        return errors;
    }
    
    /// <summary>
    /// Validates that a field value matches a required fixed value.
    /// 
    /// ERROR CODE CONTRACT (FIXED - DO NOT OVERRIDE):
    /// - FIXED_VALUE_MISMATCH: Value does not match expected fixed value
    /// - RULE_CONFIGURATION_ERROR: Missing required params.value parameter
    /// 
    /// UX CONTRACT:
    /// - ErrorCode is semantically fixed and not author-selectable
    /// - UI must display FIXED_VALUE_MISMATCH as read-only (no dropdown)
    /// - Granular context (expected/actual values) belongs in Details, not ErrorCode
    /// - Governance enforces errorCode = "FIXED_VALUE_MISMATCH" at authoring time
    /// 
    /// RATIONALE:
    /// - FixedValue has one semantic meaning: "value must equal X"
    /// - Allowing custom errorCodes creates semantic drift and UI confusion
    /// - Stability ensures consistent error handling across all projects
    /// </summary>
    private List<RuleValidationError> ValidateFixedValue(Resource resource, RuleDefinition rule, int entryIndex)
    {
        var errors = new List<RuleValidationError>();
        
        if (rule.Params == null || !rule.Params.ContainsKey("value"))
        {
            errors.Add(new RuleValidationError
            {
                RuleId = rule.Id,
                RuleType = rule.Type,
                Severity = "error",
                ResourceType = rule.ResourceType,
                FieldPath = rule.FieldPath,
                ErrorCode = "RULE_CONFIGURATION_ERROR",
                Details = new Dictionary<string, object>
                {
                    ["ruleType"] = "FixedValue",
                    ["missingParams"] = new[] { "value" }
                },
                EntryIndex = entryIndex,
                ResourceId = resource.Id
            });
            return errors;
        }
        
        var fieldPath = GetFieldPathForRule(rule);
        var result = EvaluateFhirPath(resource, fieldPath, rule, entryIndex, errors);
        
        if (!errors.Any(e => e.ErrorCode == "RULE_DEFINITION_ERROR"))
        {
            var expectedValue = rule.Params["value"]?.ToString();
            
            // Phase 2: Track array indices during POCO evaluation
            var resultList = result.ToList();
            for (int i = 0; i < resultList.Count; i++)
            {
                var item = resultList[i];
                var actualValue = GetValueAsString(item);
                
                if (actualValue != expectedValue)
                {
                    // Phase 2: Extract precise index from ITypedElement if available
                    int? arrayIndex = null;
                    if (item is Hl7.Fhir.ElementModel.ITypedElement typedElement)
                    {
                        arrayIndex = ExtractArrayIndexFromLocation(typedElement.Location);
                    }
                    
                    // Canonical schema: {actual, expected}
                    var details = new Dictionary<string, object>
                    {
                        ["actual"] = actualValue,
                        ["expected"] = expectedValue ?? "",
                        ["arrayIndex"] = arrayIndex ?? i  // Internal hint for Phase 2
                    };
                    
                    errors.Add(new RuleValidationError
                    {
                        RuleId = rule.Id,
                        RuleType = rule.Type,
                        Severity = rule.Severity,
                        ResourceType = rule.ResourceType,
                        FieldPath = rule.FieldPath,
                        ErrorCode = ValidationErrorCodes.FIXED_VALUE_MISMATCH,
                        Details = details,
                        EntryIndex = entryIndex,
                        ResourceId = resource.Id
                    });
                }
            }
        }
        
        return errors;
    }
    
    /// <summary>
    /// Validates that a field value is in the allowed list of values.
    /// 
    /// SEMANTIC CONTRACT:
    /// - Always emits ValidationErrorCodes.VALUE_NOT_ALLOWED (ignores rule.ErrorCode)
    /// - Governance layer blocks AllowedValues rules with incorrect errorCode
    /// 
    /// UX CONTRACT (Future Implementation):
    /// - Rule authoring UI should:
    ///   * Hide errorCode dropdown for AllowedValues rules
    ///   * Display static label "Error Code: VALUE_NOT_ALLOWED" (read-only)
    ///   * Show explanation: "This rule type always uses VALUE_NOT_ALLOWED"
    /// - Governance will prevent save if user tries to override errorCode
    /// - UI should provide multi-select dropdown for "values" parameter
    /// </summary>
    private List<RuleValidationError> ValidateAllowedValues(Resource resource, RuleDefinition rule, int entryIndex)
    {
        var errors = new List<RuleValidationError>();
        
        if (rule.Params == null || !rule.Params.ContainsKey("values"))
        {
            errors.Add(new RuleValidationError
            {
                RuleId = rule.Id,
                RuleType = rule.Type,
                Severity = "error",
                ResourceType = rule.ResourceType,
                FieldPath = rule.FieldPath,
                ErrorCode = "RULE_CONFIGURATION_ERROR",
                Details = new Dictionary<string, object>
                {
                    ["ruleType"] = "AllowedValues",
                    ["missingParams"] = new[] { "values" }
                },
                EntryIndex = entryIndex,
                ResourceId = resource.Id
            });
            return errors;
        }
        
        // Extract field path, removing instance scope prefix
        var fieldPath = GetFieldPathForRule(rule);
        var result = EvaluateFhirPath(resource, fieldPath, rule, entryIndex, errors);
        
        if (!errors.Any(e => e.ErrorCode == "RULE_DEFINITION_ERROR"))
        {
            var allowedValues = GetAllowedValues(rule.Params["values"]);
            
            // Phase 2: Track array indices during POCO evaluation
            var resultList = result.ToList();
            for (int i = 0; i < resultList.Count; i++)
            {
                var item = resultList[i];
                var actualValue = GetValueAsString(item);
                
                if (!string.IsNullOrEmpty(actualValue) && !allowedValues.Contains(actualValue))
                {
                    // Phase 2: Extract precise index from ITypedElement if available
                    int? arrayIndex = null;
                    if (item is Hl7.Fhir.ElementModel.ITypedElement typedElement)
                    {
                        arrayIndex = ExtractArrayIndexFromLocation(typedElement.Location);
                    }
                    
                    // PILOT: VALUE_NOT_ALLOWED canonical schema
                    var details = new Dictionary<string, object>
                    {
                        ["actual"] = actualValue,
                        ["allowed"] = allowedValues,
                        ["valueType"] = "string",
                        ["arrayIndex"] = arrayIndex ?? i  // Internal hint for Phase 2
                    };
                    
                    errors.Add(new RuleValidationError
                    {
                        RuleId = rule.Id,
                        RuleType = rule.Type,
                        Severity = rule.Severity,
                        ResourceType = rule.ResourceType,
                        FieldPath = rule.FieldPath,
                        ErrorCode = ValidationErrorCodes.VALUE_NOT_ALLOWED,
                        Details = details,
                        EntryIndex = entryIndex,
                        ResourceId = resource.Id
                    });
                }
            }
        }
        
        return errors;
    }
    
    private List<RuleValidationError> ValidateRegex(Resource resource, RuleDefinition rule, int entryIndex)
    {
        var errors = new List<RuleValidationError>();
        
        if (rule.Params == null || !rule.Params.ContainsKey("pattern"))
        {
            errors.Add(new RuleValidationError
            {
                RuleId = rule.Id,
                RuleType = rule.Type,
                Severity = "error",
                ResourceType = rule.ResourceType,
                FieldPath = rule.FieldPath,
                ErrorCode = "RULE_CONFIGURATION_ERROR",
                Details = new Dictionary<string, object>
                {
                    ["ruleType"] = "Regex",
                    ["missingParams"] = new[] { "pattern" }
                },
                EntryIndex = entryIndex,
                ResourceId = resource.Id
            });
            return errors;
        }
        
        // Extract field path, removing instance scope prefix
        var fieldPath = GetFieldPathForRule(rule);
        var result = EvaluateFhirPath(resource, fieldPath, rule, entryIndex, errors);
        
        if (!errors.Any(e => e.ErrorCode == "RULE_DEFINITION_ERROR"))
        {
            var pattern = rule.Params["pattern"]?.ToString();
            
            if (string.IsNullOrEmpty(pattern))
                return errors;
            
            var regex = new Regex(pattern);
            
            foreach (var item in result)
            {
                var actualValue = GetValueAsString(item);
                
                if (!string.IsNullOrEmpty(actualValue) && !regex.IsMatch(actualValue))
                {
                    // Canonical schema: {actual, pattern}
                    var details = new Dictionary<string, object>
                    {
                        ["actual"] = actualValue,
                        ["pattern"] = pattern
                    };
                    
                    errors.Add(new RuleValidationError
                    {
                        RuleId = rule.Id,
                        RuleType = rule.Type,
                        Severity = rule.Severity,
                        ResourceType = rule.ResourceType,
                        FieldPath = rule.FieldPath,
                        ErrorCode = ValidationErrorCodes.PATTERN_MISMATCH,
                        Details = details,
                        EntryIndex = entryIndex,
                        ResourceId = resource.Id
                    });
                }
            }
        }
        
        return errors;
    }
    
    /// <summary>
    /// ValidateArrayLength - ErrorCode-First Implementation (Phase D: UX Contract)
    /// 
    /// RUNTIME BEHAVIOR:
    /// - Always emits: ErrorCode = "ARRAY_LENGTH_VIOLATION"
    /// - Ignores: rule.ErrorCode override (governance blocks invalid values)
    /// - Details Structure:
    ///   • violation: "min" | "max" (which constraint failed)
    ///   • min: integer (minimum allowed count)
    ///   • max: integer (maximum allowed count, if defined)
    ///   • actual: integer (actual element count)
    ///
    /// GOVERNANCE ENFORCEMENT:
    /// - CheckArrayLengthErrorCode blocks any errorCode != "ARRAY_LENGTH_VIOLATION"
    /// - Rejected codes: "ARRAY_TOO_SHORT", "ARRAY_TOO_LONG", custom codes
    ///
    /// UI EXPOSURE (Future Phase - NOT IMPLEMENTED):
    /// - Single error code ensures consistent frontend grouping/filtering
    /// - UI can differentiate min vs. max via details.violation field
    /// - Semantic stability: no UI code changes when new array rules added
    /// - Message template: "{actual} elements found, expected {min} to {max}"
    ///
    /// ACCEPTANCE CRITERIA:
    /// ✅ Runtime emits only ARRAY_LENGTH_VIOLATION
    /// ✅ Governance blocks any other errorCode
    /// ✅ Details include violation type (min/max)
    /// ✅ 5 critical tests pass (3 runtime + 2 governance)
    /// ✅ No UI exposure (backend-only hardening)
    /// </summary>
    private List<RuleValidationError> ValidateArrayLength(Resource resource, RuleDefinition rule, int entryIndex)
    {
        var errors = new List<RuleValidationError>();
        
        if (rule.Params == null || (!rule.Params.ContainsKey("min") && !rule.Params.ContainsKey("max")))
        {
            errors.Add(new RuleValidationError
            {
                RuleId = rule.Id,
                RuleType = rule.Type,
                Severity = "error",
                ResourceType = rule.ResourceType,
                FieldPath = rule.FieldPath,
                ErrorCode = "RULE_CONFIGURATION_ERROR",
                Details = new Dictionary<string, object>
                {
                    ["ruleType"] = "ArrayLength",
                    ["missingParams"] = new[] { "min or max" }
                },
                EntryIndex = entryIndex,
                ResourceId = resource.Id
            });
            return errors;
        }
        
        // Extract field path, removing instance scope prefix
        var fieldPath = GetFieldPathForRule(rule);
        var result = EvaluateFhirPath(resource, fieldPath, rule, entryIndex, errors);
        
        if (!errors.Any(e => e.ErrorCode == "RULE_DEFINITION_ERROR"))
        {
            var count = result.Count();
            
            if (rule.Params.ContainsKey("min"))
            {
                // Handle JsonElement or direct int
                var minValue = rule.Params["min"];
                int min;
                if (minValue is JsonElement jsonMin)
                {
                    min = jsonMin.GetInt32();
                }
                else
                {
                    min = Convert.ToInt32(minValue);
                }
                
                if (count < min)
                {
                    // Canonical schema: { min, max, actual }
                    var details = new Dictionary<string, object>
                    {
                        ["min"] = min,
                        ["max"] = null,
                        ["actual"] = count
                    };
                    
                    // Use rule's errorCode if specified, otherwise default to ARRAY_LENGTH_OUT_OF_RANGE
                    var errorCode = !string.IsNullOrEmpty(rule.ErrorCode) 
                        ? rule.ErrorCode 
                        : "ARRAY_LENGTH_OUT_OF_RANGE";
                    
                    errors.Add(new RuleValidationError
                    {
                        RuleId = rule.Id,
                        RuleType = rule.Type,
                        Severity = rule.Severity,
                        ResourceType = rule.ResourceType,
                        FieldPath = rule.FieldPath,
                        ErrorCode = errorCode,
                        Details = details,
                        EntryIndex = entryIndex,
                        ResourceId = resource.Id
                    });
                }
            }
            
            if (rule.Params.ContainsKey("max"))
            {
                // Handle JsonElement or direct int
                var maxValue = rule.Params["max"];
                int max;
                if (maxValue is JsonElement jsonMax)
                {
                    max = jsonMax.GetInt32();
                }
                else
                {
                    max = Convert.ToInt32(maxValue);
                }
                
                if (count > max)
                {
                    // Canonical schema: { min, max, actual }
                    var details = new Dictionary<string, object>
                    {
                        ["min"] = null,
                        ["max"] = max,
                        ["actual"] = count
                    };
                    
                    // Use rule's errorCode if specified, otherwise default to ARRAY_LENGTH_OUT_OF_RANGE
                    var errorCode = !string.IsNullOrEmpty(rule.ErrorCode) 
                        ? rule.ErrorCode 
                        : "ARRAY_LENGTH_OUT_OF_RANGE";
                    
                    errors.Add(new RuleValidationError
                    {
                        RuleId = rule.Id,
                        RuleType = rule.Type,
                        Severity = rule.Severity,
                        ResourceType = rule.ResourceType,
                        FieldPath = rule.FieldPath,
                        ErrorCode = errorCode,
                        Details = details,
                        EntryIndex = entryIndex,
                        ResourceId = resource.Id
                    });
                }
            }
        }
        
        return errors;
    }
    
    /// <summary>
    /// Validates CodeSystem rules with CodeSet-driven validation (closed-world).
    /// 
    /// CONTRACT (Tier-1 Validation):
    /// - rule.Params must contain: codeSetId (required), system (required), mode (fixed at "codeset")
    /// - codes[] is optional and ONLY used for future "restrict further" scenarios
    /// 
    /// VALIDATION BEHAVIOR:
    /// - Resolves CodeSet by codeSetId from Terminology module
    /// - Validates BOTH system AND code against CodeSet.concepts[]
    /// - Any code NOT in CodeSet.concepts[] MUST FAIL
    /// - No system-only validation - closed-world by default
    /// 
    /// ERROR CODE:
    /// - Always emits ValidationErrorCodes.CODESYSTEM_VIOLATION
    /// - Details["violation"] distinguishes "system" vs "code" vs "codeSetId" failure
    /// - Frontend UI must treat CodeSystem errorCode as read-only
    /// </summary>
    private async Task<List<RuleValidationError>> ValidateCodeSystemAsync(Resource resource, RuleDefinition rule, int entryIndex, string? projectId)
    {
        var errors = new List<RuleValidationError>();
        
        var fieldPath = GetFieldPathForRule(rule);
        _logger.LogInformation("ValidateCodeSystem: Validating rule {RuleId} for resource {ResourceType} at fieldPath {FieldPath}, projectId={ProjectId}", 
            rule.Id, resource.TypeName, fieldPath, projectId ?? "null");
        
        // Validate params structure
        if (rule.Params == null || !rule.Params.ContainsKey("codeSetId") || !rule.Params.ContainsKey("system"))
        {
            errors.Add(new RuleValidationError
            {
                RuleId = rule.Id,
                RuleType = rule.Type,
                Severity = "error",
                ResourceType = rule.ResourceType,
                FieldPath = rule.FieldPath,
                ErrorCode = "RULE_CONFIGURATION_ERROR",
                Details = new Dictionary<string, object>
                {
                    ["ruleType"] = "CodeSystem",
                    ["missingParams"] = new[] { "codeSetId", "system" },
                    ["explanation"] = "CodeSystem rules require both codeSetId and system parameters"
                },
                EntryIndex = entryIndex,
                ResourceId = resource.Id
            });
            return errors;
        }
        
        var codeSetId = rule.Params["codeSetId"]?.ToString();
        var expectedSystem = rule.Params["system"]?.ToString();
        
        if (string.IsNullOrWhiteSpace(codeSetId) || string.IsNullOrWhiteSpace(expectedSystem))
        {
            errors.Add(new RuleValidationError
            {
                RuleId = rule.Id,
                RuleType = rule.Type,
                Severity = "error",
                ResourceType = rule.ResourceType,
                FieldPath = rule.FieldPath,
                ErrorCode = "RULE_CONFIGURATION_ERROR",
                Details = new Dictionary<string, object>
                {
                    ["ruleType"] = "CodeSystem",
                    ["explanation"] = "codeSetId and system must not be empty"
                },
                EntryIndex = entryIndex,
                ResourceId = resource.Id
            });
            return errors;
        }
        
        // Resolve CodeSet from Terminology module
        Models.Terminology.CodeSystem? codeSet = null;
        try
        {
            if (!string.IsNullOrWhiteSpace(projectId))
            {
                codeSet = await _terminologyService.GetCodeSystemByUrlAsync(expectedSystem, CancellationToken.None);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError("ValidateCodeSystem: Error loading CodeSet {CodeSetId}: {ErrorMessage}", codeSetId, ex.Message);
        }
        
        if (codeSet == null)
        {
            errors.Add(new RuleValidationError
            {
                RuleId = rule.Id,
                RuleType = rule.Type,
                Severity = "error",
                ResourceType = rule.ResourceType,
                FieldPath = rule.FieldPath,
                ErrorCode = "RULE_CONFIGURATION_ERROR",
                Details = new Dictionary<string, object>
                {
                    ["ruleType"] = "CodeSystem",
                    ["codeSetId"] = codeSetId,
                    ["system"] = expectedSystem,
                    ["explanation"] = $"CodeSet '{codeSetId}' with system '{expectedSystem}' not found in Terminology module"
                },
                EntryIndex = entryIndex,
                ResourceId = resource.Id
            });
            return errors;
        }
        
        // Extract all valid codes from CodeSet
        var validCodes = codeSet.Concept?.Select(c => c.Code).Where(code => !string.IsNullOrWhiteSpace(code)).ToList() ?? new List<string>();
        
        if (validCodes.Count == 0)
        {
            _logger.LogWarning("ValidateCodeSystem: CodeSet {CodeSetId} has no concepts defined", codeSetId);
        }
        
        // Use the fieldPath from earlier in the method
        var result = EvaluateFhirPath(resource, fieldPath, rule, entryIndex, errors);
        
        _logger.LogInformation("ValidateCodeSystem: FhirPath evaluation returned {Count} items for path {FieldPath}", 
            result.Count(), fieldPath);
        
        if (!errors.Any(e => e.ErrorCode == "RULE_DEFINITION_ERROR"))
        {
            // Phase 2: Track array indices during POCO evaluation
            var resultList = result.ToList();
            for (int i = 0; i < resultList.Count; i++)
            {
                var item = resultList[i];
                _logger.LogInformation("ValidateCodeSystem: Evaluating item of type {ItemType}", item?.GetType().Name ?? "null");
                
                // Phase 2: Extract precise index from ITypedElement if available
                int? arrayIndex = null;
                
                // Extract the actual Coding object from the FhirPath result
                Coding? coding = null;
                
                if (item is Coding codingDirect)
                {
                    coding = codingDirect;
                }
                else if (item is Hl7.Fhir.ElementModel.ITypedElement typedElement)
                {
                    // Phase 2: Extract array index from Location
                    arrayIndex = ExtractArrayIndexFromLocation(typedElement.Location);
                    
                    // Convert ITypedElement to POCO
                    try
                    {
                        coding = typedElement.ToPoco<Coding>();
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning("ValidateCodeSystem: Failed to convert ITypedElement to Coding: {Message}", ex.Message);
                    }
                }
                
                if (coding == null)
                {
                    _logger.LogWarning("ValidateCodeSystem: Could not extract Coding from item of type {ItemType}", item?.GetType().Name ?? "null");
                    continue;
                }
                
                _logger.LogInformation("ValidateCodeSystem: Found Coding - system={System}, code={Code}, validCodes={ValidCodes}", 
                    coding.System, coding.Code, string.Join(",", validCodes));
                
                // Validate system URL
                if (coding.System != expectedSystem)
                {
                    // Canonical schema: {expectedSystem, actualSystem}
                    var details = new Dictionary<string, object>
                    {
                        ["expectedSystem"] = expectedSystem,
                        ["actualSystem"] = coding.System,
                        ["arrayIndex"] = arrayIndex ?? i  // Internal hint
                    };
                    
                    errors.Add(new RuleValidationError
                    {
                        RuleId = rule.Id,
                        RuleType = rule.Type,
                        Severity = rule.Severity,
                        ResourceType = rule.ResourceType,
                        FieldPath = rule.FieldPath,
                        ErrorCode = "CODESYSTEM_MISMATCH",
                        Details = details,
                        EntryIndex = entryIndex,
                        ResourceId = resource.Id
                    });
                }
                // Validate code against CodeSet concepts (closed-world validation)
                else if (!validCodes.Contains(coding.Code))
                {
                    // Canonical schema: {system, code, valueSet}
                    var details = new Dictionary<string, object>
                    {
                        ["system"] = coding.System ?? expectedSystem,
                        ["code"] = coding.Code ?? "",
                        ["valueSet"] = codeSetId,
                        ["arrayIndex"] = arrayIndex ?? i  // Internal hint
                    };
                    
                    errors.Add(new RuleValidationError
                    {
                        RuleId = rule.Id,
                        RuleType = rule.Type,
                        Severity = rule.Severity,
                        ResourceType = rule.ResourceType,
                        FieldPath = rule.FieldPath,
                        ErrorCode = ValidationErrorCodes.CODE_NOT_IN_VALUESET,
                        Details = details,
                        EntryIndex = entryIndex,
                        ResourceId = resource.Id
                    });
                }
            }
        }
        
        return errors;
    }
    
    /// <summary>
    /// Validates CustomFHIRPath rules.
    /// 
    /// ERROR CODE CONTRACT (BACKEND-OWNED):
    /// - Always emits ValidationErrorCodes.CUSTOMFHIRPATH_CONDITION_FAILED
    /// - rule.ErrorCode is NOT read during execution
    /// - Backend owns semantic error code determination
    /// 
    /// EXECUTION CONTRACT:
    /// - Evaluates FHIRPath expression in FieldPath
    /// - Expression must return boolean true for validation to pass
    /// - InstanceScope determines which resources to evaluate (handled by outer loop)
    /// - FieldPath contains the FHIRPath expression relative to resource root
    /// </summary>
    private List<RuleValidationError> ValidateCustomFhirPath(Resource resource, RuleDefinition rule, int entryIndex)
    {
        var errors = new List<RuleValidationError>();
        
        // Phase 1: Use FieldPath for evaluation
        // InstanceScope determines which resources (handled by outer loop)
        // FieldPath contains the FHIRPath expression relative to resource root
        var fieldPath = GetFieldPathForRule(rule);
        var result = EvaluateFhirPath(resource, fieldPath, rule, entryIndex, errors);
        
        if (!errors.Any(e => e.ErrorCode == "RULE_DEFINITION_ERROR"))
        {
            // Custom FHIRPath should return boolean
            var isValid = result.Any() && result.All(r =>
            {
                if (r is FhirBoolean fb)
                    return fb.Value == true;
                if (r is Hl7.Fhir.ElementModel.ITypedElement te)
                    return te.Value?.ToString()?.ToLowerInvariant() == "true";
                return false;
            });
            
            if (!isValid)
            {
                var details = new Dictionary<string, object>
                {
                    ["source"] = "ProjectRule",
                    ["resourceType"] = rule.ResourceType,
                    ["path"] = fieldPath,
                    ["ruleType"] = rule.Type,
                    ["ruleId"] = rule.Id,
                    ["expression"] = fieldPath,
                    ["evaluationResult"] = "false"
                };
                
                details["explanation"] = GetExplanation(rule.Type, ValidationErrorCodes.CUSTOMFHIRPATH_CONDITION_FAILED, details);
                
                errors.Add(new RuleValidationError
                {
                    RuleId = rule.Id,
                    RuleType = rule.Type,
                    Severity = rule.Severity,
                    ResourceType = rule.ResourceType,
                    FieldPath = rule.FieldPath,
                    ErrorCode = ValidationErrorCodes.CUSTOMFHIRPATH_CONDITION_FAILED,
                    Details = details,
                    EntryIndex = entryIndex,
                    ResourceId = resource.Id
                });
            }
        }
        
        return errors;
    }
    
    /// <summary>
    /// Validates RequiredResources rules (bundle-level validation).
    /// 
    /// SEMANTIC CONTRACT:
    /// - Always emits ValidationErrorCodes.REQUIRED_RESOURCE_MISSING (ignores rule.ErrorCode)
    /// - Governance layer blocks RequiredResources rules with incorrect errorCode
    /// - Two modes: "min" (at least) and "exact" (min === max)
    /// - No range support (min < max is blocked by governance)
    /// 
    /// GOVERNANCE CONTRACT:
    /// - errorCode must be absent or REQUIRED_RESOURCE_MISSING (no custom errorCodes)
    /// - requirements array must not be empty
    /// - Each requirement must have resourceType and min >= 1
    /// - max >= min OR max absent (no range support)
    /// - max === min OR max absent (exact or min-only modes)
    /// - No duplicate resourceTypes
    /// 
    /// UX CONTRACT:
    /// - Rule authoring UI shows fixed error code: RESOURCE_REQUIREMENT_VIOLATION
    /// - Mode selector: "At least" (min only) vs "Exactly" (min === max)
    /// - Count input (minimum 1)
    /// - Advanced: where attribute filters (FHIRPath conditions)
    /// - Banner: "Any resource not declared will be rejected"
    /// </summary>
    private List<RuleValidationError> ValidateRequiredResources(Bundle bundle, RuleDefinition rule)
    {
        var errors = new List<RuleValidationError>();
        
        // Validation check: params.requirements must exist
        if (rule.Params == null || !rule.Params.ContainsKey("requirements"))
        {
            errors.Add(new RuleValidationError
            {
                RuleId = rule.Id,
                RuleType = rule.Type,
                Severity = "error",
                ResourceType = rule.ResourceType,
                FieldPath = rule.FieldPath,
                ErrorCode = "RULE_CONFIGURATION_ERROR",
                Details = new Dictionary<string, object>
                {
                    ["ruleType"] = "RequiredResources",
                    ["missingParams"] = new[] { "requirements" }
                },
                EntryIndex = null,
                ResourceId = null
            });
            return errors;
        }
        
        // Parse rejectUndeclaredResources flag (default: true for Resource rules)
        var rejectUndeclaredResources = true;
        if (rule.Params.ContainsKey("rejectUndeclaredResources"))
        {
            var paramValue = rule.Params["rejectUndeclaredResources"];
            if (paramValue is JsonElement jsonElement)
            {
                rejectUndeclaredResources = jsonElement.GetBoolean();
            }
            else if (paramValue is bool boolValue)
            {
                rejectUndeclaredResources = boolValue;
            }
            else
            {
                rejectUndeclaredResources = Convert.ToBoolean(paramValue);
            }
        }
        
        // Parse requirements array from params
        List<ResourceRequirement> requirements;
        try
        {
            var requirementsJson = JsonSerializer.Serialize(rule.Params["requirements"]);
            requirements = JsonSerializer.Deserialize<List<ResourceRequirement>>(requirementsJson) ?? new List<ResourceRequirement>();
        }
        catch (Exception ex)
        {
            errors.Add(new RuleValidationError
            {
                RuleId = rule.Id,
                RuleType = rule.Type,
                Severity = "error",
                ResourceType = rule.ResourceType,
                FieldPath = rule.FieldPath,
                ErrorCode = "RULE_CONFIGURATION_ERROR",
                Details = new Dictionary<string, object>
                {
                    ["ruleType"] = "RequiredResources",
                    ["reason"] = "Failed to parse requirements array",
                    ["exception"] = ex.Message
                },
                EntryIndex = null,
                ResourceId = null
            });
            return errors;
        }
        
        // Group all resources by type for initial counting
        var resourcesByType = bundle.Entry
            .Where(e => e.Resource != null)
            .GroupBy(e => e.Resource!.TypeName)
            .ToDictionary(g => g.Key, g => g.Select(e => e.Resource!).ToList());
        
        // Apply where filters if present to get matching resources per requirement
        var matchingCounts = new Dictionary<string, int>();
        foreach (var requirement in requirements)
        {
            var resourcesOfType = resourcesByType.GetValueOrDefault(requirement.ResourceType, new List<Resource>());
            
            // If no where filters, count all resources of this type
            if (requirement.Where == null || !requirement.Where.Any())
            {
                matchingCounts[requirement.ResourceType] = resourcesOfType.Count;
                continue;
            }
            
            // Apply where filters using FHIRPath
            var matchingResources = resourcesOfType.Where(resource =>
            {
                try
                {
                    foreach (var filter in requirement.Where)
                    {
                        var compiled = _compiler.Compile(filter.Path);
                        var typedElement = resource.ToTypedElement();
                        var scopedNode = new ScopedNode(typedElement);
                        var result = compiled(scopedNode, new EvaluationContext());
                        var resultValue = result.FirstOrDefault()?.ToString() ?? "";
                        
                        // Evaluate filter condition
                        var matches = filter.Op switch
                        {
                            "=" => resultValue.Equals(filter.Value?.ToString() ?? "", StringComparison.Ordinal),
                            "!=" => !resultValue.Equals(filter.Value?.ToString() ?? "", StringComparison.Ordinal),
                            "contains" => resultValue.Contains(filter.Value?.ToString() ?? "", StringComparison.Ordinal),
                            "in" => filter.Value is System.Text.Json.JsonElement jsonArray && jsonArray.ValueKind == System.Text.Json.JsonValueKind.Array
                                ? jsonArray.EnumerateArray().Any(item => item.GetString()?.Equals(resultValue, StringComparison.Ordinal) == true)
                                : false,
                            _ => false
                        };
                        
                        if (!matches) return false;
                    }
                    return true;
                }
                catch
                {
                    return false; // Filter evaluation failed, exclude resource
                }
            }).ToList();
            
            matchingCounts[requirement.ResourceType] = matchingResources.Count;
        }
        
        // Count ALL resources by type (for undeclared resource check)
        var allResourceCounts = resourcesByType.ToDictionary(kvp => kvp.Key, kvp => kvp.Value.Count);
        
        // Extract declared resource types
        var declaredResourceTypes = new HashSet<string>(requirements.Select(r => r.ResourceType), StringComparer.Ordinal);
        
        // Build expected structure for frontend
        var expectedStructure = requirements.Select(req =>
        {
            var max = req.Max.HasValue ? (object)req.Max.Value : "*";
            var id = req.ResourceType;
            
            var expectedItem = new Dictionary<string, object>
            {
                ["id"] = id,
                ["resourceType"] = req.ResourceType,
                ["min"] = req.Min,
                ["max"] = max
            };
            
            // Add filter info if present
            if (req.Where != null && req.Where.Any())
            {
                var filter = req.Where.First(); // Use first filter for label
                var filterLabel = $"{req.ResourceType} ({filter.Path} {filter.Op} {filter.Value})";
                
                expectedItem["filter"] = new Dictionary<string, object>
                {
                    ["kind"] = "fhirpath",
                    ["expression"] = filter.Path,
                    ["label"] = filterLabel
                };
            }
            
            return expectedItem;
        }).ToList();
        
        // Build actual structure for frontend
        var actualStructure = new List<Dictionary<string, object>>();
        foreach (var requirement in requirements)
        {
            var actualCount = matchingCounts.GetValueOrDefault(requirement.ResourceType, 0);
            var allCountForType = allResourceCounts.GetValueOrDefault(requirement.ResourceType, 0);
            
            var actualItem = new Dictionary<string, object>
            {
                ["id"] = requirement.ResourceType,
                ["resourceType"] = requirement.ResourceType,
                ["count"] = actualCount
            };
            
            // Add filter info if present
            if (requirement.Where != null && requirement.Where.Any())
            {
                var filter = requirement.Where.First();
                var filterLabel = $"{requirement.ResourceType} ({filter.Path} {filter.Op} {filter.Value})";
                
                actualItem["filter"] = new Dictionary<string, object>
                {
                    ["kind"] = "fhirpath",
                    ["expression"] = filter.Path,
                    ["label"] = filterLabel
                };
            }
            
            // Add examples for this resource type (max 3)
            var resourcesOfType = resourcesByType.GetValueOrDefault(requirement.ResourceType, new List<Resource>());
            if (resourcesOfType.Any())
            {
                var examples = resourcesOfType.Take(3).Select((r, idx) =>
                {
                    var entryIndex = bundle.Entry.FindIndex(e => e.Resource == r);
                    return new Dictionary<string, object?>
                    {
                        ["jsonPointer"] = $"/entry/{entryIndex}/resource",
                        ["fullUrl"] = bundle.Entry[entryIndex].FullUrl,
                        ["resourceId"] = r.Id
                    };
                }).ToList();
                
                actualItem["examples"] = examples;
            }
            
            actualStructure.Add(actualItem);
        }
        
        // Add undeclared resources to actual structure
        if (rejectUndeclaredResources)
        {
            foreach (var kvp in allResourceCounts)
            {
                var resourceType = kvp.Key;
                if (!declaredResourceTypes.Contains(resourceType))
                {
                    var resourcesOfType = resourcesByType.GetValueOrDefault(resourceType, new List<Resource>());
                    var actualItem = new Dictionary<string, object>
                    {
                        ["id"] = resourceType,
                        ["resourceType"] = resourceType,
                        ["count"] = kvp.Value
                    };
                    
                    // Add examples (max 3)
                    if (resourcesOfType.Any())
                    {
                        var examples = resourcesOfType.Take(3).Select((r, idx) =>
                        {
                            var entryIndex = bundle.Entry.FindIndex(e => e.Resource == r);
                            return new Dictionary<string, object?>
                            {
                                ["jsonPointer"] = $"/entry/{entryIndex}/resource",
                                ["fullUrl"] = bundle.Entry[entryIndex].FullUrl,
                                ["resourceId"] = r.Id
                            };
                        }).ToList();
                        
                        actualItem["examples"] = examples;
                    }
                    
                    actualStructure.Add(actualItem);
                }
            }
        }
        
        // Build diff structure
        var missing = new List<Dictionary<string, object>>();
        var unexpected = new List<Dictionary<string, object>>();
        
        // Check for missing/insufficient resources
        foreach (var requirement in requirements)
        {
            var actualCount = matchingCounts.GetValueOrDefault(requirement.ResourceType, 0);
            var isExactMode = requirement.Max.HasValue && requirement.Max.Value == requirement.Min;
            var meetsMin = actualCount >= requirement.Min;
            var meetsExact = !isExactMode || actualCount == requirement.Min;
            
            if (!meetsMin || !meetsExact)
            {
                var filterLabel = requirement.Where != null && requirement.Where.Any()
                    ? $"{requirement.ResourceType} ({requirement.Where.First().Path} {requirement.Where.First().Op} {requirement.Where.First().Value})"
                    : requirement.ResourceType;
                
                missing.Add(new Dictionary<string, object>
                {
                    ["expectedId"] = requirement.ResourceType,
                    ["resourceType"] = requirement.ResourceType,
                    ["expectedMin"] = requirement.Min,
                    ["actualCount"] = actualCount,
                    ["filterLabel"] = filterLabel
                });
            }
        }
        
        // Check for unexpected resources
        if (rejectUndeclaredResources)
        {
            foreach (var kvp in allResourceCounts)
            {
                var resourceType = kvp.Key;
                if (!declaredResourceTypes.Contains(resourceType))
                {
                    var resourcesOfType = resourcesByType.GetValueOrDefault(resourceType, new List<Resource>());
                    var unexpectedItem = new Dictionary<string, object>
                    {
                        ["resourceType"] = resourceType,
                        ["count"] = kvp.Value
                    };
                    
                    // Add examples (max 3)
                    if (resourcesOfType.Any())
                    {
                        var examples = resourcesOfType.Take(3).Select((r, idx) =>
                        {
                            var entryIndex = bundle.Entry.FindIndex(e => e.Resource == r);
                            return new Dictionary<string, object?>
                            {
                                ["jsonPointer"] = $"/entry/{entryIndex}/resource",
                                ["fullUrl"] = bundle.Entry[entryIndex].FullUrl,
                                ["resourceId"] = r.Id
                            };
                        }).ToList();
                        
                        unexpectedItem["examples"] = examples;
                    }
                    
                    unexpected.Add(unexpectedItem);
                }
            }
        }
        
        // If any violations found, emit single consolidated error
        if (missing.Any() || unexpected.Any())
        {
            var details = new Dictionary<string, object>
            {
                ["source"] = "ProjectRule",
                ["resourceType"] = rule.ResourceType,
                ["path"] = rule.FieldPath,
                ["ruleType"] = rule.Type,
                ["ruleId"] = rule.Id,
                ["expected"] = expectedStructure,
                ["actual"] = actualStructure,
                ["diff"] = new Dictionary<string, object>
                {
                    ["missing"] = missing,
                    ["unexpected"] = unexpected
                }
            };
            
            details["explanation"] = GetExplanation(rule.Type, ValidationErrorCodes.RESOURCE_REQUIREMENT_VIOLATION, details);
            
            errors.Add(new RuleValidationError
            {
                RuleId = rule.Id,
                RuleType = rule.Type,
                Severity = rule.Severity,
                ResourceType = rule.ResourceType,
                FieldPath = rule.FieldPath,
                ErrorCode = ValidationErrorCodes.RESOURCE_REQUIREMENT_VIOLATION,
                Details = details,
                EntryIndex = null, // Bundle-level validation
                ResourceId = null  // No specific resource
            });
        }
        
        return errors;
    }
    
    private IEnumerable<object> EvaluateFhirPath(
        Resource resource,
        string path,
        RuleDefinition rule,
        int entryIndex,
        List<RuleValidationError> errors)
    {
        try
        {
            var compiled = _compiler.Compile(path);
            
            // Convert Resource POCO to ITypedElement - R4 SDK works directly on POCO
            var typedElement = resource.ToTypedElement();
            var scopedNode = new ScopedNode(typedElement);
            
            // Use new EvaluationContext() instead of deprecated CreateDefault()
            var result = compiled(scopedNode, new EvaluationContext());
            return result.ToList();
        }
        catch (Exception ex)
        {
            // Categorize error type
            var errorCategory = ex.GetType().Name.Contains("Compile") || ex.Message.Contains("parse") 
                ? "FHIRPATH_SYNTAX" 
                : "FHIRPATH_RUNTIME";
            
            // Provide helpful suggestion based on error type
            var suggestion = errorCategory == "FHIRPATH_SYNTAX"
                ? "Check FHIRPath syntax: verify property names, array indexing (e.g., [0]), and path structure match the FHIR resource schema."
                : "Check runtime evaluation: ensure the resource has the expected structure and the path navigates existing elements.";
            
            // FHIRPath compilation or evaluation failed - create user-visible error
            errors.Add(new RuleValidationError
            {
                RuleId = rule.Id,
                RuleType = rule.Type,
                Severity = "error",
                ResourceType = rule.ResourceType,
                FieldPath = rule.FieldPath,
                ErrorCode = "RULE_DEFINITION_ERROR",
                Details = new Dictionary<string, object>
                {
                    ["source"] = "ProjectRule",
                    ["resourceType"] = rule.ResourceType,
                    ["path"] = rule.FieldPath,
                    ["ruleType"] = rule.Type,
                    ["ruleId"] = rule.Id,
                    ["fhirPath"] = path,
                    ["exceptionType"] = ex.GetType().Name,
                    ["exceptionMessage"] = ex.Message,
                    ["errorCategory"] = errorCategory,
                    ["suggestion"] = suggestion,
                    ["explanation"] = $"This FHIRPath expression could not be evaluated. {suggestion}"
                },
                EntryIndex = entryIndex,
                ResourceId = resource.Id
            });
            
            return Enumerable.Empty<object>();
        }
    }
    
    private string? GetValueAsString(object item)
    {
        if (item == null)
            return null;
        
        if (item is FhirString fs)
            return fs.Value;
        
        if (item is Hl7.Fhir.ElementModel.ITypedElement te)
            return te.Value?.ToString();
        
        if (item is Code code)
            return code.Value;
        
        if (item is FhirBoolean fb)
            return fb.Value?.ToString();
        
        return item.ToString();
    }
    
    private List<string> GetAllowedValues(object values)
    {
        if (values is JsonElement je && je.ValueKind == JsonValueKind.Array)
        {
            return je.EnumerateArray()
                .Select(e => e.GetString() ?? "")
                .Where(s => !string.IsNullOrEmpty(s))
                .ToList();
        }
        
        if (values is IEnumerable<string> stringList)
        {
            return stringList.ToList();
        }
        
        if (values is IEnumerable<object> list)
        {
            return list.Select(v => v.ToString() ?? "").ToList();
        }
        
        return new List<string>();
    }
    
    private RuleValidationError CreateErrorFromException(Resource resource, RuleDefinition rule, int entryIndex, Exception ex)
    {
        return new RuleValidationError
        {
            RuleId = rule.Id,
            RuleType = rule.Type,
            Severity = "error",
            ResourceType = rule.ResourceType,
            FieldPath = rule.FieldPath,
            ErrorCode = "RULE_EVALUATION_ERROR",
            EntryIndex = entryIndex,
            ResourceId = resource.Id
        };
    }
    
    /// <summary>
    /// Generate deterministic, clear explanations for rule validation errors.
    /// Explanations are business-focused and specify impact on downstream workflows.
    /// </summary>
    private string GetExplanation(string ruleType, string? errorCode, Dictionary<string, object>? details = null)
    {
        return ruleType.ToUpperInvariant() switch
        {
            "REQUIRED" => 
                "This field is mandatory according to your project's business rules. " +
                "Without this field, downstream business workflows cannot process this resource correctly.",
            
            "FIXEDVALUE" when errorCode == "FIXED_VALUE_MISMATCH" => 
                $"This field must have the exact value '{details?.GetValueOrDefault("expected")}' as defined in your business rules. " +
                $"Found '{details?.GetValueOrDefault("actual")}' instead. " +
                "Fixed values ensure consistency across resources and prevent processing errors in dependent systems.",
            
            "ALLOWEDVALUES" when errorCode == "VALUE_NOT_ALLOWED" =>
                $"The value '{details?.GetValueOrDefault("actual")}' is not in the approved list for this field. " +
                "Only pre-approved values are allowed to ensure data quality, enable correct system routing, and maintain referential integrity with master data.",
            
            "REGEX" when errorCode == "PATTERN_MISMATCH" =>
                $"The value '{details?.GetValueOrDefault("actual")}' does not match the required format pattern. " +
                "Format validation ensures this field can be parsed correctly by downstream systems and maintains data consistency (e.g., phone numbers, identifiers, codes).",
            
            "ARRAYLENGTH" when errorCode == "ARRAY_TOO_SHORT" =>
                $"This array must contain at least {details?.GetValueOrDefault("min")} item(s) according to your business rules. " +
                $"Currently it has {details?.GetValueOrDefault("actual")} item(s). " +
                "Minimum array length ensures required information is present for complete resource processing.",
            
            "ARRAYLENGTH" when errorCode == "ARRAY_TOO_LONG" =>
                $"This array can contain at most {details?.GetValueOrDefault("max")} item(s) according to your business rules. " +
                $"Currently it has {details?.GetValueOrDefault("actual")} item(s). " +
                "Maximum array length prevents data overflow and ensures compatibility with system constraints.",
            
            "REFERENCE" when errorCode == "REFERENCE_NOT_FOUND" =>
                "The referenced resource could not be found within this bundle. " +
                "All resource references must resolve to valid resources for proper data integrity and relationship processing.",
            
            "REFERENCE" when errorCode == "REFERENCE_TYPE_MISMATCH" =>
                $"The referenced resource type does not match the expected type. " +
                "Type mismatches prevent downstream systems from correctly processing resource relationships and may cause integration failures.",
            
            "CODESYSTEM" when errorCode == "CODESYSTEM_VIOLATION" && details?.GetValueOrDefault("violation")?.ToString() == "system" =>
                $"The code system '{details?.GetValueOrDefault("actualSystem")}' does not match the required system '{details?.GetValueOrDefault("expectedSystem")}'. " +
                "Correct code system URIs ensure terminology can be validated and interpreted consistently across all integrated systems.",
            
            "CODESYSTEM" when errorCode == "CODESYSTEM_VIOLATION" && details?.GetValueOrDefault("violation")?.ToString() == "code" =>
                $"The code '{details?.GetValueOrDefault("actualCode")}' is not valid within the required code system '{details?.GetValueOrDefault("expectedSystem")}'. " +
                "Using valid codes from the specified terminology system is essential for semantic interoperability, correct clinical interpretation, and integration with terminology services.",
            
            "CODESYSTEM" when errorCode == "CODESYSTEM_VIOLATION" =>
                "CodeSystem validation failed. Check that the code system and code value match the requirements.",
            
            "CUSTOMFHIRPATH" =>
                $"This field failed a custom business logic check defined by the FHIRPath expression: '{details?.GetValueOrDefault("expression")}'. " +
                "The expression evaluated to false, indicating the resource does not meet the specific business requirement encoded in this rule.",
            
            _ => 
                "This field does not meet the business rule requirements defined for your project. " +
                "Review the rule configuration to understand the specific validation logic and expected values."
        };
    }
    
    /// <summary>
    /// Determines if a resource should be validated against a rule based on instance scope filtering.
    /// Evaluates FHIRPath .where() filters to check if the resource matches the rule's target scope.
    /// This version works with POCO Resource objects.
    /// </summary>
    /// <param name="resource">The Resource POCO to check</param>
    /// <param name="rule">The rule definition containing potential .where() filters in the path</param>
    /// <param name="resourceType">The resource type (e.g., "Observation")</param>
    /// <returns>True if the resource matches the filter and should be validated, false otherwise</returns>
    private bool ShouldValidateResourcePoco(Resource resource, RuleDefinition rule, string resourceType)
    {
        try
        {
            // Check if InstanceScope has filter (new architecture)
            if (rule.InstanceScope == null || rule.InstanceScope is AllInstances)
            {
                // No filter present, validate all resources of this type
                _logger.LogTrace("ShouldValidateResourcePoco: No InstanceScope filter, validating resource");
                return true;
            }
            
            if (rule.InstanceScope is FirstInstance)
            {
                // First instance only - would need entry index to check
                // For now, we'll validate (refinement needed for multi-instance support)
                return true;
            }
            
            if (rule.InstanceScope is not FilteredInstances filteredScope)
            {
                // Unknown scope type, validate by default
                return true;
            }
            
            var filterExpression = filteredScope.ConditionFhirPath;
            _logger.LogTrace("ShouldValidateResourcePoco: Found filter expression: {FilterExpression}", filterExpression);
            
            // Evaluate the filter expression against the resource
            // The filter is relative to the resource, so we evaluate it directly
            var compiled = _compiler.Compile(filterExpression);
            var typedElement = resource.ToTypedElement();
            var scopedNode = new ScopedNode(typedElement);
            
            var result = compiled(scopedNode, new EvaluationContext());
            var resultList = result.ToList();
            
            // If the filter returns any true values, the resource matches
            if (resultList.Any())
            {
                // Check if result is a boolean value
                var firstResult = resultList.First();
                
                // ITypedElement wraps the actual value
                if (firstResult is ITypedElement resultElement)
                {
                    if (resultElement.Value is bool boolValue)
                    {
                        _logger.LogTrace("ShouldValidateResourcePoco: Filter evaluated to boolean {Result}", boolValue);
                        return boolValue;
                    }
                }
                
                // If filter returns non-empty results, consider it a match
                _logger.LogTrace("ShouldValidateResourcePoco: Filter returned {Count} results, considering as match", resultList.Count);
                return true;
            }
            
            // Empty result means filter didn't match
            _logger.LogTrace("ShouldValidateResourcePoco: Filter returned no results, resource doesn't match");
            return false;
        }
        catch (Exception ex)
        {
            // If filter evaluation fails, log and assume resource should be validated
            // This ensures we don't silently skip validation due to filter errors
            _logger.LogWarning("ShouldValidateResourcePoco: Error evaluating filter for rule {RuleId}: {ErrorMessage}. Proceeding with validation.", rule.Id, ex.Message);
            return true;
        }
    }
    
    /// <summary>
    /// Determines if a resource should be validated against a rule based on instance scope filtering.
    /// Evaluates FHIRPath .where() filters to check if the resource matches the rule's target scope.
    /// </summary>
    /// <param name="resource">The ISourceNode resource to check</param>
    /// <param name="rule">The rule definition containing potential .where() filters in the path</param>
    /// <param name="resourceType">The resource type (e.g., "Observation")</param>
    /// <returns>True if the resource matches the filter and should be validated, false otherwise</returns>
    private bool ShouldValidateResource(ISourceNode resource, RuleDefinition rule, string resourceType)
    {
        try
        {
            // Check if InstanceScope has filter (new architecture)
            if (rule.InstanceScope == null || rule.InstanceScope is AllInstances)
            {
                // No filter present, validate all resources of this type
                _logger.LogTrace("ShouldValidateResource: No InstanceScope filter, validating resource");
                return true;
            }
            
            if (rule.InstanceScope is FirstInstance)
            {
                // First instance only - would need entry index to check
                // For now, we'll validate (refinement needed for multi-instance support)
                return true;
            }
            
            if (rule.InstanceScope is not FilteredInstances filteredScope)
            {
                // Unknown scope type, validate by default
                return true;
            }
            
            var filterExpression = filteredScope.ConditionFhirPath;
            _logger.LogTrace("ShouldValidateResource: Found filter expression: {FilterExpression}", filterExpression);
            
            // Evaluate the filter expression against the resource
            // The filter is relative to the resource, so we evaluate it directly
            var compiled = _compiler.Compile(filterExpression);
            var typedElement = resource.ToTypedElement(ModelInfo.ModelInspector);
            var scopedNode = new ScopedNode(typedElement);
            
            var result = compiled(scopedNode, new EvaluationContext());
            var resultList = result.ToList();
            
            // If the filter returns any true values, the resource matches
            if (resultList.Any())
            {
                // Check if result is a boolean value
                var firstResult = resultList.First();
                
                // ITypedElement wraps the actual value
                if (firstResult is ITypedElement resultElement)
                {
                    if (resultElement.Value is bool boolValue)
                    {
                        _logger.LogTrace("ShouldValidateResource: Filter evaluated to boolean {Result}", boolValue);
                        return boolValue;
                    }
                }
                
                // If filter returns non-empty results, consider it a match
                _logger.LogTrace("ShouldValidateResource: Filter returned {Count} results, considering as match", resultList.Count);
                return true;
            }
            
            // Empty result means filter didn't match
            _logger.LogTrace("ShouldValidateResource: Filter returned no results, resource doesn't match");
            return false;
        }
        catch (Exception ex)
        {
            // If filter evaluation fails, log and assume resource should be validated
            // This ensures we don't silently skip validation due to filter errors
            _logger.LogWarning("ShouldValidateResource: Error evaluating filter for rule {RuleId}: {ErrorMessage}. Proceeding with validation.", rule.Id, ex.Message);
            return true;
        }
    }
    
    /// <summary>
    /// Gets the field path for evaluation from a rule, preferring the new FieldPath property
    /// over legacy Path parsing. This provides backward compatibility during migration.
    /// </summary>
    /// <param name="rule">The rule definition</param>
    /// <returns>The field path for FHIRPath evaluation relative to the resource</returns>
    /// <summary>
    /// Gets the field path for a rule. FieldPath must be populated.
    /// Phase 1: No fallback to legacy Path field.
    /// </summary>
    private string GetFieldPathForRule(RuleDefinition rule)
    {
        if (string.IsNullOrWhiteSpace(rule.FieldPath))
        {
            throw new InvalidOperationException(
                $"Rule {rule.Id} (Type: {rule.Type}, ResourceType: {rule.ResourceType}) is missing required FieldPath. " +
                "Legacy Path-based rules are no longer supported in execution. " +
                "All rules must use InstanceScope + FieldPath.");
        }
        
        return rule.FieldPath;
    }
}

/// <summary>
/// Resource requirement for RequiredResources rule validation
/// </summary>
internal class ResourceRequirement
{
    [System.Text.Json.Serialization.JsonPropertyName("resourceType")]
    public required string ResourceType { get; set; }
    
    [System.Text.Json.Serialization.JsonPropertyName("min")]
    public required int Min { get; set; }
    
    [System.Text.Json.Serialization.JsonPropertyName("max")]
    public int? Max { get; set; }
    
    [System.Text.Json.Serialization.JsonPropertyName("where")]
    public List<WhereFilter>? Where { get; set; }
}

/// <summary>
/// Filter condition for Resource requirements
/// Supports FHIRPath-based filtering before counting resources
/// </summary>
internal class WhereFilter
{
    [System.Text.Json.Serialization.JsonPropertyName("path")]
    public required string Path { get; set; }
    
    [System.Text.Json.Serialization.JsonPropertyName("op")]
    public required string Op { get; set; } // Supported: "=", "!=", "contains", "in"
    
    [System.Text.Json.Serialization.JsonPropertyName("value")]
    public object? Value { get; set; } // string for =, !=, contains | string[] for in
}
