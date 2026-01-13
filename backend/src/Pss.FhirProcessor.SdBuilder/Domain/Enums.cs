namespace Pss.FhirProcessor.SdBuilder.Domain;

/// <summary>
/// Start mode for SD Builder initialization.
/// </summary>
public enum VisibilityMode
{
    /// <summary>
    /// Exclude base 0..* elements by default.
    /// </summary>
    Minimal,

    /// <summary>
    /// Include all base elements.
    /// </summary>
    Full
}

/// <summary>
/// Binding strength for terminology bindings.
/// </summary>
public enum BindingStrength
{
    /// <summary>
    /// Value must come from the ValueSet.
    /// </summary>
    Required,

    /// <summary>
    /// Value should come from the ValueSet if possible.
    /// </summary>
    Extensible,

    /// <summary>
    /// Value is suggested from the ValueSet.
    /// </summary>
    Preferred
}

/// <summary>
/// Severity of SD authoring validation issues.
/// </summary>
public enum SdValidationSeverity
{
    /// <summary>
    /// Blocks export.
    /// </summary>
    Error,

    /// <summary>
    /// Allows export.
    /// </summary>
    Warning
}
