namespace Pss.FhirProcessor.Engine.Navigation.Predicates;

/// <summary>
/// DLL-SAFE: AST for JSON-based predicate expressions.
/// Represents parsed where() clauses without POCO dependencies.
/// </summary>
public abstract record PredicateExpression;

/// <summary>
/// Equality predicate: path='value'
/// Example: display='Doctor B'
/// </summary>
public record EqualsExpression(string Path, string Value) : PredicateExpression;

/// <summary>
/// Existence predicate: path.exists()
/// Example: system.exists()
/// </summary>
public record ExistsExpression(string Path) : PredicateExpression;

/// <summary>
/// Empty predicate: path.empty()
/// Example: coding.empty()
/// </summary>
public record EmptyExpression(string Path) : PredicateExpression;

/// <summary>
/// Logical AND: left and right
/// Example: system='http://loinc.org' and code='12345'
/// </summary>
public record AndExpression(PredicateExpression Left, PredicateExpression Right) : PredicateExpression;

/// <summary>
/// Logical OR: left or right
/// Example: system.exists() or value.exists()
/// </summary>
public record OrExpression(PredicateExpression Left, PredicateExpression Right) : PredicateExpression;
