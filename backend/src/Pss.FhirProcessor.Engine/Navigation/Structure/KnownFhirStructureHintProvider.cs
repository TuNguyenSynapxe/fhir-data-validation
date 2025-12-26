namespace Pss.FhirProcessor.Engine.Navigation.Structure;

/// <summary>
/// DLL-SAFE: Minimal structural hint provider with known FHIR R4 repeating fields.
/// 
/// Purpose: Restore implicit array[0] navigation for common repeating fields
/// without hard-coding heuristics in JsonPointerResolver.
/// 
/// This is opt-in via DI registration (Playground uses this, Engine default does not).
/// </summary>
public sealed class KnownFhirStructureHintProvider : IFhirStructureHintProvider
{
    // Known repeating properties by resource type
    private readonly Dictionary<string, HashSet<string>> _repeatingProperties = new()
    {
        ["Observation"] = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "performer",
            "identifier",
            "category",
            "component",
            "basedOn",
            "partOf",
            "hasMember",
            "derivedFrom",
            "code.coding",
            "valueCodeableConcept.coding",
            "interpretation.coding",
            "bodySite.coding",
            "method.coding"
        },
        ["Patient"] = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "identifier",
            "name",
            "telecom",
            "address",
            "photo",
            "contact",
            "communication",
            "link",
            "generalPractitioner"
        },
        ["Practitioner"] = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "identifier",
            "name",
            "telecom",
            "address",
            "photo",
            "qualification",
            "communication"
        },
        ["Organization"] = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "identifier",
            "telecom",
            "address",
            "contact",
            "endpoint"
        },
        ["Encounter"] = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "identifier",
            "statusHistory",
            "classHistory",
            "type",
            "serviceType",
            "priority",
            "episodeOfCare",
            "basedOn",
            "participant",
            "appointment",
            "reasonCode",
            "reasonReference",
            "diagnosis",
            "account",
            "location"
        },
        ["Procedure"] = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "identifier",
            "instantiatesCanonical",
            "instantiatesUri",
            "basedOn",
            "partOf",
            "category",
            "code.coding",
            "reasonCode",
            "reasonReference",
            "bodySite",
            "performer",
            "location",
            "complication",
            "followUp",
            "note",
            "focalDevice",
            "usedReference",
            "usedCode"
        },
        ["DiagnosticReport"] = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "identifier",
            "basedOn",
            "category",
            "code.coding",
            "result",
            "imagingStudy",
            "media",
            "conclusion",
            "conclusionCode",
            "presentedForm"
        },
        ["Condition"] = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "identifier",
            "category",
            "code.coding",
            "bodySite",
            "stage",
            "evidence",
            "note"
        },
        ["Medication"] = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "identifier",
            "code.coding",
            "ingredient"
        },
        ["ServiceRequest"] = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "identifier",
            "instantiatesCanonical",
            "instantiatesUri",
            "basedOn",
            "replaces",
            "category",
            "code.coding",
            "orderDetail",
            "reasonCode",
            "reasonReference",
            "insurance",
            "supportingInfo",
            "specimen",
            "bodySite",
            "note",
            "patientInstruction",
            "relevantHistory"
        }
    };

    /// <summary>
    /// Checks if a property is repeating at the given path.
    /// Supports both exact matches and prefix matches for nested paths.
    /// </summary>
    /// <example>
    /// IsRepeating("Observation", "performer") → true
    /// IsRepeating("Observation", "performer.display") → true (prefix match)
    /// IsRepeating("Observation", "code.coding") → true
    /// IsRepeating("Observation", "code.coding.system") → true (prefix match)
    /// </example>
    public bool IsRepeating(string resourceType, string propertyPath)
    {
        if (string.IsNullOrWhiteSpace(resourceType) || string.IsNullOrWhiteSpace(propertyPath))
        {
            return false;
        }

        if (!_repeatingProperties.TryGetValue(resourceType, out var properties))
        {
            return false;
        }

        // Check for exact match
        if (properties.Contains(propertyPath))
        {
            return true;
        }

        // Check for prefix match (e.g., "performer" matches "performer.display")
        // This allows deeper navigation into repeating structures
        foreach (var knownPath in properties)
        {
            if (propertyPath.StartsWith(knownPath + ".", StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
        }

        return false;
    }

    /// <summary>
    /// Checks if a property is a FHIR Reference type.
    /// Currently a stub - can be enhanced in future phases.
    /// </summary>
    public bool IsReference(string resourceType, string propertyPath)
    {
        // Stub for now - can be populated with known reference properties
        // Examples: subject, patient, encounter, performer, etc.
        return false;
    }
}
