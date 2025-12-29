using Pss.FhirProcessor.Engine.Models;

namespace Pss.FhirProcessor.Engine.Governance;

/// <summary>
/// Rule review engine interface for governance and quality enforcement.
/// Phase 7: Deterministic linting based ONLY on rule metadata
/// </summary>
public interface IRuleReviewEngine
{
    /// <summary>
    /// Review a single rule for governance issues.
    /// CRITICAL: MUST NOT access FHIR bundle, MUST NOT run validation,
    /// MUST NOT inspect sample data. ONLY inspect rule metadata.
    /// </summary>
    RuleReviewResult Review(RuleDefinition rule);
    
    /// <summary>
    /// Review multiple rules and detect duplicates.
    /// </summary>
    IReadOnlyList<RuleReviewResult> ReviewRuleSet(IEnumerable<RuleDefinition> rules);
}

/// <summary>
/// Rule review engine implementation.
/// Phase 7: Pure rule-linting engine (no validation, no data access)
/// </summary>
public class RuleReviewEngine : IRuleReviewEngine
{
    // Known FHIR resource types that commonly have arrays
    private static readonly HashSet<string> ArrayFieldPatterns = new()
    {
        "identifier", "telecom", "address", "name", "contact",
        "communication", "extension", "contained", "entry", "item",
        "component", "code", "coding", "note", "performer"
    };
    
    // String-typed FHIR fields
    private static readonly HashSet<string> StringFieldPatterns = new()
    {
        "id", "status", "gender", "value", "display", "text",
        "family", "given", "prefix", "suffix", "system", "code",
        "reference", "url", "version", "name", "title", "description"
    };
    
    public RuleReviewResult Review(RuleDefinition rule)
    {
        var issues = new List<RuleReviewIssue>();
        
        // BLOCKED checks (cannot save/export)
        CheckMissingErrorCode(rule, issues);
        CheckSemanticStability(rule, issues);
        CheckEmptyOrRootPath(rule, issues);
        CheckQuestionAnswerWithoutQuestionSetId(rule, issues);
        CheckPatternErrorCode(rule, issues);
        CheckAllowedValuesErrorCode(rule, issues);
        CheckArrayLengthErrorCode(rule, issues);
        CheckFixedValueErrorCode(rule, issues);
        CheckCodeSystemErrorCode(rule, issues);
        CheckRequiredResourcesErrorCode(rule, issues);
        CheckRequiredResourcesConfiguration(rule, issues);
        CheckCustomFhirPathErrorCodeIsKnown(rule, issues);
        CheckReferenceRuleNotSupported(rule, issues);
        CheckFullUrlIdMatchRuleNotSupported(rule, issues);
        CheckPatternOnNonString(rule, issues);
        CheckArrayLengthOnNonArray(rule, issues);
        
        // WARNING checks (allowed but flagged)
        CheckQuestionAnswerProvidedErrorCode(rule, issues);
        CheckPathEndsAtResourceRoot(rule, issues);
        CheckGenericWildcardPaths(rule, issues);
        CheckFixedValueWithoutConstraints(rule, issues);
        
        // Determine overall status
        var status = DetermineStatus(issues);
        
        return new RuleReviewResult(rule.Id, status, issues.AsReadOnly());
    }
    
    public IReadOnlyList<RuleReviewResult> ReviewRuleSet(IEnumerable<RuleDefinition> rules)
    {
        var rulesList = rules.ToList();
        var results = new List<RuleReviewResult>();
        
        // Review each rule individually
        foreach (var rule in rulesList)
        {
            results.Add(Review(rule));
        }
        
        // Check for duplicates (WARNING level)
        CheckDuplicateRules(rulesList, results);
        
        // Check for path conflicts with different errorCodes (WARNING level)
        CheckPathErrorCodeConflicts(rulesList, results);
        
        // Check for multiple RequiredResources rules (BLOCKED level)
        CheckSingleRequiredResourcesRule(rulesList, results);
        
        return results.AsReadOnly();
    }
    
    // ═══════════════════════════════════════════════════════════
    // BLOCKED CHECKS (Cannot Save/Export)
    // ═══════════════════════════════════════════════════════════
    
    /// <summary>
    /// BLOCKED: Missing or empty errorCode (defensive check, even if already enforced)
    /// EXCEPTION: QuestionAnswer rule type allows missing errorCode (constraint-driven, runtime determines code)
    /// </summary>
    private void CheckMissingErrorCode(RuleDefinition rule, List<RuleReviewIssue> issues)
    {
        // QuestionAnswer is constraint-driven: errorCode is determined at runtime based on validation outcome
        if (rule.Type == "QuestionAnswer")
            return;
        
        if (string.IsNullOrWhiteSpace(rule.ErrorCode))
        {
            issues.Add(new RuleReviewIssue(
                Code: "MISSING_ERROR_CODE",
                Severity: RuleReviewStatus.BLOCKED,
                RuleId: rule.Id,
                Facts: new Dictionary<string, object>
                {
                    ["ruleType"] = rule.Type
                }
            ));
        }
    }
    
