using System.Linq;
using Hl7.Fhir.Model;
using Hl7.Fhir.Specification.Source;
using Hl7.Fhir.Introspection;
using Microsoft.Extensions.Logging;
using Pss.FhirProcessor.Engine.Interfaces;
using Pss.FhirProcessor.Engine.Models;

namespace Pss.FhirProcessor.Engine.Firely;

/// <summary>
/// FHIR R4 model resolver service.
/// Loads FHIR R4 core specification from embedded resources.
/// Provides StructureDefinition resolver for validation.
/// </summary>
public class FhirR4ModelResolverService : IFhirModelResolverService
{
    private readonly ILogger<FhirR4ModelResolverService> _logger;
    private readonly IResourceResolver _resourceResolver;
    private readonly ModelInspector _modelInspector;

    public FhirR4ModelResolverService(ILogger<FhirR4ModelResolverService> logger)
    {
        _logger = logger;

        try
        {
            _logger.LogInformation("Initializing FHIR R4 Model Resolver...");

            // Use the built-in ModelInspector which has information about all R4 resources
            _modelInspector = ModelInfo.ModelInspector;
            
            // Create an empty resolver - we'll generate definitions on-demand
            _resourceResolver = new InMemoryResourceResolver();
            
            _logger.LogInformation("FHIR R4 Model Resolver initialized successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to initialize FHIR R4 Model Resolver");
            throw new InvalidOperationException("Failed to initialize FHIR R4 Model Resolver. Ensure Hl7.Fhir.R4 package is available.", ex);
        }
    }

    /// <inheritdoc/>
    public FhirVersion Version => FhirVersion.R4;

    /// <inheritdoc/>
    public IResourceResolver GetResolver() => _resourceResolver;

    /// <inheritdoc/>
    public StructureDefinition? GetStructureDefinition(string resourceType)
    {
        try
        {
            _logger.LogInformation("Generating StructureDefinition for {ResourceType}", resourceType);
            
            // Get the class mapping for this resource type
            var classMapping = _modelInspector.FindClassMapping(resourceType);
            if (classMapping == null)
            {
                _logger.LogWarning("No class mapping found for resource type: {ResourceType}", resourceType);
                return null;
            }

            // Create a StructureDefinition with recursively expanded elements
            var sd = new StructureDefinition
            {
                Url = $"http://hl7.org/fhir/StructureDefinition/{resourceType}",
                Name = resourceType,
                Status = PublicationStatus.Active,
                Kind = StructureDefinition.StructureDefinitionKind.Resource,
                Abstract = false,
                Type = resourceType,
                Differential = new StructureDefinition.DifferentialComponent()
            };

            // Build elements recursively
            var elements = new List<ElementDefinition>();
            var visitedTypes = new HashSet<string>();
            
            BuildElementsRecursively(resourceType, classMapping, elements, visitedTypes, depth: 0, maxDepth: 6);

            sd.Differential.Element = elements;
            sd.Snapshot = new StructureDefinition.SnapshotComponent { Element = elements };

            return sd;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate StructureDefinition for resource type: {ResourceType}", resourceType);
            return null;
        }
    }

    /// <summary>
    /// Recursively builds ElementDefinitions for a type and its properties.
    /// </summary>
    private void BuildElementsRecursively(
        string path,
        ClassMapping classMapping,
        List<ElementDefinition> elements,
        HashSet<string> visitedTypes,
        int depth,
        int maxDepth)
    {
        // Guard: max depth
        if (depth >= maxDepth)
        {
            return;
        }

        // Guard: circular reference
        var typeKey = classMapping.Name;
        if (visitedTypes.Contains(typeKey))
        {
            return;
        }

        // Only add root element for depth 0 (it's already added by the caller for nested types)
        if (depth == 0)
        {
            elements.Add(new ElementDefinition
            {
                Path = path,
                ElementId = path,
                Min = 0,
                Max = "*"
            });
        }

        // Track visited type
        var branchVisited = new HashSet<string>(visitedTypes) { typeKey };

        // Primitive types that should not be expanded
        var primitiveTypes = new HashSet<string>
        {
            "boolean", "integer", "string", "decimal", "uri", "url", "canonical",
            "base64Binary", "instant", "date", "dateTime", "time", "code", "oid",
            "id", "markdown", "unsignedInt", "positiveInt", "uuid", "xhtml"
        };

        // Add property elements
        foreach (var propMapping in classMapping.PropertyMappings)
        {
            var elementPath = $"{path}.{propMapping.Name}";
            
            // Get the actual .NET type from the property mapping
            var dotnetType = propMapping.ImplementingType;
            string typeString;
            
            if (dotnetType != null)
            {
                // Extract simple type name (e.g., "HumanName" from "Hl7.Fhir.Model.HumanName")
                typeString = dotnetType.Name;
            }
            else
            {
                typeString = "Element";
            }
            
            var element = new ElementDefinition
            {
                Path = elementPath,
                ElementId = elementPath,
                Min = 0,
                Max = propMapping.IsCollection ? "*" : "1"
            };

            element.Type = new List<ElementDefinition.TypeRefComponent>
            {
                new ElementDefinition.TypeRefComponent { Code = typeString }
            };

            // Add binding information for enum fields
            // This enables JSON node structural validation to enforce enum constraints
            var binding = GetBindingForElement(elementPath);
            if (binding != null)
            {
                element.Binding = binding;
            }

            elements.Add(element);

            // Recursively expand complex types
            if (!primitiveTypes.Contains(typeString) && !string.IsNullOrEmpty(typeString))
            {
                var nestedClassMapping = _modelInspector.FindClassMapping(typeString);
                if (nestedClassMapping != null)
                {
                    BuildElementsRecursively(
                        elementPath,
                        nestedClassMapping,
                        elements,
                        branchVisited,
                        depth + 1,
                        maxDepth);
                }
            }
        }
    }

    /// <summary>
    /// Returns binding information for well-known enum fields.
    /// This enables JSON node structural validation without requiring full StructureDefinition expansion.
    /// </summary>
    private ElementDefinition.ElementDefinitionBindingComponent? GetBindingForElement(string elementPath)
    {
        // Map common enum fields to their ValueSet URLs
        var bindings = new Dictionary<string, (string ValueSetUrl, BindingStrength Strength)>
        {
            ["Patient.gender"] = ("http://hl7.org/fhir/ValueSet/administrative-gender", BindingStrength.Required),
            ["Observation.status"] = ("http://hl7.org/fhir/ValueSet/observation-status", BindingStrength.Required),
            ["Bundle.type"] = ("http://hl7.org/fhir/ValueSet/bundle-type", BindingStrength.Required),
            ["Encounter.status"] = ("http://hl7.org/fhir/ValueSet/encounter-status", BindingStrength.Required),
            ["MedicationRequest.status"] = ("http://hl7.org/fhir/ValueSet/medicationrequest-status", BindingStrength.Required),
            ["Condition.clinicalStatus"] = ("http://hl7.org/fhir/ValueSet/condition-clinical", BindingStrength.Required),
            ["AllergyIntolerance.clinicalStatus"] = ("http://hl7.org/fhir/ValueSet/allergyintolerance-clinical", BindingStrength.Required),
            ["AllergyIntolerance.verificationStatus"] = ("http://hl7.org/fhir/ValueSet/allergyintolerance-verification", BindingStrength.Required),
        };

        if (bindings.TryGetValue(elementPath, out var binding))
        {
            return new ElementDefinition.ElementDefinitionBindingComponent
            {
                ValueSet = binding.ValueSetUrl,
                Strength = binding.Strength
            };
        }

        return null;
    }
}
