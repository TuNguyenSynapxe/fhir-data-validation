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
        element.OverrideBinding = binding;
    }

    /// <summary>
    /// Clears binding override for an element (reverts to base binding if any).
    /// </summary>
    /// <param name="path">Element path.</param>
    public void ClearBindingOverride(string path)
    {
        var element = FindElement(path);
        element.OverrideBinding = null;
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

    /// <summary>
    /// Configures slicing for an element.
    /// </summary>
    /// <param name="slicedPath">Path of the element to be sliced.</param>
    /// <param name="ordered">Whether slices must appear in the defined order.</param>
    /// <param name="rules">Slicing rules (Open or Closed).</param>
    /// <param name="discriminators">Discriminators used to differentiate slices.</param>
    public void ConfigureSlicing(
        string slicedPath,
        bool ordered,
        SlicingRules rules,
        IReadOnlyList<SliceDiscriminator> discriminators)
    {
        var element = FindElement(slicedPath);
        
        element.Slicing = new SlicingConfig
        {
            Ordered = ordered,
            Rules = rules,
            Discriminators = new List<SliceDiscriminator>(discriminators)
        };
    }

    /// <summary>
    /// Adds a named slice to a sliced element.
    /// </summary>
    /// <param name="slicedPath">Path of the sliced element.</param>
    /// <param name="sliceName">Name of the slice to add.</param>
    public void AddSlice(string slicedPath, string sliceName)
    {
        var element = FindElement(slicedPath);
        
        // Auto-create SlicingConfig if missing
        if (element.Slicing == null)
        {
            element.Slicing = new SlicingConfig();
        }

        // Auto-create slice if not exists
        if (!element.Slices.ContainsKey(sliceName))
        {
            element.Slices[sliceName] = new SliceDesignState
            {
                SliceName = sliceName
            };
        }
    }

    /// <summary>
    /// Removes a named slice from a sliced element.
    /// </summary>
    /// <param name="slicedPath">Path of the sliced element.</param>
    /// <param name="sliceName">Name of the slice to remove.</param>
    /// <returns>True if removed, false if slice did not exist.</returns>
    public bool RemoveSlice(string slicedPath, string sliceName)
    {
        var element = FindElement(slicedPath);
        return element.Slices.Remove(sliceName);
    }

    /// <summary>
    /// Sets or clears cardinality override for a slice.
    /// </summary>
    /// <param name="slicedPath">Path of the sliced element.</param>
    /// <param name="sliceName">Name of the slice.</param>
    /// <param name="card">Optional cardinality override (null to clear).</param>
    public void SetSliceCardinality(
        string slicedPath,
        string sliceName,
        Cardinality? card)
    {
        var slice = FindSlice(slicedPath, sliceName);
        slice.OverrideCardinality = card;
    }

    /// <summary>
    /// Sets or clears terminology binding for a slice.
    /// </summary>
    /// <param name="slicedPath">Path of the sliced element.</param>
    /// <param name="sliceName">Name of the slice.</param>
    /// <param name="binding">Optional binding configuration (null to clear).</param>
    public void SetSliceBinding(
        string slicedPath,
        string sliceName,
        BindingConfig? binding)
    {
        var slice = FindSlice(slicedPath, sliceName);
        slice.Binding = binding;
    }

    /// <summary>
    /// Sets a fixed value for an element under a slice.
    /// </summary>
    /// <param name="slicedPath">Path of the sliced element.</param>
    /// <param name="sliceName">Name of the slice.</param>
    /// <param name="elementPathUnderSlice">Path of the element under the slice.</param>
    /// <param name="value">The fixed value to set.</param>
    public void SetSliceFixedValue(
        string slicedPath,
        string sliceName,
        string elementPathUnderSlice,
        object value)
    {
        var slice = FindSlice(slicedPath, sliceName);
        slice.FixedValues[elementPathUnderSlice] = value;
    }

    /// <summary>
    /// Sets a pattern value for an element under a slice.
    /// </summary>
    /// <param name="slicedPath">Path of the sliced element.</param>
    /// <param name="sliceName">Name of the slice.</param>
    /// <param name="elementPathUnderSlice">Path of the element under the slice.</param>
    /// <param name="value">The pattern value to set.</param>
    public void SetSlicePatternValue(
        string slicedPath,
        string sliceName,
        string elementPathUnderSlice,
        object value)
    {
        var slice = FindSlice(slicedPath, sliceName);
        slice.PatternValues[elementPathUnderSlice] = value;
    }

    // ============================================
    // Phase 2.2: Slice Child Constraint APIs
    // ============================================

    /// <summary>
    /// Sets or clears cardinality override for a child element within a slice.
    /// </summary>
    /// <param name="parentPath">Path of the sliced parent element.</param>
    /// <param name="sliceName">Name of the slice.</param>
    /// <param name="relativePath">Relative path of the child element (e.g., "valueQuantity.value").</param>
    /// <param name="override">Optional cardinality override (null to clear).</param>
    public void SetSliceElementCardinality(
        string parentPath,
        string sliceName,
        string relativePath,
        Cardinality? @override)
    {
        var slice = FindSlice(parentPath, sliceName);
        var constraint = FindOrCreateChildConstraint(slice, relativePath);
        constraint.CardinalityOverride = @override;
    }

    /// <summary>
    /// Sets or clears binding for a child element within a slice.
    /// </summary>
    /// <param name="parentPath">Path of the sliced parent element.</param>
    /// <param name="sliceName">Name of the slice.</param>
    /// <param name="relativePath">Relative path of the child element.</param>
    /// <param name="binding">Optional binding configuration (null to clear).</param>
    public void SetSliceElementBinding(
        string parentPath,
        string sliceName,
        string relativePath,
        BindingConfig? binding)
    {
        var slice = FindSlice(parentPath, sliceName);
        var constraint = FindOrCreateChildConstraint(slice, relativePath);
        constraint.Binding = binding;
    }

    /// <summary>
    /// Sets or clears fixed value for a child element within a slice.
    /// Setting a fixed value clears any pattern value.
    /// </summary>
    /// <param name="parentPath">Path of the sliced parent element.</param>
    /// <param name="sliceName">Name of the slice.</param>
    /// <param name="relativePath">Relative path of the child element.</param>
    /// <param name="fixedValue">Optional fixed value (null to clear).</param>
    public void SetSliceElementFixedValue(
        string parentPath,
        string sliceName,
        string relativePath,
        object? fixedValue)
    {
        var slice = FindSlice(parentPath, sliceName);
        var constraint = FindOrCreateChildConstraint(slice, relativePath);
        constraint.FixedValue = fixedValue;
        if (fixedValue != null)
            constraint.PatternValue = null; // Mutually exclusive
    }

    /// <summary>
    /// Sets or clears pattern value for a child element within a slice.
    /// Setting a pattern value clears any fixed value.
    /// </summary>
    /// <param name="parentPath">Path of the sliced parent element.</param>
    /// <param name="sliceName">Name of the slice.</param>
    /// <param name="relativePath">Relative path of the child element.</param>
    /// <param name="patternValue">Optional pattern value (null to clear).</param>
    public void SetSliceElementPatternValue(
        string parentPath,
        string sliceName,
        string relativePath,
        object? patternValue)
    {
        var slice = FindSlice(parentPath, sliceName);
        var constraint = FindOrCreateChildConstraint(slice, relativePath);
        constraint.PatternValue = patternValue;
        if (patternValue != null)
            constraint.FixedValue = null; // Mutually exclusive
    }

    private SliceElementConstraint FindOrCreateChildConstraint(SliceDesignState slice, string relativePath)
    {
        var existing = slice.ChildConstraints.FirstOrDefault(c => c.ElementPath == relativePath);
        if (existing != null)
            return existing;

        var constraint = new SliceElementConstraint
        {
            SliceName = slice.SliceName,
            ElementPath = relativePath
        };
        slice.ChildConstraints.Add(constraint);
        return constraint;
    }

    private ElementDesignState FindElement(string path)
    {
        var element = _designState.Elements.FirstOrDefault(e => e.Path == path);
        if (element == null)
            throw new InvalidOperationException($"Element not found: {path}");
        
        return element;
    }

    private SliceDesignState FindSlice(string slicedPath, string sliceName)
    {
        var element = FindElement(slicedPath);
        
        if (!element.Slices.TryGetValue(sliceName, out var slice))
            throw new InvalidOperationException($"Slice not found: {sliceName} on {slicedPath}");
        
        return slice;
    }
}