    /// <summary>
    /// BLOCKED: RULE_SEMANTIC_STABILITY - Prevent semantic ambiguity
    /// Enforces that every rule declares exactly one semantic meaning via errorCode,
    /// and that runtime data never determines semantic classification.
    /// EXCEPTION: QuestionAnswer is exempt (constraint-driven, runtime emits appropriate errorCode)
    /// </summary>
    private void CheckSemanticStability(RuleDefinition rule, List<RuleReviewIssue> issues)
    {
        // Rule types in scope for this check (QuestionAnswer removed - see CheckQuestionAnswerProvidedErrorCode)
        var scopedTypes = new HashSet<string>
        {
            "Reference", "CustomFHIRPath",
            "CodeMaster", "AllowedValues", "FixedValue", "ArrayLength"
        };
        
        // Skip if not in scope
        if (!scopedTypes.Contains(rule.Type))
            return;
        
        // BLOCKED: errorCode is null, empty, or whitespace (already caught by CheckMissingErrorCode, but double-check for scoped types)
        if (string.IsNullOrWhiteSpace(rule.ErrorCode))
        {
            issues.Add(new RuleReviewIssue(
                Code: "RULE_SEMANTIC_STABILITY",
                Severity: RuleReviewStatus.BLOCKED,
                RuleId: rule.Id,
                Facts: new Dictionary<string, object>
                {
                    ["ruleType"] = rule.Type,
                    ["reason"] = "errorCode is required for semantic stability"
                }
            ));
            return;
        }
        
        // BLOCKED: Forbidden properties that imply runtime semantic selection
        var forbiddenKeys = new[] { "errorCodeMap", "onFail", "conditionalError", "errorSwitch" };
        
        if (rule.Params != null)
        {
            foreach (var forbiddenKey in forbiddenKeys)
            {
                if (rule.Params.ContainsKey(forbiddenKey))
                {
                    issues.Add(new RuleReviewIssue(
                        Code: "RULE_SEMANTIC_STABILITY",
                        Severity: RuleReviewStatus.BLOCKED,
                        RuleId: rule.Id,
                        Facts: new Dictionary<string, object>
                        {
                            ["ruleType"] = rule.Type,
                            ["forbiddenProperty"] = forbiddenKey,
                            ["reason"] = "runtime semantic selection is forbidden"
                        }
                    ));
                }
            }
        }
    }
    
    /// <summary>
    /// BLOCKED: Rule path is empty or root-level only
    /// </summary>
    private void CheckEmptyOrRootPath(RuleDefinition rule, List<RuleReviewIssue> issues)
    {
        if (string.IsNullOrWhiteSpace(rule.Path))
        {
            issues.Add(new RuleReviewIssue(
                Code: "EMPTY_PATH",
                Severity: RuleReviewStatus.BLOCKED,
                RuleId: rule.Id,
                Facts: new Dictionary<string, object>
                {
                    ["ruleType"] = rule.Type
                }
            ));
            return;
        }
        
        // Check if path is just resource type with no navigation
        var trimmedPath = rule.Path.Trim();
        if (trimmedPath == rule.ResourceType || 
            trimmedPath == $"{rule.ResourceType}.where(true)" ||
            trimmedPath == $"{rule.ResourceType}[*]")
        {
            issues.Add(new RuleReviewIssue(
                Code: "ROOT_LEVEL_PATH",
                Severity: RuleReviewStatus.BLOCKED,
                RuleId: rule.Id,
                Facts: new Dictionary<string, object>
                {
                    ["path"] = rule.Path,
                    ["resourceType"] = rule.ResourceType
                }
            ));
        }
    }
    
    /// <summary>
    /// BLOCKED: QuestionAnswer rule without questionSetId in params
    /// </summary>
    private void CheckQuestionAnswerWithoutQuestionSetId(RuleDefinition rule, List<RuleReviewIssue> issues)
    {
        if (rule.Type != "QuestionAnswer")
            return;
        
        var hasQuestionSetId = rule.Params?.ContainsKey("questionSetId") == true &&
                              !string.IsNullOrWhiteSpace(rule.Params["questionSetId"]?.ToString());
        
        if (!hasQuestionSetId)
        {
            issues.Add(new RuleReviewIssue(
                Code: "QUESTION_ANSWER_WITHOUT_QUESTION_SET_ID",
                Severity: RuleReviewStatus.BLOCKED,
                RuleId: rule.Id,
                Facts: new Dictionary<string, object>
                {
                    ["ruleType"] = rule.Type,
                    ["path"] = rule.Path
                }
            ));
        }
    }
    
    /// <summary>
    /// WARNING: QuestionAnswer rule with provided errorCode (should be omitted, runtime determines errorCode)
    /// </summary>
    private void CheckQuestionAnswerProvidedErrorCode(RuleDefinition rule, List<RuleReviewIssue> issues)
    {
        if (rule.Type != "QuestionAnswer")
            return;
        
        if (!string.IsNullOrWhiteSpace(rule.ErrorCode))
        {
            issues.Add(new RuleReviewIssue(
                Code: "QUESTIONANSWER_ERROR_CODE_IGNORED",
                Severity: RuleReviewStatus.WARNING,
                RuleId: rule.Id,
                Facts: new Dictionary<string, object>
                {
                    ["ruleType"] = rule.Type,
                    ["providedErrorCode"] = rule.ErrorCode,
                    ["reason"] = "QuestionAnswer is constraint-driven. The errorCode field is ignored at runtime. " +
                                "Runtime validator emits appropriate errorCode based on validation outcome: " +
                                "ANSWER_REQUIRED, INVALID_ANSWER_VALUE, ANSWER_OUT_OF_RANGE, ANSWER_NOT_IN_VALUESET, " +
                                "QUESTION_NOT_FOUND, or QUESTIONSET_DATA_MISSING. " +
                                "Authors should omit errorCode or leave it empty."
                }
            ));
        }
    }
    
    /// <summary>
    /// BLOCKED: Pattern/Regex rule with incorrect errorCode (must be PATTERN_MISMATCH)
    /// </summary>
    private void CheckPatternErrorCode(RuleDefinition rule, List<RuleReviewIssue> issues)
    {
        if (rule.Type != "Regex" && rule.Type != "Pattern")
            return;
        
        if (!string.IsNullOrWhiteSpace(rule.ErrorCode) && rule.ErrorCode != "PATTERN_MISMATCH")
        {
            issues.Add(new RuleReviewIssue(
                Code: "PATTERN_ERROR_CODE_MISMATCH",
                Severity: RuleReviewStatus.BLOCKED,
                RuleId: rule.Id,
                Facts: new Dictionary<string, object>
                {
                    ["ruleType"] = rule.Type,
                    ["currentErrorCode"] = rule.ErrorCode,
                    ["requiredErrorCode"] = "PATTERN_MISMATCH",
                    ["reason"] = "Pattern rules must use errorCode PATTERN_MISMATCH"
                }
            ));
        }
    }
    
