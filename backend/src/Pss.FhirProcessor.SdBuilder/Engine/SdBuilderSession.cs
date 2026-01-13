namespace Pss.FhirProcessor.SdBuilder.Engine;

using Pss.FhirProcessor.SdBuilder.Domain;

/// <summary>
/// Controlled session API for mutating StructureDefinition design state.
/// Provides thin command surface over ResourceDesignState without validation logic.
/// </summary>
public sealed class SdBuilderSession
{
    private readonly ResourceDesignState _designState;

    /// <summary>
    /// Initializes a new SD Builder session with existing design state.
    /// </summary>
    /// <param name="designState">The design state to manage.</param>
    public SdBuilderSession(ResourceDesignState designState)
    {
        _designState = designState ?? throw new ArgumentNullException(nameof(designState));
    }

    /// <summary>
    /// Gets the current design state (read-only accessor).
    /// </summary>
    public ResourceDesignState DesignState => _designState;

    /// <summary>
    /// Toggles element inclusion.
    /// </summary>
    /// <param name="path">Element path (e.g. "Patient.name").</param>
    /// <param name="isIncluded">True to include, false to exclude (0..0).</param>
    public void ToggleInclude(string path, bool isIncluded)
    {
        var element = FindElement(path);
        element.IsIncluded = isIncluded;
    }

    /// <summary>
    /// Sets or clears cardinality override for an element.
    /// </summary>
    /// <param name="path">Element path.</param>
    /// <param name="override">Optional cardinality override (null to clear).</param>
    public void SetCardinalityOverride(string path, Cardinality? @override)
    {
        var element = FindElement(path);
        element.OverrideCardinality = @override;
    }

    /// <summary>
    /// Sets or clears terminology binding for an element.
    /// </summary>
    /// <param name="path">Element path.</param>
    /// <param name="binding">Optional binding configuration (null to clear).</param>
    public void SetBinding(string path, BindingConfig? binding)
    {
        var element = FindElement(path);
        element.Binding = binding;
    }

    /// <summary>
    /// Adds an extension to an element.
    /// </summary>
    /// <param name="path">Element path.</param>
    /// <param name="extension">Extension configuration.</param>
    public void AddExtension(string path, ExtensionConfig extension)
    {
        if (extension == null) throw new ArgumentNullException(nameof(extension));

        var element = FindElement(path);
        element.Extensions.Add(extension);
    }

    /// <summary>
    /// Removes an extension from an element by canonical URL.
    /// </summary>
    /// <param name="path">Element path.</param>
    /// <param name="extensionUrl">Canonical URL of the extension to remove.</param>
    /// <returns>True if removed, false if not found.</returns>
    public bool RemoveExtension(string path, string extensionUrl)
    {
        var element = FindElement(path);
        var toRemove = element.Extensions.FirstOrDefault(e => e.Url == extensionUrl);
        
        if (toRemove == null)
            return false;

        element.Extensions.Remove(toRemove);
        return true;
    }

    /// <summary>
    /// Changes the visibility mode of the design state (UX-only, does not affect export).
    /// </summary>
    /// <param name="mode">New visibility mode.</param>
    public void SetVisibilityMode(VisibilityMode mode)
    {
        _designState.VisibilityMode = mode;
    }

    private ElementDesignState FindElement(string path)
    {
        var element = _designState.Elements.FirstOrDefault(e => e.Path == path);
        if (element == null)
            throw new InvalidOperationException($"Element not found: {path}");
        
        return element;
    }
}
