using Pss.FhirProcessor.Terminology.Domain;
using Pss.FhirProcessor.Terminology.Sources.Hl7.Domain;
using Pss.FhirProcessor.Terminology.Utils;

namespace Pss.FhirProcessor.Terminology.Sources.Hl7;

/// <summary>
/// Enhanced HL7 R5 ValueSet registry with canonical normalization and CodeSystem resolution.
/// 
/// ARCHITECTURE:
/// - Immutable in-memory registry
/// - Canonical URL normalization (strips |version)
/// - CodeSystem → ValueSet resolution for compose-based expansions
/// - Deterministic ordering
/// - No Firely SDK dependencies
/// - No runtime network calls
/// 
/// CURRENT IMPLEMENTATION:
/// - Seed-based: 4 core ValueSets with explicit codes
/// - Future: JSON import pipeline from hl7.fhir.r5.core package
/// </summary>
internal sealed class Hl7R5RegistryV2
{
    private readonly IReadOnlyDictionary<string, CodeSystemDefinition> _codeSystems;
    private readonly IReadOnlyDictionary<string, ValueSetDefinition> _valueSets;
    
    public Hl7R5RegistryV2()
    {
        _codeSystems = BuildCodeSystemRegistry();
        _valueSets = BuildValueSetRegistry();
    }
    
    #region Search
    
    /// <summary>
    /// Search ValueSets by name, publisher, or description.
    /// </summary>
    public IReadOnlyList<ValueSetSummary> SearchValueSets(string? query)
    {
        var results = _valueSets.Values.AsEnumerable();
        
        if (!string.IsNullOrWhiteSpace(query))
        {
            var queryLower = query.ToLowerInvariant();
            results = results.Where(vs =>
                vs.Name.Contains(queryLower, StringComparison.OrdinalIgnoreCase) ||
                (vs.Publisher?.Contains(queryLower, StringComparison.OrdinalIgnoreCase) ?? false) ||
                (vs.Description?.Contains(queryLower, StringComparison.OrdinalIgnoreCase) ?? false));
        }
        
        return results
            .Select(vs => new ValueSetSummary
            {
                Url = vs.Url,
                Name = vs.Name,
                Publisher = vs.Publisher ?? "Unknown",
                Description = vs.Description
            })
            .OrderBy(vs => vs.Name)
            .ThenBy(vs => vs.Url)
            .ToList();
    }
    
    /// <summary>
    /// Check if a ValueSet exists (canonical identity).
    /// </summary>
    public bool ContainsValueSet(string canonicalUrl)
    {
        var identity = CanonicalParser.GetIdentity(canonicalUrl);
        return _valueSets.ContainsKey(identity);
    }
    
    #endregion
    
    #region Preview/Expansion
    
    /// <summary>
    /// Preview codes from a ValueSet.
    /// Handles both explicit codes and compose-based expansion.
    /// </summary>
    public ValueSetPreview? PreviewValueSet(string canonicalUrl, int maxItems)
    {
        var identity = CanonicalParser.GetIdentity(canonicalUrl);
        
        if (!_valueSets.TryGetValue(identity, out var valueSet))
        {
            return null;
        }
        
        var codes = ExpandValueSet(valueSet, maxItems);
        
        return new ValueSetPreview
        {
            Url = valueSet.Url,
            Name = valueSet.Name,
            Codes = codes
        };
    }
    
    private IReadOnlyList<ValueSetCode> ExpandValueSet(ValueSetDefinition valueSet, int maxItems)
    {
        return valueSet.Strategy switch
        {
            ExpansionStrategy.ExplicitCodes => ExpandFromExplicitCodes(valueSet, maxItems),
            ExpansionStrategy.ComposeIncludes => ExpandFromComposeIncludes(valueSet, maxItems),
            ExpansionStrategy.Unsupported => Array.Empty<ValueSetCode>(),
            _ => Array.Empty<ValueSetCode>()
        };
    }
    
