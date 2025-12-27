namespace Pss.FhirProcessor.Engine.Validation.QuestionAnswer.Models;

/// <summary>
/// STRUCTURED DATA MODEL (NO UI WORDING)
/// Represents expected answer constraints for a question
/// </summary>
public record ExpectedAnswer(
    string AnswerType,
    IDictionary<string, object>? Constraints
);

/// <summary>
/// STRUCTURED DATA MODEL (NO UI WORDING)
/// Represents actual answer value found in FHIR data
/// </summary>
public record ActualAnswer(
    string AnswerType,
    object? Value
);

/// <summary>
/// STRUCTURED DATA MODEL (NO UI WORDING)
/// Represents question identity (system/code/display)
/// </summary>
public record QuestionRef(
    string? System,
    string Code,
    string? Display
);

/// <summary>
/// STRUCTURED DATA MODEL (NO UI WORDING)
/// Represents validation location
/// </summary>
public record ValidationLocation(
    string FhirPath,
    string? JsonPointer
);
