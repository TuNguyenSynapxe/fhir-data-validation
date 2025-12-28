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

namespace Pss.FhirProcessor.Engine.RuleEngines;

/// <summary>
/// Evaluates FHIRPath-based business rules as per docs/03_rule_dsl_spec.md
/// Uses FHIR R4 specification
/// </summary>
public class FhirPathRuleEngine : IFhirPathRuleEngine
{
    private readonly FhirPathCompiler _compiler;
    private readonly ILogger<FhirPathRuleEngine> _logger;
    
    public FhirPathRuleEngine(IFhirModelResolverService modelResolver, ILogger<FhirPathRuleEngine> logger)
    {
        _compiler = new FhirPathCompiler();
        _logger = logger;
    }
    
    public async Task<List<RuleValidationError>> ValidateAsync(Bundle bundle, RuleSet ruleSet, CancellationToken cancellationToken = default)
    {
        var errors = new List<RuleValidationError>();
        
        if (ruleSet?.Rules == null || ruleSet.Rules.Count == 0)
            return errors;
        
        // Group rules by resource type
        var rulesByType = ruleSet.Rules.GroupBy(r => r.ResourceType);
        
        foreach (var resourceGroup in rulesByType)
        {
            var resourceType = resourceGroup.Key;
            var rules = resourceGroup.ToList();
            
            // Find all matching resources in bundle
            var matchingEntries = bundle.Entry
                .Where(e => e.Resource != null && e.Resource.TypeName == resourceType)
                .Select((entry, index) => new { Entry = entry, Index = index })
                .ToList();
            
            foreach (var item in matchingEntries)
            {
                var resource = item.Entry.Resource;
                var entryIndex = item.Index;
                
                foreach (var rule in rules)
                {
                    // Check if this resource matches the rule's instance scope filter
                    if (!ShouldValidateResourcePoco(resource, rule, resourceType))
                    {
                        _logger.LogTrace("ValidateAsync: Resource at entry {EntryIndex} doesn't match filter for rule {RuleId}, skipping", entryIndex, rule.Id);
                        continue;
                    }
                    
                    var ruleErrors = await ValidateRuleAsync(resource, rule, entryIndex, cancellationToken);
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
            
            // Group rules by resource type
            var rulesByType = ruleSet.Rules.GroupBy(r => r.ResourceType).ToDictionary(g => g.Key, g => g.ToList());
            
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
            
            // Extract the field path portion, removing instance scope prefix if present
            // Example: "Observation.where(code.coding.code='HS').performer.display" -> "performer.display"
            var fieldPath = ExtractFieldPathFromRulePath(rule.Path, resourceType);
            
            switch (rule.Type.ToUpperInvariant())
            {
                case "REQUIRED":
                    // Navigate to the field path and check if it exists
                    var valueNode = NavigateToPathInSourceNode(resource, fieldPath);
                    if (valueNode == null || string.IsNullOrWhiteSpace(valueNode.Text))
                    {
                        // Construct jsonPointer for SmartPath navigation (since we don't have a valid Bundle object)
                        var jsonPointer = $"/entry/{entryIndex}/resource/{fieldPath.Replace(".", "/")}";
                        
                        errors.Add(new RuleValidationError
                        {
                            RuleId = rule.Id,
                            RuleType = rule.Type,
                            Severity = rule.Severity,
                            ResourceType = resourceType ?? rule.ResourceType,
                            Path = rule.Path,
                            ErrorCode = "MANDATORY_MISSING",
                            Details = new Dictionary<string, object>
                            {
                                ["source"] = "ProjectRule",
                                ["resourceType"] = resourceType ?? rule.ResourceType,
                                ["path"] = rule.Path,
                                ["ruleId"] = rule.Id,
                                ["entryIndex"] = entryIndex,
                                ["_precomputedJsonPointer"] = jsonPointer  // Special key for UnifiedErrorModelBuilder
                            },
                            EntryIndex = entryIndex,
                            ResourceId = resourceId ?? "unknown"
                        });
                    }
                    break;
                
                case "ARRAYLENGTH":
                    // Navigate to the path and check array length
                    // For paths like "address.line", we check all addresses
                    // For paths like "address[0].line", we check ONLY the specified index
                    
                    // Extract array indices if present
                    var indexMatches = System.Text.RegularExpressions.Regex.Matches(rule.Path, @"\[(\d+)\]");
                    var cleanPath = System.Text.RegularExpressions.Regex.Replace(rule.Path, @"\[\d+\]", "");
                    var pathParts = cleanPath.Split('.');
                    var targetArrayName = pathParts.Last();
                    
                    _logger.LogTrace("ArrayLength validation: Rule {RuleId}, Path: {OriginalPath} -> {CleanPath}, Parts: {PathParts}", rule.Id, rule.Path, cleanPath, string.Join(", ", pathParts));
                    
                    if (pathParts.Length == 1)
                    {
                        // Simple path like "address" - check directly
                        var arrayNode = resource.Children(targetArrayName).ToList();
                        _logger.LogTrace("ArrayLength: Simple path {ArrayName} has {ElementCount} elements", targetArrayName, arrayNode.Count);
                        ValidateArrayLengthForNode(arrayNode.Count, rule, resourceType, resourceId, entryIndex, errors, targetArrayName);
                    }
                    else
                    {
                        // Nested path like "address.line" or "address[0].line"
                        var parentPath = string.Join(".", pathParts.Take(pathParts.Length - 1));
                        var parentNodes = resource.Children(pathParts[0]).ToList();
                        _logger.LogTrace("ArrayLength: Parent {ParentName} has {ElementCount} elements", pathParts[0], parentNodes.Count);
                        
                        // Check if first part has an array index (e.g., address[0])
                        int? specificIndex = null;
                        if (indexMatches.Count > 0 && int.TryParse(indexMatches[0].Groups[1].Value, out int idx))
                        {
                            specificIndex = idx;
                            _logger.LogTrace("ArrayLength: Checking specific index [{SpecificIndex}]", specificIndex);
                        }
                        
                        // Check each parent node (or just the specific index)
                        for (int parentIndex = 0; parentIndex < parentNodes.Count; parentIndex++)
                        {
                            // If a specific index was requested, skip other indices
                            if (specificIndex.HasValue && parentIndex != specificIndex.Value)
                            {
                                _logger.LogTrace("ArrayLength: Skipping parent[{ParentIndex}] (only checking [{SpecificIndex}])", parentIndex, specificIndex);
                                continue;
                            }
                            
                            var parentNode = parentNodes[parentIndex];
                            
                            if (pathParts.Length == 2)
                            {
                                // Direct child like "address.line"
                                var arrayElements = parentNode.Children(targetArrayName).ToList();
                                _logger.LogTrace("ArrayLength: Parent[{ParentIndex}].{ArrayName} has {ElementCount} elements", parentIndex, targetArrayName, arrayElements.Count);
                                
                                // Construct the specific path for this array instance
                                var specificArrayPath = $"{pathParts[0]}[{parentIndex}].{targetArrayName}";
                                ValidateArrayLengthForNode(arrayElements.Count, rule, resourceType, resourceId, entryIndex, errors, specificArrayPath);
                            }
                            else
                            {
                                // More complex nesting - navigate deeper
                                var currentNode = parentNode;
                                for (int i = 1; i < pathParts.Length - 1; i++)
                                {
                                    var nextNodes = currentNode.Children(pathParts[i]).ToList();
                                    if (nextNodes.Any())
                                    {
                                        currentNode = nextNodes.First();
                                    }
                                    else
                                    {
                                        currentNode = null;
                                        break;
                                    }
                                }
                                
                                if (currentNode != null)
                                {
                                    var arrayElements = currentNode.Children(targetArrayName).ToList();
                                    // For complex paths, use the original rule path
                                    ValidateArrayLengthForNode(arrayElements.Count, rule, resourceType, resourceId, entryIndex, errors, rule.Path);
                                }
                            }
                        }
                    }
                    break;
                    
                // For other rule types, we'd need more complex logic
                // For now, skip them when using JSON fallback
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
    /// Helper method to validate array length and add errors if constraints are violated
    /// </summary>
    private void ValidateArrayLengthForNode(int count, RuleDefinition rule, string? resourceType, string? resourceId, int entryIndex, List<RuleValidationError> errors, string? arrayPath = null)
    {
        bool hasError = false;
        var details = new Dictionary<string, object>
        {
            ["source"] = "ProjectRule",
            ["resourceType"] = resourceType ?? rule.ResourceType,
            ["path"] = rule.Path,
            ["ruleId"] = rule.Id,
            ["count"] = count,
            ["actual"] = count
        };
        
        _logger.LogTrace("ArrayLength validation: Count={Count}, Params={Params}", count, rule.Params != null ? string.Join(", ", rule.Params.Select(kv => $"{kv.Key}={kv.Value}")) : "null");
        
        if (rule.Params != null)
        {
            if (rule.Params.ContainsKey("min"))
            {
                var minValue = rule.Params["min"];
                int min = minValue is JsonElement jsonMin ? jsonMin.GetInt32() : Convert.ToInt32(minValue);
                details["min"] = min;
                _logger.LogTrace("ArrayLength: Min constraint {Min}, Count {Count}, Violation: {Violation}", min, count, count < min);
                
                if (count < min)
                {
                    hasError = true;
                }
            }
            
            if (rule.Params.ContainsKey("max"))
            {
                var maxValue = rule.Params["max"];
                int max = maxValue is JsonElement jsonMax ? jsonMax.GetInt32() : Convert.ToInt32(maxValue);
                details["max"] = max;
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
            // Add array path info to details for navigation
            var pathForNavigation = arrayPath ?? rule.Path;
            details["arrayPath"] = pathForNavigation;
            details["entryIndex"] = entryIndex;
            
            // Construct jsonPointer for SmartPath navigation (since we don't have a valid Bundle object)
            var jsonPointer = $"/entry/{entryIndex}/resource/{pathForNavigation.Replace(".", "/").Replace("[0]", "/0").Replace("[1]", "/1").Replace("[2]", "/2")}";
            details["_precomputedJsonPointer"] = jsonPointer;
            
            errors.Add(new RuleValidationError
            {
                RuleId = rule.Id,
                RuleType = rule.Type,
                Severity = rule.Severity,
                ResourceType = resourceType ?? rule.ResourceType,
                Path = rule.Path,
                ErrorCode = rule.ErrorCode ?? "ARRAY_LENGTH_VIOLATION",
                Details = details,
                EntryIndex = entryIndex,
                ResourceId = resourceId ?? "unknown"
            });
        }
    }
    
    private async Task<List<RuleValidationError>> ValidateRuleAsync(Resource resource, RuleDefinition rule, int entryIndex, CancellationToken cancellationToken)
    {
        var errors = new List<RuleValidationError>();
        
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
                    errors.AddRange(ValidateCodeSystem(resource, rule, entryIndex));
                    break;
                
                case "CUSTOMFHIRPATH":
                    errors.AddRange(ValidateCustomFhirPath(resource, rule, entryIndex));
                    break;
                
                case "FULLURLIDMATCH":
                    // This is bundle-level validation, skip here
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
                Path = rule.Path,
                ErrorCode = "RULE_EXECUTION_ERROR",
                Details = new Dictionary<string, object>
                {
                    ["source"] = "ProjectRule",
                    ["resourceType"] = rule.ResourceType,
                    ["path"] = rule.Path,
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
        
        // Extract field path, removing instance scope prefix
        var fieldPath = ExtractFieldPathFromRulePath(rule.Path, rule.ResourceType);
        
        var result = EvaluateFhirPath(resource, fieldPath, rule, entryIndex, errors);
        
        _logger.LogTrace("ValidateRequired: Rule {RuleId}, Path {Path}, FieldPath {FieldPath}, ResourceType {ResourceType}", rule.Id, rule.Path, fieldPath, rule.ResourceType);
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
            var details = new Dictionary<string, object>
            {
                ["source"] = "ProjectRule",
                ["resourceType"] = rule.ResourceType,
                ["path"] = rule.Path,
                ["ruleType"] = rule.Type,
                ["ruleId"] = rule.Id,
                ["isMissing"] = isMissing,
                ["isAllEmpty"] = isAllEmpty
            };
            
            details["explanation"] = GetExplanation(rule.Type, rule.ErrorCode ?? ValidationErrorCodes.FIELD_REQUIRED, details);
            
            errors.Add(new RuleValidationError
            {
                RuleId = rule.Id,
                RuleType = rule.Type,
                Severity = rule.Severity,
                ResourceType = rule.ResourceType,
                Path = rule.Path,
                ErrorCode = rule.ErrorCode ?? ValidationErrorCodes.FIELD_REQUIRED,
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
                Path = rule.Path,
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
        
        var result = EvaluateFhirPath(resource, rule.Path, rule, entryIndex, errors);
        
        if (!errors.Any(e => e.ErrorCode == "RULE_DEFINITION_ERROR"))
        {
            var expectedValue = rule.Params["value"]?.ToString();
            
            foreach (var item in result)
            {
                var actualValue = GetValueAsString(item);
                
                if (actualValue != expectedValue)
                {
                    var details = new Dictionary<string, object>
                    {
                        ["source"] = "ProjectRule",
                        ["resourceType"] = rule.ResourceType,
                        ["path"] = rule.Path,
                        ["ruleType"] = rule.Type,
                        ["ruleId"] = rule.Id,
                        ["expected"] = expectedValue ?? "",
                        ["actual"] = actualValue ?? ""
                    };
                    
                    details["explanation"] = GetExplanation(rule.Type, ValidationErrorCodes.FIXED_VALUE_MISMATCH, details);
                    
                    errors.Add(new RuleValidationError
                    {
                        RuleId = rule.Id,
                        RuleType = rule.Type,
                        Severity = rule.Severity,
                        ResourceType = rule.ResourceType,
                        Path = rule.Path,
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
                Path = rule.Path,
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
        var fieldPath = ExtractFieldPathFromRulePath(rule.Path, rule.ResourceType);
        var result = EvaluateFhirPath(resource, fieldPath, rule, entryIndex, errors);
        
        if (!errors.Any(e => e.ErrorCode == "RULE_DEFINITION_ERROR"))
        {
            var allowedValues = GetAllowedValues(rule.Params["values"]);
            
            foreach (var item in result)
            {
                var actualValue = GetValueAsString(item);
                
                if (!string.IsNullOrEmpty(actualValue) && !allowedValues.Contains(actualValue))
                {
                    var details = new Dictionary<string, object>
                    {
                        ["source"] = "ProjectRule",
                        ["resourceType"] = rule.ResourceType,
                        ["path"] = rule.Path,
                        ["ruleType"] = rule.Type,
                        ["ruleId"] = rule.Id,
                        ["actual"] = actualValue,
                        ["allowed"] = allowedValues
                    };
                    
                    details["explanation"] = GetExplanation(rule.Type, ValidationErrorCodes.VALUE_NOT_ALLOWED, details);
                    
                    errors.Add(new RuleValidationError
                    {
                        RuleId = rule.Id,
                        RuleType = rule.Type,
                        Severity = rule.Severity,
                        ResourceType = rule.ResourceType,
                        Path = rule.Path,
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
                Path = rule.Path,
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
        var fieldPath = ExtractFieldPathFromRulePath(rule.Path, rule.ResourceType);
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
                    var details = new Dictionary<string, object>
                    {
                        ["source"] = "ProjectRule",
                        ["resourceType"] = rule.ResourceType,
                        ["path"] = rule.Path,
                        ["ruleType"] = rule.Type,
                        ["ruleId"] = rule.Id,
                        ["actual"] = actualValue,
                        ["pattern"] = pattern
                    };
                    
                    details["explanation"] = GetExplanation(rule.Type, ValidationErrorCodes.PATTERN_MISMATCH, details);
                    
                    errors.Add(new RuleValidationError
                    {
                        RuleId = rule.Id,
                        RuleType = rule.Type,
                        Severity = rule.Severity,
                        ResourceType = rule.ResourceType,
                        Path = rule.Path,
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
                Path = rule.Path,
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
        var fieldPath = ExtractFieldPathFromRulePath(rule.Path, rule.ResourceType);
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
                    var details = new Dictionary<string, object>
                    {
                        ["source"] = "ProjectRule",
                        ["resourceType"] = rule.ResourceType,
                        ["path"] = rule.Path,
                        ["ruleType"] = rule.Type,
                        ["ruleId"] = rule.Id,
                        ["count"] = count,
                        ["actual"] = count,
                        ["min"] = min,
                        ["violation"] = "min"
                    };
                    
                    details["explanation"] = GetExplanation(rule.Type, ValidationErrorCodes.ARRAY_LENGTH_VIOLATION, details);
                    
                    errors.Add(new RuleValidationError
                    {
                        RuleId = rule.Id,
                        RuleType = rule.Type,
                        Severity = rule.Severity,
                        ResourceType = rule.ResourceType,
                        Path = rule.Path,
                        ErrorCode = ValidationErrorCodes.ARRAY_LENGTH_VIOLATION,
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
                    var details = new Dictionary<string, object>
                    {
                        ["source"] = "ProjectRule",
                        ["resourceType"] = rule.ResourceType,
                        ["path"] = rule.Path,
                        ["ruleType"] = rule.Type,
                        ["ruleId"] = rule.Id,
                        ["count"] = count,
                        ["actual"] = count,
                        ["max"] = max,
                        ["violation"] = "max"
                    };
                    
                    details["explanation"] = GetExplanation(rule.Type, ValidationErrorCodes.ARRAY_LENGTH_VIOLATION, details);
                    
                    errors.Add(new RuleValidationError
                    {
                        RuleId = rule.Id,
                        RuleType = rule.Type,
                        Severity = rule.Severity,
                        ResourceType = rule.ResourceType,
                        Path = rule.Path,
                        ErrorCode = ValidationErrorCodes.ARRAY_LENGTH_VIOLATION,
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
    /// Validates CodeSystem rules.
    /// 
    /// UX CONTRACT:
    /// - ErrorCode is FIXED at CODESYSTEM_VIOLATION (runtime ignores rule.ErrorCode)
    /// - Details["violation"] distinguishes "system" vs "code" failure
    /// - Frontend UI must treat CodeSystem errorCode as read-only
    /// - Rule authoring UI should display: "Error Code: CODESYSTEM_VIOLATION (fixed)"
    /// </summary>
    private List<RuleValidationError> ValidateCodeSystem(Resource resource, RuleDefinition rule, int entryIndex)
    {
        var errors = new List<RuleValidationError>();
        
        if (rule.Params == null || !rule.Params.ContainsKey("system"))
        {
            errors.Add(new RuleValidationError
            {
                RuleId = rule.Id,
                RuleType = rule.Type,
                Severity = "error",
                ResourceType = rule.ResourceType,
                Path = rule.Path,
                ErrorCode = "RULE_CONFIGURATION_ERROR",
                Details = new Dictionary<string, object>
                {
                    ["ruleType"] = "CodeSystem",
                    ["missingParams"] = new[] { "system" }
                },
                EntryIndex = entryIndex,
                ResourceId = resource.Id
            });
            return errors;
        }
        
        // Extract field path, removing instance scope prefix
        var fieldPath = ExtractFieldPathFromRulePath(rule.Path, rule.ResourceType);
        var result = EvaluateFhirPath(resource, fieldPath, rule, entryIndex, errors);
        
        if (!errors.Any(e => e.ErrorCode == "RULE_DEFINITION_ERROR"))
        {
            var expectedSystem = rule.Params["system"]?.ToString();
            var allowedCodes = rule.Params.ContainsKey("codes") 
                ? GetAllowedValues(rule.Params["codes"]) 
                : new List<string>();
            
            foreach (var item in result)
            {
                // Handle Coding type
                if (item is Coding coding)
                {
                    if (coding.System != expectedSystem)
                    {
                        var details = new Dictionary<string, object>
                        {
                            ["source"] = "ProjectRule",
                            ["resourceType"] = rule.ResourceType,
                            ["path"] = rule.Path,
                            ["ruleType"] = rule.Type,
                            ["ruleId"] = rule.Id,
                            ["violation"] = "system",
                            ["expectedSystem"] = expectedSystem ?? "",
                            ["actualSystem"] = coding.System ?? "",
                            ["actualCode"] = coding.Code ?? "",
                            ["actualDisplay"] = coding.Display ?? ""
                        };
                        
                        details["explanation"] = GetExplanation(rule.Type, ValidationErrorCodes.CODESYSTEM_VIOLATION, details);
                        
                        errors.Add(new RuleValidationError
                        {
                            RuleId = rule.Id,
                            RuleType = rule.Type,
                            Severity = rule.Severity,
                            ResourceType = rule.ResourceType,
                            Path = rule.Path,
                            ErrorCode = ValidationErrorCodes.CODESYSTEM_VIOLATION,
                            Details = details,
                            EntryIndex = entryIndex,
                            ResourceId = resource.Id
                        });
                    }
                    else if (allowedCodes.Any() && !allowedCodes.Contains(coding.Code))
                    {
                        var details = new Dictionary<string, object>
                        {
                            ["source"] = "ProjectRule",
                            ["resourceType"] = rule.ResourceType,
                            ["path"] = rule.Path,
                            ["ruleType"] = rule.Type,
                            ["ruleId"] = rule.Id,
                            ["violation"] = "code",
                            ["expectedSystem"] = expectedSystem ?? "",
                            ["actualSystem"] = coding.System ?? "",
                            ["actualCode"] = coding.Code ?? "",
                            ["actualDisplay"] = coding.Display ?? "",
                            ["allowedCodes"] = allowedCodes
                        };
                        
                        details["explanation"] = GetExplanation(rule.Type, ValidationErrorCodes.CODESYSTEM_VIOLATION, details);
                        
                        errors.Add(new RuleValidationError
                        {
                            RuleId = rule.Id,
                            RuleType = rule.Type,
                            Severity = rule.Severity,
                            ResourceType = rule.ResourceType,
                            Path = rule.Path,
                            ErrorCode = ValidationErrorCodes.CODESYSTEM_VIOLATION,
                            Details = details,
                            EntryIndex = entryIndex,
                            ResourceId = resource.Id
                        });
                    }
                }
            }
        }
        
        return errors;
    }
    
    /// <summary>
    /// Validates CustomFHIRPath rules.
    /// 
    /// GOVERNANCE CONTRACT:
    /// - errorCode is REQUIRED and user-defined (no default fallback)
    /// - Runtime never invents or chooses errorCode
    /// - Governance enforces errorCode exists and is a known ValidationErrorCode
    /// - CustomFHIRPath emits advisory WARNING due to semantic complexity
    /// 
    /// UX CONTRACT:
    /// - Frontend must provide errorCode selector for CustomFHIRPath
    /// - Only known errorCodes from ValidationErrorCodes can be used
    /// - User is responsible for selecting appropriate semantic errorCode
    /// </summary>
    private List<RuleValidationError> ValidateCustomFhirPath(Resource resource, RuleDefinition rule, int entryIndex)
    {
        var errors = new List<RuleValidationError>();
        
        // Defensive guard: errorCode must be present (governance + ParseRuleSet should prevent this)
        if (string.IsNullOrWhiteSpace(rule.ErrorCode))
        {
            errors.Add(new RuleValidationError
            {
                RuleId = rule.Id,
                RuleType = rule.Type,
                Severity = "error",
                ResourceType = rule.ResourceType,
                Path = rule.Path,
                ErrorCode = "RULE_DEFINITION_ERROR",
                Details = new Dictionary<string, object>
                {
                    ["source"] = "ProjectRule",
                    ["ruleType"] = rule.Type,
                    ["ruleId"] = rule.Id,
                    ["reason"] = "CustomFHIRPath rules require explicit errorCode"
                },
                EntryIndex = entryIndex,
                ResourceId = resource.Id
            });
            return errors;
        }
        
        // Extract field path, removing instance scope prefix
        var fieldPath = ExtractFieldPathFromRulePath(rule.Path, rule.ResourceType);
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
                    ["path"] = rule.Path,
                    ["ruleType"] = rule.Type,
                    ["ruleId"] = rule.Id,
                    ["expression"] = rule.Path,
                    ["evaluationResult"] = "false"
                };
                
                details["explanation"] = GetExplanation(rule.Type, rule.ErrorCode!, details);
                
                errors.Add(new RuleValidationError
                {
                    RuleId = rule.Id,
                    RuleType = rule.Type,
                    Severity = rule.Severity,
                    ResourceType = rule.ResourceType,
                    Path = rule.Path,
                    ErrorCode = rule.ErrorCode!,
                    Details = details,
                    EntryIndex = entryIndex,
                    ResourceId = resource.Id
                });
            }
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
                Path = rule.Path,
                ErrorCode = "RULE_DEFINITION_ERROR",
                Details = new Dictionary<string, object>
                {
                    ["source"] = "ProjectRule",
                    ["resourceType"] = rule.ResourceType,
                    ["path"] = rule.Path,
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
            Path = rule.Path,
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
            var path = rule.Path;
            
            // Check if path contains a .where() filter (instance scope)
            // Example: "Observation.where(code.coding.code='HS').performer.display"
            var whereMatch = Regex.Match(path, $@"^{Regex.Escape(resourceType)}\.where\(([^)]+)\)");
            
            if (!whereMatch.Success)
            {
                // No filter present, validate all resources of this type
                _logger.LogTrace("ShouldValidateResourcePoco: No .where() filter in path, validating resource");
                return true;
            }
            
            var filterExpression = whereMatch.Groups[1].Value;
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
            var path = rule.Path;
            
            // Check if path contains a .where() filter (instance scope)
            // Example: "Observation.where(code.coding.code='HS').performer.display"
            var whereMatch = Regex.Match(path, $@"^{Regex.Escape(resourceType)}\.where\(([^)]+)\)");
            
            if (!whereMatch.Success)
            {
                // No filter present, validate all resources of this type
                _logger.LogTrace("ShouldValidateResource: No .where() filter in path, validating resource");
                return true;
            }
            
            var filterExpression = whereMatch.Groups[1].Value;
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
    /// Extracts the field path portion from a full rule path by removing the instance scope prefix.
    /// Examples:
    /// - "Observation.where(code.coding.code='HS').performer.display" -> "performer.display"
    /// - "Patient.name.given" -> "name.given"
    /// - "Observation[0].status" -> "status" (for array-indexed paths)
    /// </summary>
    /// <param name="rulePath">The full rule path from the rule definition</param>
    /// <param name="resourceType">The resource type to match and remove</param>
    /// <returns>The field path without the instance scope prefix</returns>
    private string ExtractFieldPathFromRulePath(string rulePath, string resourceType)
    {
        // Pattern 1: "ResourceType.where(...).fieldPath"
        var whereMatch = Regex.Match(rulePath, $@"^{Regex.Escape(resourceType)}\.where\([^)]+\)\.(.+)$");
        if (whereMatch.Success)
        {
            return whereMatch.Groups[1].Value;
        }
        
        // Pattern 2: "ResourceType[n].fieldPath" (array-indexed)
        var arrayMatch = Regex.Match(rulePath, $@"^{Regex.Escape(resourceType)}\[\d+\]\.(.+)$");
        if (arrayMatch.Success)
        {
            return arrayMatch.Groups[1].Value;
        }
        
        // Pattern 3: "ResourceType.fieldPath" (simple path)
        if (rulePath.StartsWith($"{resourceType}."))
        {
            return rulePath.Substring(resourceType.Length + 1);
        }
        
        // If no match, return the original path (shouldn't happen, but safe fallback)
        return rulePath;
    }
}
