using Pss.FhirProcessor.Terminology.Domain;

namespace Pss.FhirProcessor.Terminology.Sources.Hl7;

/// <summary>
/// In-memory HL7 R5 ValueSet registry (MVP seed data).
/// No Firely references - static seed data only.
/// </summary>
internal sealed class Hl7R5Registry
{
    private readonly List<ValueSetSummary> _summaries;
    private readonly Dictionary<string, ValueSetPreview> _previews;
    
    public Hl7R5Registry()
    {
        _summaries = InitializeSummaries();
        _previews = InitializePreviews();
    }
    
    public IReadOnlyList<ValueSetSummary> Search(string? query)
    {
        if (string.IsNullOrWhiteSpace(query))
        {
            return _summaries;
        }
        
        var queryLower = query.ToLowerInvariant();
        return _summaries
            .Where(vs => 
                vs.Name.Contains(queryLower, StringComparison.OrdinalIgnoreCase) ||
                vs.Publisher.Contains(queryLower, StringComparison.OrdinalIgnoreCase) ||
                (vs.Description?.Contains(queryLower, StringComparison.OrdinalIgnoreCase) ?? false))
            .ToList();
    }
    
    public bool Contains(string url)
    {
        return _summaries.Any(vs => vs.Url == url);
    }
    
    public ValueSetPreview? Preview(string url, int maxItems)
    {
        if (!_previews.TryGetValue(url, out var preview))
        {
            return null;
        }
        
        // Cap codes to maxItems
        if (preview.Codes.Count <= maxItems)
        {
            return preview;
        }
        
        return new ValueSetPreview
        {
            Url = preview.Url,
            Name = preview.Name,
            Codes = preview.Codes.Take(maxItems).ToList()
        };
    }
    
    private static List<ValueSetSummary> InitializeSummaries()
    {
        return new List<ValueSetSummary>
        {
            new()
            {
                Url = "http://hl7.org/fhir/ValueSet/administrative-gender",
                Name = "AdministrativeGender",
                Publisher = "HL7 International",
                Description = "The gender of a person used for administrative purposes."
            },
            new()
            {
                Url = "http://hl7.org/fhir/ValueSet/observation-status",
                Name = "ObservationStatus",
                Publisher = "HL7 International",
                Description = "Codes providing the status of an observation."
            },
            new()
            {
                Url = "http://hl7.org/fhir/ValueSet/marital-status",
                Name = "MaritalStatus",
                Publisher = "HL7 International",
                Description = "The domestic partnership status of a person."
            },
            new()
            {
                Url = "http://hl7.org/fhir/ValueSet/condition-clinical",
                Name = "ConditionClinicalStatusCodes",
                Publisher = "HL7 International",
                Description = "Preferred value set for Condition Clinical Status."
            }
        };
    }
    
    private static Dictionary<string, ValueSetPreview> InitializePreviews()
    {
        return new Dictionary<string, ValueSetPreview>
        {
            ["http://hl7.org/fhir/ValueSet/administrative-gender"] = new()
            {
                Url = "http://hl7.org/fhir/ValueSet/administrative-gender",
                Name = "AdministrativeGender",
                Codes = new[]
                {
                    new ValueSetCode { Code = "male", Display = "Male" },
                    new ValueSetCode { Code = "female", Display = "Female" },
                    new ValueSetCode { Code = "other", Display = "Other" },
                    new ValueSetCode { Code = "unknown", Display = "Unknown" }
                }
            },
            ["http://hl7.org/fhir/ValueSet/observation-status"] = new()
            {
                Url = "http://hl7.org/fhir/ValueSet/observation-status",
                Name = "ObservationStatus",
                Codes = new[]
                {
                    new ValueSetCode { Code = "registered", Display = "Registered" },
                    new ValueSetCode { Code = "preliminary", Display = "Preliminary" },
                    new ValueSetCode { Code = "final", Display = "Final" },
                    new ValueSetCode { Code = "amended", Display = "Amended" },
                    new ValueSetCode { Code = "corrected", Display = "Corrected" },
                    new ValueSetCode { Code = "cancelled", Display = "Cancelled" },
                    new ValueSetCode { Code = "entered-in-error", Display = "Entered in Error" },
                    new ValueSetCode { Code = "unknown", Display = "Unknown" }
                }
            },
            ["http://hl7.org/fhir/ValueSet/marital-status"] = new()
            {
                Url = "http://hl7.org/fhir/ValueSet/marital-status",
                Name = "MaritalStatus",
                Codes = new[]
                {
                    new ValueSetCode { Code = "A", Display = "Annulled" },
                    new ValueSetCode { Code = "D", Display = "Divorced" },
                    new ValueSetCode { Code = "I", Display = "Interlocutory" },
                    new ValueSetCode { Code = "L", Display = "Legally Separated" },
                    new ValueSetCode { Code = "M", Display = "Married" },
                    new ValueSetCode { Code = "P", Display = "Polygamous" },
                    new ValueSetCode { Code = "S", Display = "Never Married" },
                    new ValueSetCode { Code = "T", Display = "Domestic partner" },
                    new ValueSetCode { Code = "U", Display = "unmarried" },
                    new ValueSetCode { Code = "W", Display = "Widowed" },
                    new ValueSetCode { Code = "UNK", Display = "unknown" }
                }
            },
            ["http://hl7.org/fhir/ValueSet/condition-clinical"] = new()
            {
                Url = "http://hl7.org/fhir/ValueSet/condition-clinical",
                Name = "ConditionClinicalStatusCodes",
                Codes = new[]
                {
                    new ValueSetCode { Code = "active", Display = "Active" },
                    new ValueSetCode { Code = "recurrence", Display = "Recurrence" },
                    new ValueSetCode { Code = "relapse", Display = "Relapse" },
                    new ValueSetCode { Code = "inactive", Display = "Inactive" },
                    new ValueSetCode { Code = "remission", Display = "Remission" },
                    new ValueSetCode { Code = "resolved", Display = "Resolved" }
                }
            }
        };
    }
}
