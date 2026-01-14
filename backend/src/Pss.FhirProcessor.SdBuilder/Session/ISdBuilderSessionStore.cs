using Pss.FhirProcessor.SdBuilder.Domain;

namespace Pss.FhirProcessor.SdBuilder.Session;

/// <summary>
/// Session store for SD Builder design states.
/// Pure storage - no FHIR logic, no validation.
/// </summary>
public interface ISdBuilderSessionStore
{
    /// <summary>
    /// Create a new session with initial design state.
    /// </summary>
    string Create(ResourceDesignState design);

    /// <summary>
    /// Get design state for a session.
    /// </summary>
    ResourceDesignState? Get(string sessionId);

    /// <summary>
    /// Update design state for existing session.
    /// </summary>
    void Update(string sessionId, ResourceDesignState design);

    /// <summary>
    /// Delete a session.
    /// </summary>
    void Delete(string sessionId);
}
