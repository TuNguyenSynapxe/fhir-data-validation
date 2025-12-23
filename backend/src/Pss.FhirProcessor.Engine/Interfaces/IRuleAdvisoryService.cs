using Pss.FhirProcessor.Engine.Models.Terminology;

namespace Pss.FhirProcessor.Engine.Interfaces;

/// <summary>
/// Service for detecting and reporting rule advisories in terminology authoring.
/// 
/// Design principles:
/// - Advisories are generated dynamically (NOT persisted)
/// - Non-blocking: detection does not prevent saves
/// - Informational: user can choose to fix or ignore
/// - Run on-demand (not automatically on every save)
/// </summary>
public interface IRuleAdvisoryService
{
    /// <summary>
    /// Generates all advisories for a project's terminology and constraints.
    /// Scans all constraints and CodeSystems to detect issues.
    /// </summary>
    /// <param name="projectId">Project identifier</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>List of detected advisories</returns>
    Task<List<RuleAdvisory>> GenerateAdvisoriesAsync(string projectId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Generates advisories for a specific TerminologyConstraint.
    /// Checks if all referenced codes exist in their CodeSystems.
    /// </summary>
    /// <param name="constraint">The constraint to check</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>List of advisories for this constraint</returns>
    Task<List<RuleAdvisory>> GenerateAdvisoriesForConstraintAsync(
        TerminologyConstraint constraint, 
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Generates advisories for a specific CodeSystem.
    /// Checks for issues like duplicate codes, missing displays, etc.
    /// </summary>
    /// <param name="codeSystem">The CodeSystem to check</param>
    /// <param name="projectId">Project identifier (to check constraint references)</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>List of advisories for this CodeSystem</returns>
    Task<List<RuleAdvisory>> GenerateAdvisoriesForCodeSystemAsync(
        CodeSystem codeSystem,
        string projectId,
        CancellationToken cancellationToken = default);
}
