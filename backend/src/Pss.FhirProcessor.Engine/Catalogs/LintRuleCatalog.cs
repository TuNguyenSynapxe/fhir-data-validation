using Pss.FhirProcessor.Engine.Models;
using Pss.FhirProcessor.Engine.Authoring;

namespace Pss.FhirProcessor.Engine.Catalogs;

/// <summary>
/// Catalog of all lint validation rules.
/// This class contains ONLY metadata - no validation logic.
/// 
/// Purpose:
/// - Provides stable rule IDs
/// - Documents what each lint rule checks
/// - Defines severity and confidence levels
/// - Indicates FHIR version applicability
/// - Centralizes disclaimer text
/// </summary>
public static class LintRuleCatalog
{
    private const string DefaultDisclaimer = "This is a best-effort check. Final validation is performed by FHIR engine.";

    #region JSON Category

    public static readonly LintRuleDefinition EmptyInput = new()
    {
        Id = "LINT_EMPTY_INPUT",
        Category = LintRuleCategory.Json,
        Title = "Empty Input",
        Description = "Input JSON is empty, null, or contains only whitespace.",
        Severity = "Error",
        Confidence = "High",
        ApplicableFhirVersions = new List<string> { "R4", "R5" },
        Disclaimer = DefaultDisclaimer
    };

    public static readonly LintRuleDefinition InvalidJson = new()
    {
        Id = "LINT_INVALID_JSON",
        Category = LintRuleCategory.Json,
        Title = "Invalid JSON Syntax",
        Description = "JSON syntax is malformed and cannot be parsed.",
        Severity = "Error",
        Confidence = "High",
        ApplicableFhirVersions = new List<string> { "R4", "R5" },
        Disclaimer = DefaultDisclaimer
    };

    public static readonly LintRuleDefinition RootNotObject = new()
    {
        Id = "LINT_ROOT_NOT_OBJECT",
        Category = LintRuleCategory.Json,
        Title = "Root Must Be Object",
        Description = "FHIR JSON root element must be a JSON object, not an array or primitive.",
        Severity = "Error",
        Confidence = "High",
        ApplicableFhirVersions = new List<string> { "R4", "R5" },
        Disclaimer = DefaultDisclaimer
    };

    #endregion

    #region Structure Category

    public static readonly LintRuleDefinition MissingResourceType = new()
    {
        Id = "LINT_MISSING_RESOURCE_TYPE",
        Category = LintRuleCategory.Structure,
        Title = "Missing resourceType",
        Description = "FHIR resource is missing the required 'resourceType' property.",
        Severity = "Error",
        Confidence = "High",
        ApplicableFhirVersions = new List<string> { "R4", "R5" },
        Disclaimer = DefaultDisclaimer
    };

    public static readonly LintRuleDefinition NotBundle = new()
    {
        Id = "LINT_NOT_BUNDLE",
        Category = LintRuleCategory.Structure,
        Title = "Not a Bundle",
        Description = "Expected a Bundle resource but found a different resourceType.",
        Severity = "Error",
        Confidence = "High",
        ApplicableFhirVersions = new List<string> { "R4", "R5" },
        Disclaimer = DefaultDisclaimer
    };

    public static readonly LintRuleDefinition EntryNotArray = new()
    {
        Id = "LINT_ENTRY_NOT_ARRAY",
        Category = LintRuleCategory.Structure,
        Title = "Bundle Entry Not Array",
        Description = "Bundle.entry property must be an array, not an object or primitive.",
        Severity = "Error",
        Confidence = "High",
        ApplicableFhirVersions = new List<string> { "R4", "R5" },
        Disclaimer = DefaultDisclaimer
    };

    public static readonly LintRuleDefinition EntryNotObject = new()
    {
        Id = "LINT_ENTRY_NOT_OBJECT",
        Category = LintRuleCategory.Structure,
        Title = "Entry Not Object",
        Description = "Each item in Bundle.entry array must be an object.",
        Severity = "Error",
        Confidence = "High",
        ApplicableFhirVersions = new List<string> { "R4", "R5" },
        Disclaimer = DefaultDisclaimer
    };

    public static readonly LintRuleDefinition EntryMissingResource = new()
    {
        Id = "LINT_ENTRY_MISSING_RESOURCE",
        Category = LintRuleCategory.Structure,
        Title = "Entry Missing Resource",
        Description = "Bundle.entry item is missing the 'resource' property.",
        Severity = "Error",
        Confidence = "High",
        ApplicableFhirVersions = new List<string> { "R4", "R5" },
        Disclaimer = DefaultDisclaimer
    };

