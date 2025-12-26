using System.Text.RegularExpressions;
using Pss.FhirProcessor.Engine.Models.Questions;

namespace Pss.FhirProcessor.Engine.Validation.Questions;

/// <summary>
/// Validates Question models per answer type
/// </summary>
public class QuestionValidator
{
    /// <summary>
    /// Validate a question
    /// </summary>
    public ValidationResult Validate(Question question)
    {
        var result = new ValidationResult();

        // Basic validation
        // Note: Id can be empty during creation - service will generate it
        // Only validate Id format if present
        if (!string.IsNullOrWhiteSpace(question.Id))
        {
            // Optionally validate ID format here if needed
        }

        if (question.Code == null || string.IsNullOrWhiteSpace(question.Code.Code))
            result.AddError("Code is required");

        if (string.IsNullOrWhiteSpace(question.Metadata?.Text))
            result.AddError("Metadata.Text is required");

        // Answer type specific validation
        switch (question.AnswerType)
        {
            case QuestionAnswerType.Code:
                ValidateCodeQuestion(question, result);
                break;

            case QuestionAnswerType.Quantity:
                ValidateQuantityQuestion(question, result);
                break;

            case QuestionAnswerType.Integer:
                ValidateIntegerQuestion(question, result);
                break;

            case QuestionAnswerType.Decimal:
                ValidateDecimalQuestion(question, result);
                break;

            case QuestionAnswerType.String:
                ValidateStringQuestion(question, result);
                break;

            case QuestionAnswerType.Boolean:
                ValidateBooleanQuestion(question, result);
                break;
        }

        return result;
    }

    private void ValidateCodeQuestion(Question question, ValidationResult result)
    {
        // Code type requires ValueSet binding
        if (question.ValueSet == null || string.IsNullOrWhiteSpace(question.ValueSet.Url))
        {
            result.AddError("Code questions must have ValueSet binding");
        }

        // Code type should not have Unit
        if (question.Unit != null)
        {
            result.AddError("Code questions cannot have Unit");
        }

        // Code type should not have numeric constraints
        if (question.Constraints?.Min.HasValue == true || 
            question.Constraints?.Max.HasValue == true ||
            question.Constraints?.Precision.HasValue == true)
        {
            result.AddError("Code questions cannot have numeric constraints (Min/Max/Precision)");
        }
    }

    private void ValidateQuantityQuestion(Question question, ValidationResult result)
    {
        // Quantity type requires Unit
        if (question.Unit == null || string.IsNullOrWhiteSpace(question.Unit.Code))
        {
            result.AddError("Quantity questions must have Unit");
        }

        // Quantity type should not have ValueSet
        if (question.ValueSet != null)
        {
            result.AddError("Quantity questions cannot have ValueSet");
        }

        // Quantity type should not have string constraints
        if (question.Constraints?.MaxLength.HasValue == true ||
            !string.IsNullOrWhiteSpace(question.Constraints?.Regex))
        {
            result.AddError("Quantity questions cannot have string constraints (MaxLength/Regex)");
        }

        // Validate Min/Max if present
        if (question.Constraints?.Min.HasValue == true && 
            question.Constraints?.Max.HasValue == true)
        {
            if (question.Constraints.Min.Value > question.Constraints.Max.Value)
            {
                result.AddError("Min cannot be greater than Max");
            }
        }
    }

    private void ValidateIntegerQuestion(Question question, ValidationResult result)
    {
        // Integer type should not have Unit
        if (question.Unit != null)
        {
            result.AddError("Integer questions cannot have Unit");
        }

        // Integer type should not have ValueSet
        if (question.ValueSet != null)
        {
            result.AddError("Integer questions cannot have ValueSet");
        }

        // Integer type should not have Precision
        if (question.Constraints?.Precision.HasValue == true)
        {
            result.AddError("Integer questions cannot have Precision");
        }

        // Integer type should not have string constraints
        if (question.Constraints?.MaxLength.HasValue == true ||
            !string.IsNullOrWhiteSpace(question.Constraints?.Regex))
        {
            result.AddError("Integer questions cannot have string constraints (MaxLength/Regex)");
        }

        // Validate Min/Max if present (ensure they are integers)
        if (question.Constraints?.Min.HasValue == true && 
            question.Constraints.Min.Value != Math.Floor(question.Constraints.Min.Value))
        {
            result.AddError("Integer questions must have whole number Min value");
        }

        if (question.Constraints?.Max.HasValue == true && 
            question.Constraints.Max.Value != Math.Floor(question.Constraints.Max.Value))
        {
            result.AddError("Integer questions must have whole number Max value");
        }

        if (question.Constraints?.Min.HasValue == true && 
            question.Constraints?.Max.HasValue == true)
        {
            if (question.Constraints.Min.Value > question.Constraints.Max.Value)
            {
                result.AddError("Min cannot be greater than Max");
            }
        }
    }