    private IReadOnlyList<ValueSetCode> ExpandFromExplicitCodes(ValueSetDefinition valueSet, int maxItems)
    {
        if (valueSet.ExplicitCodes == null)
        {
            return Array.Empty<ValueSetCode>();
        }
        
        return valueSet.ExplicitCodes
            .Take(maxItems)
            .Select(c => new ValueSetCode
            {
                Code = c.Code,
                Display = c.Display
            })
            .ToList();
    }
    
    private IReadOnlyList<ValueSetCode> ExpandFromComposeIncludes(ValueSetDefinition valueSet, int maxItems)
    {
        if (valueSet.ComposeIncludes == null)
        {
            return Array.Empty<ValueSetCode>();
        }
        
        var allCodes = new List<ValueSetCode>();
        
        foreach (var include in valueSet.ComposeIncludes)
        {
            var includeIdentity = CanonicalParser.GetIdentity(include.System);
            
            if (!_codeSystems.TryGetValue(includeIdentity, out var codeSystem))
            {
                // CodeSystem not found - skip
                continue;
            }
            
            if (include.IncludeAll)
            {
                // Include all concepts from CodeSystem
                allCodes.AddRange(codeSystem.Concepts.Select(c => new ValueSetCode
                {
                    Code = c.Code,
                    Display = c.Display
                }));
            }
            else if (include.Concepts != null)
            {
                // Include specific concepts only
                foreach (var conceptCode in include.Concepts)
                {
                    var concept = codeSystem.FindConcept(conceptCode);
                    if (concept != null)
                    {
                        allCodes.Add(new ValueSetCode
                        {
                            Code = concept.Code,
                            Display = concept.Display
                        });
                    }
                }
            }
        }
        
        return allCodes
            .Take(maxItems)
            .ToList();
    }
    
    #endregion
    
    #region Seed Data Builders
    
    private static IReadOnlyDictionary<string, CodeSystemDefinition> BuildCodeSystemRegistry()
    {
        // Currently empty - will be populated when R5 package JSON import is implemented
        // For now, ValueSets use explicit codes rather than compose references
        return new Dictionary<string, CodeSystemDefinition>();
    }
    
