using System.Text.Json;

namespace Pss.FhirProcessor.Engine.Navigation.Predicates;

/// <summary>
/// DLL-SAFE: Evaluates predicate expressions against JSON elements.
/// </summary>
public interface IPredicateEvaluator
{
    /// <summary>
    /// Evaluates a predicate expression against a JSON element.
    /// </summary>
    /// <param name="element">JSON element to evaluate against</param>
    /// <param name="expression">Predicate expression to evaluate</param>
    /// <returns>True if predicate matches, false otherwise</returns>
    bool Evaluate(JsonElement element, PredicateExpression expression);
}
