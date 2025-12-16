using Hl7.Fhir.Model;
using Pss.FhirProcessor.Engine.Models;

namespace Pss.FhirProcessor.Engine.Interfaces;

/// <summary>
/// Service for generating deterministic rule suggestions based on sample bundle analysis.
/// Runs AFTER Firely validation and SPEC_HINT generation.
/// Suggestions are read-only and must be explicitly accepted by users.
/// </summary>
public interface ISystemRuleSuggestionService
{
    /// <summary>
    /// Analyzes a bundle and generates deterministic rule suggestions.
    /// </summary>
    /// <param name="bundle">Validated FHIR bundle</param>
    /// <param name="existingRules">Current project rules (to avoid duplicates)</param>
    /// <param name="specHintIssues">SPEC_HINT output (to avoid overlap)</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>List of suggested rules</returns>
    Task<List<SystemRuleSuggestion>> GenerateSuggestionsAsync(
        Bundle bundle,
        RuleSet? existingRules,
        List<SpecHintIssue>? specHintIssues,
        CancellationToken cancellationToken = default);
}
