using System.Text.Json;
using Pss.FhirProcessor.Application.Projects.Import.ImportModels;
using Pss.FhirProcessor.Persistence.Models;

namespace Pss.FhirProcessor.Application.Projects.Import;

/// <summary>
/// Phase 10.0: Classifies StructureDefinitions into promotion categories.
/// Implements explicit rule-based classification (NO heuristics).
/// </summary>
public sealed class StructureDefinitionClassifier
{
    /// <summary>
    /// Classification result for a StructureDefinition.
    /// </summary>
    public sealed class ClassificationResult
    {
        public StructureDefinitionRole Role { get; init; }
        public bool IsPromoted { get; init; }
        public string Reason { get; init; } = string.Empty;
    }

    /// <summary>
    /// Classifies a StructureDefinition artifact into a promotion category.
    /// </summary>
    /// <param name="artifact">Parsed StructureDefinition artifact.</param>
    /// <param name="bundleProfileUrls">Set of canonical URLs referenced by bundles' meta.profile.</param>
    /// <returns>Classification result.</returns>
    public ClassificationResult Classify(ParsedArtifact artifact, HashSet<string> bundleProfileUrls)
    {
        if (artifact.ArtifactType != ArtifactType.StructureDefinition)
        {
            throw new ArgumentException("Artifact must be a StructureDefinition", nameof(artifact));
        }

        var doc = JsonDocument.Parse(artifact.ResourceJson);
        var root = doc.RootElement;

        // Extract key fields for classification
        var kind = GetStringProperty(root, "kind");
        var type = GetStringProperty(root, "type");
        var abstract_ = GetBoolProperty(root, "abstract");
        var derivation = GetStringProperty(root, "derivation");
        var url = artifact.CanonicalUrl;

        // ========================================
        // Category A: Validation Profile
        // ========================================
        // Criteria:
        // - kind == "resource"
        // - type != null && type != "Bundle"
        // - NOT abstract (abstract=false or missing)
        // ========================================
        if (kind == "resource" && !string.IsNullOrWhiteSpace(type) && type != "Bundle")
        {
            // Check if abstract
            if (abstract_ == true)
            {
                return new ClassificationResult
                {
                    Role = StructureDefinitionRole.SupportingArtifact,
                    IsPromoted = false,
                    Reason = $"Category C: Abstract resource SD (kind=resource, type={type}, abstract=true)"
                };
            }

            return new ClassificationResult
            {
                Role = StructureDefinitionRole.ValidationProfile,
                IsPromoted = true,
                Reason = $"Category A: Validation Profile (kind=resource, type={type})"
            };
        }

        // ========================================
        // Category B: Bundle Profile
        // ========================================
        // Criteria:
        // - type == "Bundle"
        // - Canonical URL is referenced by at least one Bundle.meta.profile
        // ========================================
        if (type == "Bundle")
        {
            if (!string.IsNullOrWhiteSpace(url) && bundleProfileUrls.Contains(url))
            {
                return new ClassificationResult
                {
                    Role = StructureDefinitionRole.BundleProfile,
                    IsPromoted = true,
                    Reason = $"Category B: Bundle Profile (type=Bundle, referenced by bundles)"
                };
            }

            return new ClassificationResult
            {
                Role = StructureDefinitionRole.SupportingArtifact,
                IsPromoted = false,
                Reason = $"Category C: Unreferenced Bundle SD (type=Bundle, not referenced by any bundle)"
            };
        }

        // ========================================
        // Category C: Supporting Artifact
        // ========================================
        // Everything else:
        // - kind != "resource"
        // - type is null/empty
        // - Extensions, complex types, logical models, etc.
        // ========================================
        var kindInfo = string.IsNullOrWhiteSpace(kind) ? "missing" : kind;
        var typeInfo = string.IsNullOrWhiteSpace(type) ? "missing" : type;

        return new ClassificationResult
        {
            Role = StructureDefinitionRole.SupportingArtifact,
            IsPromoted = false,
            Reason = $"Category C: Supporting Artifact (kind={kindInfo}, type={typeInfo})"
        };
    }

    /// <summary>
    /// Extracts all Bundle profile URLs from parsed bundles.
    /// Scans Bundle.meta.profile arrays.
    /// </summary>
    /// <param name="bundles">List of parsed bundles.</param>
    /// <returns>Set of canonical URLs referenced by bundles.</returns>
    public HashSet<string> ExtractBundleProfileUrls(List<ParsedBundle> bundles)
    {
        var profileUrls = new HashSet<string>(StringComparer.Ordinal);

        foreach (var bundle in bundles)
        {
            var doc = JsonDocument.Parse(bundle.BundleJson);
            var root = doc.RootElement;

            // Check Bundle.meta.profile
            if (root.TryGetProperty("meta", out var metaElement) &&
                metaElement.TryGetProperty("profile", out var profileArray) &&
                profileArray.ValueKind == JsonValueKind.Array)
            {
                foreach (var profileElement in profileArray.EnumerateArray())
                {
                    var profileUrl = profileElement.GetString();
                    if (!string.IsNullOrWhiteSpace(profileUrl))
                    {
                        profileUrls.Add(profileUrl);
                    }
                }
            }
        }

        return profileUrls;
    }

    private static string? GetStringProperty(JsonElement element, string propertyName)
    {
        if (element.TryGetProperty(propertyName, out var prop))
        {
            return prop.GetString();
        }
        return null;
    }

    private static bool? GetBoolProperty(JsonElement element, string propertyName)
    {
        if (element.TryGetProperty(propertyName, out var prop) &&
            prop.ValueKind == JsonValueKind.True || prop.ValueKind == JsonValueKind.False)
        {
            return prop.GetBoolean();
        }
        return null;
    }
}
