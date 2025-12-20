using System.Text.RegularExpressions;
using Pss.FhirProcessor.Engine.Models;

namespace Pss.FhirProcessor.Engine.Services;

/// <summary>
/// Resolves message tokens for validation errors
/// Matches frontend implementation in ruleMessageTemplates.ts
/// </summary>
public class MessageTokenResolver
{
    /// <summary>
    /// Resolves all tokens in a message template
    /// </summary>
    public static string ResolveTokens(string template, RuleDefinition rule, Dictionary<string, object>? runtimeContext = null)
    {
        if (string.IsNullOrEmpty(template))
            return template;
        
        var resolved = template;
        
        // Global tokens
        var fullPath = !string.IsNullOrEmpty(rule.Path) 
            ? $"{rule.ResourceType}.{rule.Path}" 
            : rule.ResourceType;
        
        // Support both single braces {} and double braces {{}} for backward compatibility
        resolved = ReplaceToken(resolved, "resource", rule.ResourceType ?? "");
        resolved = ReplaceToken(resolved, "path", rule.Path ?? "");
        resolved = ReplaceToken(resolved, "fullPath", fullPath);
        resolved = ReplaceToken(resolved, "ruleType", rule.Type ?? "");
        resolved = ReplaceToken(resolved, "severity", rule.Severity ?? "");
        
        // Rule-specific tokens based on params
        if (rule.Params != null)
        {
            // FixedValue: {expected}
            if (rule.Params.ContainsKey("value"))
            {
                var value = rule.Params["value"]?.ToString() ?? "";
                resolved = ReplaceToken(resolved, "expected", value);
            }
            
            // AllowedValues: {allowed}, {count}
            if (rule.Params.ContainsKey("values"))
            {
                var values = GetStringArray(rule.Params["values"]);
                if (values != null && values.Count > 0)
                {
                    var allowed = string.Join(", ", values.Select(v => $"\"{v}\""));
                    resolved = ReplaceToken(resolved, "allowed", allowed);
                    resolved = ReplaceToken(resolved, "count", values.Count.ToString());
                }
            }
            
            // AllowedValues (codes variant): {allowed}, {count}
            if (rule.Params.ContainsKey("codes"))
            {
                var codes = GetStringArray(rule.Params["codes"]);
                if (codes != null && codes.Count > 0)
                {
                    var allowed = string.Join(", ", codes.Select(c => $"\"{c}\""));
                    resolved = ReplaceToken(resolved, "allowed", allowed);
                    resolved = ReplaceToken(resolved, "count", codes.Count.ToString());
                }
            }
            
            // Regex: {pattern}
            if (rule.Params.ContainsKey("pattern"))
            {
                var pattern = rule.Params["pattern"]?.ToString() ?? "";
                resolved = ReplaceToken(resolved, "pattern", pattern);
            }
            
            // ArrayLength: {min}, {max}
            if (rule.Params.ContainsKey("min"))
            {
                var min = rule.Params["min"]?.ToString() ?? "";
                resolved = ReplaceToken(resolved, "min", min);
            }
            
            if (rule.Params.ContainsKey("max"))
            {
                var max = rule.Params["max"]?.ToString() ?? "";
                resolved = ReplaceToken(resolved, "max", max);
            }
            
            // CodeSystem: {system}, {code}, {display}
            if (rule.Params.ContainsKey("system"))
            {
                var system = rule.Params["system"]?.ToString() ?? "";
                // Extract short name from URL (e.g., "loinc.org" from "http://loinc.org")
                var systemName = system.Split('/').LastOrDefault() ?? system;
                resolved = ReplaceToken(resolved, "system", systemName);
            }
            
            if (rule.Params.ContainsKey("code"))
            {
                var code = rule.Params["code"]?.ToString() ?? "";
                resolved = ReplaceToken(resolved, "code", code);
            }
            
            if (rule.Params.ContainsKey("display"))
            {
                var display = rule.Params["display"]?.ToString() ?? "";
                resolved = ReplaceToken(resolved, "display", display);
            }
            
            // CustomFHIRPath: {expression}
            if (rule.Params.ContainsKey("expression"))
            {
                var expression = rule.Params["expression"]?.ToString() ?? "";
                resolved = ReplaceToken(resolved, "expression", expression);
            }
        }
        
        // Runtime context (actual values, results)
        if (runtimeContext != null)
        {
            if (runtimeContext.ContainsKey("actual"))
            {
                var actual = runtimeContext["actual"]?.ToString() ?? "";
                resolved = ReplaceToken(resolved, "actual", actual);
            }
            
            if (runtimeContext.ContainsKey("result"))
            {
                var result = runtimeContext["result"]?.ToString() ?? "";
                resolved = ReplaceToken(resolved, "result", result);
            }
        }
        
        // Remove any unresolved tokens (both {token} and {{token}})
        resolved = Regex.Replace(resolved, @"\{\{?[^}]+\}\}?", "");
        
        return resolved;
    }
    
    /// <summary>
    /// Helper to replace both single-brace {token} and double-brace {{token}} patterns
    /// </summary>
    private static string ReplaceToken(string template, string tokenName, string value)
    {
        // Replace {token}
        template = template.Replace($"{{{tokenName}}}", value);
        // Replace {{token}}
        template = template.Replace($"{{{{{tokenName}}}}}", value);
        return template;
    }
    
    /// <summary>
    /// Helper to extract string array from various object types
    /// </summary>
    private static List<string>? GetStringArray(object? value)
    {
        if (value == null)
            return null;
        
        // Handle System.Text.Json.JsonElement
        if (value is System.Text.Json.JsonElement jsonElement)
        {
            if (jsonElement.ValueKind == System.Text.Json.JsonValueKind.Array)
            {
                return jsonElement.EnumerateArray()
                    .Select(e => e.GetString() ?? "")
                    .ToList();
            }
        }
        
        // Handle IEnumerable<string>
        if (value is IEnumerable<string> stringList)
        {
            return stringList.ToList();
        }
        
        // Handle IEnumerable<object>
        if (value is System.Collections.IEnumerable enumerable)
        {
            var result = new List<string>();
            foreach (var item in enumerable)
            {
                result.Add(item?.ToString() ?? "");
            }
            return result;
        }
        
        return null;
    }
}
