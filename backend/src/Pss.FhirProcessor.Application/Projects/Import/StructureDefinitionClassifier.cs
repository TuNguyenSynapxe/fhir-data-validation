using System.Text.Json;
using Pss.FhirProcessor.Application.Projects.Import.ImportModels;
using Pss.FhirProcessor.Persistence.Models;

namespace Pss.FhirProcessor.Application.Projects.Import;

/// <summary>
/// Phase 10.2: Classifies StructureDefinitions into promotion categories.
/// Implements explicit rule-based classification (NO heuristics).
/// Expanded promotion logic for real-world IGs.
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
        // Category A: Validation Profile (Phase 10.2 Expanded)
        // ========================================
        // Criteria:
        // 1. kind != "logical" (exclude logical models)
        // 2. abstract == false (or missing)
        // 3. type is a FHIR resource type (not null/empty, not Extension)
        // 4. type != "Bundle" (Bundle profiles handled separately)
        // 5. derivation == "constraint" (or missing for older SDs)
        // 6. Has at least one actionable constraint:
        //    - Cardinality constraints
        //    - Fixed values
        //    - Bindings
        //    - Invariants
        //    - mustSupport
        //    - Slicing
        //    - Differential elements > 0
        // ========================================
        if (kind != "logical" && !string.IsNullOrWhiteSpace(type) && type != "Bundle" && type != "Extension")
        {
            // Check if abstract
            if (abstract_ == true)
            {
                return new ClassificationResult
                {
                    Role = StructureDefinitionRole.SupportingArtifact,
                    IsPromoted = false,
                    Reason = $"Category C: Abstract resource SD (type={type}, abstract=true)"
                };
            }

            // Check derivation (must be constraint, or missing for backward compatibility)
            if (derivation != null && derivation != "constraint" && derivation != "specialization")
            {
                return new ClassificationResult
                {
                    Role = StructureDefinitionRole.SupportingArtifact,
                    IsPromoted = false,
                    Reason = $"Category C: Non-constraint derivation (type={type}, derivation={derivation})"
                };
            }

            // Phase 10.2: Check if SD has actionable constraints
            if (HasActionableConstraints(root))
            {
                return new ClassificationResult
                {
                    Role = StructureDefinitionRole.ValidationProfile,
                    IsPromoted = true,
                    Reason = $"Category A: Validation Profile (type={type}, has actionable constraints)"
                };
            }

            // No actionable constraints - not promoted
            return new ClassificationResult
            {
                Role = StructureDefinitionRole.SupportingArtifact,
                IsPromoted = false,
                Reason = $"Category C: No actionable constraints (type={type}, empty differential)"
            };
        }

        // ========================================
        // Category B: Bundle Profile (Phase 10.2 Simplified)
        // ========================================
        // Criteria:
        // - type == "Bundle"
        // - abstract == false (or missing)
        // - derivation == "constraint" (or missing)
        // Bundle profiles enable resolution but don't generate rules.
        // Referenced or not, all non-abstract Bundle profiles are promoted.
        // ========================================
        if (type == "Bundle")
        {
            // Check if abstract
            if (abstract_ == true)
            {
                return new ClassificationResult
                {
                    Role = StructureDefinitionRole.SupportingArtifact,
                    IsPromoted = false,
                    Reason = $"Category C: Abstract Bundle SD (type=Bundle, abstract=true)"
                };
            }

            // Check derivation
            if (derivation != null && derivation != "constraint" && derivation != "specialization")
            {
                return new ClassificationResult
                {
                    Role = StructureDefinitionRole.SupportingArtifact,
                    IsPromoted = false,
                    Reason = $"Category C: Non-constraint Bundle (type=Bundle, derivation={derivation})"
                };
            }

            // Promote all non-abstract, constraint-based Bundle profiles
            return new ClassificationResult
            {
                Role = StructureDefinitionRole.BundleProfile,
                IsPromoted = true,
                Reason = $"Category B: Bundle Profile (type=Bundle, constraint-based)"
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

    /// <summary>
    /// Phase 10.2: Checks if a StructureDefinition has actionable constraints.
    /// Returns true if ANY of these are present:
    /// - Cardinality constraints (min/max different from base)
    /// - Fixed values (fixed[x])
    /// - Bindings (binding.strength)
    /// - Invariants (constraint[])
    /// - mustSupport = true
    /// - Slicing definitions
    /// - Differential elements count > 0
    /// </summary>
    private static bool HasActionableConstraints(JsonElement root)
    {
        // Check if differential exists and has elements
        if (!root.TryGetProperty("differential", out var differential) ||
            !differential.TryGetProperty("element", out var elements) ||
            elements.ValueKind != JsonValueKind.Array)
        {
            return false;
        }

        var elementArray = elements.EnumerateArray().ToList();
        
        // No differential elements = no constraints
        if (elementArray.Count == 0)
        {
            return false;
        }

        // If only root element exists with no constraints, not actionable
        if (elementArray.Count == 1)
        {
            var rootElement = elementArray[0];
            if (!HasElementConstraints(rootElement))
            {
                return false;
            }
        }

        // Multiple elements or root element with constraints = actionable
        return true;
    }

    /// <summary>
    /// Checks if a single differential element has any constraints.
    /// </summary>
    private static bool HasElementConstraints(JsonElement element)
    {
        // Check for cardinality constraints
        if (element.TryGetProperty("min", out _) || element.TryGetProperty("max", out _))
        {
            return true;
        }

        // Check for fixed values (fixed[x] properties)
        foreach (var property in element.EnumerateObject())
        {
            if (property.Name.StartsWith("fixed", StringComparison.Ordinal))
            {
                return true;
            }
            if (property.Name.StartsWith("pattern", StringComparison.Ordinal))
            {
                return true;
            }
        }

        // Check for bindings
        if (element.TryGetProperty("binding", out var binding) &&
            binding.TryGetProperty("strength", out _))
        {
            return true;
        }

        // Check for invariants
        if (element.TryGetProperty("constraint", out var constraints) &&
            constraints.ValueKind == JsonValueKind.Array &&
            constraints.GetArrayLength() > 0)
        {
            return true;
        }

        // Check for mustSupport
        if (element.TryGetProperty("mustSupport", out var mustSupport) &&
            mustSupport.ValueKind == JsonValueKind.True)
        {
            return true;
        }

        // Check for slicing
        if (element.TryGetProperty("slicing", out _))
        {
            return true;
        }

        // Check for type constraints (can indicate profiling)
        if (element.TryGetProperty("type", out var typeArray) &&
            typeArray.ValueKind == JsonValueKind.Array &&
            typeArray.GetArrayLength() > 0)
        {
            // Type constraints are actionable if they specify profiles or target profiles
            foreach (var typeElement in typeArray.EnumerateArray())
            {
                if (typeElement.TryGetProperty("profile", out _) ||
                    typeElement.TryGetProperty("targetProfile", out _))
                {
                    return true;
                }
            }
        }

        return false;
    }
}
