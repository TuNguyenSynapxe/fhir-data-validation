using System.Text.Json;
using Hl7.Fhir.Model;
using Hl7.Fhir.Serialization;
using Microsoft.Extensions.Logging;
using Pss.FhirProcessor.Engine.Models;

namespace Pss.FhirProcessor.Engine.Services;

/// <summary>
/// Generates SPEC_HINT catalog from official HL7 FHIR StructureDefinition resources.
/// This replaces manual JSON maintenance with schema-driven, version-aware hints.
/// 
/// DESIGN PRINCIPLES:
/// - Metadata-driven only (no path inference or heuristics)
/// - Graceful failure (never throws, returns empty on error)
/// - Educational/advisory only (does not enforce validation)
/// - Deterministic output (same input = same output)
/// 
/// EXTRACTION RULES:
/// 1. Required fields: element.min > 0 AND not root AND not .id/.extension
/// 2. Conditional: element.condition[] references constraint.key
/// 3. AppliesToEach: parent.max = "*" (array context)
/// </summary>
public class Hl7SpecHintGenerator
{
    private readonly ILogger<Hl7SpecHintGenerator> _logger;
    private readonly FhirJsonParser _parser;

    public Hl7SpecHintGenerator(ILogger<Hl7SpecHintGenerator> logger)
    {
        _logger = logger;
        _parser = new FhirJsonParser();
    }

