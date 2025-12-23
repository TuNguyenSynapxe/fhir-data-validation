namespace Pss.FhirProcessor.Engine.Models.Questions;

/// <summary>
/// ValueSet binding for coded answers
/// </summary>
public class ValueSetBinding
{
    /// <summary>
    /// Canonical URL of the ValueSet
    /// </summary>
    public string Url { get; set; } = string.Empty;

    /// <summary>
    /// Binding strength: required | extensible | preferred
    /// </summary>
    public string BindingStrength { get; set; } = "required";
}
