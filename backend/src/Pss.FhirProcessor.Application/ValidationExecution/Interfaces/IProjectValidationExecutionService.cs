using Pss.FhirProcessor.Engine.Models;

namespace Pss.FhirProcessor.Application.ValidationExecution.Interfaces;

/// <summary>
/// Phase 8.1: Validation Execution Service
/// Orchestrates validation for a single Project + Bundle pair using imported artifacts and rules.
/// READ-ONLY. NO mutations. NO rule management. NO publishing.
/// </summary>
public interface IProjectValidationExecutionService
{
    /// <summary>
    /// Execute validation for a project bundle using imported rules and structure definitions.
    /// </summary>
    /// <param name="projectId">Project ID (must exist)</param>
    /// <param name="bundleId">Bundle ID (must belong to project)</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>ValidationResponse compatible with Phase 5/6 frontend</returns>
    /// <exception cref="ValidationExecutionException">When project/bundle not found or validation fails</exception>
    Task<ValidationResponse> ExecuteAsync(
        Guid projectId,
        Guid bundleId,
        CancellationToken cancellationToken = default);
}
