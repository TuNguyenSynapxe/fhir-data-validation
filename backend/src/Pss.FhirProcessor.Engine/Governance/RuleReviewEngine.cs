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
        CheckPatternOnNonString(rule, issues);
        CheckArrayLengthOnNonArray(rule, issues);
        
        // WARNING checks (allowed but flagged)
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
        
        return results.AsReadOnly();
    }
    
    // ═══════════════════════════════════════════════════════════
    // BLOCKED CHECKS (Cannot Save/Export)
    // ═══════════════════════════════════════════════════════════
    
    /// <summary>
    /// BLOCKED: Missing or empty errorCode (defensive check, even if already enforced)
    /// </summary>
    private void CheckMissingErrorCode(RuleDefinition rule, List<RuleReviewIssue> issues)
    {
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
    /// </summary>
    private void CheckSemanticStability(RuleDefinition rule, List<RuleReviewIssue> issues)
    {
        // Rule types in scope for this check
        var scopedTypes = new HashSet<string>
        {
            "QuestionAnswer", "Reference", "CustomFHIRPath",
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
        
        // WARNING: Informational reminder for QuestionAnswer and CustomFHIRPath
        if (rule.Type == "QuestionAnswer" || rule.Type == "CustomFHIRPath")
        {
            issues.Add(new RuleReviewIssue(
                Code: "RULE_SEMANTIC_STABILITY_INFO",
                Severity: RuleReviewStatus.WARNING,
                RuleId: rule.Id,
                Facts: new Dictionary<string, object>
                {
                    ["ruleType"] = rule.Type,
                    ["reason"] = "informational: complex rule type requires careful errorCode selection"
                }
            ));
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
