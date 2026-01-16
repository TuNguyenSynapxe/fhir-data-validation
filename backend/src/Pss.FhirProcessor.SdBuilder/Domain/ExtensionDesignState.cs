namespace Pss.FhirProcessor.SdBuilder.Domain;

/// <summary>
/// Represents the design-time state of a FHIR extension constraint.
/// Extensions are implemented as specialized slicing on the 'extension' path.
/// </summary>
/// <remarks>
/// FHIR extensions are:
/// - Always on path *.extension
/// - Always repeatable
/// - Always sliced by URL discriminator
/// - May be simple (value[x]) or complex (nested extensions)
/// 
/// This model is a semantic layer over slicing infrastructure.
/// </remarks>
public sealed class ExtensionDesignState
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
    public IReadOnlyList<ExtensionDesignState>? SubExtensions { get; init; }

    /// <summary>
    /// Whether this is a simple extension (has value[x]).
    /// </summary>
    public bool IsSimple => ValueType != null && SubExtensions == null;

    /// <summary>
    /// Whether this is a complex extension (has nested extensions).
    /// </summary>
    public bool IsComplex => SubExtensions != null && SubExtensions.Count > 0;
}
