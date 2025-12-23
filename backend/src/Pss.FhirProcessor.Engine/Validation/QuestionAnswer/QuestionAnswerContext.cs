using Hl7.Fhir.ElementModel;
using Hl7.Fhir.Model;
using Pss.FhirProcessor.Engine.Models;
using Pss.FhirProcessor.Engine.Models.Questions;

namespace Pss.FhirProcessor.Engine.Validation.QuestionAnswer;

/// <summary>
/// Context for validating a single question/answer pair
/// Contains all information needed for validation
/// </summary>
public class QuestionAnswerContext
{
    /// <summary>
    /// The rule being evaluated
    /// </summary>
    public required RuleDefinition Rule { get; set; }

    /// <summary>
    /// The question set referenced by this rule
    /// </summary>
    public QuestionSet? QuestionSet { get; set; }

    /// <summary>
    /// Dictionary of questions by ID for fast lookup
    /// </summary>
    public Dictionary<string, Question> Questions { get; set; } = new();

    /// <summary>
    /// The FHIR resource being validated (e.g., Observation)
    /// </summary>
    public Resource? Resource { get; set; }

    /// <summary>
    /// Alternative: ITypedElement for fallback validation
    /// </summary>
    public ITypedElement? TypedElement { get; set; }

    /// <summary>
    /// The iteration node (e.g., specific component)
    /// </summary>
    public object? IterationNode { get; set; }

    /// <summary>
    /// Resolved question matching the question coding
    /// </summary>
    public Question? ResolvedQuestion { get; set; }

    /// <summary>
    /// Extracted answer value
    /// </summary>
    public object? ExtractedAnswer { get; set; }

    /// <summary>
    /// Entry index in Bundle
    /// </summary>
    public int EntryIndex { get; set; }

    /// <summary>
    /// FHIRPath to the current validation context
    /// </summary>
    public string CurrentPath { get; set; } = string.Empty;

    /// <summary>
    /// Question coding extracted from the data
    /// </summary>
    public Coding? QuestionCoding { get; set; }

    /// <summary>
    /// Is this question required per QuestionSet?
    /// </summary>
    public bool IsRequired { get; set; }
}

/// <summary>
/// QuestionSet model (matching frontend DTOs)
/// </summary>
public class QuestionSet
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string TerminologyUrl { get; set; } = string.Empty;
    public List<QuestionSetQuestionRef> Questions { get; set; } = new();
}

/// <summary>
/// Question reference within a QuestionSet
/// </summary>
public class QuestionSetQuestionRef
{
    public string QuestionId { get; set; } = string.Empty;
    public bool Required { get; set; }
}
