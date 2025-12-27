using Hl7.Fhir.Model;
using Pss.FhirProcessor.Engine.Models;
using Pss.FhirProcessor.Engine.Validation.QuestionAnswer;

namespace Pss.FhirProcessor.Engine.Core.Execution;

/// <summary>
/// Internal execution context for rule validation.
/// Computed ONCE per rule to avoid redundant bundle scanning and traversal resolution.
/// INTERNAL ONLY - not exposed in public APIs or DTOs.
/// </summary>
internal sealed record RuleExecutionContext
{
    /// <summary>
    /// The rule being validated
    /// </summary>
    public required RuleDefinition Rule { get; init; }

    /// <summary>
    /// The bundle being validated
    /// </summary>
    public required Bundle Bundle { get; init; }

    /// <summary>
    /// Pre-resolved Question/Answer traversal seeds.
    /// Populated only when Rule.Type == "QuestionAnswer".
    /// Null for other rule types (not applicable).
    /// </summary>
    public IReadOnlyList<QuestionAnswerContextSeed>? QuestionAnswerSeeds { get; init; }

    /// <summary>
    /// Entry index for single-entry rule validation.
    /// Populated when rule targets a single bundle entry.
    /// Null when not applicable or when using QuestionAnswerSeeds iteration.
    /// </summary>
    public int? EntryIndex { get; init; }
}
