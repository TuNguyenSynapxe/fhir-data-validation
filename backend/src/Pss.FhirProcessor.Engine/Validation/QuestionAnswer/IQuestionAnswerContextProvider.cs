using Hl7.Fhir.Model;
using Pss.FhirProcessor.Engine.Models;

namespace Pss.FhirProcessor.Engine.Validation.QuestionAnswer;

/// <summary>
/// Provides normalized context for Question/Answer validation.
/// Handles all FHIR structure traversal, resource selection, and iteration logic.
/// Validator remains pure and path-agnostic.
/// </summary>
public interface IQuestionAnswerContextProvider
{
    /// <summary>
    /// Resolve all iteration contexts for a given rule against a bundle.
    /// Returns one seed per validation context (e.g., per Observation.component).
    /// </summary>
    IEnumerable<QuestionAnswerContextSeed> Resolve(Bundle bundle, RuleDefinition rule);
}

/// <summary>
/// Single validation context seed.
/// Contains everything needed to validate one question/answer pair.
/// </summary>
public sealed record QuestionAnswerContextSeed(
    Resource Resource,
    Base IterationNode,
    int EntryIndex,
    string CurrentFhirPath,
    int IterationIndex  // Array index within the iteration (e.g., component[2] -> 2)
);
