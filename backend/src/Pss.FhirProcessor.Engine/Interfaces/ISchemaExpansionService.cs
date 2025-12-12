using Hl7.Fhir.Model;
using Pss.FhirProcessor.Engine.Models;

namespace Pss.FhirProcessor.Engine.Interfaces;

/// <summary>
/// Interface for safe schema expansion service.
/// Expands FHIR StructureDefinitions into finite schema trees.
/// </summary>
public interface ISchemaExpansionService
{
    /// <summary>
    /// Expands a StructureDefinition into a safe, finite schema tree.
    /// </summary>
    /// <param name="structureDefinition">The StructureDefinition to expand</param>
    /// <param name="resourceType">The resource type name</param>
    /// <param name="maxDepth">Maximum recursion depth (default 8)</param>
    /// <returns>Root schema node with safely expanded children</returns>
    FhirSchemaNode ExpandStructureDefinition(
        StructureDefinition structureDefinition, 
        string resourceType,
        int maxDepth = 8);
}
