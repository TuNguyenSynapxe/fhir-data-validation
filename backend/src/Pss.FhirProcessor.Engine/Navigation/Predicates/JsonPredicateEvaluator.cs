using System.Text.Json;

namespace Pss.FhirProcessor.Engine.Navigation.Predicates;

/// <summary>
/// DLL-SAFE: JSON-based predicate evaluator.
/// Evaluates predicates without POCO dependencies.
/// </summary>
public class JsonPredicateEvaluator : IPredicateEvaluator
{
    /// <summary>
    /// Evaluates a predicate expression against a JSON element.
    /// </summary>
    public bool Evaluate(JsonElement element, PredicateExpression expression)
    {
        return expression switch
        {
            EqualsExpression eq => EvaluateEquals(element, eq),
            ExistsExpression ex => EvaluateExists(element, ex),
            EmptyExpression em => EvaluateEmpty(element, em),
            AndExpression and => EvaluateAnd(element, and),
            OrExpression or => EvaluateOr(element, or),
            _ => false // Unknown expression type
        };
    }
    
    private bool EvaluateEquals(JsonElement element, EqualsExpression expression)
    {
        var value = NavigateJsonPath(element, expression.Path);
        return value == expression.Value;
    }
    
    private bool EvaluateExists(JsonElement element, ExistsExpression expression)
    {
        var value = NavigateJsonPath(element, expression.Path);
        return value != null;
    }
    
    private bool EvaluateEmpty(JsonElement element, EmptyExpression expression)
    {
        var current = element;
        var parts = expression.Path.Split('.');
        
        foreach (var part in parts)
        {
            if (!current.TryGetProperty(part, out var next))
            {
                return true; // Property doesn't exist → empty
            }
            
            current = next;
            
            // Navigate into arrays automatically
            if (current.ValueKind == JsonValueKind.Array)
            {
                if (current.GetArrayLength() == 0)
                {
                    return true; // Empty array
                }
                current = current[0];
            }
        }
        
        // Check if final value is empty
        return current.ValueKind switch
        {
            JsonValueKind.Null => true,
            JsonValueKind.String => string.IsNullOrEmpty(current.GetString()),
            JsonValueKind.Array => current.GetArrayLength() == 0,
            JsonValueKind.Object => false, // Objects are never "empty" in FHIRPath sense
            _ => false
        };
    }
    
    private bool EvaluateAnd(JsonElement element, AndExpression expression)
    {
        // Left-to-right evaluation, short-circuit if left is false
        return Evaluate(element, expression.Left) && Evaluate(element, expression.Right);
    }
    
    private bool EvaluateOr(JsonElement element, OrExpression expression)
    {
        // Left-to-right evaluation, short-circuit if left is true
        return Evaluate(element, expression.Left) || Evaluate(element, expression.Right);
    }
    
    private string? NavigateJsonPath(JsonElement element, string path)
    {
        var parts = path.Split('.');
        var current = element;
        
        foreach (var part in parts)
        {
            if (!current.TryGetProperty(part, out var next))
            {
                return null;
            }
            
            current = next;
            
            // Navigate into arrays automatically
            if (current.ValueKind == JsonValueKind.Array)
            {
                if (current.GetArrayLength() == 0)
                {
                    return null;
                }
                current = current[0];
            }
        }
        
        return current.ValueKind == JsonValueKind.String 
            ? current.GetString() 
            : current.ToString();
    }
}
