using Hl7.Fhir.Model;
using Hl7.Fhir.FhirPath;
using Microsoft.Extensions.Logging;

namespace Pss.FhirProcessor.Engine.Validation.QuestionAnswer;

/// <summary>
/// Extracts question coding and answer values from FHIR data using relative paths
/// </summary>
public class QuestionAnswerValueExtractor
{
    private readonly ILogger<QuestionAnswerValueExtractor> _logger;

    public QuestionAnswerValueExtractor(ILogger<QuestionAnswerValueExtractor> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// Extract question coding from iteration node
    /// </summary>
    public Coding? ExtractQuestionCoding(Base iterationNode, string relativePath)
    {
        try
        {
            var result = iterationNode.Select(relativePath).FirstOrDefault();
            
            if (result is CodeableConcept codeableConcept && codeableConcept.Coding.Any())
            {
                return codeableConcept.Coding.First();
            }
            
            if (result is Coding coding)
            {
                return coding;
            }

            _logger.LogWarning("QuestionPath did not resolve to Coding or CodeableConcept: {Path}", relativePath);
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error extracting question coding from path: {Path}", relativePath);
            return null;
        }
    }

    /// <summary>
    /// Extract answer value from iteration node
    /// Handles value[x] polymorphism
    /// </summary>
    public object? ExtractAnswerValue(Base iterationNode, string relativePath)
    {
        try
        {
            var result = iterationNode.Select(relativePath).FirstOrDefault();
            
            if (result == null)
            {
                return null;
            }

            // Handle different value types
            return result switch
            {
                FhirString fhirString => fhirString.Value,
                Integer fhirInt => fhirInt.Value,
                FhirDecimal fhirDecimal => fhirDecimal.Value,
                FhirBoolean fhirBool => fhirBool.Value,
                Quantity quantity => quantity,
                CodeableConcept codeableConcept => codeableConcept,
                Coding coding => coding,
                _ => result
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error extracting answer value from path: {Path}", relativePath);
            return null;
        }
    }

    /// <summary>
    /// Determine if answer value is present (not null or empty)
    /// </summary>
    public bool IsAnswerPresent(object? answerValue)
    {
        if (answerValue == null)
            return false;

        return answerValue switch
        {
            string str => !string.IsNullOrWhiteSpace(str),
            int => true,
            decimal => true,
            bool => true,
            Quantity q => q.Value.HasValue,
            CodeableConcept cc => cc.Coding.Any(),
            Coding c => !string.IsNullOrEmpty(c.Code),
            _ => true
        };
    }

    /// <summary>
    /// Get the answer type name for error messages
    /// </summary>
    public string GetAnswerTypeName(object? answerValue)
    {
        if (answerValue == null)
            return "null";

        return answerValue switch
        {
            string => "String",
            int => "Integer",
            decimal => "Decimal",
            bool => "Boolean",
            Quantity => "Quantity",
            CodeableConcept => "CodeableConcept",
            Coding => "Coding",
            _ => answerValue.GetType().Name
        };
    }
}
