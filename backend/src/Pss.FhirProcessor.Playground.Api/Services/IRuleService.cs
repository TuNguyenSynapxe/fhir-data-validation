using Pss.FhirProcessor.Playground.Api.Models;

namespace Pss.FhirProcessor.Playground.Api.Services;

/// <summary>
/// Service interface for rule management
/// </summary>
public interface IRuleService
{
    /// <summary>
    /// Extract observed terminology values from project's sample bundle
    /// </summary>
    Task<ObservedTerminologyResponse> GetObservedTerminologyAsync(Guid projectId);
    
    /// <summary>
    /// Create rules in bulk from intents
    /// </summary>
    Task<BulkCreateRulesResponse> BulkCreateRulesAsync(Guid projectId, BulkCreateRulesRequest request);
}
