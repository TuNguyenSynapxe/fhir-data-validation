namespace Pss.FhirProcessor.Engine.Services;

/// <summary>
/// Internal-only navigation metadata used by SmartPathNavigationService.
/// NOT exposed in public API - jsonPointer is returned directly.
/// </summary>
internal class NavigationInfoInternal
{
    public string? JsonPointer { get; set; }
    public List<string> Breadcrumbs { get; set; } = new();
    public bool Exists { get; set; }
    public List<string> MissingParents { get; set; } = new();
}
