namespace Pss.FhirProcessor.Engine.Models.Questions;

/// <summary>
/// Constraints for answer values
/// </summary>
public class QuestionConstraints
{
    /// <summary>
    /// Minimum value (for numeric types)
    /// </summary>
    public decimal? Min { get; set; }

    /// <summary>
    /// Maximum value (for numeric types)
    /// </summary>
    public decimal? Max { get; set; }

    /// <summary>
    /// Number of decimal places (for decimal/quantity types)
    /// </summary>
    public int? Precision { get; set; }

    /// <summary>
    /// Maximum string length (for string types)
    /// </summary>
    public int? MaxLength { get; set; }

    /// <summary>
    /// Regular expression pattern (for string types)
    /// </summary>
    public string? Regex { get; set; }
}
