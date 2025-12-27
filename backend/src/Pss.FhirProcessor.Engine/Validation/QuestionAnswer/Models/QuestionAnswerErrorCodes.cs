namespace Pss.FhirProcessor.Engine.Validation.QuestionAnswer.Models;

/// <summary>
/// DEPRECATED: Use ValidationErrorCodes instead
/// This class is kept for backward compatibility only
/// Backend returns error codes; frontend renders appropriate messages
/// </summary>
[Obsolete("Use ValidationErrorCodes from Pss.FhirProcessor.Engine.Validation namespace")]
public static class QuestionAnswerErrorCodes
{
    /// <summary>
    /// Wrong answer type (e.g., expected quantity, got string)
    /// </summary>
    [Obsolete("Use ValidationErrorCodes.INVALID_ANSWER_VALUE")]
    public const string INVALID_ANSWER_VALUE = "INVALID_ANSWER_VALUE";

    /// <summary>
    /// Numeric value outside allowed range
    /// </summary>
    [Obsolete("Use ValidationErrorCodes.ANSWER_OUT_OF_RANGE")]
    public const string ANSWER_OUT_OF_RANGE = "ANSWER_OUT_OF_RANGE";

    /// <summary>
    /// Code not found in allowed ValueSet
    /// </summary>
    [Obsolete("Use ValidationErrorCodes.ANSWER_NOT_IN_VALUESET")]
    public const string ANSWER_NOT_IN_VALUESET = "ANSWER_NOT_IN_VALUESET";

    /// <summary>
    /// Required answer is missing
    /// </summary>
    [Obsolete("Use ValidationErrorCodes.ANSWER_REQUIRED")]
    public const string ANSWER_REQUIRED = "ANSWER_REQUIRED";

    /// <summary>
    /// Multiple answers found when only one allowed
    /// </summary>
    [Obsolete("Use ValidationErrorCodes.ANSWER_MULTIPLE_NOT_ALLOWED")]
    public const string ANSWER_MULTIPLE_NOT_ALLOWED = "ANSWER_MULTIPLE_NOT_ALLOWED";

    /// <summary>
    /// Question identity could not be resolved
    /// </summary>
    [Obsolete("Use ValidationErrorCodes.QUESTION_NOT_FOUND")]
    public const string QUESTION_NOT_FOUND = "QUESTION_NOT_FOUND";

    /// <summary>
    /// QuestionSet data missing or invalid
    /// </summary>
    [Obsolete("Use ValidationErrorCodes.QUESTIONSET_DATA_MISSING")]
    public const string QUESTIONSET_DATA_MISSING = "QUESTIONSET_DATA_MISSING";

    /// <summary>
    /// Invalid answer type (not recognized FHIR type)
    /// </summary>
    [Obsolete("Use ValidationErrorCodes.INVALID_ANSWER_TYPE")]
    public const string INVALID_ANSWER_TYPE = "INVALID_ANSWER_TYPE";
}