    /// <summary>
    /// Generates SpecHint catalog from StructureDefinition JSON files.
    /// Gracefully handles errors - returns empty list if generation fails.
    /// Scans /resources, /datatypes, and /base subdirectories for organized spec files.
    /// </summary>
    /// <param name="structureDefinitionDirectory">Base directory containing resources/, datatypes/, and base/ subdirectories</param>
    /// <param name="fhirVersion">FHIR version string (e.g., "R4")</param>
    /// <returns>Dictionary mapping ResourceType to list of SpecHints</returns>
    public Dictionary<string, List<SpecHint>> GenerateHints(string structureDefinitionDirectory, string fhirVersion = "R4")
    {
        var hints = new Dictionary<string, List<SpecHint>>();

        try
        {
            if (!Directory.Exists(structureDefinitionDirectory))
            {
                _logger.LogWarning("StructureDefinition directory not found: {Directory}. Returning empty hints.", structureDefinitionDirectory);
                return hints;
            }

            // Scan all subdirectories (resources, datatypes, base) for StructureDefinition files
            var jsonFiles = Directory.GetFiles(structureDefinitionDirectory, "StructureDefinition-*.json", SearchOption.AllDirectories);
            
            if (jsonFiles.Length == 0)
            {
                _logger.LogWarning("No StructureDefinition files found in {Directory} (searched recursively). Returning empty hints.", structureDefinitionDirectory);
                return hints;
            }

            _logger.LogInformation("Processing {Count} StructureDefinition files from {Directory} (curated subset)", jsonFiles.Length, structureDefinitionDirectory);

            foreach (var file in jsonFiles)
            {
                try
                {
                    var resourceHints = ProcessStructureDefinition(file, fhirVersion);
                    if (resourceHints != null && resourceHints.Value.Item2.Count > 0)
                    {
                        var (resourceType, hintList) = resourceHints.Value;
                        hints[resourceType] = hintList;
                        _logger.LogDebug("Generated {Count} hints for {ResourceType}", hintList.Count, resourceType);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to process StructureDefinition file: {File}. Skipping.", file);
                    // Continue processing other files
                }
            }

            _logger.LogInformation("Successfully generated hints for {Count} resource types", hints.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate HL7 SpecHints. Returning empty hints.");
            return new Dictionary<string, List<SpecHint>>();
        }

        return hints;
    }

    /// <summary>
    /// Processes a single StructureDefinition file and extracts SpecHints.
    /// Returns null if the file doesn't represent a base resource type.
    /// </summary>
    private (string ResourceType, List<SpecHint> Hints)? ProcessStructureDefinition(string filePath, string fhirVersion)
    {
        var json = File.ReadAllText(filePath);
        var structureDefinition = _parser.Parse<StructureDefinition>(json);

        // Only process base resource types (not profiles or extensions)
        if (structureDefinition.Kind != StructureDefinition.StructureDefinitionKind.Resource)
        {
            return null;
        }

        // Extract resource type from the name or type field
        var resourceType = structureDefinition.Type;
        if (string.IsNullOrWhiteSpace(resourceType))
        {
            return null;
        }

        // Filter to major FHIR resources only (not infrastructural types)
        if (IsInfrastructuralType(resourceType))
        {
            return null;
        }

        var hints = new List<SpecHint>();

        // Process snapshot elements (complete expanded view)
        if (structureDefinition.Snapshot?.Element != null)
        {
            // Build constraint lookup for conditional requirements
            var constraints = BuildConstraintLookup(structureDefinition);

            foreach (var element in structureDefinition.Snapshot.Element)
            {
                var elementHints = ExtractHintsFromElement(element, resourceType, fhirVersion, constraints, structureDefinition.Snapshot.Element);
                hints.AddRange(elementHints);
            }
        }

        return (resourceType, hints);
    }

    /// <summary>
    /// Extracts SpecHints from a single ElementDefinition.
    /// Handles both simple required fields and conditional requirements.
    /// </summary>
    private List<SpecHint> ExtractHintsFromElement(
        ElementDefinition element,
        string resourceType,
        string fhirVersion,
        Dictionary<string, ElementDefinition.ConstraintComponent> constraints,
        List<ElementDefinition> allElements)
    {
        var hints = new List<SpecHint>();

        try
        {
            // RULE: Skip root element (e.g., "Patient")
            if (element.Path == resourceType)
            {
                return hints;
            }

            // RULE: Skip .id and .extension fields (meta fields)
            if (element.Path.EndsWith(".id") || element.Path.EndsWith(".extension"))
            {
                return hints;
            }

            // RULE: Check if element is required (min > 0)
            if (element.Min.HasValue && element.Min.Value > 0u)
            {
                // Extract relative path (remove resource type prefix)
                var relativePath = element.Path.Substring(resourceType.Length + 1);

                // Check if parent element is optional (implicit conditional)
                var parentPath = GetParentPath(element.Path);
                var parentElement = parentPath != null 
                    ? allElements.FirstOrDefault(e => e.Path == parentPath) 
                    : null;
                var isImplicitConditional = parentElement != null && parentElement.Min.GetValueOrDefault(0) == 0;

                // Check if has explicit condition property
                var hasExplicitCondition = element.Condition != null && element.Condition.Any();

                if (isImplicitConditional)
                {
                    // IMPLICIT conditional: required child of optional parent
                    var parentRelativePath = parentPath!.Substring(resourceType.Length + 1);
                    var appliesToEach = parentElement!.Max == "*";
                    
                    _logger.LogDebug("Detected implicit conditional: {Path} (parent: {ParentPath}, appliesToEach: {AppliesToEach})",
                        element.Path, parentPath, appliesToEach);
                    
                    hints.Add(new SpecHint
                    {
                        Path = relativePath,
                        Reason = $"According to HL7 FHIR {fhirVersion}, '{element.Path}' is required when {parentPath} is present.",
                        Severity = "warning",
                        Source = "HL7",
                        IsConditional = true,
                        Condition = $"{parentRelativePath}.exists()",
                        AppliesToEach = appliesToEach
                    });
                }
                else if (hasExplicitCondition)
                {
                    // EXPLICIT conditional - need to extract condition expression from constraint
                    var conditionalHints = ExtractConditionalHints(element, relativePath, resourceType, fhirVersion, constraints, allElements);
                    hints.AddRange(conditionalHints);
                }
                else
                {
                    // Simple required field (no conditionality)
                    hints.Add(new SpecHint
                    {
                        Path = relativePath,
                        Reason = $"According to HL7 FHIR {fhirVersion}, '{element.Path}' is required (min cardinality = {element.Min!.Value}).",
                        Severity = "warning",
                        Source = "HL7",
                        IsConditional = false,
                        Condition = null
                    });
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to extract hints from element: {Path}. Skipping.", element.Path);
        }

        return hints;
    }

    /// <summary>
    /// Extracts conditional hints from an element with conditions.
    /// Maps FHIR invariant keys to their FHIRPath expressions.
    /// </summary>
    private List<SpecHint> ExtractConditionalHints(
        ElementDefinition element,
        string relativePath,
        string resourceType,
        string fhirVersion,
        Dictionary<string, ElementDefinition.ConstraintComponent> constraints,
        List<ElementDefinition> allElements)
    {
        var hints = new List<SpecHint>();

        try
        {
            foreach (var conditionKey in element.Condition)
            {
                if (constraints.TryGetValue(conditionKey, out var constraint))
                {
                    // Extract condition expression (FHIRPath)
                    var conditionExpression = constraint.Expression;

                    if (!string.IsNullOrWhiteSpace(conditionExpression))
                    {
                        // Determine if this applies to each element in an array
                        var appliesToEach = DetermineAppliesToEach(element, relativePath, allElements);

                        hints.Add(new SpecHint
                        {
                            Path = relativePath,
                            Reason = $"According to HL7 FHIR {fhirVersion}, '{element.Path}' is required when condition '{conditionExpression}' is true.",
                            Severity = "warning",
                            Source = "HL7",
                            IsConditional = true,
                            Condition = conditionExpression,
                            AppliesToEach = appliesToEach
                        });
                    }
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to extract conditional hints for element: {Path}. Skipping.", element.Path);
        }

        return hints;
    }

    /// <summary>
    /// Determines if a hint should apply to each element in a collection.
    /// Returns true if the parent element has max = "*" (array).
    /// </summary>
    private bool DetermineAppliesToEach(ElementDefinition element, string relativePath, List<ElementDefinition> allElements)
    {
        try
        {
            // Check if this element is a child of an array
            // Example: "communication.language" where "communication" has max = "*"
            var parts = relativePath.Split('.');
            if (parts.Length < 2)
            {
                return false;
            }

            // Get parent path (e.g., "communication" from "communication.language")
            var parentPath = string.Join(".", parts.Take(parts.Length - 1));
            var fullParentPath = $"{element.Path.Split('.')[0]}.{parentPath}";

            // Find parent element definition
            var parentElement = allElements.FirstOrDefault(e => e.Path == fullParentPath);
            if (parentElement != null)
            {
                // Check if parent has max = "*" (unbounded array)
                return parentElement.Max == "*";
            }
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Could not determine AppliesToEach for {Path}. Defaulting to false.", element.Path);
        }

        return false;
    }

    /// <summary>
    /// Builds a lookup dictionary of constraints (invariants) for quick access.
    /// Maps constraint.key to the full constraint component.
    /// </summary>
    private Dictionary<string, ElementDefinition.ConstraintComponent> BuildConstraintLookup(StructureDefinition structureDefinition)
    {
        var lookup = new Dictionary<string, ElementDefinition.ConstraintComponent>();

        try
        {
            if (structureDefinition.Snapshot?.Element != null)
            {
                foreach (var element in structureDefinition.Snapshot.Element)
                {
                    if (element.Constraint != null)
                    {
                        foreach (var constraint in element.Constraint)
                        {
                            if (!string.IsNullOrWhiteSpace(constraint.Key))
                            {
                                lookup[constraint.Key] = constraint;
                            }
                        }
                    }
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to build constraint lookup. Returning empty lookup.");
        }

        return lookup;
    }

    /// <summary>
    /// Checks if a resource type is infrastructural (should be skipped).
    /// We only want clinical/administrative resources, not meta types.
    /// </summary>
    private bool IsInfrastructuralType(string resourceType)
    {
        var infrastructuralTypes = new HashSet<string>
        {
            "Resource",
            "DomainResource",
            "Bundle",
            "Parameters",
            "OperationOutcome",
            "CapabilityStatement",
            "StructureDefinition",
            "ValueSet",
            "CodeSystem",
            "SearchParameter",
            "ImplementationGuide",
            "TerminologyCapabilities",
            "MessageDefinition",
            "CompartmentDefinition",
            "OperationDefinition",
            "Conformance"
        };

        return infrastructuralTypes.Contains(resourceType);
    }

    /// <summary>
    /// Extracts the parent path from an element path.
    /// E.g., "Patient.communication.language" → "Patient.communication"
    /// Returns null if no parent (e.g., "Patient" has no parent).
    /// </summary>
    private string? GetParentPath(string elementPath)
    {
        var lastDotIndex = elementPath.LastIndexOf('.');
        if (lastDotIndex <= 0)
        {
            return null;
        }
        return elementPath.Substring(0, lastDotIndex);
    }
}
