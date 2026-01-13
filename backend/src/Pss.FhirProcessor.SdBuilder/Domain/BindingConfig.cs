namespace Pss.FhirProcessor.SdBuilder.Domain;

/// <summary>
/// Configuration for a terminology binding.
/// </summary>
public sealed class BindingConfig
{
    /// <summary>
    /// Binding strength (required, extensible, preferred).
    /// </summary>
    public BindingStrength Strength { get; set; }

    /// <summary>
    /// Canonical URL of the ValueSet.
    /// </summary>
    public string ValueSetUrl { get; set; } = string.Empty;
}
