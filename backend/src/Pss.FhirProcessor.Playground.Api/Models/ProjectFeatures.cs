namespace Pss.FhirProcessor.Playground.Api.Models;

/// <summary>
/// Feature flags for controlling access to experimental/preview features per project
/// </summary>
public class ProjectFeatures
{
    /// <summary>
    /// Enable tree-based rule authoring UI (Advanced Rules Preview)
    /// Default: false (opt-in only)
    /// </summary>
    public bool TreeRuleAuthoring { get; set; } = false;
}
