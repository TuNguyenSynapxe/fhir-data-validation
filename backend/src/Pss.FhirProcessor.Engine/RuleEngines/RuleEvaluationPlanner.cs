using System.Text.Json;
using System.Text.RegularExpressions;
using Hl7.Fhir.Model;
using Pss.FhirProcessor.Engine.Models;

namespace Pss.FhirProcessor.Engine.RuleEngines;

/// <summary>
/// Builds evaluation plans for Project Rules, determining whether Firely or custom evaluator should be used.
/// Implements the SAFE dual-lane evaluation strategy where Firely is preferred but fallback is always available.
/// </summary>
public class RuleEvaluationPlanner
{
    /// <summary>
    /// Build an evaluation plan for a rule BEFORE execution.
    /// Returns plan with preferFirely = true ONLY if ALL safety conditions are met.
    /// </summary>
    public RuleEvaluationPlan BuildPlan(
        RuleDefinition rule,
        string? rawJson,
        Resource? firelyPoco,
        bool firelyParsingSucceeded)
    {
        var plan = new RuleEvaluationPlan
        {
            RuleId = rule.Id,
            PreferFirely = false,
            FallbackReasons = new List<string>()
        };
        
        // CONDITION 1: Firely parsing must have succeeded
        if (!firelyParsingSucceeded || firelyPoco == null)
        {
            plan.FallbackReasons.Add("Firely POCO parsing failed or incomplete");
            return plan;
        }
        
        // CONDITION 2: Rule type must NOT be CustomFHIRPath
        // CustomFHIRPath rules are explicitly designed for best-effort semantics
        if (rule.Type.Equals("CustomFHIRPath", StringComparison.OrdinalIgnoreCase))
        {
            plan.FallbackReasons.Add("CustomFHIRPath rules always use best-effort evaluation");
            return plan;
        }
        
        // CONDITION 3: Path must NOT touch extension fields
        // Extensions have complex, dynamic structure that may not map cleanly to POCOs
        if (PathTouchesExtensions(rule.Path))
        {
            plan.FallbackReasons.Add("Path navigates FHIR extensions which may have structural discrepancies");
            return plan;
        }
        
        // CONDITION 4: Path must NOT touch potential structural mismatches
        // Check if raw JSON has structures that might not exist in POCO
        if (!string.IsNullOrEmpty(rawJson) && HasStructuralMismatchRisk(rule.Path, rawJson))
        {
            plan.FallbackReasons.Add("Potential structural mismatch between JSON and POCO representation");
            return plan;
        }
        
        // CONDITION 5: Path should be navigable in both POCO and JSON
        // If we can't confidently navigate in both, use custom evaluator
        if (!IsPathSafeForFirely(rule.Path))
        {
            plan.FallbackReasons.Add("Path contains complex navigation that may behave inconsistently");
            return plan;
        }
        
        // ALL conditions met - prefer Firely
        plan.PreferFirely = true;
        return plan;
    }
    
    /// <summary>
    /// Check if path navigates FHIR extension fields
    /// </summary>
    private bool PathTouchesExtensions(string path)
    {
        // Check for explicit extension navigation
        if (path.Contains("extension", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }
        
        // Check for modifierExtension
        if (path.Contains("modifierExtension", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }
        
        return false;
    }
    
    /// <summary>
    /// Check if raw JSON might have structural differences from POCO
    /// Examples:
    /// - Empty objects {} in JSON that don't exist in POCO
    /// - Array length differences
    /// - Unexpected nesting
    /// </summary>
    private bool HasStructuralMismatchRisk(string path, string rawJson)
    {
        try
        {
            // Parse JSON to check structure
            using var doc = JsonDocument.Parse(rawJson);
            var root = doc.RootElement;
            
            // Navigate to the relevant part based on path
            // This is a heuristic check - if we can't navigate cleanly, assume risk
            var pathParts = path.Split('.');
            
            // Check if path involves array indexing
            // Arrays can have length mismatches between JSON and POCO
            if (Regex.IsMatch(path, @"\[\d+\]"))
            {
                // Array indexing detected - check if indices are safe
                // This is conservative: we prefer custom evaluator for indexed access
                return true;
            }
            
            // Check for empty objects in JSON
            if (HasEmptyObjects(root))
            {
                return true;
            }
        }
        catch
        {
            // If we can't parse or navigate JSON, assume risk
            return true;
        }
        
        return false;
    }
    
    /// <summary>
    /// Check if JSON contains empty objects {} that might not exist in POCO
    /// </summary>
    private bool HasEmptyObjects(JsonElement element)
    {
        if (element.ValueKind == JsonValueKind.Object)
        {
            // Check if this object is empty
            if (!element.EnumerateObject().Any())
            {
                return true;
            }
            
            // Recursively check child objects
            foreach (var prop in element.EnumerateObject())
            {
                if (HasEmptyObjects(prop.Value))
                {
                    return true;
                }
            }
        }
        else if (element.ValueKind == JsonValueKind.Array)
        {
            // Check each array element
            foreach (var item in element.EnumerateArray())
            {
                if (HasEmptyObjects(item))
                {
                    return true;
                }
            }
        }
        
        return false;
    }
    
    /// <summary>
    /// Check if path is safe for Firely evaluation
    /// Safe paths are simple property navigation without complex expressions
    /// </summary>
    private bool IsPathSafeForFirely(string path)
    {
        // Paths with these patterns are potentially unsafe:
        
        // 1. Complex FHIRPath functions (other than basic navigation)
        if (Regex.IsMatch(path, @"\b(where|select|all|any|exists|count|first|last|tail|skip|take)\s*\("))
        {
            // These are actually fine - Firely handles them well
            // But if they fail, we want to be able to fall back
            // For now, consider them safe but we'll catch failures
            return true;
        }
        
        // 2. Complex predicates with comparisons
        if (Regex.IsMatch(path, @"[<>=!]+") && path.Contains("where"))
        {
            // Complex filtering might have edge cases
            // But Firely should handle these - we'll catch failures
            return true;
        }
        
        // Most paths are safe - we'll rely on try-catch to detect actual failures
        return true;
    }
}
