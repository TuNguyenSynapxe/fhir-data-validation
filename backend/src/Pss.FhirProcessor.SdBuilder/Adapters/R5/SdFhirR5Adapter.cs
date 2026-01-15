using Hl7.Fhir.Model;
using Pss.FhirProcessor.SdBuilder.Abstractions;
using Pss.FhirProcessor.SdBuilder.Domain;
using Pss.FhirProcessor.SdBuilder.Engine;
using Pss.FhirProcessor.SdBuilder.Export;

namespace Pss.FhirProcessor.SdBuilder.Adapters.R5;

/// <summary>
/// FHIR R5 adapter for SD Builder.
/// Delegates to existing Phase 3 components without modification.
/// </summary>
public sealed class SdFhirR5Adapter : ISdFhirAdapter
{
    public FhirVersion Version => FhirVersion.R5;

    private readonly IStructureDefinitionRepository _repository;
    private readonly SdImportEngine _importer;
    private readonly IReadOnlyList<ValueSetSummaryDto> _knownValueSets;
    private readonly IReadOnlyDictionary<string, ValueSetPreviewDto> _previewByUrl;

    public SdFhirR5Adapter(IStructureDefinitionRepository repository)
    {
        _repository = repository;
        _importer = new SdImportEngine();
        
        // Curated registry (MVP - deterministic and pure)
        _knownValueSets = InitializeKnownValueSets();
        _previewByUrl = InitializePreviewRegistry();
    }

    /// <summary>
    /// Load base StructureDefinition from repository.
    /// </summary>
    public async Task<StructureDefinition> LoadBaseAsync(string canonicalUrl)
    {
        var result = await _repository.FindByUrlAsync(canonicalUrl, CancellationToken.None);
        return result as StructureDefinition
            ?? throw new InvalidOperationException(
                $"Base StructureDefinition not found: {canonicalUrl}"
            );
    }

    /// <summary>
    /// Import using Phase 3 SdImportEngine (requires base + profile).
    /// </summary>
    public ResourceDesignState Import(StructureDefinition sd)
    {
        // For import, we need the base SD too
        // The calling code must provide the profile SD, and we'll load the base
        var baseSd = LoadBaseAsync(sd.BaseDefinition).GetAwaiter().GetResult();
        return _importer.Import(baseSd, sd);
    }

    /// <summary>
    /// Export using Phase 3 SdExporter (requires base SD).
    /// </summary>
    public StructureDefinition Export(ResourceDesignState design, SdMetadata metadata)
    {
        // For export, we need the base SD
        var baseUrl = $"http://hl7.org/fhir/StructureDefinition/{design.ResourceType}";
        var baseSd = LoadBaseAsync(baseUrl).GetAwaiter().GetResult();
        return SdExporter.Export(design, baseSd, metadata);
    }

    /// <summary>
    /// Search for ValueSets (read-only UX helper).
    /// </summary>
    public System.Threading.Tasks.Task<IReadOnlyList<ValueSetSummaryDto>> SearchValueSetsAsync(
        ValueSetSearchRequest request,
        CancellationToken cancellationToken = default)
    {
        var query = request.Query?.Trim() ?? string.Empty;
        var limit = Math.Clamp(request.Limit, 1, 50);

        var results = _knownValueSets
            .Where(vs =>
            {
                if (string.IsNullOrEmpty(query))
                    return true;

                return vs.Name.Contains(query, StringComparison.OrdinalIgnoreCase) ||
                       vs.Url.Contains(query, StringComparison.OrdinalIgnoreCase) ||
                       (vs.Description?.Contains(query, StringComparison.OrdinalIgnoreCase) ?? false);
            })
            .OrderBy(vs => vs.Name)
            .ThenBy(vs => vs.Url)
            .Take(limit)
            .ToList();

        return System.Threading.Tasks.Task.FromResult<IReadOnlyList<ValueSetSummaryDto>>(results);
    }

    /// <summary>
    /// Preview ValueSet codes (read-only UX helper).
    /// </summary>
    public System.Threading.Tasks.Task<ValueSetPreviewDto> PreviewValueSetAsync(
        string valueSetUrl,
        int maxItems,
        CancellationToken cancellationToken = default)
    {
        var clampedMax = Math.Clamp(maxItems, 1, 200);

        if (_previewByUrl.TryGetValue(valueSetUrl, out var preview))
        {
            // Return limited codes
            var limitedPreview = preview with
            {
                Codes = preview.Codes.Take(clampedMax).ToList()
            };
            return System.Threading.Tasks.Task.FromResult(limitedPreview);
        }

        // Not found - return empty preview
        return System.Threading.Tasks.Task.FromResult(new ValueSetPreviewDto
        {
            Url = valueSetUrl,
            Name = valueSetUrl,
            Codes = Array.Empty<CodeDisplayDto>()
        });
    }

    // ========================================================================
    // Curated Registry (MVP)
    // ========================================================================