    public static readonly LintRuleDefinition ResourceNotObject = new()
    {
        Id = "LINT_RESOURCE_NOT_OBJECT",
        Category = LintRuleCategory.Structure,
        Title = "Resource Not Object",
        Description = "Resource property must be a JSON object, not an array or primitive.",
        Severity = "Error",
        Confidence = "High",
        ApplicableFhirVersions = new List<string> { "R4", "R5" },
        Disclaimer = DefaultDisclaimer
    };

    public static readonly LintRuleDefinition ResourceMissingType = new()
    {
        Id = "LINT_RESOURCE_MISSING_TYPE",
        Category = LintRuleCategory.Structure,
        Title = "Resource Missing resourceType",
        Description = "Resource object is missing the required 'resourceType' property.",
        Severity = "Error",
        Confidence = "High",
        ApplicableFhirVersions = new List<string> { "R4", "R5" },
        Disclaimer = DefaultDisclaimer
    };

    public static readonly LintRuleDefinition ResourceTypeNotString = new()
    {
        Id = "LINT_RESOURCE_TYPE_NOT_STRING",
        Category = LintRuleCategory.Structure,
        Title = "resourceType Not String",
        Description = "The 'resourceType' property must be a string value.",
        Severity = "Error",
        Confidence = "High",
        ApplicableFhirVersions = new List<string> { "R4", "R5" },
        Disclaimer = DefaultDisclaimer
    };

    #endregion

    #region Schema Shape Category

    public static readonly LintRuleDefinition ExpectedArray = new()
    {
        Id = "LINT_EXPECTED_ARRAY",
        Category = LintRuleCategory.SchemaShape,
        Title = "Expected Array",
        Description = "Property should be an array according to FHIR schema (max cardinality = '*'), but an object was provided.",
        Severity = "Error",
        Confidence = "High",
        ApplicableFhirVersions = new List<string> { "R4", "R5" },
        Disclaimer = "This check uses FHIR schema cardinality. " + DefaultDisclaimer
    };

    public static readonly LintRuleDefinition ExpectedObject = new()
    {
        Id = "LINT_EXPECTED_OBJECT",
        Category = LintRuleCategory.SchemaShape,
        Title = "Expected Single Object",
        Description = "Property should be a single object according to FHIR schema (max cardinality = 1), but an array was provided.",
        Severity = "Error",
        Confidence = "High",
        ApplicableFhirVersions = new List<string> { "R4", "R5" },
        Disclaimer = "This check uses FHIR schema cardinality. " + DefaultDisclaimer
    };

    public static readonly LintRuleDefinition UnknownElement = new()
    {
        Id = "UNKNOWN_ELEMENT",
        Category = LintRuleCategory.SchemaShape,
        Title = "Unknown FHIR element",
        Description = "Element does not exist in the FHIR specification for this resource",
        Severity = "Warning",
        Confidence = "High",
        ApplicableFhirVersions = new List<string> { "R4", "R5" },
        Disclaimer = "Best-effort check. Extensions or custom elements may be valid. Final validation is performed by the FHIR engine."
    };

    public static readonly LintRuleDefinition MissingRequiredField = new()
    {
        Id = "MISSING_REQUIRED_FIELD",
        Category = LintRuleCategory.SchemaShape,
        Title = "Missing required field",
        Description = "A required field (min > 0 in FHIR schema) is missing from the resource",
        Severity = "Warning",
        Confidence = "High",
        ApplicableFhirVersions = new List<string> { "R4", "R5" },
        Disclaimer = "Best-effort portability check. Some FHIR engines may accept incomplete resources. Final validation is performed by the FHIR engine."
    };

    #endregion

    #region Primitive Category

    public static readonly LintRuleDefinition InvalidDate = new()
    {
        Id = "LINT_INVALID_DATE",
        Category = LintRuleCategory.Primitive,
        Title = "Invalid Date Format",
        Description = "Date value does not match FHIR date format (YYYY, YYYY-MM, or YYYY-MM-DD).",
        Severity = "Warning",
        Confidence = "Medium",
        ApplicableFhirVersions = new List<string> { "R4", "R5" },
        Disclaimer = "This is a regex-based best-effort check. " + DefaultDisclaimer
    };

