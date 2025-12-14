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
            
            await ValidatePropertyAsync(
                property.Name, 
                property.Value, 
                resourceType, 
                propertyJsonPath,
                fhirPath, // Parent FHIR path
                schema, // Initial schema context is the resource schema
                issues,
                fhirVersion,
                cancellationToken);
        }
    }

    /// <summary>
    /// Validates individual property using FHIR schema and best-effort heuristics.
    /// Uses type-aware schema resolution to correctly validate complex datatypes.
    /// </summary>
    /// <param name="parentFhirPath">Parent's FHIR path (to construct this property's path)</param>
    /// <param name="currentSchemaContext">Current schema context (resource or datatype)</param>
    private async Task ValidatePropertyAsync(
        string propertyName, 
        JsonElement value, 
        string resourceType, 
        string jsonPath,
        string parentFhirPath,
        FhirSchemaNode? currentSchemaContext,
        List<LintIssue> issues,
        string fhirVersion,
        CancellationToken cancellationToken)
    {
        var fhirPath = $"{parentFhirPath}.{propertyName}";

        // Check for unknown elements using the CURRENT schema context (type-aware)
        CheckUnknownElement(propertyName, parentFhirPath, fhirPath, jsonPath, currentSchemaContext, resourceType, issues);

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
        await ValidateCollectionTypeAsync(propertyName, value, resourceType, jsonPath, fhirPath, currentSchemaContext, issues);

        // Resolve schema context for children (type-aware)
        // This switches from resource schema to datatype schema when needed
        var childSchemaContext = await ResolveSchemaForNextPropertyAsync(
            currentSchemaContext,
            propertyName,
            parentFhirPath,
            cancellationToken);

        // Recurse into nested objects and arrays with type-aware schema context
        if (value.ValueKind == JsonValueKind.Object)
        {
            foreach (var childProperty in value.EnumerateObject())
            {
                var childJsonPath = $"{jsonPath}/{childProperty.Name}";
                
                await ValidatePropertyAsync(
                    childProperty.Name, 
                    childProperty.Value, 
                    resourceType, 
                    childJsonPath,
                    fhirPath, // Parent path for the child
                    childSchemaContext, // TYPE-AWARE: Use resolved schema context
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
                        
                        await ValidatePropertyAsync(
                            childProperty.Name, 
                            childProperty.Value, 
                            resourceType, 
                            childJsonPath,
                            fhirPath, // Parent path (array items don't add to FHIR path)
                            childSchemaContext, // TYPE-AWARE: Use resolved schema context
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
    /// Finds a direct child element in the schema by element name (property name).
    /// Used for type-aware validation when the schema context has switched to a datatype.
    /// Example: In HumanName schema, find "family" child by ElementName, not by full path.
    /// </summary>
    private FhirSchemaNode? FindChildByElementName(FhirSchemaNode schema, string elementName)
    {
        // Search direct children only (not recursive)
        foreach (var child in schema.Children)
        {
            if (child.ElementName == elementName)
            {
                return child;
            }
        }

        return null;
    }

    /// <summary>
    /// Resolves the schema context for a property's children by looking up the property's datatype.
    /// This is critical for validating complex datatypes like Reference, Period, HumanName, etc.
    /// 
    /// FHIR schemas are type-based:
    /// - Resource properties use the resource schema
    /// - Complex datatype properties use the datatype schema
    /// - Primitive types have no child properties (except "_" extensions which lint ignores)
    /// </summary>
    /// <param name="currentSchema">Current schema context (resource or datatype)</param>
    /// <param name="propertyName">Property name being validated</param>
    /// <param name="parentFhirPath">Parent FHIR path</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Schema for the property's datatype, or null if not found/not applicable</returns>
    private async Task<FhirSchemaNode?> ResolveSchemaForNextPropertyAsync(
        FhirSchemaNode? currentSchema,
        string propertyName,
        string parentFhirPath,
        CancellationToken cancellationToken)
    {
        if (currentSchema == null)
        {
            return null;
        }

        // Find the property element in the current schema
        var propertyPath = $"{parentFhirPath}.{propertyName}";
        var element = FindElementInSchema(currentSchema, propertyPath);

        if (element == null)
        {
            // Property not found - caller will handle this
            return null;
        }

        // If the element has a complex datatype, load that datatype's schema
        if (!string.IsNullOrEmpty(element.Type))
        {
            var dataType = element.Type;

            // Primitive types don't have child properties
            var primitiveTypes = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            {
                "boolean", "integer", "string", "decimal", "uri", "url", "canonical",
                "base64Binary", "instant", "date", "dateTime", "time", "code", "oid",
                "id", "markdown", "unsignedInt", "positiveInt", "uuid", "xhtml"
            };

            if (primitiveTypes.Contains(dataType))
            {
                // Primitive types have no schema for children
                return null;
            }

            // Check if it's a backbone element (inline complex type)
            if (element.IsBackbone && element.Children.Count > 0)
            {
                // Return the element itself as the schema context
                return element;
            }

            // Load the datatype schema (e.g., Reference, Period, HumanName)
            // Try to load from cache first
            if (!_schemaCache.ContainsKey(dataType))
            {
                _schemaCache[dataType] = await _schemaService.GetResourceSchemaAsync(dataType, cancellationToken);
            }

            return _schemaCache[dataType];
        }

        return null;
    }

    /// <summary>
    /// Checks if an element exists in the FHIR schema using type-aware validation.
    /// Best-effort validation - does not throw exceptions.
    /// Exclusions: resourceType, id, meta, extension, modifierExtension, primitive extensions (_field)
    /// 
    /// CRITICAL: This method validates against the CURRENT schema context,
    /// which may be a resource schema OR a datatype schema (e.g., Reference, Period).
    /// </summary>
    private void CheckUnknownElement(
        string propertyName,
        string parentFhirPath,
        string fhirPath,
        string jsonPath,
        FhirSchemaNode? currentSchemaContext,
        string resourceTypeForError,
        List<LintIssue> issues)
    {
        // Skip if no schema available (best-effort principle)
        if (currentSchemaContext == null)
        {
            return;
        }

        // Exclusions - do not validate these standard FHIR elements
        var exclusions = new HashSet<string>
        {
            "resourceType",
            "id",
            "meta",
            "extension",
            "modifierExtension"
        };

        if (exclusions.Contains(propertyName))
        {
            return;
        }

        // Skip primitive extensions (properties starting with underscore)
        if (propertyName.StartsWith("_"))
        {
            return;
        }

        // Look up the element in the CURRENT schema context
        // Search by property name, not full FHIR path, since datatype schemas have their own root
        var element = FindChildByElementName(currentSchemaContext, propertyName);

        if (element == null)
        {
            // Element not found in schema - emit warning
            var schemaTypeName = currentSchemaContext.ElementName == currentSchemaContext.Path 
                ? currentSchemaContext.Path  // Root element (resource or datatype name)
                : currentSchemaContext.Type; // Nested element type

            issues.Add(CreateIssue(
                "UNKNOWN_ELEMENT",
                $"Property '{propertyName}' does not exist in FHIR type '{schemaTypeName}'",
                jsonPointer: jsonPath,
                fhirPath: fhirPath,
                resourceType: resourceTypeForError,
                details: new Dictionary<string, object>
                {
                    ["propertyName"] = propertyName,
                    ["fhirPath"] = fhirPath,
                    ["schemaContext"] = schemaTypeName
                }
            ));
        }
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
