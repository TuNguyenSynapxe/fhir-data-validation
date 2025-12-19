namespace Pss.FhirProcessor.Playground.Api.Models;

/// <summary>
/// Request to update project feature flags
/// Admin-only operation
/// </summary>
public class UpdateFeaturesRequest
{
    /// <summary>
    /// Enable/disable tree-based rule authoring UI
    /// </summary>
    public bool? TreeRuleAuthoring { get; set; }
}
