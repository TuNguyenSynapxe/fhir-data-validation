using Pss.FhirProcessor.Persistence.Models;

namespace Pss.FhirProcessor.Playground.Api.Dtos;

/// <summary>
/// Phase 7.4: Rule metadata (read-only, provenance-visible).
/// </summary>
public class ProjectRuleDto
{
    public Guid RuleId { get; set; }
    public RuleScope Scope { get; set; }
    public Guid? BundleId { get; set; }
    public RuleType RuleType { get; set; }
    public RuleProvenance Provenance { get; set; }
    public string Title { get; set; } = string.Empty;
    public bool IsEnabled { get; set; }
}
