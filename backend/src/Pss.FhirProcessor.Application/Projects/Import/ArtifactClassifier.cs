using System.Text.Json;
using Pss.FhirProcessor.Application.Projects.Import.Errors;
using Pss.FhirProcessor.Application.Projects.Import.ImportModels;
using Pss.FhirProcessor.Persistence.Models;

namespace Pss.FhirProcessor.Application.Projects.Import;

/// <summary>
/// Classifies FHIR resources into artifact types.
/// Deterministic classification based on resourceType only.
/// </summary>
public sealed class ArtifactClassifier
{
    /// <summary>
    /// Classifies a FHIR resource JSON into a ParsedArtifact.
    /// </summary>
    /// <param name="filePath">Relative file path within the package.</param>
    /// <param name="jsonContent">Full FHIR resource JSON.</param>
    /// <returns>Parsed artifact with classification.</returns>
    /// <exception cref="ProjectImportException">Thrown when classification fails.</exception>
    public ParsedArtifact Classify(string filePath, string jsonContent)
    {
        var fileName = Path.GetFileName(filePath);

        // Parse JSON
        JsonDocument doc;
        try
        {
            doc = JsonDocument.Parse(jsonContent);
        }
        catch (JsonException ex)
        {
            throw new ProjectImportException(
                ImportErrorCodes.InvalidJsonFile,
                $"Failed to parse JSON file: {filePath}",
                new Dictionary<string, object> { ["FilePath"] = filePath },
                ex);
        }

        var root = doc.RootElement;

        // Extract resourceType
        if (!root.TryGetProperty("resourceType", out var resourceTypeElement))
        {
            throw new ProjectImportException(
                ImportErrorCodes.InvalidJsonFile,
                $"Missing 'resourceType' in JSON file: {filePath}",
                new Dictionary<string, object> { ["FilePath"] = filePath });
        }

        var resourceType = resourceTypeElement.GetString();
        if (string.IsNullOrWhiteSpace(resourceType))
        {
            throw new ProjectImportException(
                ImportErrorCodes.InvalidJsonFile,
                $"Empty 'resourceType' in JSON file: {filePath}",
                new Dictionary<string, object> { ["FilePath"] = filePath });
        }

        // Classify into ArtifactType
        var artifactType = ClassifyResourceType(resourceType);

        // Extract canonical URL (optional for some types)
        string? canonicalUrl = null;
        if (root.TryGetProperty("url", out var urlElement))
        {
            canonicalUrl = urlElement.GetString();
        }

        // Compute hash
        var hash = SimplifierPackageParser.ComputeHash(jsonContent);

        return new ParsedArtifact
        {
            FilePath = filePath,
            FileName = fileName,
            ResourceType = resourceType,
            ArtifactType = artifactType,
            CanonicalUrl = canonicalUrl,
            ResourceJson = jsonContent,
            Hash = hash
        };
    }

    /// <summary>
    /// Classifies a FHIR resourceType into an ArtifactType enum.
    /// </summary>
    private static ArtifactType ClassifyResourceType(string resourceType)
    {
        return resourceType switch
        {
            "StructureDefinition" => ArtifactType.StructureDefinition,
            "ValueSet" => ArtifactType.ValueSet,
            "CodeSystem" => ArtifactType.CodeSystem,
            "Bundle" => ArtifactType.Bundle,
            "ImplementationGuide" => ArtifactType.Guide,
            "SearchParameter" => ArtifactType.Other,
            "OperationDefinition" => ArtifactType.Other,
            "CapabilityStatement" => ArtifactType.Other,
            "CompartmentDefinition" => ArtifactType.Other,
            "ConceptMap" => ArtifactType.Other,
            "NamingSystem" => ArtifactType.Other,
            _ => ArtifactType.Other
        };
    }

    /// <summary>
    /// Identifies bundles from a list of parsed artifacts.
    /// </summary>
    public List<ParsedBundle> IdentifyBundles(List<ParsedArtifact> artifacts)
    {
        var bundles = new List<ParsedBundle>();

        foreach (var artifact in artifacts.Where(a => a.ArtifactType == ArtifactType.Bundle))
        {
            var doc = JsonDocument.Parse(artifact.ResourceJson);
            var root = doc.RootElement;

            // Extract Bundle.id or use filename
            var bundleName = artifact.FileName;
            if (root.TryGetProperty("id", out var idElement))
            {
                var id = idElement.GetString();
                if (!string.IsNullOrWhiteSpace(id))
                {
                    bundleName = id;
                }
            }

            bundles.Add(new ParsedBundle
            {
                FilePath = artifact.FilePath,
                FileName = artifact.FileName,
                Name = bundleName,
                BundleJson = artifact.ResourceJson
            });
        }

        return bundles;
    }
}
