using Hl7.Fhir.Model;
using Hl7.Fhir.Specification.Source;
using Microsoft.Extensions.Logging;
using Pss.FhirProcessor.Engine.Firely;
using Pss.FhirProcessor.Engine.Models;
using Pss.FhirProcessor.Engine.Interfaces;

namespace Pss.FhirProcessor.Engine.Services;

/// <summary>
/// Service for retrieving FHIR R4 schema information
/// Loads StructureDefinitions and builds hierarchical schema trees
/// </summary>
public class FhirSchemaService : IFhirSchemaService
{
    private readonly IFhirModelResolverService _modelResolver;
    private readonly ISchemaExpansionService _expansionService;
    private readonly ILogger<FhirSchemaService> _logger;

    public FhirSchemaService(
        IFhirModelResolverService modelResolver,
        ISchemaExpansionService expansionService,
        ILogger<FhirSchemaService> logger)
    {
        _modelResolver = modelResolver;
        _expansionService = expansionService;
        _logger = logger;
    }

    public async System.Threading.Tasks.Task<FhirSchemaNode?> GetResourceSchemaAsync(string resourceType, CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogInformation("Loading schema for FHIR R4 resource type: {ResourceType}", resourceType);

            // Load StructureDefinition from resolver
            var structureDefinition = _modelResolver.GetStructureDefinition(resourceType);
            
            await System.Threading.Tasks.Task.CompletedTask; // Satisfy async signature

            if (structureDefinition == null)
            {
                _logger.LogWarning("StructureDefinition not found for resource type: {ResourceType}", resourceType);
                return null;
            }

            // Ensure we have snapshot (differential won't work for full tree)
            if (structureDefinition.Snapshot == null || structureDefinition.Snapshot.Element.Count == 0)
            {
                _logger.LogWarning("StructureDefinition snapshot is empty for: {ResourceType}", resourceType);
                return null;
            }

            _logger.LogInformation("Building schema tree for {ResourceType} with {ElementCount} elements", 
                resourceType, structureDefinition.Snapshot.Element.Count);

            // Use safe expansion service
            var rootNode = _expansionService.ExpandStructureDefinition(structureDefinition, resourceType);

            _logger.LogInformation("Schema tree built successfully for {ResourceType}", resourceType);

            return rootNode;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error loading schema for resource type: {ResourceType}", resourceType);
            throw;
        }
    }

    public async Task<List<string>> GetAvailableResourceTypesAsync(CancellationToken cancellationToken = default)
    {
        // Common FHIR R4 resource types
        var resourceTypes = new List<string>
        {
            "Patient", "Observation", "Condition", "Procedure", "Medication",
            "MedicationRequest", "Encounter", "AllergyIntolerance", "Immunization",
            "DiagnosticReport", "Organization", "Practitioner", "PractitionerRole",
            "Location", "Coverage", "Claim", "CarePlan", "Goal", "ServiceRequest",
            "Specimen", "Device", "DocumentReference", "Bundle"
        };

        return await System.Threading.Tasks.Task.FromResult(resourceTypes.OrderBy(r => r).ToList());
    }
}