    /// <summary>
    /// Enforces that AllowedValues rules use errorCode = "VALUE_NOT_ALLOWED".
    /// 
    /// GOVERNANCE CONTRACT:
    /// - Blocks AllowedValues rules with errorCode != "VALUE_NOT_ALLOWED"
    /// - Returns BLOCKED status with ALLOWEDVALUES_ERROR_CODE_MISMATCH code
    /// 
    /// UX CONTRACT (Future Implementation):
    /// - Frontend should prevent user from setting invalid errorCode
    /// - Rule authoring UI should hide errorCode dropdown for AllowedValues
    /// - Display static "Error Code: VALUE_NOT_ALLOWED" label
    /// - If governance error occurs, show clear message:
    ///   "AllowedValues rules must use VALUE_NOT_ALLOWED error code. 
    ///    Current: {currentErrorCode}. Please remove or change errorCode."
    /// </summary>
    private void CheckAllowedValuesErrorCode(RuleDefinition rule, List<RuleReviewIssue> issues)
    {
        if (rule.Type != "AllowedValues")
            return;
        
        if (!string.IsNullOrWhiteSpace(rule.ErrorCode) && rule.ErrorCode != "VALUE_NOT_ALLOWED")
        {
            issues.Add(new RuleReviewIssue(
                Code: "ALLOWEDVALUES_ERROR_CODE_MISMATCH",
                Severity: RuleReviewStatus.BLOCKED,
                RuleId: rule.Id,
                Facts: new Dictionary<string, object>
                {
                    ["ruleType"] = rule.Type,
                    ["currentErrorCode"] = rule.ErrorCode,
                    ["requiredErrorCode"] = "VALUE_NOT_ALLOWED",
                    ["reason"] = "AllowedValues rules must use errorCode VALUE_NOT_ALLOWED"
                }
            ));
        }
    }
    
    /// <summary>
    /// Enforces that ArrayLength rules use errorCode = "ARRAY_LENGTH_VIOLATION".
    /// 
    /// GOVERNANCE CONTRACT:
    /// - Blocks ArrayLength rules with errorCode != "ARRAY_LENGTH_VIOLATION"
    /// - Returns BLOCKED status with ARRAYLENGTH_ERROR_CODE_MISMATCH code
    /// 
    /// UX CONTRACT (Future Implementation):
    /// - Frontend should prevent user from setting invalid errorCode
    /// - Rule authoring UI should hide errorCode dropdown for ArrayLength
    /// - Display static "Error Code: ARRAY_LENGTH_VIOLATION" label
    /// - If governance error occurs, show clear message:
    ///   "ArrayLength rules must use ARRAY_LENGTH_VIOLATION error code. 
    ///    Current: {currentErrorCode}. Please remove or change errorCode."
    /// </summary>
    private void CheckArrayLengthErrorCode(RuleDefinition rule, List<RuleReviewIssue> issues)
    {
        if (rule.Type != "ArrayLength")
            return;
        
        if (!string.IsNullOrWhiteSpace(rule.ErrorCode) && rule.ErrorCode != "ARRAY_LENGTH_VIOLATION")
        {
            issues.Add(new RuleReviewIssue(
                Code: "ARRAYLENGTH_ERROR_CODE_MISMATCH",
                Severity: RuleReviewStatus.BLOCKED,
                RuleId: rule.Id,
                Facts: new Dictionary<string, object>
                {
                    ["ruleType"] = rule.Type,
                    ["currentErrorCode"] = rule.ErrorCode,
                    ["requiredErrorCode"] = "ARRAY_LENGTH_VIOLATION",
                    ["reason"] = "ArrayLength rules must use errorCode ARRAY_LENGTH_VIOLATION"
                }
            ));
        }
    }
    
    /// <summary>
    /// Enforces that CodeSystem rules use errorCode = "CODESYSTEM_VIOLATION".
    /// 
    /// GOVERNANCE CONTRACT:
    /// - Blocks CodeSystem rules with errorCode != "CODESYSTEM_VIOLATION"
    /// - Returns BLOCKED status with CODESYSTEM_ERROR_CODE_MISMATCH code
    /// 
    /// UX CONTRACT (Implementation Required):
    /// - Frontend should treat CodeSystem errorCode as read-only
    /// - Rule authoring UI should display static label: "Error Code: CODESYSTEM_VIOLATION (fixed)"
    /// - ErrorCodeSelector should not show dropdown for CodeSystem rules
    /// - If governance error occurs, show clear message:
    ///   "CodeSystem rules have a fixed error code: CODESYSTEM_VIOLATION. 
    ///    Current: {currentErrorCode}. Please update the rule."
    /// </summary>
    private void CheckCodeSystemErrorCode(RuleDefinition rule, List<RuleReviewIssue> issues)
    {
        if (rule.Type != "CodeSystem")
            return;
        
        if (string.IsNullOrWhiteSpace(rule.ErrorCode) || rule.ErrorCode != "CODESYSTEM_VIOLATION")
        {
            issues.Add(new RuleReviewIssue(
                Code: "CODESYSTEM_ERROR_CODE_MISMATCH",
                Severity: RuleReviewStatus.BLOCKED,
                RuleId: rule.Id,
                Facts: new Dictionary<string, object>
                {
                    ["ruleType"] = rule.Type,
                    ["currentErrorCode"] = rule.ErrorCode ?? "(missing)",
                    ["requiredErrorCode"] = "CODESYSTEM_VIOLATION",
                    ["reason"] = "CodeSystem rules have a fixed semantic errorCode and must use CODESYSTEM_VIOLATION.",
                    ["explanation"] = "CodeSystem validation has one fixed meaning: system or code validation failed. " +
                                    "Use Details['violation'] to distinguish 'system' vs 'code' failure, not custom errorCodes."
                }
            ));
        }
    }
    
