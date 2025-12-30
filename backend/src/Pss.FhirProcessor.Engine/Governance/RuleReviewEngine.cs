using Pss.FhirProcessor.Engine.Models;

namespace Pss.FhirProcessor.Engine.Governance;

/// <summary>
/// Rule review engine interface for governance and quality enforcement.
/// Phase 2A-3: Path-free governance - uses FieldPath + InstanceScope for all checks.
/// Deterministic linting based ONLY on rule metadata (no validation, no data access).
/// </summary>
public interface IRuleReviewEngine
{
    /// <summary>
    /// Review a single rule for governance issues.
    /// CRITICAL: MUST NOT access FHIR bundle, MUST NOT run validation,
    /// MUST NOT inspect sample data. ONLY inspect rule metadata.
    /// Phase 2A-3: All checks use FieldPath + InstanceScope (no Path parsing).
    /// </summary>
    RuleReviewResult Review(RuleDefinition rule);
    
    /// <summary>
    /// Review multiple rules and detect duplicates.
    /// Phase 2A-3: Duplicate detection uses FieldPath + InstanceScope.ToStableKey().
    /// </summary>
    IReadOnlyList<RuleReviewResult> ReviewRuleSet(IEnumerable<RuleDefinition> rules);
}

/// <summary>
/// Rule review engine implementation.
/// Phase 2A-3: Path-free governance engine.
/// - Duplicate detection: Type + FieldPath + InstanceScope.ToStableKey()
/// - Conflict detection: FieldPath + InstanceScope + ErrorCode
/// - Removed heuristic checks requiring Path string parsing
/// - Execution layer handles type/cardinality validation
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
        CheckCodeSystemParams(rule, issues);
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
    /// BLOCKED: Rule FieldPath is empty (Phase 2A: Path-free governance)
    /// EXCEPTION: Resource and CustomFHIRPath rules may have empty FieldPath (bundle/resource-level validation)
    /// Path-based checks removed - execution layer enforces FieldPath requirement
    /// </summary>
    private void CheckEmptyOrRootPath(RuleDefinition rule, List<RuleReviewIssue> issues)
    {
        // Exception: Resource rules operate at Bundle level (FieldPath = "")
        // Exception: CustomFHIRPath rules may evaluate at resource level (FieldPath = "")
        if (rule.Type == "Resource" || rule.Type == "CustomFHIRPath")
            return;
        
        // Phase 2A: Only check FieldPath presence (execution layer will enforce this)
        if (string.IsNullOrWhiteSpace(rule.FieldPath))
        {
            issues.Add(new RuleReviewIssue(
                Code: "EMPTY_FIELD_PATH",
                Severity: RuleReviewStatus.BLOCKED,
                RuleId: rule.Id,
                Facts: new Dictionary<string, object>
                {
                    ["ruleType"] = rule.Type,
                    ["reason"] = "FieldPath is required for all rules"
                }
            ));
        }
        
        // Note: Root-level path checks removed (require string parsing)
        // Execution layer handles path validation via FieldPath structure
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
                    ["fieldPath"] = rule.FieldPath ?? "(not set)"
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
    /// BLOCKED: CodeSystem rules must have codeSetId and system params (Tier-1 Validation).
    /// 
    /// CONTRACT:
    /// - params.codeSetId: Required - identifies CodeSet in Terminology module
    /// - params.system: Required - must match CodeSet canonical URL
    /// - params.mode: Should be "codeset" for closed-world validation
    /// - params.codes: Optional - ONLY for future "restrict further" scenarios
    /// 
    /// RATIONALE:
    /// - CodeSystem validation requires CodeSet reference for closed-world validation
    /// - System-only validation is insufficient and allows invalid codes
    /// - Enforces CodeSet-driven terminology governance
    /// </summary>
    private void CheckCodeSystemParams(RuleDefinition rule, List<RuleReviewIssue> issues)
    {
        if (rule.Type != "CodeSystem")
            return;
        
        // Check for missing params
        if (rule.Params == null || rule.Params.Count == 0)
        {
            issues.Add(new RuleReviewIssue(
                Code: "CODESYSTEM_MISSING_PARAMS",
                Severity: RuleReviewStatus.BLOCKED,
                RuleId: rule.Id,
                Facts: new Dictionary<string, object>
                {
                    ["ruleType"] = rule.Type,
                    ["requiredParams"] = new[] { "codeSetId", "system" },
                    ["reason"] = "CodeSystem rules require codeSetId and system parameters",
                    ["explanation"] = "CodeSystem validation requires a CodeSet reference from the Terminology module. " +
                                    "The codeSetId identifies the CodeSet, and system must match its canonical URL."
                }
            ));
            return;
        }
        
        // Check for missing codeSetId
        if (!rule.Params.ContainsKey("codeSetId") || string.IsNullOrWhiteSpace(rule.Params["codeSetId"]?.ToString()))
        {
            issues.Add(new RuleReviewIssue(
                Code: "CODESYSTEM_MISSING_CODESETID",
                Severity: RuleReviewStatus.BLOCKED,
                RuleId: rule.Id,
                Facts: new Dictionary<string, object>
                {
                    ["ruleType"] = rule.Type,
                    ["missingParam"] = "codeSetId",
                    ["reason"] = "CodeSystem rules require codeSetId to reference a CodeSet in the Terminology module",
                    ["explanation"] = "The codeSetId parameter identifies which CodeSet to validate against. " +
                                    "All codes in the data must exist in the selected CodeSet (closed-world validation)."
                }
            ));
        }
        
        // Check for missing system
        if (!rule.Params.ContainsKey("system") || string.IsNullOrWhiteSpace(rule.Params["system"]?.ToString()))
        {
            issues.Add(new RuleReviewIssue(
                Code: "CODESYSTEM_MISSING_SYSTEM",
                Severity: RuleReviewStatus.BLOCKED,
                RuleId: rule.Id,
                Facts: new Dictionary<string, object>
                {
                    ["ruleType"] = rule.Type,
                    ["missingParam"] = "system",
                    ["reason"] = "CodeSystem rules require system to specify the CodeSystem canonical URL",
                    ["explanation"] = "The system parameter must match the canonical URL of the selected CodeSet. " +
                                    "This ensures coding.system in the data matches the expected CodeSystem."
                }
            ));
        }
        
        // Warn if codes[] is provided (advanced restriction mode - not Tier-1)
        if (rule.Params.ContainsKey("codes"))
        {
            issues.Add(new RuleReviewIssue(
                Code: "CODESYSTEM_MANUAL_CODES_PROVIDED",
                Severity: RuleReviewStatus.WARNING,
                RuleId: rule.Id,
                Facts: new Dictionary<string, object>
                {
                    ["ruleType"] = rule.Type,
                    ["providedParam"] = "codes",
                    ["reason"] = "Manual codes[] parameter is for advanced restriction scenarios only",
                    ["explanation"] = "By default, all codes from the CodeSet are allowed. " +
                                    "The codes[] parameter is only needed if you want to restrict further to a subset. " +
                                    "This is an advanced feature not required for normal validation."
                }
            ));
        }
    }
    
    /// <summary>
    /// BLOCKED: RequiredResources/Resource rules must use RESOURCE_REQUIREMENT_VIOLATION errorCode.
    /// 
    /// GOVERNANCE CONTRACT:
    /// - errorCode must be absent or RESOURCE_REQUIREMENT_VIOLATION (no custom errorCodes)
    /// - Fixed semantic: resource requirement violated (min/max cardinality or undeclared resource)
    /// 
    /// RATIONALE:
    /// - RequiredResources/Resource has one semantic meaning: bundle resource requirements violated
    /// - Allowing custom errorCodes creates semantic drift
    /// - Mode and count details belong in Details, not errorCode
    /// </summary>
    private void CheckRequiredResourcesErrorCode(RuleDefinition rule, List<RuleReviewIssue> issues)
    {
        if (rule.Type != "RequiredResources" && rule.Type != "Resource")
            return;
        
        // errorCode must be absent (will default to RESOURCE_REQUIREMENT_VIOLATION at runtime) or explicitly RESOURCE_REQUIREMENT_VIOLATION
        if (!string.IsNullOrWhiteSpace(rule.ErrorCode) && 
            rule.ErrorCode != "RESOURCE_REQUIREMENT_VIOLATION" && 
            rule.ErrorCode != "REQUIRED_RESOURCE_MISSING") // Legacy support
        {
            issues.Add(new RuleReviewIssue(
                Code: "REQUIRED_RESOURCES_ERROR_CODE_NOT_ALLOWED",
                Severity: RuleReviewStatus.BLOCKED,
                RuleId: rule.Id,
                Facts: new Dictionary<string, object>
                {
                    ["ruleType"] = rule.Type,
                    ["currentErrorCode"] = rule.ErrorCode,
                    ["requiredErrorCode"] = "RESOURCE_REQUIREMENT_VIOLATION",
                    ["reason"] = "Resource rules have a fixed semantic errorCode and must use RESOURCE_REQUIREMENT_VIOLATION.",
                    ["explanation"] = "Resource validation has one fixed meaning: bundle resource requirements violated (min/max cardinality or undeclared resource). " +
                                    "Use Details['violations'] to provide specific violation information, not custom errorCodes."
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
        if (rule.Type != "RequiredResources" && rule.Type != "Resource")
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
    /// REMOVED: CheckPatternOnNonString (Phase 2A: Path-free governance)
    /// Rationale: Requires string parsing of Path. Type validation belongs in execution layer.
    /// </summary>
    private void CheckPatternOnNonString(RuleDefinition rule, List<RuleReviewIssue> issues)
    {
        // Phase 2A: Removed Path-based heuristic check
        // Execution layer will handle type validation via Firely SDK
    }
    
    /// <summary>
    /// REMOVED: CheckArrayLengthOnNonArray (Phase 2A: Path-free governance)
    /// Rationale: Requires string parsing of Path. Cardinality validation belongs in execution layer.
    /// </summary>
    private void CheckArrayLengthOnNonArray(RuleDefinition rule, List<RuleReviewIssue> issues)
    {
        // Phase 2A: Removed Path-based heuristic check
        // Execution layer will detect array cardinality issues via Firely SDK
    }
    
    // ═══════════════════════════════════════════════════════════
    // WARNING CHECKS (Allowed but Flagged)
    // ═══════════════════════════════════════════════════════════
    
    /// <summary>
    /// REMOVED: CheckPathEndsAtResourceRoot (Phase 2A: Path-free governance)
    /// Rationale: Requires string parsing of Path. Advisory check only.
    /// </summary>
    private void CheckPathEndsAtResourceRoot(RuleDefinition rule, List<RuleReviewIssue> issues)
    {
        // Phase 2A: Removed Path-based advisory check
        // FieldPath structure naturally documents field depth
    }
    
    /// <summary>
    /// REMOVED: CheckGenericWildcardPaths (Phase 2A: Path-free governance)
    /// Rationale: Requires string parsing of Path. Advisory check only.
    /// </summary>
    private void CheckGenericWildcardPaths(RuleDefinition rule, List<RuleReviewIssue> issues)
    {
        // Phase 2A: Removed Path-based advisory check
        // InstanceScope (AllInstances vs FilteredInstances) naturally documents scope
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
    /// REMOVED: CheckFixedValueWithoutConstraints (Phase 2A: Path-free governance)
    /// Rationale: Requires string parsing of Path. Advisory check only.
    /// </summary>
    private void CheckFixedValueWithoutConstraints(RuleDefinition rule, List<RuleReviewIssue> issues)
    {
        // Phase 2A: Removed Path-based advisory check
        // System constraint validation belongs in execution layer
    }
    
    /// <summary>
    /// WARNING: Detect duplicate rules (Phase 2A: FieldPath + InstanceScope identity)
    /// Two rules are duplicates if they have:
    /// - Same Type
    /// - Same FieldPath
    /// - Same InstanceScope (structural equality via RuleIdentity.GetIdentityKey())
    /// </summary>
    private void CheckDuplicateRules(List<RuleDefinition> rules, List<RuleReviewResult> results)
    {
        var seen = new Dictionary<string, string>(); // key: identityKey, value: ruleId
        
        foreach (var rule in rules)
        {
            // Phase 2A: Require FieldPath for duplicate detection
            if (string.IsNullOrWhiteSpace(rule.FieldPath))
                continue; // Will be caught by CheckEmptyOrRootPath
                
            // Phase 2A: Use centralized identity helper
            var identityKey = RuleIdentity.GetIdentityKey(rule);
            
            if (seen.TryGetValue(identityKey, out var existingRuleId))
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
                            ["fieldPath"] = rule.FieldPath,
                            ["instanceScope"] = rule.InstanceScope?.ToStableKey() ?? "none",
                            ["identityKey"] = identityKey
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
                seen[identityKey] = rule.Id;
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
            .Where(r => r.Type.Equals("RequiredResources", StringComparison.OrdinalIgnoreCase) || 
                       r.Type.Equals("Resource", StringComparison.OrdinalIgnoreCase))
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
                            ["reason"] = "Only one bundle-level Resource rule is allowed per project.",
                            ["explanation"] = "Resource rule defines the complete bundle composition contract. " +
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
    /// WARNING: Detect field conflicts with different errorCodes (Phase 2A: FieldPath + InstanceScope)
    /// Multiple rules targeting the same FieldPath+InstanceScope with different errorCodes is allowed but flagged
    /// </summary>
    private void CheckPathErrorCodeConflicts(List<RuleDefinition> rules, List<RuleReviewResult> results)
    {
        // Phase 2A: Use FieldPath + InstanceScope for conflict detection
        var fieldErrorCodeMap = new Dictionary<string, Dictionary<string, List<string>>>(); // fieldKey -> errorCode -> [ruleIds]
        
        foreach (var rule in rules)
        {
            if (string.IsNullOrWhiteSpace(rule.ErrorCode))
                continue; // Skip rules without errorCode
            
            // Phase 2A: Require FieldPath for conflict detection
            if (string.IsNullOrWhiteSpace(rule.FieldPath))
                continue;
            
            // Phase 2A: Build key from FieldPath + InstanceScope
            var scopeKey = rule.InstanceScope?.ToStableKey() ?? "none";
            var fieldKey = $"{rule.FieldPath}|{scopeKey}";
            
            if (!fieldErrorCodeMap.ContainsKey(fieldKey))
            {
                fieldErrorCodeMap[fieldKey] = new Dictionary<string, List<string>>();
            }
            
            if (!fieldErrorCodeMap[fieldKey].ContainsKey(rule.ErrorCode))
            {
                fieldErrorCodeMap[fieldKey][rule.ErrorCode] = new List<string>();
            }
            
            fieldErrorCodeMap[fieldKey][rule.ErrorCode].Add(rule.Id);
        }
        
        // Check for conflicts (same FieldPath+InstanceScope, different errorCodes)
        foreach (var (fieldKey, errorCodeMap) in fieldErrorCodeMap)
        {
            if (errorCodeMap.Count > 1)
            {
                // Multiple errorCodes for same field+scope - add WARNING to all affected rules
                foreach (var (errorCode, ruleIds) in errorCodeMap)
                {
                    foreach (var ruleId in ruleIds)
                    {
                        var currentResult = results.FirstOrDefault(r => r.RuleId == ruleId);
                        if (currentResult != null)
                        {
                            var updatedIssues = currentResult.Issues.ToList();
                            
                            // Collect all other errorCodes for this field+scope
                            var otherErrorCodes = errorCodeMap.Keys.Where(ec => ec != errorCode).ToList();
                            
                            updatedIssues.Add(new RuleReviewIssue(
                                Code: "FIELD_ERROR_CODE_CONFLICT",
                                Severity: RuleReviewStatus.WARNING,
                                RuleId: ruleId,
                                Facts: new Dictionary<string, object>
                                {
                                    ["fieldKey"] = fieldKey,
                                    ["thisErrorCode"] = errorCode,
                                    ["conflictingErrorCodes"] = string.Join(", ", otherErrorCodes),
                                    ["reason"] = "multiple rules target same FieldPath+InstanceScope with different errorCodes"
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
