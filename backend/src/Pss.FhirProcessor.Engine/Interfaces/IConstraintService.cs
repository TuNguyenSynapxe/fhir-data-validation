using Pss.FhirProcessor.Engine.Models.Terminology;

namespace Pss.FhirProcessor.Engine.Interfaces;

/// <summary>
/// Service for managing TerminologyConstraints in an authoring-only environment.
/// 
/// Design principles:
/// - No locking or concurrency control
/// - No referential integrity enforcement (Rule Advisory detects broken references)
/// - Last-write-wins for saves
/// - Identity is TerminologyConstraint.id
/// - JSON file storage (or in-memory for testing)
/// </summary>
public interface IConstraintService
{
    /// <summary>
    /// Retrieves a TerminologyConstraint by its ID.
    /// </summary>
    /// <param name="constraintId">Unique constraint identifier (e.g., "TERM-OBS-001")</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>The constraint, or null if not found</returns>
    Task<TerminologyConstraint?> GetConstraintByIdAsync(string constraintId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Lists all TerminologyConstraints for a project.
    /// </summary>
    /// <param name="projectId">Project identifier</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>List of all constraints in the project</returns>
    Task<List<TerminologyConstraint>> ListConstraintsAsync(string projectId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Lists TerminologyConstraints filtered by FHIR resource type.
    /// </summary>
    /// <param name="projectId">Project identifier</param>
    /// <param name="resourceType">FHIR resource type (e.g., "Observation", "Patient")</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>List of constraints for the specified resource type</returns>
    Task<List<TerminologyConstraint>> ListConstraintsByResourceTypeAsync(
        string projectId, 
        string resourceType, 
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Lists TerminologyConstraints that reference a specific CodeSystem.
    /// Useful for detecting which constraints might be affected by CodeSystem changes.
    /// </summary>
    /// <param name="projectId">Project identifier</param>
    /// <param name="codeSystemUrl">CodeSystem URL to filter by</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>List of constraints referencing the CodeSystem</returns>
    Task<List<TerminologyConstraint>> ListConstraintsByCodeSystemAsync(
        string projectId, 
        string codeSystemUrl, 
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Saves a TerminologyConstraint (create or overwrite).
    /// Last-write-wins: no concurrency checking, no locking.
    /// Does NOT validate references (Rule Advisory will detect broken references).
    /// </summary>
    /// <param name="projectId">Project identifier</param>
    /// <param name="constraint">Constraint to save</param>
    /// <param name="cancellationToken">Cancellation token</param>
    Task SaveConstraintAsync(string projectId, TerminologyConstraint constraint, CancellationToken cancellationToken = default);

    /// <summary>
    /// Deletes a TerminologyConstraint by its ID.
    /// </summary>
    /// <param name="projectId">Project identifier</param>
    /// <param name="constraintId">Constraint ID to delete</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>True if deleted, false if not found</returns>
    Task<bool> DeleteConstraintAsync(string projectId, string constraintId, CancellationToken cancellationToken = default);
}