    private static List<ValueSetSummaryDto> InitializeKnownValueSets()
    {
        return new List<ValueSetSummaryDto>
        {
            new()
            {
                Url = "http://hl7.org/fhir/ValueSet/administrative-gender",
                Name = "AdministrativeGender",
                Publisher = "HL7 International",
                Description = "The gender of a person used for administrative purposes"
            },
            new()
            {
                Url = "http://hl7.org/fhir/ValueSet/marital-status",
                Name = "Marital Status",
                Publisher = "HL7 International",
                Description = "The domestic partnership status of a person"
            },
            new()
            {
                Url = "http://hl7.org/fhir/ValueSet/observation-category",
                Name = "Observation Category",
                Publisher = "HL7 International",
                Description = "Observation Category codes"
            },
            new()
            {
                Url = "http://hl7.org/fhir/ValueSet/observation-status",
                Name = "Observation Status",
                Publisher = "HL7 International",
                Description = "Codes providing the status of an observation"
            },
            new()
            {
                Url = "http://hl7.org/fhir/ValueSet/condition-clinical",
                Name = "Condition Clinical Status",
                Publisher = "HL7 International",
                Description = "The clinical status of the condition or diagnosis"
            },
            new()
            {
                Url = "http://hl7.org/fhir/ValueSet/condition-ver-status",
                Name = "Condition Verification Status",
                Publisher = "HL7 International",
                Description = "The verification status to support or decline the clinical status"
            },
            new()
            {
                Url = "http://hl7.org/fhir/ValueSet/identifier-use",
                Name = "Identifier Use",
                Publisher = "HL7 International",
                Description = "Identifies the purpose for this identifier"
            },
            new()
            {
                Url = "http://hl7.org/fhir/ValueSet/contact-point-system",
                Name = "Contact Point System",
                Publisher = "HL7 International",
                Description = "Telecommunications form for contact point"
            },
            new()
            {
                Url = "http://hl7.org/fhir/ValueSet/address-use",
                Name = "Address Use",
                Publisher = "HL7 International",
                Description = "The use of an address"
            },
            new()
            {
                Url = "http://hl7.org/fhir/ValueSet/name-use",
                Name = "Name Use",
                Publisher = "HL7 International",
                Description = "The use of a human name"
            }
        };
    }

    private static Dictionary<string, ValueSetPreviewDto> InitializePreviewRegistry()
    {
        return new Dictionary<string, ValueSetPreviewDto>
        {
            ["http://hl7.org/fhir/ValueSet/administrative-gender"] = new()
            {
                Url = "http://hl7.org/fhir/ValueSet/administrative-gender",
                Name = "AdministrativeGender",
                Codes = new List<CodeDisplayDto>
                {
                    new() { Code = "male", Display = "Male" },
                    new() { Code = "female", Display = "Female" },
                    new() { Code = "other", Display = "Other" },
                    new() { Code = "unknown", Display = "Unknown" }
                }
            },
            ["http://hl7.org/fhir/ValueSet/observation-status"] = new()
            {
                Url = "http://hl7.org/fhir/ValueSet/observation-status",
                Name = "Observation Status",
                Codes = new List<CodeDisplayDto>
                {
                    new() { Code = "registered", Display = "Registered" },
                    new() { Code = "preliminary", Display = "Preliminary" },
                    new() { Code = "final", Display = "Final" },
                    new() { Code = "amended", Display = "Amended" },
                    new() { Code = "corrected", Display = "Corrected" },
                    new() { Code = "cancelled", Display = "Cancelled" },
                    new() { Code = "entered-in-error", Display = "Entered in Error" },
                    new() { Code = "unknown", Display = "Unknown" }
                }
            },
            ["http://hl7.org/fhir/ValueSet/observation-category"] = new()
            {
                Url = "http://hl7.org/fhir/ValueSet/observation-category",
                Name = "Observation Category",
                Codes = new List<CodeDisplayDto>
                {
                    new() { Code = "social-history", Display = "Social History" },
                    new() { Code = "vital-signs", Display = "Vital Signs" },
                    new() { Code = "imaging", Display = "Imaging" },
                    new() { Code = "laboratory", Display = "Laboratory" },
                    new() { Code = "procedure", Display = "Procedure" },
                    new() { Code = "survey", Display = "Survey" },
                    new() { Code = "exam", Display = "Exam" },
                    new() { Code = "therapy", Display = "Therapy" }
                }
            },
            ["http://hl7.org/fhir/ValueSet/condition-clinical"] = new()
            {
                Url = "http://hl7.org/fhir/ValueSet/condition-clinical",
                Name = "Condition Clinical Status",
                Codes = new List<CodeDisplayDto>
                {
                    new() { Code = "active", Display = "Active" },
                    new() { Code = "recurrence", Display = "Recurrence" },
                    new() { Code = "relapse", Display = "Relapse" },
                    new() { Code = "inactive", Display = "Inactive" },
                    new() { Code = "remission", Display = "Remission" },
                    new() { Code = "resolved", Display = "Resolved" }
                }
            },
            ["http://hl7.org/fhir/ValueSet/condition-ver-status"] = new()
            {
                Url = "http://hl7.org/fhir/ValueSet/condition-ver-status",
                Name = "Condition Verification Status",
                Codes = new List<CodeDisplayDto>
                {
                    new() { Code = "unconfirmed", Display = "Unconfirmed" },
                    new() { Code = "provisional", Display = "Provisional" },
                    new() { Code = "differential", Display = "Differential" },
                    new() { Code = "confirmed", Display = "Confirmed" },
                    new() { Code = "refuted", Display = "Refuted" },
                    new() { Code = "entered-in-error", Display = "Entered in Error" }
                }
            },
            ["http://hl7.org/fhir/ValueSet/marital-status"] = new()
            {
                Url = "http://hl7.org/fhir/ValueSet/marital-status",
                Name = "Marital Status",
                Codes = new List<CodeDisplayDto>
                {
                    new() { Code = "A", Display = "Annulled" },
                    new() { Code = "D", Display = "Divorced" },
                    new() { Code = "I", Display = "Interlocutory" },
                    new() { Code = "L", Display = "Legally Separated" },
                    new() { Code = "M", Display = "Married" },
                    new() { Code = "P", Display = "Polygamous" },
                    new() { Code = "S", Display = "Never Married" },
                    new() { Code = "T", Display = "Domestic Partner" },
                    new() { Code = "U", Display = "Unmarried" },
                    new() { Code = "W", Display = "Widowed" },
                    new() { Code = "UNK", Display = "Unknown" }
                }
            }
        };
    }
}