    private void ValidateDecimalQuestion(Question question, ValidationResult result)
    {
        // Decimal type should not have Unit
        if (question.Unit != null)
        {
            result.AddError("Decimal questions cannot have Unit");
        }

        // Decimal type should not have ValueSet
        if (question.ValueSet != null)
        {
            result.AddError("Decimal questions cannot have ValueSet");
        }

        // Decimal type should not have string constraints
        if (question.Constraints?.MaxLength.HasValue == true ||
            !string.IsNullOrWhiteSpace(question.Constraints?.Regex))
        {
            result.AddError("Decimal questions cannot have string constraints (MaxLength/Regex)");
        }

        // Validate Min/Max if present
        if (question.Constraints?.Min.HasValue == true && 
            question.Constraints?.Max.HasValue == true)
        {
            if (question.Constraints.Min.Value > question.Constraints.Max.Value)
            {
                result.AddError("Min cannot be greater than Max");
            }
        }

        // Validate Precision if present
        if (question.Constraints?.Precision.HasValue == true &&
            question.Constraints.Precision.Value < 0)
        {
            result.AddError("Precision must be non-negative");
        }
    }

    private void ValidateStringQuestion(Question question, ValidationResult result)
    {
        // String type should not have Unit
        if (question.Unit != null)
        {
            result.AddError("String questions cannot have Unit");
        }

        // String type should not have ValueSet
        if (question.ValueSet != null)
        {
            result.AddError("String questions cannot have ValueSet");
        }

        // String type should not have numeric constraints
        if (question.Constraints?.Min.HasValue == true || 
            question.Constraints?.Max.HasValue == true ||
            question.Constraints?.Precision.HasValue == true)
        {
            result.AddError("String questions cannot have numeric constraints (Min/Max/Precision)");
        }

        // Validate Regex if present
        if (!string.IsNullOrWhiteSpace(question.Constraints?.Regex))
        {
            try
            {
                _ = new Regex(question.Constraints.Regex);
            }
            catch (ArgumentException)
            {
                result.AddError("Regex pattern is invalid");
            }
        }

        // Validate MaxLength if present
        if (question.Constraints?.MaxLength.HasValue == true &&
            question.Constraints.MaxLength.Value <= 0)
        {
            result.AddError("MaxLength must be positive");
        }
    }

    private void ValidateBooleanQuestion(Question question, ValidationResult result)
    {
        // Boolean type should not have Unit
        if (question.Unit != null)
        {
            result.AddError("Boolean questions cannot have Unit");
        }

        // Boolean type should not have ValueSet
        if (question.ValueSet != null)
        {
            result.AddError("Boolean questions cannot have ValueSet");
        }

        // Boolean type should not have any constraints
        if (question.Constraints != null)
        {
            if (question.Constraints.Min.HasValue ||
                question.Constraints.Max.HasValue ||
                question.Constraints.Precision.HasValue ||
                question.Constraints.MaxLength.HasValue ||
                !string.IsNullOrWhiteSpace(question.Constraints.Regex))
            {
                result.AddError("Boolean questions cannot have constraints");
            }
        }
    }
}

/// <summary>
/// Validation result
/// </summary>
public class ValidationResult
{
    private readonly List<string> _errors = new();

    public bool IsValid => _errors.Count == 0;
    public IReadOnlyList<string> Errors => _errors;

    public void AddError(string error)
    {
        _errors.Add(error);
    }
}
