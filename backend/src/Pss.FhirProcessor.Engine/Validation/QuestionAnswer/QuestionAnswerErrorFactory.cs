using Pss.FhirProcessor.Engine.Models;
using Pss.FhirProcessor.Engine.Validation.QuestionAnswer.Models;

namespace Pss.FhirProcessor.Engine.Validation.QuestionAnswer;

/// <summary>
/// REFACTORED: Generates STRUCTURED validation errors (NO PROSE)
/// Frontend owns all message wording
/// Backend returns machine-readable facts only
/// </summary>
public static class QuestionAnswerErrorFactory
{
    /// <summary>
    /// Guard: Ensure no prose is emitted from backend
    /// Allows short labels only (max 60 chars, no sentence punctuation)
    /// </summary>
    private static void EnsureNoProse(string? value, string paramName)
    {
        if (string.IsNullOrWhiteSpace(value)) return;

        if (value.Length > 60)
            throw new InvalidOperationException(
                $"Backend must not emit prose in {paramName}. Max 60 chars. Use ErrorCode instead.");

        if (value.Contains('.') && !value.EndsWith("..."))
            throw new InvalidOperationException(
                $"Backend must not emit sentences in {paramName}. Use ErrorCode instead.");
    }

    /// <summary>
    /// Create structured error for invalid answer value/type
    /// </summary>
    public static RuleValidationError InvalidAnswerValue(
        string ruleId,
        string resourceType,
        string severity,
        QuestionRef question,
        ExpectedAnswer expected,
        ActualAnswer actual,
        ValidationLocation location,
        string questionSetId,
        string questionIdentifierType,
        int iterationIndex,
        int? entryIndex = null,
        string? userHint = null)
    {
        EnsureNoProse(userHint, nameof(userHint));

        return new RuleValidationError
        {
            RuleId = ruleId,
            RuleType = "QuestionAnswer",
            Severity = severity,
            ResourceType = resourceType,
            FieldPath = location.FhirPath,
            ErrorCode = ValidationErrorCodes.INVALID_ANSWER_VALUE,
            UserHint = userHint,
            EntryIndex = entryIndex,
            Details = new Dictionary<string, object>
            {
                ["source"] = "Business",
                ["questionSetId"] = questionSetId,
                ["iteration"] = new Dictionary<string, object>
                {
                    ["path"] = location.FhirPath,
                    ["index"] = iterationIndex
                },
                ["question"] = new Dictionary<string, object?>
                {
                    ["identifierType"] = questionIdentifierType,
                    ["identifier"] = question.Code,
                    ["system"] = question.System,
                    ["display"] = question.Display
                },
                ["answer"] = new Dictionary<string, object?>
                {
                    ["path"] = "value[x]",
                    ["actualType"] = actual.AnswerType,
                    ["actualValue"] = actual.Value
                },
                ["expected"] = new Dictionary<string, object?>
                {
                    ["answerType"] = expected.AnswerType,
                    ["constraints"] = expected.Constraints
                },
                ["location"] = new Dictionary<string, object?>
                {
                    ["path"] = location.FhirPath,
                    ["jsonPointer"] = location.JsonPointer
                }
            }
        };
    }

    /// <summary>
    /// Create structured error for out-of-range numeric answer
    /// </summary>
    public static RuleValidationError AnswerOutOfRange(
        string ruleId,
        string resourceType,
        string severity,
        QuestionRef question,
        decimal? min,
        decimal? max,
        decimal actualValue,
        ValidationLocation location,
        string questionSetId,
        string questionIdentifierType,
        int iterationIndex,
        int? entryIndex = null,
        string? userHint = null)
    {
        EnsureNoProse(userHint, nameof(userHint));

        return new RuleValidationError
        {
            RuleId = ruleId,
            RuleType = "QuestionAnswer",
            Severity = severity,
            ResourceType = resourceType,
            FieldPath = location.FhirPath,
            ErrorCode = ValidationErrorCodes.ANSWER_OUT_OF_RANGE,
            UserHint = userHint,
            EntryIndex = entryIndex,
            Details = new Dictionary<string, object>
            {
                ["source"] = "Business",
                ["questionSetId"] = questionSetId,
                ["iteration"] = new Dictionary<string, object>
                {
                    ["path"] = location.FhirPath,
                    ["index"] = iterationIndex
                },
                ["question"] = new Dictionary<string, object?>
                {
                    ["identifierType"] = questionIdentifierType,
                    ["identifier"] = question.Code,
                    ["system"] = question.System,
                    ["display"] = question.Display
                },
                ["answer"] = new Dictionary<string, object?>
                {
                    ["path"] = "value[x]",
                    ["actualType"] = "quantity",
                    ["actualValue"] = actualValue
                },
                ["expected"] = new Dictionary<string, object?>
                {
                    ["answerType"] = "quantity",
                    ["min"] = min,
                    ["max"] = max
                },
                ["location"] = new Dictionary<string, object?>
                {
                    ["path"] = location.FhirPath,
                    ["jsonPointer"] = location.JsonPointer
                }
            }
        };
    }

