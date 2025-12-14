using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Logging;
using Pss.FhirProcessor.Engine.Interfaces;
using Pss.FhirProcessor.Engine.Models;
using Pss.FhirProcessor.Engine.Catalogs;

namespace Pss.FhirProcessor.Engine.Services;

/// <summary>
/// Best-effort structural lint validation service for FHIR JSON.
/// 
/// ARCHITECTURE NOTES:
/// - Runs BEFORE Firely validation
/// - Works on raw JSON (System.Text.Json)
/// - Does NOT create FHIR POCOs
/// - Returns multiple errors without fail-fast
/// - Results are advisory, not authoritative
/// - Uses FHIR schema for accurate array/object validation
/// 
/// Firely validation remains the source of truth for FHIR compliance.
/// </summary>
public class LintValidationService : ILintValidationService
{
    private readonly ILogger<LintValidationService> _logger;
    private readonly IFhirSchemaService _schemaService;

    // Regex patterns for best-effort primitive validation
    private static readonly Regex DateRegex = new(@"^\d{4}(-\d{2}(-\d{2})?)?$", RegexOptions.Compiled);
    private static readonly Regex DateTimeRegex = new(@"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$", RegexOptions.Compiled);
    private static readonly Regex TimeRegex = new(@"^\d{2}:\d{2}:\d{2}(\.\d+)?$", RegexOptions.Compiled);

    // Cache for schema trees during validation
    private readonly Dictionary<string, FhirSchemaNode?> _schemaCache = new();

    public LintValidationService(
        ILogger<LintValidationService> logger,
        IFhirSchemaService schemaService)
    {
        _logger = logger;
        _schemaService = schemaService;
    }

    /// <summary>
    /// Creates a LintIssue from a catalog rule with contextual message
    /// Fails fast if rule is not found (development-time safety)
    /// </summary>
    private static LintIssue CreateIssue(
        string ruleId, 
        string contextualMessage,
        string? jsonPointer = null,
        string? fhirPath = null,
        string? resourceType = null,
        Dictionary<string, object>? details = null)
    {
        var rule = LintRuleCatalog.GetRuleById(ruleId);
        if (rule == null)
        {
            throw new InvalidOperationException(
                $"Lint rule '{ruleId}' not found in catalog. This indicates a programming error.");
        }

        return new LintIssue
        {
            RuleId = rule.Id,
            Category = rule.Category.ToString(),
            Severity = rule.Severity,
            Confidence = rule.Confidence,
            Title = rule.Title,
            Description = rule.Description,
            Message = contextualMessage,
            Disclaimer = rule.Disclaimer,
            JsonPointer = jsonPointer,
            FhirPath = fhirPath,
            ResourceType = resourceType,
            Details = details
        };
    }