    /// <summary>
    /// BLOCKED: RequiredResources rules must use REQUIRED_RESOURCE_MISSING errorCode.
    /// 
    /// GOVERNANCE CONTRACT:
    /// - errorCode must be absent or REQUIRED_RESOURCE_MISSING (no custom errorCodes)
    /// - Fixed semantic: resource count constraint violation
    /// 
    /// RATIONALE:
    /// - RequiredResources has one semantic meaning: resource missing or count wrong
    /// - Allowing custom errorCodes creates semantic drift
    /// - Mode and count details belong in Details, not errorCode
    /// </summary>
    private void CheckRequiredResourcesErrorCode(RuleDefinition rule, List<RuleReviewIssue> issues)
    {
        if (rule.Type != "RequiredResources")
            return;
        
        // errorCode must be absent (will default to REQUIRED_RESOURCE_MISSING at runtime) or explicitly REQUIRED_RESOURCE_MISSING
        if (!string.IsNullOrWhiteSpace(rule.ErrorCode) && rule.ErrorCode != "REQUIRED_RESOURCE_MISSING")
        {
            issues.Add(new RuleReviewIssue(
                Code: "REQUIRED_RESOURCES_ERROR_CODE_NOT_ALLOWED",
                Severity: RuleReviewStatus.BLOCKED,
                RuleId: rule.Id,
                Facts: new Dictionary<string, object>
                {
                    ["ruleType"] = rule.Type,
                    ["currentErrorCode"] = rule.ErrorCode,
                    ["requiredErrorCode"] = "REQUIRED_RESOURCE_MISSING",
                    ["reason"] = "RequiredResources rules have a fixed semantic errorCode and must use REQUIRED_RESOURCE_MISSING.",
                    ["explanation"] = "RequiredResources validation has one fixed meaning: required resource count constraint violated. " +
                                    "Use Details['mode'] and Details['expectedCount'] to distinguish 'at least' vs 'exactly', not custom errorCodes."
                }
            ));
        }
    }
    
    /// <summary>
    /// BLOCKED: RequiredResources rules must have valid configuration.
    /// 
    /// GOVERNANCE CONTRACT:
    /// - requirements array must not be empty
    /// - Each requirement must have resourceType
    /// - min >= 1 for all requirements
    /// - max >= min when max present (no invalid ranges)
    /// - max === min OR max absent (no range support - only "at least" or "exactly" modes)
    /// - No duplicate resourceTypes
    /// 
    /// RATIONALE:
    /// - Empty requirements = meaningless rule
    /// - min < 1 = nonsensical (resource count cannot be negative)
    /// - max < min = invalid constraint
    /// - min < max = range mode not supported (governance enforces binary choice: min-only or exact)
    /// - Duplicates = ambiguous/conflicting constraints
    /// </summary>
    private void CheckRequiredResourcesConfiguration(RuleDefinition rule, List<RuleReviewIssue> issues)
    {
        if (rule.Type != "RequiredResources")
            return;
        
        // Check 1: params.requirements must exist
        if (rule.Params == null || !rule.Params.ContainsKey("requirements"))
        {
            issues.Add(new RuleReviewIssue(
                Code: "REQUIRED_RESOURCES_INVALID_CONFIG",
                Severity: RuleReviewStatus.BLOCKED,
                RuleId: rule.Id,
                Facts: new Dictionary<string, object>
                {
                    ["ruleType"] = rule.Type,
                    ["reason"] = "Missing 'requirements' parameter",
                    ["explanation"] = "RequiredResources rules must have a 'requirements' array parameter with at least one requirement."
                }
            ));
            return;
        }
        
        // Parse requirements array
        List<System.Text.Json.JsonElement>? requirementsArray = null;
        try
        {
            var requirementsJson = System.Text.Json.JsonSerializer.Serialize(rule.Params["requirements"]);
            var requirementsDoc = System.Text.Json.JsonDocument.Parse(requirementsJson);
            requirementsArray = requirementsDoc.RootElement.EnumerateArray().ToList();
        }
        catch
        {
            issues.Add(new RuleReviewIssue(
                Code: "REQUIRED_RESOURCES_INVALID_CONFIG",
                Severity: RuleReviewStatus.BLOCKED,
                RuleId: rule.Id,
                Facts: new Dictionary<string, object>
                {
                    ["ruleType"] = rule.Type,
                    ["reason"] = "Failed to parse 'requirements' array",
                    ["explanation"] = "The 'requirements' parameter must be a valid JSON array."
                }
            ));
            return;
        }
        
        // Check 2: requirements array must not be empty
        if (requirementsArray == null || !requirementsArray.Any())
        {
            issues.Add(new RuleReviewIssue(
                Code: "REQUIRED_RESOURCES_INVALID_CONFIG",
                Severity: RuleReviewStatus.BLOCKED,
                RuleId: rule.Id,
                Facts: new Dictionary<string, object>
                {
                    ["ruleType"] = rule.Type,
                    ["reason"] = "Empty 'requirements' array",
                    ["explanation"] = "RequiredResources rules must have at least one requirement."
                }
            ));
            return;
        }
        
        // Check each requirement
        var seenResourceTypes = new HashSet<string>(StringComparer.Ordinal);
        
        for (int i = 0; i < requirementsArray.Count; i++)
        {
            var req = requirementsArray[i];
            
            // Check resourceType exists
            if (!req.TryGetProperty("resourceType", out var resourceTypeProp) || string.IsNullOrWhiteSpace(resourceTypeProp.GetString()))
            {
                issues.Add(new RuleReviewIssue(
                    Code: "REQUIRED_RESOURCES_INVALID_CONFIG",
                    Severity: RuleReviewStatus.BLOCKED,
                    RuleId: rule.Id,
                    Facts: new Dictionary<string, object>
                    {
                        ["ruleType"] = rule.Type,
                        ["requirementIndex"] = i,
                        ["reason"] = "Missing or empty 'resourceType' in requirement",
                        ["explanation"] = "Each requirement must specify a valid FHIR resourceType."
                    }
                ));
                continue;
            }
            
            var resourceType = resourceTypeProp.GetString()!;
            
            // Check for duplicates
            if (!seenResourceTypes.Add(resourceType))
            {
                issues.Add(new RuleReviewIssue(
                    Code: "REQUIRED_RESOURCES_INVALID_CONFIG",
                    Severity: RuleReviewStatus.BLOCKED,
                    RuleId: rule.Id,
                    Facts: new Dictionary<string, object>
                    {
                        ["ruleType"] = rule.Type,
                        ["resourceType"] = resourceType,
                        ["reason"] = "Duplicate resourceType in requirements",
                        ["explanation"] = $"Resource type '{resourceType}' appears multiple times. Each resource type can only have one requirement."
                    }
                ));
            }
            
            // Check min exists and >= 1
            if (!req.TryGetProperty("min", out var minProp))
            {
                issues.Add(new RuleReviewIssue(
                    Code: "REQUIRED_RESOURCES_INVALID_CONFIG",
                    Severity: RuleReviewStatus.BLOCKED,
                    RuleId: rule.Id,
                    Facts: new Dictionary<string, object>
                    {
                        ["ruleType"] = rule.Type,
                        ["resourceType"] = resourceType,
                        ["requirementIndex"] = i,
                        ["reason"] = "Missing 'min' value in requirement",
                        ["explanation"] = "Each requirement must specify a minimum count (min >= 1)."
                    }
                ));
                continue;
            }
            
            var min = minProp.GetInt32();
            
            if (min < 1)
            {
                issues.Add(new RuleReviewIssue(
                    Code: "REQUIRED_RESOURCES_INVALID_CONFIG",
                    Severity: RuleReviewStatus.BLOCKED,
                    RuleId: rule.Id,
                    Facts: new Dictionary<string, object>
                    {
                        ["ruleType"] = rule.Type,
                        ["resourceType"] = resourceType,
                        ["min"] = min,
                        ["reason"] = "Invalid 'min' value (must be >= 1)",
                        ["explanation"] = "Minimum count must be at least 1."
                    }
                ));
            }
            
            // Check max (if present)
            if (req.TryGetProperty("max", out var maxProp))
            {
                var max = maxProp.GetInt32();
                
                // Check max >= min
                if (max < min)
                {
                    issues.Add(new RuleReviewIssue(
                        Code: "REQUIRED_RESOURCES_INVALID_CONFIG",
                        Severity: RuleReviewStatus.BLOCKED,
                        RuleId: rule.Id,
                        Facts: new Dictionary<string, object>
                        {
                            ["ruleType"] = rule.Type,
                            ["resourceType"] = resourceType,
                            ["min"] = min,
                            ["max"] = max,
                            ["reason"] = "Invalid constraint: max < min",
                            ["explanation"] = "Maximum count must be greater than or equal to minimum count."
                        }
                    ));
                }
                
                // Check max === min OR max absent (no range support)
                if (max != min)
                {
                    issues.Add(new RuleReviewIssue(
                        Code: "REQUIRED_RESOURCES_INVALID_CONFIG",
                        Severity: RuleReviewStatus.BLOCKED,
                        RuleId: rule.Id,
                        Facts: new Dictionary<string, object>
                        {
                            ["ruleType"] = rule.Type,
                            ["resourceType"] = resourceType,
                            ["min"] = min,
                            ["max"] = max,
                            ["reason"] = "Range mode not supported (min < max)",
                            ["explanation"] = "RequiredResources only supports two modes: 'At least' (min only, no max) or 'Exactly' (min === max). " +
                                            "Ranges (min < max) are not supported. Please use either min-only or set max equal to min."
                        }
                    ));
                }
            }
        }
    }
    
