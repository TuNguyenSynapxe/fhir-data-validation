using Pss.FhirProcessor.Engine.Models.Terminology;

namespace Pss.FhirProcessor.Engine.Interfaces;

/// <summary>
/// Service for managing FHIR CodeSystems in an authoring-only environment.
/// 
/// Design principles:
/// - No locking or concurrency control
/// - No lifecycle enforcement (draft/active/retired are metadata only)
/// - Last-write-wins for saves
/// - Identity is CodeSystem.url (canonical URL)
/// - JSON file storage (or in-memory for testing)
/// </summary>
public interface ITerminologyService
{
    /// <summary>
    /// Retrieves a CodeSystem by its canonical URL.
    /// </summary>
    /// <param name="url">Canonical URL of the CodeSystem (e.g., "http://example.org/fhir/CodeSystem/screening-types")</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>The CodeSystem, or null if not found</returns>
    Task<CodeSystem?> GetCodeSystemByUrlAsync(string url, CancellationToken cancellationToken = default);

    /// <summary>
    /// Lists all CodeSystems for a project.
    /// </summary>
    /// <param name="projectId">Project identifier</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>List of all CodeSystems in the project</returns>
    Task<List<CodeSystem>> ListCodeSystemsAsync(string projectId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Saves a CodeSystem (create or overwrite).
    /// Last-write-wins: no concurrency checking, no locking.
    /// </summary>
    /// <param name="projectId">Project identifier</param>
    /// <param name="codeSystem">CodeSystem to save</param>
    /// <param name="cancellationToken">Cancellation token</param>
    Task SaveCodeSystemAsync(string projectId, CodeSystem codeSystem, CancellationToken cancellationToken = default);

    /// <summary>
    /// Deletes a CodeSystem by its canonical URL.
    /// No cascade: deletion does NOT remove references in constraints (Rule Advisory will detect orphans).
    /// </summary>
    /// <param name="projectId">Project identifier</param>
    /// <param name="url">Canonical URL of the CodeSystem to delete</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>True if deleted, false if not found</returns>
    Task<bool> DeleteCodeSystemAsync(string projectId, string url, CancellationToken cancellationToken = default);

    /// <summary>
    /// Searches for a concept within a CodeSystem by system + code.
    /// Searches recursively through hierarchical concepts.
    /// </summary>
    /// <param name="system">CodeSystem URL</param>
    /// <param name="code">Concept code</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>The concept if found, null otherwise</returns>
    Task<CodeSystemConcept?> FindConceptAsync(string system, string code, CancellationToken cancellationToken = default);
}