    public async Task<IReadOnlyList<LintIssue>> ValidateAsync(
        string bundleJson,
        string fhirVersion,
        CancellationToken cancellationToken = default)
    {
        var issues = new List<LintIssue>();

        try
        {
            _logger.LogInformation("Starting lint validation (best-effort structural checks)");
            
            // Clear schema cache for this validation run
            _schemaCache.Clear();

            // Step 1: JSON-level validation
            if (string.IsNullOrWhiteSpace(bundleJson))
            {
                issues.Add(CreateIssue(
                    "LINT_EMPTY_INPUT",
                    "Input JSON is empty or null",
                    jsonPointer: "/"
                ));
                return issues;
            }

            JsonDocument? document = null;
            try
            {
                document = JsonDocument.Parse(bundleJson);
            }
            catch (JsonException ex)
            {
                issues.Add(CreateIssue(
                    "LINT_INVALID_JSON",
                    $"Parse error: {ex.Message}",
                    jsonPointer: "/",
                    details: new Dictionary<string, object>
                    {
                        ["exceptionType"] = ex.GetType().Name,
                        ["lineNumber"] = ex.LineNumber ?? 0,
                        ["bytePosition"] = ex.BytePositionInLine ?? 0
                    }
                ));
                return issues;
            }

            using (document)
            {
                var root = document.RootElement;

                // Step 2: Basic structure validation
                ValidateBundleStructure(root, issues, fhirVersion);

                // Step 3: Validate entries
                if (root.TryGetProperty("entry", out var entryArray) && entryArray.ValueKind == JsonValueKind.Array)
                {
                    int entryIndex = 0;
                    foreach (var entry in entryArray.EnumerateArray())
                    {
                        await ValidateEntryAsync(entry, entryIndex, issues, fhirVersion, cancellationToken);
                        entryIndex++;
                    }
                }
            }

            _logger.LogInformation("Lint validation completed: {IssueCount} issues found", issues.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error during lint validation");
            
            // Lint should never throw - return error as issue
            issues.Add(CreateIssue(
                "LINT_INTERNAL_ERROR",
                $"Internal validation error: {ex.Message}",
                details: new Dictionary<string, object>
                {
                    ["exceptionType"] = ex.GetType().Name
                }
            ));
        }

        return issues;
    }

    /// <summary>
    /// Validates bundle-level structure
    /// </summary>
    private void ValidateBundleStructure(JsonElement root, List<LintIssue> issues, string fhirVersion)
    {
        // Check: Must be an object
        if (root.ValueKind != JsonValueKind.Object)
        {
            issues.Add(CreateIssue(
                "LINT_ROOT_NOT_OBJECT",
                "Root element is not a JSON object",
                jsonPointer: "/"
            ));
            return;
        }

        // Check: Must have resourceType
        if (!root.TryGetProperty("resourceType", out var resourceType))
        {
            issues.Add(CreateIssue(
                "LINT_MISSING_RESOURCE_TYPE",
                "Missing 'resourceType' property at root",
                jsonPointer: "/"
            ));
        }
        else if (resourceType.ValueKind != JsonValueKind.String)
        {
            issues.Add(CreateIssue(
                "LINT_RESOURCE_TYPE_NOT_STRING",
                "Property 'resourceType' is not a string",
                jsonPointer: "/resourceType"
            ));
        }
        else if (resourceType.GetString() != "Bundle")
        {
            issues.Add(CreateIssue(
                "LINT_NOT_BUNDLE",
                $"Expected 'Bundle', found '{resourceType.GetString()}'",
                jsonPointer: "/resourceType",
                resourceType: resourceType.GetString()
            ));
        }

        // Check: Bundle should have entry array
        if (root.TryGetProperty("entry", out var entry))
        {
            if (entry.ValueKind != JsonValueKind.Array)
            {
                issues.Add(CreateIssue(
                    "LINT_ENTRY_NOT_ARRAY",
                    "Property 'entry' is not an array",
                    jsonPointer: "/entry",
                    resourceType: "Bundle"
                ));
            }
        }
    }

    /// <summary>
    /// Validates a single bundle entry
    /// </summary>
    private async Task ValidateEntryAsync(JsonElement entry, int entryIndex, List<LintIssue> issues, string fhirVersion, CancellationToken cancellationToken)
    {
        var entryPath = $"/entry/{entryIndex}";

        // Check: Entry must be object
        if (entry.ValueKind != JsonValueKind.Object)
        {
            issues.Add(CreateIssue(
                "LINT_ENTRY_NOT_OBJECT",
                $"Entry at index {entryIndex} is not an object",
                jsonPointer: entryPath
            ));
            return;
        }

        // Check: Entry should have resource
        if (!entry.TryGetProperty("resource", out var resource))
        {
            issues.Add(CreateIssue(
                "LINT_ENTRY_MISSING_RESOURCE",
                $"Entry at index {entryIndex} missing 'resource' property",
                jsonPointer: entryPath
            ));
            return;
        }

        // Check: Resource must be object
        if (resource.ValueKind != JsonValueKind.Object)
        {
            issues.Add(CreateIssue(
                "LINT_RESOURCE_NOT_OBJECT",
                $"Resource in entry {entryIndex} is not an object",
                jsonPointer: $"{entryPath}/resource"
            ));
            return;
        }

        // Check: Resource must have resourceType
        if (!resource.TryGetProperty("resourceType", out var resourceType))
        {
            issues.Add(CreateIssue(
                "LINT_RESOURCE_MISSING_TYPE",
                $"Resource in entry {entryIndex} missing 'resourceType'",
                jsonPointer: $"{entryPath}/resource"
            ));
            return;
        }

        if (resourceType.ValueKind != JsonValueKind.String)
        {
            issues.Add(CreateIssue(
                "LINT_RESOURCE_TYPE_NOT_STRING",
                $"Resource 'resourceType' in entry {entryIndex} is not a string",
                jsonPointer: $"{entryPath}/resource/resourceType"
            ));
            return;
        }

        var resourceTypeName = resourceType.GetString() ?? "unknown";

        // Validate resource contents with schema
        await ValidateResourceAsync(resource, resourceTypeName, $"{entryPath}/resource", resourceTypeName, issues, fhirVersion, cancellationToken);
    }

    /// <summary>
    /// Validates resource structure and common primitives using FHIR schema
    /// </summary>
    private async Task ValidateResourceAsync(
        JsonElement resource, 
        string resourceType, 
        string jsonPath,
        string fhirPath,
        List<LintIssue> issues,
        string fhirVersion,
        CancellationToken cancellationToken)
    {
        // Load schema for this resource type if not cached
        if (!_schemaCache.ContainsKey(resourceType))
        {
            _schemaCache[resourceType] = await _schemaService.GetResourceSchemaAsync(resourceType, cancellationToken);
        }

        var schema = _schemaCache[resourceType];

        // Iterate through all properties and apply best-effort validation
        foreach (var property in resource.EnumerateObject())
        {
            var propertyJsonPath = $"{jsonPath}/{property.Name}";
            var propertyFhirPath = $"{fhirPath}.{property.Name}";
            
            await ValidatePropertyAsync(
                property.Name, 
                property.Value, 
                resourceType, 
                propertyJsonPath,
                propertyFhirPath,
                schema,
                issues,
                fhirVersion,
                cancellationToken);
        }
    }

    /// <summary>
    /// Validates individual property using FHIR schema and best-effort heuristics
    /// </summary>
    private async Task ValidatePropertyAsync(
        string propertyName, 
        JsonElement value, 
        string resourceType, 
        string jsonPath,
        string fhirPath,
        FhirSchemaNode? schema,
        List<LintIssue> issues,
        string fhirVersion,
        CancellationToken cancellationToken)
    {
        // Version compatibility checks
        CheckVersionCompatibility(propertyName, resourceType, fhirVersion, jsonPath, fhirPath, issues);

        // Date validation (best-effort)
        if (propertyName.EndsWith("Date") && !propertyName.EndsWith("DateTime"))
        {
            if (value.ValueKind == JsonValueKind.String)
            {
                var dateValue = value.GetString();
                if (!string.IsNullOrEmpty(dateValue) && !DateRegex.IsMatch(dateValue))
                {
                    issues.Add(CreateIssue(
                        "LINT_INVALID_DATE",
                        $"Property '{propertyName}' has invalid format: '{dateValue}'",
                        jsonPointer: jsonPath,
                        fhirPath: fhirPath,
                        resourceType: resourceType,
                        details: new Dictionary<string, object> { ["value"] = dateValue }
                    ));
                }
            }
        }

        // DateTime validation (best-effort)
        if (propertyName.EndsWith("DateTime") || propertyName == "issued" || propertyName == "recorded")
        {
            if (value.ValueKind == JsonValueKind.String)
            {
                var dateTimeValue = value.GetString();
                if (!string.IsNullOrEmpty(dateTimeValue) && !DateTimeRegex.IsMatch(dateTimeValue))
                {
                    issues.Add(CreateIssue(
                        "LINT_INVALID_DATETIME",
                        $"Property '{propertyName}' has invalid format: '{dateTimeValue}'",
                        jsonPointer: jsonPath,
                        fhirPath: fhirPath,
                        resourceType: resourceType,
                        details: new Dictionary<string, object> { ["value"] = dateTimeValue }
                    ));
                }
            }
        }

        // Boolean validation
        if (propertyName.StartsWith("active") || propertyName.StartsWith("deceased") || 
            propertyName == "active" || propertyName == "deceasedBoolean")
        {
            if (value.ValueKind == JsonValueKind.String)
            {
                issues.Add(CreateIssue(
                    "LINT_BOOLEAN_AS_STRING",
                    $"Property '{propertyName}' is a string, expected boolean",
                    jsonPointer: jsonPath,
                    fhirPath: fhirPath,
                    resourceType: resourceType
                ));
            }
        }

        // Array/Object type validation using FHIR schema
        await ValidateCollectionTypeAsync(propertyName, value, resourceType, jsonPath, fhirPath, schema, issues);

        // Recurse into nested objects and arrays with proper path tracking
        if (value.ValueKind == JsonValueKind.Object)
        {
            foreach (var childProperty in value.EnumerateObject())
            {
                var childJsonPath = $"{jsonPath}/{childProperty.Name}";
                var childFhirPath = $"{fhirPath}.{childProperty.Name}";
                
                await ValidatePropertyAsync(
                    childProperty.Name, 
                    childProperty.Value, 
                    resourceType, 
                    childJsonPath,
                    childFhirPath,
                    schema,
                    issues,
                    fhirVersion,
                    cancellationToken);
            }
        }
        else if (value.ValueKind == JsonValueKind.Array)
        {
            int index = 0;
            foreach (var item in value.EnumerateArray())
            {
                if (item.ValueKind == JsonValueKind.Object)
                {
                    foreach (var childProperty in item.EnumerateObject())
                    {
                        var childJsonPath = $"{jsonPath}/{index}/{childProperty.Name}";
                        var childFhirPath = $"{fhirPath}.{childProperty.Name}"; // Array items don't add to FHIR path
                        
                        await ValidatePropertyAsync(
                            childProperty.Name, 
                            childProperty.Value, 
                            resourceType, 
                            childJsonPath,
                            childFhirPath,
                            schema,
                            issues,
                            fhirVersion,
                            cancellationToken);
                    }
                }
                index++;
            }
        }
    }

    /// <summary>
    /// Validates array vs object type using FHIR schema (schema-based, not heuristic)
    /// </summary>
    private async Task ValidateCollectionTypeAsync(
        string propertyName, 
        JsonElement value, 
        string resourceType, 
        string jsonPath,
        string fhirPath,
        FhirSchemaNode? schema,
        List<LintIssue> issues)
    {
        await Task.CompletedTask; // Currently synchronous

        if (schema == null)
        {
            // No schema available - skip validation (best-effort principle)
            return;
        }

        // Find the element definition in the schema tree
        var element = FindElementInSchema(schema, fhirPath);
        
        if (element == null)
        {
            // Element not found in schema - skip validation (may be extension or unknown)
            return;
        }

        // Schema-based validation: check if actual JSON type matches expected cardinality
        var isJsonArray = value.ValueKind == JsonValueKind.Array;
        
        if (element.IsArray && !isJsonArray)
        {
            issues.Add(CreateIssue(
                "LINT_EXPECTED_ARRAY",
                $"Property '{propertyName}' should be an array (max={element.Max})",
                jsonPointer: jsonPath,
                fhirPath: fhirPath,
                resourceType: resourceType,
                details: new Dictionary<string, object>
                {
                    ["schemaPath"] = element.Path,
                    ["schemaMax"] = element.Max
                }
            ));
        }
        else if (!element.IsArray && isJsonArray)
        {
            issues.Add(CreateIssue(
                "LINT_EXPECTED_OBJECT",
                $"Property '{propertyName}' should be a single object (max={element.Max})",
                jsonPointer: jsonPath,
                fhirPath: fhirPath,
                resourceType: resourceType,
                details: new Dictionary<string, object>
                {
                    ["schemaPath"] = element.Path,
                    ["schemaMax"] = element.Max
                }
            ));
        }
    }

    /// <summary>
    /// Finds an element definition in the schema tree by FHIR path
    /// </summary>
    private FhirSchemaNode? FindElementInSchema(FhirSchemaNode schema, string fhirPath)
    {
        // Handle root element
        if (schema.Path == fhirPath)
        {
            return schema;
        }

        // Search children recursively
        foreach (var child in schema.Children)
        {
            if (child.Path == fhirPath)
            {
                return child;
            }

            // Recurse into child's children
            var found = FindElementInSchema(child, fhirPath);
            if (found != null)
            {
                return found;
            }
        }

        return null;
    }

    /// <summary>
    /// Checks for FHIR version compatibility issues
    /// </summary>
    private void CheckVersionCompatibility(
        string propertyName,
        string resourceType,
        string fhirVersion,
        string jsonPath,
        string fhirPath,
        List<LintIssue> issues)
    {
        if (fhirVersion == "R4")
        {
            // Check for R5-only fields being used in R4
            if (Config.FhirVersionCompatibilityMap.IsR5OnlyField(resourceType, propertyName))
            {
                var alternative = Config.FhirVersionCompatibilityMap.GetR5FieldAlternative(resourceType, propertyName);
                var message = $"Field '{propertyName}' is only available in FHIR R5. {alternative}";
                
                issues.Add(CreateIssue(
                    "LINT_R5_FIELD_IN_R4",
                    message,
                    jsonPointer: jsonPath,
                    fhirPath: fhirPath,
                    resourceType: resourceType,
                    details: new Dictionary<string, object> 
                    { 
                        ["field"] = propertyName,
                        ["fhirVersion"] = fhirVersion,
                        ["alternative"] = alternative ?? "No R4 alternative"
                    }
                ));
            }
        }
        else if (fhirVersion == "R5")
        {
            // Check for deprecated R4 fields in R5
            if (Config.FhirVersionCompatibilityMap.IsDeprecatedInR5(resourceType, propertyName))
            {
                var replacement = Config.FhirVersionCompatibilityMap.GetR5Replacement(resourceType, propertyName);
                var message = $"Field '{propertyName}' is deprecated in FHIR R5. {replacement}";
                
                issues.Add(CreateIssue(
                    "LINT_DEPRECATED_R4_FIELD",
                    message,
                    jsonPointer: jsonPath,
                    fhirPath: fhirPath,
                    resourceType: resourceType,
                    details: new Dictionary<string, object> 
                    { 
                        ["field"] = propertyName,
                        ["fhirVersion"] = fhirVersion,
                        ["replacement"] = replacement ?? "No R5 replacement specified"
                    }
                ));
            }
        }
    }
}
