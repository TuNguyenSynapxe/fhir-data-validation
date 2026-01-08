using Hl7.Fhir.Model;
using Pss.FhirProcessor.Engine.Firely;

namespace Pss.FhirProcessor.Engine.SdValidation.Terminology;

/// <summary>
/// Phase 3.4: Offline-only ValueSet expander for StructureDefinition validation.
/// 
/// Expands ValueSets using only explicit, offline-resolvable content:
/// - compose.include.concept[] (explicit codes)
/// - compose.include.valueSet[] (recursive imports, cycle-safe)
/// - expansion.contains[] (pre-expanded codes)
/// 
/// FORBIDDEN:
/// - compose.include.filter (requires CodeSystem knowledge)
/// - Entire CodeSystem includes (non-deterministic)
/// - HTTP calls or external terminology servers
/// </summary>
public interface IOfflineValueSetExpander
{
    /// <summary>
    /// Expands a ValueSet to an explicit set of (system, code) pairs.
    /// Only resolves content available via Firely resolver (in-memory).
    /// 
    /// Phase 3.4: Supports nested ValueSet imports with cycle detection.
    /// Returns both valid codes and issues encountered during expansion.
    /// </summary>
    /// <param name="root">Root ValueSet to expand</param>
    /// <param name="context">Firely validation context for resource resolution</param>
    /// <param name="ct">Cancellation token</param>
    /// <returns>Expansion result with codes and issues</returns>
    ValueSetExpansionResult Expand(
        ValueSet root,
        FirelyValidationContext context,
        CancellationToken ct);
}

/// <summary>
/// Phase 3.4: Result of offline ValueSet expansion.
/// Contains explicitly resolvable codes and any issues encountered.
/// </summary>
public sealed record ValueSetExpansionResult
{
    /// <summary>
    /// Explicit (system, code) pairs resolved from ValueSet.
    /// Only includes codes from:
    /// - compose.include.concept[]
    /// - compose.include.valueSet[] (recursive, if resolvable)
    /// - expansion.contains[]
    /// </summary>
    public required IReadOnlySet<(string System, string Code)> Codes { get; init; }

    /// <summary>
    /// Issues encountered during expansion.
    /// Non-empty if ValueSet structure is ambiguous or unresolvable.
    /// </summary>
    public required IReadOnlyList<ValueSetExpansionIssue> Issues { get; init; }
}

/// <summary>
/// Phase 3.4: Issue encountered during offline ValueSet expansion.
/// Explains why expansion is incomplete or ambiguous.
/// </summary>
public sealed record ValueSetExpansionIssue
{
    /// <summary>
    /// Canonical URL of the ValueSet that caused the issue.
    /// </summary>
    public required string ValueSetUrl { get; init; }

    /// <summary>
    /// Violation reason explaining why expansion failed or is ambiguous.
    /// </summary>
    public required SdViolationReason Reason { get; init; }
}
