using System.Text.RegularExpressions;

namespace Pss.FhirProcessor.Engine.Navigation.Predicates;

/// <summary>
/// DLL-SAFE: Parses where() clause strings into PredicateExpression AST.
/// </summary>
public static class PredicateParser
{
    /// <summary>
    /// Parses a where() clause into a predicate expression.
    /// Returns null if parsing fails (fail-safe).
    /// </summary>
    public static PredicateExpression? Parse(string whereClause)
    {
        if (string.IsNullOrWhiteSpace(whereClause))
        {
            return null;
        }
        
        var trimmed = whereClause.Trim();
        
        // Phase 3.2: Check for logical operators (AND/OR)
        // Single-level only, left-to-right evaluation
        var orParts = SplitByOperator(trimmed, " or ");
        if (orParts.Count > 1)
        {
            // Parse OR: left or right
            var left = ParseSimple(orParts[0]);
            var right = ParseSimple(string.Join(" or ", orParts.Skip(1)));
            
            if (left != null && right != null)
            {
                return new OrExpression(left, right);
            }
        }
        
        var andParts = SplitByOperator(trimmed, " and ");
        if (andParts.Count > 1)
        {
            // Parse AND: left and right
            var left = ParseSimple(andParts[0]);
            var right = ParseSimple(string.Join(" and ", andParts.Skip(1)));
            
            if (left != null && right != null)
            {
                return new AndExpression(left, right);
            }
        }
        
        // No logical operators - parse as simple expression
        return ParseSimple(trimmed);
    }
    
    private static List<string> SplitByOperator(string expression, string op)
    {
        var parts = new List<string>();
        var currentPart = "";
        var parenDepth = 0;
        
        for (int i = 0; i < expression.Length; i++)
        {
            if (expression[i] == '(')
            {
                parenDepth++;
                currentPart += expression[i];
            }
            else if (expression[i] == ')')
            {
                parenDepth--;
                currentPart += expression[i];
            }
            else if (parenDepth == 0 && i + op.Length <= expression.Length &&
                     expression.Substring(i, op.Length).Equals(op, StringComparison.OrdinalIgnoreCase))
            {
                // Found operator at top level
                parts.Add(currentPart.Trim());
                currentPart = "";
                i += op.Length - 1; // Skip operator
            }
            else
            {
                currentPart += expression[i];
            }
        }
        
        if (currentPart.Length > 0)
        {
            parts.Add(currentPart.Trim());
        }
        
        return parts;
    }
    
    private static PredicateExpression? ParseSimple(string expression)
    {
        var trimmed = expression.Trim();
        
        // Pattern: path='value'
        var equalsMatch = Regex.Match(trimmed, @"^([^=]+)='([^']+)'$");
        if (equalsMatch.Success)
        {
            return new EqualsExpression(
                equalsMatch.Groups[1].Value.Trim(),
                equalsMatch.Groups[2].Value
            );
        }
        
        // Pattern: path.exists()
        var existsMatch = Regex.Match(trimmed, @"^(.+)\.exists\(\)$");
        if (existsMatch.Success)
        {
            return new ExistsExpression(existsMatch.Groups[1].Value.Trim());
        }
        
        // Pattern: path.empty()
        var emptyMatch = Regex.Match(trimmed, @"^(.+)\.empty\(\)$");
        if (emptyMatch.Success)
        {
            return new EmptyExpression(emptyMatch.Groups[1].Value.Trim());
        }
        
        // Unknown pattern - fail safely
        return null;
    }
}
