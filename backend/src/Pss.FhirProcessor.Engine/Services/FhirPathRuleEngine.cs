using System.Text.Json;
using System.Text.RegularExpressions;
using Hl7.Fhir.Model;
using Hl7.FhirPath;
using Hl7.Fhir.Serialization;
using Hl7.Fhir.ElementModel;
using Pss.FhirProcessor.Engine.Models;
using Pss.FhirProcessor.Engine.Interfaces;

namespace Pss.FhirProcessor.Engine.Services;

/// <summary>
/// Evaluates FHIRPath-based business rules as per docs/03_rule_dsl_spec.md
/// Uses FHIR R4 specification
/// </summary>
public class FhirPathRuleEngine : IFhirPathRuleEngine
{
    private readonly FhirPathCompiler _compiler;
    
    public FhirPathRuleEngine(IFhirModelResolverService modelResolver)
    {
        _compiler = new FhirPathCompiler();
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
            return errors;
        
        try
        {
            // Parse JSON to ISourceNode (doesn't require valid FHIR structure)
            var sourceNode = FhirJsonNode.Parse(bundleJson);
            
            // Use simpler approach: just navigate the structure without type validation
            // This avoids needing StructureDefinitionSummaryProvider
            
            // Extract entry resources from bundle
            var entryNodes = sourceNode.Children("entry").ToList();
            
            // Group rules by resource type
            var rulesByType = ruleSet.Rules.GroupBy(r => r.ResourceType);
            
            for (int entryIndex = 0; entryIndex < entryNodes.Count; entryIndex++)
            {
                var entry = entryNodes[entryIndex];
                var resourceNode = entry.Children("resource").FirstOrDefault();
                
                if (resourceNode == null)
                    continue;
                
                // Get resource type from JSON
                var resourceTypeNode = resourceNode.Children("resourceType").FirstOrDefault();
                if (resourceTypeNode == null)
                    continue;
                    
                var resourceType = resourceTypeNode.Text;
                if (string.IsNullOrEmpty(resourceType))
                    continue;
                
                // Find matching rules for this resource type
                var matchingRules = rulesByType.FirstOrDefault(g => g.Key == resourceType);
                if (matchingRules == null)
                    continue;
                
                foreach (var rule in matchingRules)
                {
                    try
                    {
                        var ruleErrors = ValidateRuleOnSourceNode(resourceNode, rule, entryIndex, resourceType);
                        errors.AddRange(ruleErrors);
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"Error validating rule {rule.Id} on JSON: {ex.Message}");
                        // Continue with other rules
                    }
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error parsing JSON for rule validation: {ex.Message}");
            // Return empty list - we've already captured Firely errors
        }
        
        return await System.Threading.Tasks.Task.FromResult(errors);
    }
    
    /// <summary>
    /// Validates a single rule against an ISourceNode resource
    /// Simplified validation that works with partially-valid structures
    /// </summary>
    private List<RuleValidationError> ValidateRuleOnSourceNode(ISourceNode resource, RuleDefinition rule, int entryIndex, string resourceType)
    {
        var errors = new List<RuleValidationError>();
        
        try
        {
            // Get resource ID for error reporting
            var idNode = resource.Children("id").FirstOrDefault();
            var resourceId = idNode?.Text;
            
            switch (rule.Type.ToUpperInvariant())
            {
                case "REQUIRED":
                    // Navigate to the path and check if it exists
                    var valueNode = NavigateToPathInSourceNode(resource, rule.Path);
                    if (valueNode == null || string.IsNullOrWhiteSpace(valueNode.Text))
                    {
                        errors.Add(new RuleValidationError
                        {
                            RuleId = rule.Id,
                            RuleType = rule.Type,
                            Severity = "error",
                            ResourceType = resourceType ?? rule.ResourceType,
                            Path = rule.Path,
                            ErrorCode = "MANDATORY_MISSING",
                            Message = $"Required field '{rule.Path}' is missing or empty",
                            Details = new Dictionary<string, object>
                            {
                                ["source"] = "ProjectRule",
                                ["resourceType"] = resourceType ?? rule.ResourceType,
                                ["path"] = rule.Path,
                                ["ruleId"] = rule.Id
                            },
                            EntryIndex = entryIndex,
                            ResourceId = resourceId ?? "unknown"
                        });
                    }
                    break;
                    
                // For other rule types, we'd need more complex logic
                // For now, skip them when using JSON fallback
                default:
                    break;
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error in ValidateRuleOnSourceNode: {ex.Message}");
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
                Message = $"Error executing rule {rule.Id}: {ex.Message}",
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
        
        var result = EvaluateFhirPath(resource, rule.Path, rule, entryIndex, errors);
        
        Console.WriteLine($"[ValidateRequired] Rule: {rule.Id}, Path: {rule.Path}, ResourceType: {rule.ResourceType}");
        Console.WriteLine($"[ValidateRequired] Result count: {result?.Count() ?? 0}");
        
        // Check if result is missing OR if all values are empty/whitespace
        var isMissing = result == null || !result.Any();
        var isAllEmpty = false;
        
        if (!isMissing)
        {
            foreach (var r in result)
            {
                var strValue = GetValueAsString(r);
                Console.WriteLine($"[ValidateRequired] Value: '{strValue}', IsNullOrWhiteSpace: {string.IsNullOrWhiteSpace(strValue)}");
            }
            
            isAllEmpty = result.All(r => 
            {
                var strValue = GetValueAsString(r);
                return string.IsNullOrWhiteSpace(strValue);
            });
        }
        
        Console.WriteLine($"[ValidateRequired] isMissing: {isMissing}, isAllEmpty: {isAllEmpty}");
        
        if (!errors.Any(e => e.ErrorCode == "RULE_DEFINITION_ERROR") && (isMissing || isAllEmpty))
        {
            var resolvedMessage = MessageTokenResolver.ResolveTokens(rule.Message, rule);
            
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
            
            details["explanation"] = GetExplanation(rule.Type, rule.ErrorCode ?? "MANDATORY_MISSING", details);
            
            errors.Add(new RuleValidationError
            {
                RuleId = rule.Id,
                RuleType = rule.Type,
                Severity = rule.Severity,
                ResourceType = rule.ResourceType,
                Path = rule.Path,
                ErrorCode = rule.ErrorCode ?? "MANDATORY_MISSING",
                Message = resolvedMessage,
                Details = details,
                EntryIndex = entryIndex,
                ResourceId = resource.Id
            });
        }
        
        return errors;
    }
    
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
                Message = $"Rule '{rule.Id}' (FixedValue) is missing required parameter 'value'.",
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
                    var runtimeContext = new Dictionary<string, object>
                    {
                        ["expected"] = expectedValue ?? "",
                        ["actual"] = actualValue ?? ""
                    };
                    
                    var resolvedMessage = MessageTokenResolver.ResolveTokens(rule.Message, rule, runtimeContext);
                    
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
                    
                    details["explanation"] = GetExplanation(rule.Type, rule.ErrorCode ?? "FIXED_VALUE_MISMATCH", details);
                    
                    errors.Add(new RuleValidationError
                    {
                        RuleId = rule.Id,
                        RuleType = rule.Type,
                        Severity = rule.Severity,
                        ResourceType = rule.ResourceType,
                        Path = rule.Path,
                        ErrorCode = rule.ErrorCode ?? "FIXED_VALUE_MISMATCH",
                        Message = resolvedMessage,
                        Details = details,
                        EntryIndex = entryIndex,
                        ResourceId = resource.Id
                    });
                }
            }
        }
        