    /// <summary>
    /// Enforces that CustomFHIRPath rules use known errorCodes from ValidationErrorCodes.
    /// 
    /// GOVERNANCE CONTRACT:
    /// - Blocks CustomFHIRPath rules with missing errorCode
    /// - Blocks CustomFHIRPath rules with unknown errorCode (not in ValidationErrorCodes)
    /// - Allows any known errorCode (user-defined semantic selection)
    /// 
    /// RATIONALE:
    /// - CustomFHIRPath is flexible by design (arbitrary boolean expressions)
    /// - But errorCode must be stable and known to prevent drift
    /// - User selects appropriate errorCode based on expression semantics
    /// - Governance ensures no typos or invented codes
    /// </summary>
    private void CheckCustomFhirPathErrorCodeIsKnown(RuleDefinition rule, List<RuleReviewIssue> issues)
    {
        if (!rule.Type.Equals("CustomFHIRPath", StringComparison.OrdinalIgnoreCase))
            return;
        
        // BLOCKED: Missing or empty errorCode
        if (string.IsNullOrWhiteSpace(rule.ErrorCode))
        {
            issues.Add(new RuleReviewIssue(
                Code: "CUSTOMFHIRPATH_ERROR_CODE_MISSING",
                Severity: RuleReviewStatus.BLOCKED,
                RuleId: rule.Id,
                Facts: new Dictionary<string, object>
                {
                    ["ruleType"] = rule.Type,
                    ["reason"] = "CustomFHIRPath rules require explicit errorCode"
                }
            ));
            return;
        }
        
        // BLOCKED: Unknown errorCode (not in ValidationErrorCodes)
        if (!KnownErrorCodes.Value.Contains(rule.ErrorCode))
        {
            issues.Add(new RuleReviewIssue(
                Code: "CUSTOMFHIRPATH_ERROR_CODE_UNKNOWN",
                Severity: RuleReviewStatus.BLOCKED,
                RuleId: rule.Id,
                Facts: new Dictionary<string, object>
                {
                    ["ruleType"] = rule.Type,
                    ["currentErrorCode"] = rule.ErrorCode,
                    ["reason"] = "errorCode must be a known ValidationErrorCode constant",
                    ["hint"] = "Check Pss.FhirProcessor.Engine.Validation.ValidationErrorCodes for valid codes"
                }
            ));
        }
    }
    
