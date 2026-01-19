namespace Pss.FhirProcessor.SdBuilder.Domain;

/// <summary>
/// Configuration for an extension applied to an element.
/// Extensions are implemented as specialized slicing on the 'extension' path.
/// </summary>
/// <remarks>
/// This is the EPIC 3 implementation where extensions are modeled as slicing.
/// The extension URL becomes the discriminator, and each extension is a slice.
/// </remarks>
public sealed class ExtensionConfig
{
    /// <summary>
    /// Canonical URL identifying the extension.
    /// Must be globally unique.
    /// </summary>
    public required string Url { get; init; }

    /// <summary>
    /// Human-readable name for the extension.
    /// Used for slice naming and UI display.
    /// </summary>
    public required string Name { get; init; }

    /// <summary>
    /// Whether this is a modifier extension.
    /// Modifier extensions alter the interpretation of the containing element.
    /// </summary>
    public bool IsModifier { get; init; } = false;

    /// <summary>
    /// Cardinality constraint for this extension instance.
    /// </summary>
    public Cardinality Cardinality { get; set; } = new(0, "1");

    /// <summary>
    /// For simple extensions: the type of extension.value[x].
    /// Examples: "string", "CodeableConcept", "integer"
    /// Null for complex extensions.
    /// </summary>
    public string? ValueType { get; set; }

    /// <summary>
    /// For complex extensions: nested sub-extensions.
    /// Null for simple extensions.
    /// </summary>
    public IReadOnlyList<ExtensionConfig>? SubExtensions { get; init; }

    /// <summary>
    /// Whether this is a simple extension (has value[x]).
    /// </summary>
    public bool IsSimple => ValueType != null && SubExtensions == null;

    /// <summary>
    /// Whether this is a complex extension (has nested extensions).
    /// </summary>
    public bool IsComplex => SubExtensions != null && SubExtensions.Count > 0;
}