        return errors;
    }
    
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
                Message = $"Rule '{rule.Id}' (AllowedValues) is missing required parameter 'values'.",
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
        
        var result = EvaluateFhirPath(resource, rule.Path, rule, entryIndex, errors);
        
        if (!errors.Any(e => e.ErrorCode == "RULE_DEFINITION_ERROR"))
        {
            var allowedValues = GetAllowedValues(rule.Params["values"]);
            
            foreach (var item in result)
            {
                var actualValue = GetValueAsString(item);
                
                if (!string.IsNullOrEmpty(actualValue) && !allowedValues.Contains(actualValue))
                {
                    var runtimeContext = new Dictionary<string, object>
                    {
                        ["actual"] = actualValue,
                        ["allowed"] = string.Join(", ", allowedValues.Select(v => $"\"{v}\""))
                    };
                    
                    var resolvedMessage = MessageTokenResolver.ResolveTokens(rule.Message, rule, runtimeContext);
                    
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
                    
                    details["explanation"] = GetExplanation(rule.Type, rule.ErrorCode ?? "VALUE_NOT_ALLOWED", details);
                    
                    errors.Add(new RuleValidationError
                    {
                        RuleId = rule.Id,
                        RuleType = rule.Type,
                        Severity = rule.Severity,
                        ResourceType = rule.ResourceType,
                        Path = rule.Path,
                        ErrorCode = rule.ErrorCode ?? "VALUE_NOT_ALLOWED",
                        Message = resolvedMessage,
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
                Message = $"Rule '{rule.Id}' (Regex) is missing required parameter 'pattern'.",
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
        
        var result = EvaluateFhirPath(resource, rule.Path, rule, entryIndex, errors);
        
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
                    var runtimeContext = new Dictionary<string, object>
                    {
                        ["actual"] = actualValue
                    };
                    
                    var resolvedMessage = MessageTokenResolver.ResolveTokens(rule.Message, rule, runtimeContext);
                    
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
                    
                    details["explanation"] = GetExplanation(rule.Type, rule.ErrorCode ?? "PATTERN_MISMATCH", details);
                    
                    errors.Add(new RuleValidationError
                    {
                        RuleId = rule.Id,
                        RuleType = rule.Type,
                        Severity = rule.Severity,
                        ResourceType = rule.ResourceType,
                        Path = rule.Path,
                        ErrorCode = rule.ErrorCode ?? "PATTERN_MISMATCH",
                        Message = resolvedMessage,
                        Details = details,
                        EntryIndex = entryIndex,
                        ResourceId = resource.Id
                    });
                }
            }
        }
        
        return errors;
    }
    
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
                Message = $"Rule '{rule.Id}' (ArrayLength) is missing required parameters. At least one of 'min' or 'max' must be specified.",
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
        
        var result = EvaluateFhirPath(resource, rule.Path, rule, entryIndex, errors);
        
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
                    var runtimeContext = new Dictionary<string, object>
                    {
                        ["actual"] = count.ToString()
                    };
                    
                    var resolvedMessage = MessageTokenResolver.ResolveTokens(rule.Message, rule, runtimeContext);
                    
                    var details = new Dictionary<string, object>
                    {
                        ["source"] = "ProjectRule",
                        ["resourceType"] = rule.ResourceType,
                        ["path"] = rule.Path,
                        ["ruleType"] = rule.Type,
                        ["ruleId"] = rule.Id,
                        ["count"] = count,
                        ["actual"] = count,
                        ["min"] = min
                    };
                    
                    details["explanation"] = GetExplanation(rule.Type, rule.ErrorCode ?? "ARRAY_TOO_SHORT", details);
                    
                    errors.Add(new RuleValidationError
                    {
                        RuleId = rule.Id,
                        RuleType = rule.Type,
                        Severity = rule.Severity,
                        ResourceType = rule.ResourceType,
                        Path = rule.Path,
                        ErrorCode = rule.ErrorCode ?? "ARRAY_TOO_SHORT",
                        Message = resolvedMessage,
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
                    var runtimeContext = new Dictionary<string, object>
                    {
                        ["actual"] = count.ToString()
                    };
                    
                    var resolvedMessage = MessageTokenResolver.ResolveTokens(rule.Message, rule, runtimeContext);
                    
                    var details = new Dictionary<string, object>
                    {
                        ["source"] = "ProjectRule",
                        ["resourceType"] = rule.ResourceType,
                        ["path"] = rule.Path,
                        ["ruleType"] = rule.Type,
                        ["ruleId"] = rule.Id,
                        ["count"] = count,
                        ["actual"] = count,
                        ["max"] = max
                    };
                    
                    details["explanation"] = GetExplanation(rule.Type, rule.ErrorCode ?? "ARRAY_TOO_LONG", details);
                    
                    errors.Add(new RuleValidationError
                    {
                        RuleId = rule.Id,
                        RuleType = rule.Type,
                        Severity = rule.Severity,
                        ResourceType = rule.ResourceType,
                        Path = rule.Path,
                        ErrorCode = rule.ErrorCode ?? "ARRAY_TOO_LONG",
                        Message = resolvedMessage,
                        Details = details,
                        EntryIndex = entryIndex,
                        ResourceId = resource.Id
                    });
                }
            }
        }
        
        return errors;
    }
    
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
                Message = $"Rule '{rule.Id}' (CodeSystem) is missing required parameter 'system'.",
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
        
        var result = EvaluateFhirPath(resource, rule.Path, rule, entryIndex, errors);
        
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
                        var runtimeContext = new Dictionary<string, object>
                        {
                            ["code"] = coding.Code ?? "",
                            ["display"] = coding.Display ?? ""
                        };
                        
                        var resolvedMessage = MessageTokenResolver.ResolveTokens(rule.Message, rule, runtimeContext);
                        
                        var details = new Dictionary<string, object>
                        {
                            ["source"] = "ProjectRule",
                            ["resourceType"] = rule.ResourceType,
                            ["path"] = rule.Path,
                            ["ruleType"] = rule.Type,
                            ["ruleId"] = rule.Id,
                            ["expectedSystem"] = expectedSystem ?? "",
                            ["actualSystem"] = coding.System ?? "",
                            ["actualCode"] = coding.Code ?? "",
                            ["actualDisplay"] = coding.Display ?? ""
                        };
                        
                        details["explanation"] = GetExplanation(rule.Type, rule.ErrorCode ?? "INVALID_SYSTEM", details);
                        
                        errors.Add(new RuleValidationError
                        {
                            RuleId = rule.Id,
                            RuleType = rule.Type,
                            Severity = rule.Severity,
                            ResourceType = rule.ResourceType,
                            Path = rule.Path,
                            ErrorCode = rule.ErrorCode ?? "INVALID_SYSTEM",
                            Message = resolvedMessage,
                            Details = details,
                            EntryIndex = entryIndex,
                            ResourceId = resource.Id
                        });
                    }
                    else if (allowedCodes.Any() && !allowedCodes.Contains(coding.Code))
                    {
                        var runtimeContext = new Dictionary<string, object>
                        {
                            ["code"] = coding.Code ?? "",
                            ["display"] = coding.Display ?? ""
                        };
                        
                        var resolvedMessage = MessageTokenResolver.ResolveTokens(rule.Message, rule, runtimeContext);
                        
                        var details = new Dictionary<string, object>
                        {
                            ["source"] = "ProjectRule",
                            ["resourceType"] = rule.ResourceType,
                            ["path"] = rule.Path,
                            ["ruleType"] = rule.Type,
                            ["ruleId"] = rule.Id,
                            ["expectedSystem"] = expectedSystem ?? "",
                            ["actualSystem"] = coding.System ?? "",
                            ["actualCode"] = coding.Code ?? "",
                            ["actualDisplay"] = coding.Display ?? "",
                            ["allowedCodes"] = allowedCodes
                        };
                        
                        details["explanation"] = GetExplanation(rule.Type, rule.ErrorCode ?? "INVALID_CODE", details);
                        
                        errors.Add(new RuleValidationError
                        {
                            RuleId = rule.Id,
                            RuleType = rule.Type,
                            Severity = rule.Severity,
                            ResourceType = rule.ResourceType,
                            Path = rule.Path,
                            ErrorCode = rule.ErrorCode ?? "INVALID_CODE",
                            Message = resolvedMessage,
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
    
    private List<RuleValidationError> ValidateCustomFhirPath(Resource resource, RuleDefinition rule, int entryIndex)
    {
        var errors = new List<RuleValidationError>();
        
        var result = EvaluateFhirPath(resource, rule.Path, rule, entryIndex, errors);
        
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
                var runtimeContext = new Dictionary<string, object>
                {
                    ["result"] = "false"
                };
                
                var resolvedMessage = MessageTokenResolver.ResolveTokens(rule.Message, rule, runtimeContext);
                
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
                
                details["explanation"] = GetExplanation(rule.Type, rule.ErrorCode ?? "CUSTOM_RULE_FAILED", details);
                
                errors.Add(new RuleValidationError
                {
                    RuleId = rule.Id,
                    RuleType = rule.Type,
                    Severity = rule.Severity,
                    ResourceType = rule.ResourceType,
                    Path = rule.Path,
                    ErrorCode = rule.ErrorCode ?? "CUSTOM_RULE_FAILED",
                    Message = resolvedMessage,
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
                Message = $"FHIRPath evaluation failed: '{path}' - {ex.Message}",
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
        
        if (values is List<object> list)
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
            Message = $"Error evaluating rule: {ex.Message}",
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
            
            "CODESYSTEM" when errorCode == "INVALID_CODE" =>
                $"The code '{details?.GetValueOrDefault("actualCode")}' is not valid within the required code system '{details?.GetValueOrDefault("expectedSystem")}'. " +
                "Using valid codes from the specified terminology system is essential for semantic interoperability, correct clinical interpretation, and integration with terminology services.",
            
            "CODESYSTEM" when errorCode == "INVALID_SYSTEM" =>
                $"The code system '{details?.GetValueOrDefault("actualSystem")}' does not match the required system '{details?.GetValueOrDefault("expectedSystem")}'. " +
                "Correct code system URIs ensure terminology can be validated and interpreted consistently across all integrated systems.",
            
            "CUSTOMFHIRPATH" =>
                $"This field failed a custom business logic check defined by the FHIRPath expression: '{details?.GetValueOrDefault("expression")}'. " +
                "The expression evaluated to false, indicating the resource does not meet the specific business requirement encoded in this rule.",
            
            _ => 
                "This field does not meet the business rule requirements defined for your project. " +
                "Review the rule configuration to understand the specific validation logic and expected values."
        };
    }
}