    /// <summary>
    /// Cached set of all known errorCode constants from ValidationErrorCodes.
    /// Built via reflection once and reused.
    /// </summary>
    private static readonly Lazy<HashSet<string>> KnownErrorCodes = new(() =>
    {
        var errorCodesType = typeof(Pss.FhirProcessor.Engine.Validation.ValidationErrorCodes);
        var fields = errorCodesType.GetFields(
            System.Reflection.BindingFlags.Public | 
            System.Reflection.BindingFlags.Static | 
            System.Reflection.BindingFlags.FlattenHierarchy
        );
        
        var codes = new HashSet<string>(StringComparer.Ordinal);
        foreach (var field in fields)
        {
            if (field.IsLiteral && !field.IsInitOnly && field.FieldType == typeof(string))
            {
                var value = field.GetValue(null) as string;
                if (!string.IsNullOrWhiteSpace(value))
                {
                    codes.Add(value);
                }
            }
        }
        
        return codes;
    });
    
    /// <summary>
    /// BLOCKED: Reference rules are not supported as user-defined business rules.
    /// Reference validation is handled globally by ReferenceResolver in the validation pipeline.
    /// 
    /// RATIONALE:
    /// - Reference validation already exists as a system-level service
    /// - Allowing rule-based Reference validation would create semantic ambiguity
    /// - ErrorCode source confusion (is REFERENCE_NOT_FOUND from ReferenceResolver or a rule?)
    /// - Prevents phantom rules that silently fail at runtime
    /// </summary>
    private void CheckReferenceRuleNotSupported(RuleDefinition rule, List<RuleReviewIssue> issues)
    {
        if (rule.Type != "Reference")
            return;
        
        issues.Add(new RuleReviewIssue(
            Code: "REFERENCE_RULE_NOT_SUPPORTED",
            Severity: RuleReviewStatus.BLOCKED,
            RuleId: rule.Id,
            Facts: new Dictionary<string, object>
            {
                ["ruleType"] = rule.Type,
                ["reason"] = "Reference validation is handled globally by the system and cannot be authored as a rule.",
                ["explanation"] = "References are automatically validated by the ReferenceResolver service. " +
                                "All resource references in the bundle are checked for existence and type correctness. " +
                                "User-defined Reference rules are not supported to avoid semantic ambiguity and ensure consistent error handling."
            }
        ));
    }
    
    /// <summary>
    /// BLOCKED: FullUrlIdMatch rules are not supported.
    /// FullUrl-to-resource.id consistency is NOT enforced via business rules.
    /// 
    /// RATIONALE:
    /// - FullUrlIdMatch is documented but has zero runtime implementation
    /// - FhirPathRuleEngine explicitly skips this rule type with a comment
    /// - No bundle-level validator exists for fullUrl/id matching
    /// - Allowing this rule type creates phantom rules that silently fail
    /// - fullUrl/id consistency must be handled by system-level validation or migration logic
    /// </summary>
    private void CheckFullUrlIdMatchRuleNotSupported(RuleDefinition rule, List<RuleReviewIssue> issues)
    {
        if (!rule.Type.Equals("FullUrlIdMatch", StringComparison.OrdinalIgnoreCase))
            return;
        
        issues.Add(new RuleReviewIssue(
            Code: "FULLURLIDMATCH_RULE_NOT_SUPPORTED",
            Severity: RuleReviewStatus.BLOCKED,
            RuleId: rule.Id,
            Facts: new Dictionary<string, object>
            {
                ["ruleType"] = rule.Type,
                ["reason"] = "FullUrlIdMatch is not implemented and cannot be used as a business rule.",
                ["explanation"] = "FullUrlIdMatch validation is not supported. fullUrl-to-resource.id consistency " +
                                "is not enforced via business rules. This rule type is intentionally blocked to " +
                                "prevent silent failures. Use system-level validation or migration logic instead."
            }
        ));
    }
    
    /// <summary>
    /// BLOCKED: Pattern/Regex rule targeting non-string type (heuristic check)
    /// </summary>
    private void CheckPatternOnNonString(RuleDefinition rule, List<RuleReviewIssue> issues)
    {
        if (rule.Type != "Regex" && rule.Type != "Pattern")
            return;
        
        // Heuristic: check if path ends with known non-string field
        var pathLower = rule.Path.ToLowerInvariant();
        
        // Common non-string fields
        if (pathLower.Contains(".active") ||      // boolean
            pathLower.Contains(".multipleBirth") || // boolean/integer
            pathLower.Contains(".deceasedBoolean") ||
            pathLower.Contains(".birthDate") ||    // date
            pathLower.Contains(".period") ||       // Period (complex type)
            pathLower.Contains(".quantity") ||     // Quantity (complex type)
            pathLower.Contains(".address") ||      // Address (complex type)
            pathLower.Contains(".contact"))        // ContactPoint (complex type)
        {
            issues.Add(new RuleReviewIssue(
                Code: "PATTERN_ON_NON_STRING",
                Severity: RuleReviewStatus.BLOCKED,
                RuleId: rule.Id,
                Facts: new Dictionary<string, object>
                {
                    ["ruleType"] = rule.Type,
                    ["path"] = rule.Path,
                    ["reason"] = "Path likely targets non-string field"
                }
            ));
        }
    }
    