    public static readonly LintRuleDefinition InvalidDateTime = new()
    {
        Id = "LINT_INVALID_DATETIME",
        Category = LintRuleCategory.Primitive,
        Title = "Invalid DateTime Format",
        Description = "DateTime value does not match ISO 8601 format expected by FHIR.",
        Severity = "Warning",
        Confidence = "Medium",
        ApplicableFhirVersions = new List<string> { "R4", "R5" },
        Disclaimer = "This is a regex-based best-effort check. " + DefaultDisclaimer
    };

    public static readonly LintRuleDefinition BooleanAsString = new()
    {
        Id = "LINT_BOOLEAN_AS_STRING",
        Category = LintRuleCategory.Primitive,
        Title = "Boolean as String",
        Description = "Boolean property is provided as a string ('true'/'false') instead of JSON boolean (true/false).",
        Severity = "Error",
        Confidence = "High",
        ApplicableFhirVersions = new List<string> { "R4", "R5" },
        Disclaimer = DefaultDisclaimer
    };

    #endregion

    #region Compatibility Category

    public static readonly LintRuleDefinition InternalError = new()
    {
        Id = "LINT_INTERNAL_ERROR",
        Category = LintRuleCategory.Compatibility,
        Title = "Internal Lint Error",
        Description = "Lint validation encountered an unexpected error. This should not block FHIR validation.",
        Severity = "Error",
        Confidence = "High",
        ApplicableFhirVersions = new List<string> { "R4", "R5" },
        Disclaimer = "This error is from the lint layer itself. " + DefaultDisclaimer
    };

    public static readonly LintRuleDefinition R5FieldInR4 = new()
    {
        Id = "LINT_R5_FIELD_IN_R4",
        Category = LintRuleCategory.Compatibility,
        Title = "R5-Only Field Used in R4",
        Description = "Field is only available in FHIR R5 but the resource is being validated as R4.",
        Severity = "Error",
        Confidence = "Medium",
        ApplicableFhirVersions = new List<string> { "R4" },
        Disclaimer = "This is a best-effort version compatibility check. " + DefaultDisclaimer
    };

    public static readonly LintRuleDefinition DeprecatedR4Field = new()
    {
        Id = "LINT_DEPRECATED_R4_FIELD",
        Category = LintRuleCategory.Compatibility,
        Title = "Deprecated R4 Field",
        Description = "Field is deprecated in FHIR R5 and should be replaced with the R5 equivalent.",
        Severity = "Warning",
        Confidence = "Medium",
        ApplicableFhirVersions = new List<string> { "R5" },
        Disclaimer = "This is a best-effort version compatibility check. " + DefaultDisclaimer
    };

    #endregion

    #region Catalog Access

    /// <summary>
    /// Gets all lint rule definitions
    /// </summary>
    public static IReadOnlyList<LintRuleDefinition> AllRules { get; } = new List<LintRuleDefinition>
    {
        // JSON
        EmptyInput,
        InvalidJson,
        RootNotObject,

        // Structure
        MissingResourceType,
        NotBundle,
        EntryNotArray,
        EntryNotObject,
        EntryMissingResource,
        ResourceNotObject,
        ResourceMissingType,
        ResourceTypeNotString,

        // Schema Shape
        ExpectedArray,
        ExpectedObject,
        UnknownElement,
        MissingRequiredField,

        // Primitive
        InvalidDate,
        InvalidDateTime,
        BooleanAsString,

        // Compatibility
        InternalError,
        R5FieldInR4,
        DeprecatedR4Field
    };

    /// <summary>
    /// Gets a rule definition by ID
    /// </summary>
    public static LintRuleDefinition? GetRuleById(string ruleId)
    {
        return AllRules.FirstOrDefault(r => r.Id == ruleId);
    }

    /// <summary>
    /// Gets all rules applicable to a specific FHIR version
    /// </summary>
    public static IEnumerable<LintRuleDefinition> GetRulesForVersion(string fhirVersion)
    {
        return AllRules.Where(r => r.ApplicableFhirVersions.Contains(fhirVersion));
    }

    /// <summary>
    /// Gets all rules in a specific category
    /// </summary>
    public static IEnumerable<LintRuleDefinition> GetRulesByCategory(LintRuleCategory category)
    {
        return AllRules.Where(r => r.Category == category);
    }

    #endregion
}
