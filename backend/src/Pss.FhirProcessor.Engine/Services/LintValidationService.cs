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
    /// Creates a QualityFinding from a catalog rule with contextual message
    /// Fails fast if rule is not found (development-time safety)
    /// </summary>
    private static QualityFinding CreateIssue(
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

        return new QualityFinding
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

    public async Task<IReadOnlyList<QualityFinding>> ValidateAsync(
        string bundleJson,
        string fhirVersion,
        CancellationToken cancellationToken = default)
    {
        var issues = new List<QualityFinding>();

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

            // Log summary by error code
            var missingRequiredCount = issues.Count(i => i.RuleId == "MISSING_REQUIRED_FIELD");
            var issuesByCode = issues.GroupBy(i => i.RuleId).OrderByDescending(g => g.Count());
            
            _logger.LogInformation("Lint validation summary: {TotalIssues} total issues", issues.Count);
            foreach (var group in issuesByCode)
            {
                _logger.LogDebug("Lint issue type: {RuleId} = {Count}", group.Key, group.Count());
            }
            
            if (missingRequiredCount > 0)
            {
                _logger.LogWarning("Found {MissingRequiredCount} MISSING_REQUIRED_FIELD issues", missingRequiredCount);
                foreach (var issue in issues.Where(i => i.RuleId == "MISSING_REQUIRED_FIELD"))
                {
                    _logger.LogDebug("Missing required field: {Message} at {JsonPointer}", issue.Message, issue.JsonPointer);
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
    private void ValidateBundleStructure(JsonElement root, List<QualityFinding> issues, string fhirVersion)
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
    private async Task ValidateEntryAsync(JsonElement entry, int entryIndex, List<QualityFinding> issues, string fhirVersion, CancellationToken cancellationToken)
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
        List<QualityFinding> issues,
        string fhirVersion,
        CancellationToken cancellationToken)
    {
        // Load schema for this resource type if not cached
        if (!_schemaCache.ContainsKey(resourceType))
        {
            _schemaCache[resourceType] = await _schemaService.GetResourceSchemaAsync(resourceType, cancellationToken);
        }

        var schema = _schemaCache[resourceType];

        // Check for missing required fields at the resource level
        CheckMissingRequiredFields(resource, fhirPath, jsonPath, schema, resourceType, issues);

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
        List<QualityFinding> issues,
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
            // Check for missing required fields in this nested object (backbone element or complex datatype)
            CheckMissingRequiredFields(value, fhirPath, jsonPath, childSchemaContext, resourceType, issues);

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
                    // Check for missing required fields in array item objects
                    var itemJsonPath = $"{jsonPath}/{index}";
                    CheckMissingRequiredFields(item, fhirPath, itemJsonPath, childSchemaContext, resourceType, issues);

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
        List<QualityFinding> issues)
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
            var schemaCardinality = element.Max == "*" ? "an array (0..*)" : $"an array (0..{element.Max})";
            issues.Add(CreateIssue(
                "LINT_EXPECTED_ARRAY",
                $"Property '{propertyName}' is defined as {schemaCardinality} in FHIR specification. This payload uses a different structure.",
                jsonPointer: jsonPath,
                fhirPath: fhirPath,
                resourceType: resourceType,
                details: new Dictionary<string, object>
                {
                    ["schemaPath"] = element.Path,
                    ["schemaMax"] = element.Max,
                    ["confidence"] = "high",
                    ["note"] = "Firely is permissive and may accept this payload. Other FHIR servers may reject it.",
                    ["disclaimer"] = "This is a best-effort portability check. Final validation is performed by the FHIR engine."
                }
            ));
        }
        else if (!element.IsArray && isJsonArray)
        {
            var schemaCardinality = element.Max == "1" ? "a single object (0..1)" : $"a single object (0..{element.Max})";
            issues.Add(CreateIssue(
                "LINT_EXPECTED_OBJECT",
                $"Property '{propertyName}' is defined as {schemaCardinality} in FHIR specification. This payload uses a different structure.",
                jsonPointer: jsonPath,
                fhirPath: fhirPath,
                resourceType: resourceType,
                details: new Dictionary<string, object>
                {
                    ["schemaPath"] = element.Path,
                    ["schemaMax"] = element.Max,
                    ["confidence"] = "high",
                    ["note"] = "Firely is permissive and may accept this payload. Other FHIR servers may reject it.",
                    ["disclaimer"] = "This is a best-effort portability check. Final validation is performed by the FHIR engine."
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
        // IMPORTANT: When already in a type-aware schema context (e.g., already in Reference schema),
        // search by element name, not full path, because datatype schemas don't have resource paths
        var element = FindChildByElementName(currentSchema, propertyName);

        if (element == null)
        {
            // Property not found - caller will handle this
            return null;
        }

        // If the element has a complex datatype, load that datatype's schema
        if (!string.IsNullOrEmpty(element.Type))
        {
            var dataType = element.Type;

            // Map schema type names to actual FHIR datatype names
            // Some schema types use different names than the actual datatypes
            var typeMapping = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
            {
                { "ResourceReference", "Reference" },
                { "Code`1", "Code" },  // Generic code with value set binding
                { "FhirUri", "uri" },
                { "Id", "id" }
            };

            if (typeMapping.ContainsKey(dataType))
            {
                dataType = typeMapping[dataType];
            }

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
        List<QualityFinding> issues)
    {
        // Skip if no schema available (best-effort principle)
        if (currentSchemaContext == null)
        {
            return;
        }

        // Exclusions - standard FHIR elements that should not be validated for unknown elements
        // IMPORTANT: Only exclude these at the RESOURCE level, not at datatype level
        // (e.g., Reference.id and Reference.extension are valid properties that should be validated)
        var resourceLevelExclusions = new HashSet<string>
        {
            "resourceType",
            "meta",
            "implicitRules",
            "language",
            "text",
            "contained"
        };

        // Check if we're at the resource level (schema path equals element name, e.g., "Patient" == "Patient")
        bool isResourceLevel = currentSchemaContext.Path == currentSchemaContext.ElementName;

        if (isResourceLevel && resourceLevelExclusions.Contains(propertyName))
        {
            return;
        }

        // Always skip extension and modifierExtension at any level (handled separately by Firely)
        if (propertyName == "extension" || propertyName == "modifierExtension")
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

            // Format message to be resource-agnostic and clearly state the violated type
            var message = $"Property '{propertyName}' is not defined on the FHIR `{schemaTypeName}` type. Found at path: '{fhirPath}'. Note: This may still parse in permissive FHIR engines.";

            issues.Add(CreateIssue(
                "UNKNOWN_ELEMENT",
                message,
                jsonPointer: jsonPath,
                fhirPath: fhirPath,
                resourceType: resourceTypeForError,
                details: new Dictionary<string, object>
                {
                    ["propertyName"] = propertyName,
                    ["fhirPath"] = fhirPath,
                    ["schemaContext"] = schemaTypeName,
                    ["confidence"] = "high",
                    ["disclaimer"] = "This is a best-effort portability check. Final validation is performed by the FHIR engine."
                }
            ));
        }
    }

    /// <summary>
    /// Checks for missing required fields (min > 0) in a resource or backbone element.
    /// Best-effort schema-driven check to help developers understand why strict FHIR servers might reject incomplete resources.
    /// </summary>
    /// <param name="jsonObject">The JSON object to check for required fields</param>
    /// <param name="parentFhirPath">Parent FHIR path for error reporting</param>
    /// <param name="jsonPath">JSON pointer path for error reporting</param>
    /// <param name="currentSchemaContext">Current schema node containing child definitions</param>
    /// <param name="resourceTypeForError">Resource type for error context</param>
    /// <param name="issues">List to add lint issues to</param>
    private void CheckMissingRequiredFields(
        JsonElement jsonObject,
        string parentFhirPath,
        string jsonPath,
        FhirSchemaNode? currentSchemaContext,
        string resourceTypeForError,
        List<QualityFinding> issues)
    {
        // Skip if no schema available (best-effort principle)
        if (currentSchemaContext == null || jsonObject.ValueKind != JsonValueKind.Object)
        {
            return;
        }

        _logger.LogTrace("Checking for missing required fields in {Path} with schema {SchemaPath}", parentFhirPath, currentSchemaContext.Path);

        // Get all property names present in the JSON object
        var presentProperties = new HashSet<string>(
            jsonObject.EnumerateObject().Select(p => p.Name),
            StringComparer.OrdinalIgnoreCase
        );

        // Standard FHIR elements that should not trigger missing field warnings
        var standardElements = new HashSet<string>
        {
            "resourceType",
            "id",
            "meta",
            "implicitRules",
            "language",
            "text",
            "contained",
            "extension",
            "modifierExtension"
        };

        // Iterate through schema children to find required fields (Min > 0)
        foreach (var child in currentSchemaContext.Children)
        {
            // Skip if not required
            if (child.Min <= 0)
            {
                continue;
            }

            var elementName = child.ElementName;
            _logger.LogTrace("Found required field: {ElementName} (min={Min}) at {Path}", elementName, child.Min, child.Path);

            // Skip standard elements
            if (standardElements.Contains(elementName))
            {
                continue;
            }

            // Skip primitive extensions (underscore-prefixed)
            if (elementName.StartsWith("_"))
            {
                continue;
            }

            // Skip choice[x] base elements - they're abstract and shouldn't be checked directly
            // The actual concrete choice types (e.g., valueString) are separate elements
            if (child.IsChoice && elementName.EndsWith("[x]"))
            {
                continue;
            }

            // Skip extension.value[x] specifically - this is handled by the FHIR engine
            if (parentFhirPath.EndsWith(".extension") && elementName == "value[x]")
            {
                continue;
            }

            // Check if the required field is present in the JSON object
            if (!presentProperties.Contains(elementName))
            {
                _logger.LogWarning("Missing required field: {ElementName} at {Path}", elementName, parentFhirPath);
                var fhirPath = $"{parentFhirPath}.{elementName}";
                var propertyJsonPath = $"{jsonPath}/{elementName}";
                var cardinality = $"{child.Min}..{child.Max}";

                issues.Add(CreateIssue(
                    "MISSING_REQUIRED_FIELD",
                    $"Required field '{elementName}' ({cardinality}) is missing according to FHIR R4 schema. Note: Some FHIR engines may accept this, but strict servers may reject it.",
                    jsonPointer: propertyJsonPath,
                    fhirPath: fhirPath,
                    resourceType: resourceTypeForError,
                    details: new Dictionary<string, object>
                    {
                        ["fieldName"] = elementName,
                        ["schemaPath"] = child.Path,
                        ["schemaMin"] = child.Min,
                        ["schemaMax"] = child.Max,
                        ["cardinality"] = cardinality,
                        ["confidence"] = "high",
                        ["disclaimer"] = "Best-effort portability check. Some FHIR engines may accept incomplete resources. Final validation is performed by the FHIR engine.",
                        ["note"] = "This field is marked as required (min > 0) in the FHIR specification but is missing from the resource."
                    }
                ));
            }
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
        List<QualityFinding> issues)
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
