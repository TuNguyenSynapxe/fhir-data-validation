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
/// </summary>
public class FhirPathRuleEngine : IFhirPathRuleEngine
{
    private readonly FhirPathCompiler _compiler;
    
    public FhirPathRuleEngine()
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
        
        if (!errors.Any(e => e.ErrorCode == "RULE_DEFINITION_ERROR") && (result == null || !result.Any()))
        {
            errors.Add(new RuleValidationError
            {
                RuleId = rule.Id,
                RuleType = rule.Type,
                Severity = rule.Severity,
                ResourceType = rule.ResourceType,
                Path = rule.Path,
                ErrorCode = rule.ErrorCode ?? "MANDATORY_MISSING",
                Message = rule.Message,
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
            return errors;
        
        var result = EvaluateFhirPath(resource, rule.Path, rule, entryIndex, errors);
        
        if (!errors.Any(e => e.ErrorCode == "RULE_DEFINITION_ERROR"))
        {
            var expectedValue = rule.Params["value"]?.ToString();
            
            foreach (var item in result)
            {
                var actualValue = GetValueAsString(item);
                
                if (actualValue != expectedValue)
                {
                    errors.Add(new RuleValidationError
                    {
                        RuleId = rule.Id,
                        RuleType = rule.Type,
                        Severity = rule.Severity,
                        ResourceType = rule.ResourceType,
                        Path = rule.Path,
                        ErrorCode = rule.ErrorCode ?? "FIXED_VALUE_MISMATCH",
                        Message = rule.Message,
                        Details = new Dictionary<string, object>
                        {
                            ["expected"] = expectedValue ?? "",
                            ["actual"] = actualValue ?? ""
                        },
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
            return errors;
        
        var result = EvaluateFhirPath(resource, rule.Path, rule, entryIndex, errors);
        
        if (!errors.Any(e => e.ErrorCode == "RULE_DEFINITION_ERROR"))
        {
            var allowedValues = GetAllowedValues(rule.Params["values"]);
            
            foreach (var item in result)
            {
                var actualValue = GetValueAsString(item);
                
                if (!string.IsNullOrEmpty(actualValue) && !allowedValues.Contains(actualValue))
                {
                    errors.Add(new RuleValidationError
                    {
                        RuleId = rule.Id,
                        RuleType = rule.Type,
                        Severity = rule.Severity,
                        ResourceType = rule.ResourceType,
                        Path = rule.Path,
                        ErrorCode = rule.ErrorCode ?? "VALUE_NOT_ALLOWED",
                        Message = rule.Message,
                        Details = new Dictionary<string, object>
                        {
                            ["actual"] = actualValue,
                            ["allowed"] = allowedValues
                        },
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
            return errors;
        
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
                    errors.Add(new RuleValidationError
                    {
                        RuleId = rule.Id,
                        RuleType = rule.Type,
                        Severity = rule.Severity,
                        ResourceType = rule.ResourceType,
                        Path = rule.Path,
                        ErrorCode = rule.ErrorCode ?? "REGEX_MISMATCH",
                        Message = rule.Message,
                        Details = new Dictionary<string, object>
                        {
                            ["actual"] = actualValue,
                            ["pattern"] = pattern
                        },
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
        
        if (rule.Params == null)
            return errors;
        
        var result = EvaluateFhirPath(resource, rule.Path, rule, entryIndex, errors);
        
        if (!errors.Any(e => e.ErrorCode == "RULE_DEFINITION_ERROR"))
        {
            var count = result.Count();
            
            if (rule.Params.ContainsKey("min"))
            {
                var min = Convert.ToInt32(rule.Params["min"]);
                if (count < min)
                {
                    errors.Add(new RuleValidationError
                    {
                        RuleId = rule.Id,
                        RuleType = rule.Type,
                        Severity = rule.Severity,
                        ResourceType = rule.ResourceType,
                        Path = rule.Path,
                        ErrorCode = rule.ErrorCode ?? "ARRAY_TOO_SHORT",
                        Message = rule.Message,
                        Details = new Dictionary<string, object>
                        {
                            ["actual"] = count,
                            ["min"] = min
                        },
                        EntryIndex = entryIndex,
                        ResourceId = resource.Id
                    });
                }
            }
            
            if (rule.Params.ContainsKey("max"))
            {
                var max = Convert.ToInt32(rule.Params["max"]);
                if (count > max)
                {
                    errors.Add(new RuleValidationError
                    {
                        RuleId = rule.Id,
                        RuleType = rule.Type,
                        Severity = rule.Severity,
                        ResourceType = rule.ResourceType,
                        Path = rule.Path,
                        ErrorCode = rule.ErrorCode ?? "ARRAY_TOO_LONG",
                        Message = rule.Message,
                        Details = new Dictionary<string, object>
                        {
                            ["actual"] = count,
                            ["max"] = max
                        },
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
            return errors;
        
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
                        errors.Add(new RuleValidationError
                        {
                            RuleId = rule.Id,
                            RuleType = rule.Type,
                            Severity = rule.Severity,
                            ResourceType = rule.ResourceType,
                            Path = rule.Path,
                            ErrorCode = rule.ErrorCode ?? "INVALID_CODE_SYSTEM",
                            Message = rule.Message,
                            Details = new Dictionary<string, object>
                            {
                                ["expectedSystem"] = expectedSystem ?? "",
                                ["actualSystem"] = coding.System ?? ""
                            },
                            EntryIndex = entryIndex,
                            ResourceId = resource.Id
                        });
                    }
                    else if (allowedCodes.Any() && !allowedCodes.Contains(coding.Code))
                    {
                        errors.Add(new RuleValidationError
                        {
                            RuleId = rule.Id,
                            RuleType = rule.Type,
                            Severity = rule.Severity,
                            ResourceType = rule.ResourceType,
                            Path = rule.Path,
                            ErrorCode = rule.ErrorCode ?? "INVALID_CODE",
                            Message = rule.Message,
                            Details = new Dictionary<string, object>
                            {
                                ["actualCode"] = coding.Code ?? "",
                                ["allowedCodes"] = allowedCodes
                            },
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
                errors.Add(new RuleValidationError
                {
                    RuleId = rule.Id,
                    RuleType = rule.Type,
                    Severity = rule.Severity,
                    ResourceType = rule.ResourceType,
                    Path = rule.Path,
                    ErrorCode = rule.ErrorCode ?? "CUSTOM_RULE_FAILED",
                    Message = rule.Message,
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
            var typedElement = resource.ToTypedElement();
            var result = compiled(typedElement, null);
            return result.ToList();
        }
        catch (Exception ex)
        {
            // FHIRPath compilation or evaluation failed - create user-visible error
            errors.Add(new RuleValidationError
            {
                RuleId = rule.Id,
                RuleType = rule.Type,
                Severity = "error",
                ResourceType = rule.ResourceType,
                Path = rule.Path,
                ErrorCode = "RULE_DEFINITION_ERROR",
                Message = $"FHIRPath compilation failed: '{path}' - {ex.Message}",
                Details = new Dictionary<string, object>
                {
                    ["fhirPath"] = path,
                    ["exceptionType"] = ex.GetType().Name,
                    ["exceptionMessage"] = ex.Message
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
}