    /// <summary>
    /// BLOCKED: ArrayLength rule targeting non-array path (heuristic check)
    /// </summary>
    private void CheckArrayLengthOnNonArray(RuleDefinition rule, List<RuleReviewIssue> issues)
    {
        if (rule.Type != "ArrayLength")
            return;
        
        // Heuristic: check if path contains known array patterns
        var pathLower = rule.Path.ToLowerInvariant();
        var looksLikeArray = ArrayFieldPatterns.Any(pattern => pathLower.Contains(pattern));
        
        if (!looksLikeArray)
        {
            issues.Add(new RuleReviewIssue(
                Code: "ARRAY_LENGTH_ON_NON_ARRAY",
                Severity: RuleReviewStatus.WARNING, // Downgrade to WARNING (might be valid)
                RuleId: rule.Id,
                Facts: new Dictionary<string, object>
                {
                    ["ruleType"] = rule.Type,
                    ["path"] = rule.Path,
                    ["reason"] = "Path does not contain common array field patterns"
                }
            ));
        }
    }
    
    // ═══════════════════════════════════════════════════════════
    // WARNING CHECKS (Allowed but Flagged)
    // ═══════════════════════════════════════════════════════════
    
    /// <summary>
    /// WARNING: Path ends at resource root without specific field navigation
    /// </summary>
    private void CheckPathEndsAtResourceRoot(RuleDefinition rule, List<RuleReviewIssue> issues)
    {
        var pathSegments = rule.Path.Split('.');
        
        // If path is just ResourceType.field (2 segments) or less, might be too broad
        if (pathSegments.Length <= 2 && !rule.Path.Contains("where(") && !rule.Path.Contains("["))
        {
            issues.Add(new RuleReviewIssue(
                Code: "BROAD_PATH",
                Severity: RuleReviewStatus.WARNING,
                RuleId: rule.Id,
                Facts: new Dictionary<string, object>
                {
                    ["path"] = rule.Path,
                    ["segmentCount"] = pathSegments.Length,
                    ["reason"] = "Path may be too broad without specific field navigation"
                }
            ));
        }
    }
    
    /// <summary>
    /// WARNING: Overly generic wildcard paths ([*] without narrowing)
    /// </summary>
    private void CheckGenericWildcardPaths(RuleDefinition rule, List<RuleReviewIssue> issues)
    {
        if (rule.Path.Contains("[*]") && !rule.Path.Contains("where("))
        {
            issues.Add(new RuleReviewIssue(
                Code: "GENERIC_WILDCARD",
                Severity: RuleReviewStatus.WARNING,
                RuleId: rule.Id,
                Facts: new Dictionary<string, object>
                {
                    ["path"] = rule.Path,
                    ["reason"] = "Wildcard [*] without where() filter may match too broadly"
                }
            ));
        }
    }
    
    /// <summary>
    /// BLOCKED: FixedValue rules must use the fixed error code FIXED_VALUE_MISMATCH.
    /// 
    /// RATIONALE:
    /// - FixedValue has one semantic meaning: "value must equal fixed value"
    /// - Custom errorCodes create semantic drift and UI confusion
    /// - Granularity belongs in Details (expected/actual), not ErrorCode
    /// </summary>
    private void CheckFixedValueErrorCode(RuleDefinition rule, List<RuleReviewIssue> issues)
    {
        if (rule.Type != "FixedValue")
            return;
        
        if (string.IsNullOrWhiteSpace(rule.ErrorCode) || rule.ErrorCode != "FIXED_VALUE_MISMATCH")
        {
            issues.Add(new RuleReviewIssue(
                Code: "FIXEDVALUE_ERROR_CODE_MISMATCH",
                Severity: RuleReviewStatus.BLOCKED,
                RuleId: rule.Id,
                Facts: new Dictionary<string, object>
                {
                    ["ruleType"] = "FixedValue",
                    ["currentErrorCode"] = rule.ErrorCode ?? "(missing)",
                    ["requiredErrorCode"] = "FIXED_VALUE_MISMATCH",
                    ["reason"] = "FixedValue rules have a fixed error meaning and must use FIXED_VALUE_MISMATCH.",
                    ["explanation"] = "The errorCode field is semantically fixed for FixedValue rules. " +
                                    "Use the Details payload (expected/actual) for granular context, not custom errorCodes."
                }
            ));
        }
    }
    
    /// <summary>
    /// WARNING: FixedValue rule without system constraint (might be ambiguous)
    /// </summary>
    private void CheckFixedValueWithoutConstraints(RuleDefinition rule, List<RuleReviewIssue> issues)
    {
        if (rule.Type != "FixedValue")
            return;
        
        // Check if path targets a coding/code field but has no system constraint
        var pathLower = rule.Path.ToLowerInvariant();
        if ((pathLower.Contains(".code") || pathLower.Contains(".coding")) &&
            !rule.Path.Contains("system"))
        {
            issues.Add(new RuleReviewIssue(
                Code: "FIXED_VALUE_WITHOUT_SYSTEM",
                Severity: RuleReviewStatus.WARNING,
                RuleId: rule.Id,
                Facts: new Dictionary<string, object>
                {
                    ["path"] = rule.Path,
                    ["reason"] = "FixedValue on code/coding without system constraint may be ambiguous"
                }
            ));
        }
    }
    
    /// <summary>
    /// WARNING: Detect duplicate rules (same type + path)
    /// </summary>
    private void CheckDuplicateRules(List<RuleDefinition> rules, List<RuleReviewResult> results)
    {
        var seen = new Dictionary<string, string>(); // key: type+path, value: ruleId
        
        foreach (var rule in rules)
        {
            var key = $"{rule.Type}|{rule.Path}";
            
            if (seen.TryGetValue(key, out var existingRuleId))
            {
                // Found duplicate - add WARNING to current rule's result
                var currentResult = results.FirstOrDefault(r => r.RuleId == rule.Id);
                if (currentResult != null)
                {
                    var updatedIssues = currentResult.Issues.ToList();
                    updatedIssues.Add(new RuleReviewIssue(
                        Code: "DUPLICATE_RULE",
                        Severity: RuleReviewStatus.WARNING,
                        RuleId: rule.Id,
                        Facts: new Dictionary<string, object>
                        {
                            ["duplicateOf"] = existingRuleId,
                            ["ruleType"] = rule.Type,
                            ["path"] = rule.Path
                        }
                    ));
                    
                    // Update result
                    var index = results.IndexOf(currentResult);
                    results[index] = new RuleReviewResult(
                        rule.Id,
                        DetermineStatus(updatedIssues),
                        updatedIssues.AsReadOnly()
                    );
                }
            }
            else
            {
                seen[key] = rule.Id;
            }
        }
    }
    