    /// <summary>
    /// Create structured error for code not in ValueSet
    /// </summary>
    public static RuleValidationError AnswerNotInValueSet(
        string ruleId,
        string resourceType,
        string severity,
        QuestionRef question,
        string valueSetUrl,
        string actualCode,
        string? actualSystem,
        ValidationLocation location,
        string questionSetId,
        string questionIdentifierType,
        int iterationIndex,
        int? entryIndex = null,
        string? userHint = null)
    {
        EnsureNoProse(userHint, nameof(userHint));

        return new RuleValidationError
        {
            RuleId = ruleId,
            RuleType = "QuestionAnswer",
            Severity = severity,
            ResourceType = resourceType,
            FieldPath = location.FhirPath,
            ErrorCode = ValidationErrorCodes.ANSWER_NOT_IN_VALUESET,
            UserHint = userHint,
            EntryIndex = entryIndex,
            Details = new Dictionary<string, object>
            {
                ["source"] = "Business",
                ["questionSetId"] = questionSetId,
                ["iteration"] = new Dictionary<string, object>
                {
                    ["path"] = location.FhirPath,
                    ["index"] = iterationIndex
                },
                ["question"] = new Dictionary<string, object?>
                {
                    ["identifierType"] = questionIdentifierType,
                    ["identifier"] = question.Code,
                    ["system"] = question.System,
                    ["display"] = question.Display
                },
                ["answer"] = new Dictionary<string, object?>
                {
                    ["path"] = "value[x]",
                    ["actualType"] = "codeableConcept",
                    ["actualValue"] = new Dictionary<string, object?>
                    {
                        ["code"] = actualCode,
                        ["system"] = actualSystem
                    }
                },
                ["expected"] = new Dictionary<string, object?>
                {
                    ["answerType"] = "codeableConcept",
                    ["allowedCodes"] = new object[] { new { valueSetUrl } }
                },
                ["location"] = new Dictionary<string, object?>
                {
                    ["path"] = location.FhirPath,
                    ["jsonPointer"] = location.JsonPointer
                }
            }
        };
    }

    /// <summary>
    /// Create structured error for missing required answer
    /// </summary>
    public static RuleValidationError AnswerRequired(
        string ruleId,
        string resourceType,
        string severity,
        QuestionRef question,
        string expectedAnswerType,
        ValidationLocation location,
        string questionSetId,
        string questionIdentifierType,
        int iterationIndex,
        int? entryIndex = null,
        string? userHint = null)
    {
        EnsureNoProse(userHint, nameof(userHint));

        return new RuleValidationError
        {
            RuleId = ruleId,
            RuleType = "QuestionAnswer",
            Severity = severity,
            ResourceType = resourceType,
            FieldPath = location.FhirPath,
            ErrorCode = ValidationErrorCodes.ANSWER_REQUIRED,
            UserHint = userHint,
            EntryIndex = entryIndex,
            Details = new Dictionary<string, object>
            {
                ["source"] = "Business",
                ["questionSetId"] = questionSetId,
                ["iteration"] = new Dictionary<string, object>
                {
                    ["path"] = location.FhirPath,
                    ["index"] = iterationIndex
                },
                ["question"] = new Dictionary<string, object?>
                {
                    ["identifierType"] = questionIdentifierType,
                    ["identifier"] = question.Code,
                    ["system"] = question.System,
                    ["display"] = question.Display
                },
                ["answer"] = new Dictionary<string, object?>
                {
                    ["path"] = "value[x]",
                    ["actualType"] = "missing",
                    ["actualValue"] = null
                },
                ["expected"] = new Dictionary<string, object?>
                {
                    ["answerType"] = expectedAnswerType
                },
                ["location"] = new Dictionary<string, object?>
                {
                    ["path"] = location.FhirPath,
                    ["jsonPointer"] = location.JsonPointer
                }
            }
        };
    }

    /// <summary>
    /// Create structured error for QuestionSet data missing
    /// </summary>
    public static RuleValidationError QuestionSetDataMissing(
        string ruleId,
        string resourceType,
        string severity,
        string questionSetId,
        int? entryIndex = null,
        string? userHint = null)
    {
        EnsureNoProse(userHint, nameof(userHint));

        return new RuleValidationError
        {
            RuleId = ruleId,
            RuleType = "QuestionAnswer",
            Severity = severity,
            ResourceType = resourceType,
            FieldPath = "",
            ErrorCode = ValidationErrorCodes.QUESTIONSET_DATA_MISSING,
            UserHint = userHint,
            EntryIndex = entryIndex,
            Details = new Dictionary<string, object>
            {
                ["source"] = "Business",
                ["questionSetId"] = questionSetId
            }
        };
    }

    /// <summary>
    /// Create structured error for question not found in QuestionSet
    /// </summary>
    public static RuleValidationError QuestionNotFound(
        string ruleId,
        string resourceType,
        string severity,
        string? system,
        string code,
        ValidationLocation location,
        string questionSetId,
        string questionIdentifierType,
        int iterationIndex,
        int? entryIndex = null,
        string? userHint = null)
    {
        EnsureNoProse(userHint, nameof(userHint));

        return new RuleValidationError
        {
            RuleId = ruleId,
            RuleType = "QuestionAnswer",
            Severity = severity,
            ResourceType = resourceType,
            FieldPath = location.FhirPath,
            ErrorCode = ValidationErrorCodes.QUESTION_NOT_FOUND,
            UserHint = userHint,
            EntryIndex = entryIndex,
            Details = new Dictionary<string, object>
            {
                ["source"] = "Business",
                ["questionSetId"] = questionSetId,
                ["iteration"] = new Dictionary<string, object>
                {
                    ["path"] = location.FhirPath,
                    ["index"] = iterationIndex
                },
                ["question"] = new Dictionary<string, object?>
                {
                    ["identifierType"] = questionIdentifierType,
                    ["identifier"] = code,
                    ["system"] = system,
                    ["display"] = null
                },
                ["expected"] = new Dictionary<string, object>
                {
                    ["questionIdentifiers"] = "Must match a question in the QuestionSet"
                },
                ["location"] = new Dictionary<string, object?>
                {
                    ["path"] = location.FhirPath,
                    ["jsonPointer"] = location.JsonPointer
                }
            }
        };
    }
}
