using Hl7.Fhir.Model;
using Microsoft.Extensions.Logging;
using Pss.FhirProcessor.Engine.Models;

namespace Pss.FhirProcessor.Engine.Authoring;

/// <summary>
/// Classifies SpecHint issues as STRUCTURE (blocking) or SPEC_HINT (advisory).
/// 
/// STRUCTURE: Non-negotiable HL7 base rules that make the payload invalid FHIR JSON:
/// - Category A: Unconditional required elements (min=1, no conditional logic)
/// - Category B: Cardinality violations (array/object shape mismatches)
/// - Category C: JSON representation violations (FHIR JSON grammar errors)
/// - Category D: Closed enum violations (binding strength = required)
/// 
/// SPEC_HINT: Advisory guidance (remains permissive):
/// - Conditional requirements (depends on other fields)
/// - Profile-only constraints
/// - Terminology membership checks (ValueSet validation)
/// - Best-practice recommendations
/// 
/// Design Philosophy:
/// - We are not making the system stricter than HL7
/// - We are making it faithful to HL7 earlier (pre-POCO)
/// - Preservation: Error codes and messages unchanged
/// - Only source and severity are upgraded
/// </summary>
public class BaseRuleClassifier
{
    private readonly ILogger<BaseRuleClassifier> _logger;
    
    // Root-level required fields that must be present for the resource to be valid FHIR
    // IMPORTANT: JsonNodeStructuralValidator ALREADY validates all fields where Min >= 1
    // This list should ONLY contain violations that JsonNodeStructuralValidator doesn't handle
    // Examples: JSON grammar violations, value[x] choice violations, etc.
    private static readonly HashSet<string> UnconditionalRequiredFields = new()
    {
        // EMPTY - JsonNodeStructuralValidator handles all Min >= 1 validations
        // Future: Add JSON grammar violations not yet handled by JsonNodeStructuralValidator:
        // - Multiple value[x] present
        // - reference as object instead of string
        // - Primitive wrapped as { value: ... }
    };
    
    // Closed enum fields with required binding strength
    // These are validated in JsonNodeStructuralValidator, but we include them here for completeness
    private static readonly HashSet<string> ClosedEnumFields = new()
    {
        "Patient.gender",
        "Observation.status",
        "Bundle.type",
        "Encounter.status"
        // Note: More closed enums are handled by JsonNodeStructuralValidator via FhirEnumIndex
    };