    /// <summary>
    /// BLOCKED: Multiple RequiredResources rules not allowed.
    /// RequiredResources defines the complete bundle composition contract.
    /// Only ONE such rule is permitted per project.
    /// 
    /// RATIONALE:
    /// - RequiredResources is a closed-bundle rule (declares ALL allowed resources)
    /// - Multiple rules would create conflicting bundle contracts
    /// - Single rule = single source of truth for bundle composition
    /// </summary>
    private void CheckSingleRequiredResourcesRule(List<RuleDefinition> rules, List<RuleReviewResult> results)
    {
        var requiredResourcesRules = rules
            .Where(r => r.Type.Equals("RequiredResources", StringComparison.OrdinalIgnoreCase))
            .ToList();
        
        if (requiredResourcesRules.Count > 1)
        {
            // Block ALL RequiredResources rules if multiple exist
            foreach (var rule in requiredResourcesRules)
            {
                var existingResult = results.FirstOrDefault(r => r.RuleId == rule.Id);
                if (existingResult != null)
                {
                    // Add issue to existing result
                    var mutableIssues = existingResult.Issues.ToList();
                    mutableIssues.Add(new RuleReviewIssue(
                        Code: "DUPLICATE_BUNDLE_RESOURCE_RULE",
                        Severity: RuleReviewStatus.BLOCKED,
                        RuleId: rule.Id,
                        Facts: new Dictionary<string, object>
                        {
                            ["ruleType"] = rule.Type,
                            ["totalCount"] = requiredResourcesRules.Count,
                            ["reason"] = "Only one bundle-level Required Resources rule is allowed per project.",
                            ["explanation"] = "RequiredResources defines the complete bundle composition contract. " +
                                            "Multiple rules would create conflicting constraints. " +
                                            "Please consolidate all resource requirements into a single rule."
                        }
                    ));
                    
                    // Update result with BLOCKED status
                    var index = results.IndexOf(existingResult);
                    results[index] = new RuleReviewResult(
                        existingResult.RuleId,
                        RuleReviewStatus.BLOCKED,
                        mutableIssues.AsReadOnly()
                    );
                }
            }
        }
    }
    
    /// <summary>
    /// WARNING: Detect path conflicts with different errorCodes (RULE_SEMANTIC_STABILITY)
    /// Multiple rules targeting the same path with different errorCodes is allowed but flagged
    /// </summary>
    private void CheckPathErrorCodeConflicts(List<RuleDefinition> rules, List<RuleReviewResult> results)
    {
        var pathErrorCodeMap = new Dictionary<string, Dictionary<string, List<string>>>(); // path -> errorCode -> [ruleIds]
        
        foreach (var rule in rules)
        {
            if (string.IsNullOrWhiteSpace(rule.ErrorCode))
                continue; // Skip rules without errorCode
            
            var path = rule.Path;
            
            if (!pathErrorCodeMap.ContainsKey(path))
            {
                pathErrorCodeMap[path] = new Dictionary<string, List<string>>();
            }
            
            if (!pathErrorCodeMap[path].ContainsKey(rule.ErrorCode))
            {
                pathErrorCodeMap[path][rule.ErrorCode] = new List<string>();
            }
            
            pathErrorCodeMap[path][rule.ErrorCode].Add(rule.Id);
        }
        
        // Check for conflicts (same path, different errorCodes)
        foreach (var (path, errorCodeMap) in pathErrorCodeMap)
        {
            if (errorCodeMap.Count > 1)
            {
                // Multiple errorCodes for same path - add WARNING to all affected rules
                foreach (var (errorCode, ruleIds) in errorCodeMap)
                {
                    foreach (var ruleId in ruleIds)
                    {
                        var currentResult = results.FirstOrDefault(r => r.RuleId == ruleId);
                        if (currentResult != null)
                        {
                            var updatedIssues = currentResult.Issues.ToList();
                            
                            // Collect all other errorCodes for this path
                            var otherErrorCodes = errorCodeMap.Keys.Where(ec => ec != errorCode).ToList();
                            
                            updatedIssues.Add(new RuleReviewIssue(
                                Code: "PATH_ERROR_CODE_CONFLICT",
                                Severity: RuleReviewStatus.WARNING,
                                RuleId: ruleId,
                                Facts: new Dictionary<string, object>
                                {
                                    ["path"] = path,
                                    ["thisErrorCode"] = errorCode,
                                    ["conflictingErrorCodes"] = string.Join(", ", otherErrorCodes),
                                    ["reason"] = "multiple rules target same path with different errorCodes"
                                }
                            ));
                            
                            // Update result
                            var index = results.IndexOf(currentResult);
                            results[index] = new RuleReviewResult(
                                ruleId,
                                DetermineStatus(updatedIssues),
                                updatedIssues.AsReadOnly()
                            );
                        }
                    }
                }
            }
        }
    }
    
    // ═══════════════════════════════════════════════════════════
    // HELPERS
    // ═══════════════════════════════════════════════════════════
    
    /// <summary>
    /// Determine overall status from list of issues (worst severity)
    /// </summary>
    private static RuleReviewStatus DetermineStatus(List<RuleReviewIssue> issues)
    {
        if (issues.Count == 0)
            return RuleReviewStatus.OK;
        
        if (issues.Any(i => i.Severity == RuleReviewStatus.BLOCKED))
            return RuleReviewStatus.BLOCKED;
        
        if (issues.Any(i => i.Severity == RuleReviewStatus.WARNING))
            return RuleReviewStatus.WARNING;
        
        return RuleReviewStatus.OK;
    }
}