    private static IReadOnlyDictionary<string, ValueSetDefinition> BuildValueSetRegistry()
    {
        var valueSets = new List<ValueSetDefinition>
        {
            // Administrative Gender
            new()
            {
                Url = "http://hl7.org/fhir/ValueSet/administrative-gender",
                Name = "AdministrativeGender",
                Publisher = "HL7 International",
                Description = "The gender of a person used for administrative purposes.",
                Strategy = ExpansionStrategy.ExplicitCodes,
                ExplicitCodes = new[]
                {
                    new CodeDefinition { Code = "male", Display = "Male", System = "http://hl7.org/fhir/administrative-gender" },
                    new CodeDefinition { Code = "female", Display = "Female", System = "http://hl7.org/fhir/administrative-gender" },
                    new CodeDefinition { Code = "other", Display = "Other", System = "http://hl7.org/fhir/administrative-gender" },
                    new CodeDefinition { Code = "unknown", Display = "Unknown", System = "http://hl7.org/fhir/administrative-gender" }
                }
            },
            
            // Observation Status
            new()
            {
                Url = "http://hl7.org/fhir/ValueSet/observation-status",
                Name = "ObservationStatus",
                Publisher = "HL7 International",
                Description = "Codes providing the status of an observation.",
                Strategy = ExpansionStrategy.ExplicitCodes,
                ExplicitCodes = new[]
                {
                    new CodeDefinition { Code = "registered", Display = "Registered", System = "http://hl7.org/fhir/observation-status" },
                    new CodeDefinition { Code = "preliminary", Display = "Preliminary", System = "http://hl7.org/fhir/observation-status" },
                    new CodeDefinition { Code = "final", Display = "Final", System = "http://hl7.org/fhir/observation-status" },
                    new CodeDefinition { Code = "amended", Display = "Amended", System = "http://hl7.org/fhir/observation-status" },
                    new CodeDefinition { Code = "corrected", Display = "Corrected", System = "http://hl7.org/fhir/observation-status" },
                    new CodeDefinition { Code = "cancelled", Display = "Cancelled", System = "http://hl7.org/fhir/observation-status" },
                    new CodeDefinition { Code = "entered-in-error", Display = "Entered in Error", System = "http://hl7.org/fhir/observation-status" },
                    new CodeDefinition { Code = "unknown", Display = "Unknown", System = "http://hl7.org/fhir/observation-status" }
                }
            },
            
            // Marital Status
            new()
            {
                Url = "http://hl7.org/fhir/ValueSet/marital-status",
                Name = "MaritalStatus",
                Publisher = "HL7 International",
                Description = "The domestic partnership status of a person.",
                Strategy = ExpansionStrategy.ExplicitCodes,
                ExplicitCodes = new[]
                {
                    new CodeDefinition { Code = "A", Display = "Annulled", System = "http://terminology.hl7.org/CodeSystem/v3-MaritalStatus" },
                    new CodeDefinition { Code = "D", Display = "Divorced", System = "http://terminology.hl7.org/CodeSystem/v3-MaritalStatus" },
                    new CodeDefinition { Code = "I", Display = "Interlocutory", System = "http://terminology.hl7.org/CodeSystem/v3-MaritalStatus" },
                    new CodeDefinition { Code = "L", Display = "Legally Separated", System = "http://terminology.hl7.org/CodeSystem/v3-MaritalStatus" },
                    new CodeDefinition { Code = "M", Display = "Married", System = "http://terminology.hl7.org/CodeSystem/v3-MaritalStatus" },
                    new CodeDefinition { Code = "P", Display = "Polygamous", System = "http://terminology.hl7.org/CodeSystem/v3-MaritalStatus" },
                    new CodeDefinition { Code = "S", Display = "Never Married", System = "http://terminology.hl7.org/CodeSystem/v3-MaritalStatus" },
                    new CodeDefinition { Code = "T", Display = "Domestic partner", System = "http://terminology.hl7.org/CodeSystem/v3-MaritalStatus" },
                    new CodeDefinition { Code = "U", Display = "unmarried", System = "http://terminology.hl7.org/CodeSystem/v3-MaritalStatus" },
                    new CodeDefinition { Code = "W", Display = "Widowed", System = "http://terminology.hl7.org/CodeSystem/v3-MaritalStatus" },
                    new CodeDefinition { Code = "UNK", Display = "unknown", System = "http://terminology.hl7.org/CodeSystem/v3-NullFlavor" }
                }
            },
            
            // Condition Clinical Status
            new()
            {
                Url = "http://hl7.org/fhir/ValueSet/condition-clinical",
                Name = "ConditionClinicalStatusCodes",
                Publisher = "HL7 International",
                Description = "Preferred value set for Condition Clinical Status.",
                Strategy = ExpansionStrategy.ExplicitCodes,
                ExplicitCodes = new[]
                {
                    new CodeDefinition { Code = "active", Display = "Active", System = "http://terminology.hl7.org/CodeSystem/condition-clinical" },
                    new CodeDefinition { Code = "recurrence", Display = "Recurrence", System = "http://terminology.hl7.org/CodeSystem/condition-clinical" },
                    new CodeDefinition { Code = "relapse", Display = "Relapse", System = "http://terminology.hl7.org/CodeSystem/condition-clinical" },
                    new CodeDefinition { Code = "inactive", Display = "Inactive", System = "http://terminology.hl7.org/CodeSystem/condition-clinical" },
                    new CodeDefinition { Code = "remission", Display = "Remission", System = "http://terminology.hl7.org/CodeSystem/condition-clinical" },
                    new CodeDefinition { Code = "resolved", Display = "Resolved", System = "http://terminology.hl7.org/CodeSystem/condition-clinical" }
                }
            }
        };
        
        // Build dictionary keyed by canonical identity (no version)
        return valueSets.ToDictionary(
            vs => CanonicalParser.GetIdentity(vs.Url),
            vs => vs);
    }
    
    #endregion
}