    public BaseRuleClassifier(ILogger<BaseRuleClassifier> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// Determines if a SpecHintIssue should be upgraded to STRUCTURE (blocking) error.
    /// Returns classification result with reasoning.
    /// </summary>
    public ClassificationResult Classify(SpecHintIssue issue)
    {
        // RULE 1: Conditional requirements ALWAYS remain SPEC_HINT
        // These depend on context and cannot be enforced universally
        if (issue.IsConditional)
        {
            return new ClassificationResult
            {
                Source = "SPEC_HINT",
                Severity = "warning",
                Reason = "Conditional requirement - depends on context/profile",
                Category = ClassificationCategory.Conditional
            };
        }
        
        // RULE 2: Root-level unconditional required fields → STRUCTURE
        // These are non-negotiable base HL7 requirements
        if (IsUnconditionalRequiredField(issue.Path))
        {
            _logger.LogDebug("Upgrading '{Path}' to STRUCTURE: Category A (unconditional required)", issue.Path);
            return new ClassificationResult
            {
                Source = "STRUCTURE",
                Severity = "error",
                Reason = "Unconditional required field per HL7 base specification",
                Category = ClassificationCategory.UnconditionalRequired
            };
        }
        
        // RULE 3: Closed enum violations are already handled by JsonNodeStructuralValidator
        // If they reach here, they're advisory only (e.g., preferred/extensible bindings)
        if (ClosedEnumFields.Contains(issue.Path))
        {
            _logger.LogDebug("'{Path}' is a closed enum but reached SPEC_HINT - likely already validated", issue.Path);
            // These should already be caught by structural validation
            // If they reach here, keep as SPEC_HINT (might be a secondary check)
            return new ClassificationResult
            {
                Source = "SPEC_HINT",
                Severity = "warning",
                Reason = "Closed enum already validated by structural layer",
                Category = ClassificationCategory.AlreadyHandled
            };
        }
        
        // RULE 4: Check if it's a nested required field (child of optional parent)
        // These should remain SPEC_HINT because enforcement depends on parent presence
        if (IsNestedOptionalRequirement(issue.Path))
        {
            _logger.LogDebug("Keeping '{Path}' as SPEC_HINT: nested optional requirement", issue.Path);
            return new ClassificationResult
            {
                Source = "SPEC_HINT",
                Severity = "warning",
                Reason = "Required field within optional parent - contextual guidance",
                Category = ClassificationCategory.NestedOptional
            };
        }
        
        // RULE 5: Default to SPEC_HINT for advisory guidance
        // Includes: terminology checks, best practices, profile-specific rules
        _logger.LogDebug("Keeping '{Path}' as SPEC_HINT: advisory guidance", issue.Path);
        return new ClassificationResult
        {
            Source = "SPEC_HINT",
            Severity = "warning",
            Reason = "Advisory guidance - not a base HL7 violation",
            Category = ClassificationCategory.Advisory
        };
    }
    
    /// <summary>
    /// Checks if a path represents an unconditional required field at the resource root level.
    /// Examples: Observation.status, Encounter.class, Bundle.type
    /// </summary>
    private bool IsUnconditionalRequiredField(string path)
    {
        // Exact match against known unconditional required fields
        return UnconditionalRequiredFields.Contains(path);
    }
    
    /// <summary>
    /// Checks if a path represents a nested field within an optional parent.
    /// Examples: 
    /// - "Patient.communication.language" (communication is optional array)
    /// - "Observation.component.code" (component is optional array)
    /// 
    /// These should remain SPEC_HINT because:
    /// 1. Parent may not exist (optional)
    /// 2. If parent exists, child is required (conditional enforcement)
    /// 3. HL7 spec says "IF parent present, THEN child required"
    /// </summary>
    private bool IsNestedOptionalRequirement(string path)
    {
        // Check for nested paths (contains more than one dot after resource type)
        var parts = path.Split('.');
        
        // Root-level fields have 2 parts: "ResourceType.field"
        // Nested fields have 3+ parts: "ResourceType.parent.field"
        if (parts.Length <= 2)
        {
            return false; // Root-level field
        }
        
        // Nested field - these are typically conditional on parent presence
        // Examples:
        // - Patient.communication.language
        // - Observation.component.code
        // - Observation.component.value[x]
        return true;
    }
}

/// <summary>
/// Result of rule classification.
/// </summary>
public class ClassificationResult
{
    /// <summary>
    /// Source to assign: "STRUCTURE" (blocking) or "SPEC_HINT" (advisory)
    /// </summary>
    public required string Source { get; init; }
    
    /// <summary>
    /// Severity to assign: "error" (blocking) or "warning" (advisory)
    /// </summary>
    public required string Severity { get; init; }
    
    /// <summary>
    /// Human-readable reason for classification decision
    /// </summary>
    public required string Reason { get; init; }
    
    /// <summary>
    /// Category of classification for analytics/debugging
    /// </summary>
    public required ClassificationCategory Category { get; init; }
}

/// <summary>
/// Categories of rule classification for analytics and debugging.
/// </summary>
public enum ClassificationCategory
{
    /// <summary>
    /// Unconditional required field at resource root (min=1, no conditionals)
    /// Example: Observation.status, Encounter.class
    /// Decision: STRUCTURE (blocking)
    /// </summary>
    UnconditionalRequired,
    
    /// <summary>
    /// Conditional requirement (depends on other fields/context)
    /// Example: Patient.communication.language (only if communication exists)
    /// Decision: SPEC_HINT (advisory)
    /// </summary>
    Conditional,
    
    /// <summary>
    /// Nested required field within optional parent
    /// Example: Observation.component.code (component is optional)
    /// Decision: SPEC_HINT (advisory)
    /// </summary>
    NestedOptional,
    
    /// <summary>
    /// Already handled by earlier validation layer
    /// Example: Closed enum validation in JsonNodeStructuralValidator
    /// Decision: SPEC_HINT (advisory - secondary check only)
    /// </summary>
    AlreadyHandled,
    
    /// <summary>
    /// Advisory guidance (terminology, best practices, profiles)
    /// Decision: SPEC_HINT (advisory)
    /// </summary>
    Advisory
}
