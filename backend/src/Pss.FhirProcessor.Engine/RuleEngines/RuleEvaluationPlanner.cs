using System.Text.Json;
using Hl7.Fhir.Model;
using Pss.FhirProcessor.Engine.Models;

namespace Pss.FhirProcessor.Engine.RuleEngines;

/// <summary>
/// Builds evaluation plans for Project Rules, determining whether Firely or custom evaluator should be used.
/// Phase 1: Path-free implementation using FieldPath + InstanceScope.
/// Implements the SAFE dual-lane evaluation strategy where Firely is preferred but fallback is always available.
/// </summary>
public class RuleEvaluationPlanner
{
    /// <summary>
    /// Build an evaluation plan for a rule BEFORE execution.
    /// Returns plan with preferFirely = true ONLY if ALL safety conditions are met.
    /// Phase 1: Uses FieldPath and InstanceScope for all decisions.
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
        
        // CONDITION 2: Rule must have FieldPath (Phase 1 requirement)
        if (string.IsNullOrWhiteSpace(rule.FieldPath))
        {
            plan.FallbackReasons.Add("Rule missing FieldPath - cannot evaluate");
            return plan;
        }
        
        // CONDITION 3: Rule type must NOT be CustomFHIRPath
        // CustomFHIRPath rules are explicitly designed for best-effort semantics
        if (rule.Type.Equals("CustomFHIRPath", StringComparison.OrdinalIgnoreCase))
        {
            plan.FallbackReasons.Add("CustomFHIRPath rules always use best-effort evaluation");
            return plan;
        }
        
        // CONDITION 4: FieldPath must NOT navigate extensions
        // Extensions have complex, dynamic structure that may not map cleanly to POCOs
        if (FieldPathTouchesExtensions(rule.FieldPath))
        {
            plan.FallbackReasons.Add("FieldPath navigates FHIR extensions which may have structural discrepancies");
            return plan;
        }
        
        // CONDITION 5: Check for structural mismatch risk
        // Complex instance scopes or deep field paths may benefit from JSON evaluation
        if (HasStructuralMismatchRisk(rule, rawJson))
        {
            plan.FallbackReasons.Add("Potential structural mismatch between JSON and POCO representation");
            return plan;
        }
        
        // ALL conditions met - prefer Firely
        plan.PreferFirely = true;
        return plan;
    }
    
    /// <summary>
    /// Check if FieldPath navigates FHIR extension fields.
    /// Phase 1: Uses FieldPath instead of Path.
    /// </summary>
    private bool FieldPathTouchesExtensions(string fieldPath)
    {
        // Check for explicit extension navigation
        if (fieldPath.Contains("extension", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }
        
        // Check for modifierExtension
        if (fieldPath.Contains("modifierExtension", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }
        
        return false;
    }
    
    /// <summary>
    /// Check if raw JSON might have structural differences from POCO.
    /// Phase 1: Uses FieldPath depth and InstanceScope complexity.
    /// </summary>
    private bool HasStructuralMismatchRisk(RuleDefinition rule, string? rawJson)
    {
        // Heuristic 1: Deep FieldPaths (3+ segments) may have POCO/JSON differences
        var fieldPathDepth = rule.FieldPath!.Split('.').Length;
        if (fieldPathDepth >= 3)
        {
            // Deep navigation increases risk of structural mismatches
            // Prefer JSON evaluation for safety
            return true;
        }
        
        // Heuristic 2: FilteredInstances with complex conditions
        if (rule.InstanceScope is FilteredInstances filtered)
        {
            // Filtered scopes involve complex FHIRPath evaluation
            // POCO navigation may not handle all edge cases
            if (filtered.ConditionFhirPath.Length > 20 || 
                filtered.ConditionFhirPath.Contains("where", StringComparison.OrdinalIgnoreCase) ||
                filtered.ConditionFhirPath.Contains("exists", StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
        }
        
        // Heuristic 3: Check JSON structure if available
        if (!string.IsNullOrEmpty(rawJson))
        {
            try
            {
                using var doc = JsonDocument.Parse(rawJson);
                var root = doc.RootElement;
                
                // Check for empty objects {} that might not exist in POCO
                if (HasEmptyObjects(root))
                {
                    return true;
                }
            }
            catch
            {
                // If we can't parse JSON, assume risk
                return true;
            }
        }
        
        return false;
    }
    
    /// <summary>
    /// Check if JSON contains empty objects {} that might not exist in POCO.
    /// Unchanged from original - not Path-dependent.
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
}
