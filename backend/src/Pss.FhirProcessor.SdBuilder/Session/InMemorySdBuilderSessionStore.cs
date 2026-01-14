using Pss.FhirProcessor.SdBuilder.Domain;
using System.Collections.Concurrent;

namespace Pss.FhirProcessor.SdBuilder.Session;

/// <summary>
/// In-memory implementation of session store.
/// Thread-safe via ConcurrentDictionary.
/// NO FHIR logic - pure storage only.
/// </summary>
public sealed class InMemorySdBuilderSessionStore : ISdBuilderSessionStore
{
    private readonly ConcurrentDictionary<string, ResourceDesignState> _sessions = new();

    public string Create(ResourceDesignState design)
    {
        ArgumentNullException.ThrowIfNull(design);
        
        var sessionId = Guid.NewGuid().ToString();
        _sessions[sessionId] = design;
        return sessionId;
    }

    public ResourceDesignState? Get(string sessionId)
    {
        _sessions.TryGetValue(sessionId, out var design);
        return design;
    }

    public void Update(string sessionId, ResourceDesignState design)
    {
        ArgumentNullException.ThrowIfNull(design);
        
        if (!_sessions.ContainsKey(sessionId))
        {
            throw new InvalidOperationException($"Session {sessionId} not found");
        }
        
        _sessions[sessionId] = design;
    }

    public void Delete(string sessionId)
    {
        _sessions.TryRemove(sessionId, out _);
    }
}
