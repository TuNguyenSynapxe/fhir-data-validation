namespace Pss.FhirProcessor.SdBuilder.Domain;

/// <summary>
/// Represents a cardinality constraint (min..max).
/// </summary>
public sealed record Cardinality(int Min, string Max)
{
    /// <summary>
    /// Returns the cardinality in "min..max" format.
    /// </summary>
    public override string ToString() => $"{Min}..{Max}";
}
