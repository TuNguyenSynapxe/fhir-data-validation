using System.Text.Json;
using Hl7.Fhir.Model;
using Pss.FhirProcessor.Engine.Models;
using Pss.FhirProcessor.Engine.Interfaces;

namespace Pss.FhirProcessor.Engine.Services;

/// <summary>
/// Builds unified error model from various validation sources as per docs/08_unified_error_model.md
/// </summary>
public class UnifiedErrorModelBuilder : IUnifiedErrorModelBuilder
{
    private readonly ISmartPathNavigationService _navigationService;
    
    public UnifiedErrorModelBuilder(ISmartPathNavigationService navigationService)
    {
        _navigationService = navigationService;
    }
    
    /// <summary>
    /// Enhances a Firely parsing error with navigation context
    /// Used for errors caught during Bundle deserialization (before OperationOutcome is available)
    /// </summary>
    public async Task<ValidationError> EnhanceFirelyParsingErrorAsync(ValidationError error, string? rawBundleJson, CancellationToken cancellationToken = default)
    {
        // If error already has jsonPointer, return as-is
        if (!string.IsNullOrEmpty(error.JsonPointer))
            return error;
        
        // Try to add navigation context if we have a path and the raw JSON
        if (!string.IsNullOrEmpty(error.Path) && !string.IsNullOrEmpty(rawBundleJson))
        {
            try
            {
                // Parse raw JSON directly for navigation - DO NOT use POCO
                // Navigation must work consistently whether POCO parsing succeeds or fails
                var jsonDoc = JsonDocument.Parse(rawBundleJson);
                var rawJson = jsonDoc.RootElement;
                
                var jsonPointer = await _navigationService.ResolvePathAsync(
                    rawJson,
                    null,  // No Bundle POCO available for parsing errors
                    error.Path, 
                    error.ResourceType, 
                    null,
                    cancellationToken);
                
                // Update JsonPointer if resolved
                if (!string.IsNullOrEmpty(jsonPointer))
                {
                    error.JsonPointer = jsonPointer;
                }
            }
            catch
            {
                // JSON parsing failed - return error without navigation
            }
        }
        
        return error;
    }
    
    public async Task<List<ValidationError>> FromFirelyIssuesAsync(OperationOutcome outcome, string rawBundleJson, Bundle bundle, CancellationToken cancellationToken = default)
    {
        var errors = new List<ValidationError>();
        
        if (outcome?.Issue == null)
            return errors;
        
        // Parse raw JSON for navigation - DO NOT use POCO serialization
        JsonElement rawJson;
        try
        {
            var jsonDoc = JsonDocument.Parse(rawBundleJson);
            rawJson = jsonDoc.RootElement;
        }
        catch
        {
            // JSON parsing failed - continue without navigation
            rawJson = default;
        }
        
        foreach (var issue in outcome.Issue)
        {
            // Skip informational messages about successful validation
            if (issue.Severity == OperationOutcome.IssueSeverity.Information && 
                (issue.Diagnostics?.Contains("passed") == true || 
                 issue.Diagnostics?.Contains("no issues") == true))
                continue;
            
            var path = issue.Expression?.FirstOrDefault() ?? issue.Location?.FirstOrDefault();
            
            // Try to resolve navigation using raw JSON
            string? jsonPointer = null;
            if (rawJson.ValueKind != JsonValueKind.Undefined && path != null)
            {
                try
                {
                    jsonPointer = await _navigationService.ResolvePathAsync(rawJson, bundle, path, null, null, cancellationToken);
                }
                catch
                {
                    // Navigation resolution failed - this is ok, we'll just have no navigation info
                }
            }
            
            var errorCode = issue.Code?.ToString()?.ToUpperInvariant()?.Replace("-", "_");
            var details = new Dictionary<string, object>
            {
                ["issueType"] = issue.Code?.ToString() ?? "Unknown",
                ["severity"] = issue.Severity?.ToString() ?? "Unknown"
            };
            
            errors.Add(new ValidationError
            {
                Source = "FHIR",
                Severity = MapSeverity(issue.Severity),
                ResourceType = ExtractResourceType(path),
                Path = path,
                JsonPointer = jsonPointer,
                ErrorCode = errorCode,
                Message = issue.Diagnostics ?? issue.Details?.Text ?? "FHIR validation error",
                Details = details,
                Explanation = ValidationExplanationService.ForFhirStructural(errorCode, path, details)
            });
        }
        
        return errors;
    }
    
    public async Task<List<ValidationError>> FromRuleErrorsAsync(List<RuleValidationError> errors, string rawBundleJson, Bundle bundle, CancellationToken cancellationToken = default)
    {
        var validationErrors = new List<ValidationError>();
        
        // Parse raw JSON for navigation - DO NOT use POCO serialization
        JsonElement rawJson;
        try
        {
            var jsonDoc = JsonDocument.Parse(rawBundleJson);
            rawJson = jsonDoc.RootElement;
        }
        catch
        {
            // JSON parsing failed - continue without navigation
            rawJson = default;
        }
        
        foreach (var error in errors)
        {
            // Check if JSON fallback precomputed the jsonPointer (when Bundle is null)
            string? jsonPointer = null;
            
            if (error.Details?.ContainsKey("_precomputedJsonPointer") == true)
            {
                // Use precomputed jsonPointer from JSON fallback
                jsonPointer = error.Details["_precomputedJsonPointer"]?.ToString();
                // Remove it from details so it doesn't appear in API response
                error.Details.Remove("_precomputedJsonPointer");
            }
            else if (rawJson.ValueKind != JsonValueKind.Undefined)
            {
                // Normal path: resolve using SmartPathNavigation on raw JSON
                jsonPointer = await _navigationService.ResolvePathAsync(rawJson, bundle, error.Path, error.ResourceType, null, cancellationToken);
            }
            
            // Include engine metadata in details for Firely-preferred with safe fallback strategy
            var details = error.Details ?? new Dictionary<string, object>();
            
            // Add engine metadata if present
            if (!string.IsNullOrEmpty(error.EngineUsed))
            {
                details["engineUsed"] = error.EngineUsed;
            }
            
            if (!string.IsNullOrEmpty(error.Confidence))
            {
                details["confidence"] = error.Confidence;
            }
            
            if (error.EvaluationNotes != null && error.EvaluationNotes.Any())
            {
                details["evaluationNotes"] = error.EvaluationNotes;
            }
            
            validationErrors.Add(new ValidationError
            {
                Source = "Business",
                Severity = error.Severity,
                ResourceType = error.ResourceType,
                Path = error.Path,
                JsonPointer = jsonPointer,
                ErrorCode = error.ErrorCode,
                Message = error.Message,
                Details = details,
                Explanation = ValidationExplanationService.ForProjectRule(
                    error.ErrorCode ?? "UNKNOWN",
                    error.Path,
                    null, // RuleExplanation - will be added when rules support it
                    details
                )
            });
        }
        
        return validationErrors;
    }
    
    public async Task<List<ValidationError>> FromCodeMasterErrorsAsync(List<CodeMasterValidationError> errors, string rawBundleJson, Bundle bundle, CancellationToken cancellationToken = default)
    {
        var validationErrors = new List<ValidationError>();
        
        // Parse raw JSON for navigation - DO NOT use POCO serialization
        JsonElement rawJson;
        try
        {
            var jsonDoc = JsonDocument.Parse(rawBundleJson);
            rawJson = jsonDoc.RootElement;
        }
        catch
        {
            // JSON parsing failed - continue without navigation
            rawJson = default;
        }
        
        foreach (var error in errors)
        {
            string? jsonPointer = null;
            if (rawJson.ValueKind != JsonValueKind.Undefined)
            {
                jsonPointer = await _navigationService.ResolvePathAsync(rawJson, bundle, error.Path, error.ResourceType, null, cancellationToken);
            }
            
            validationErrors.Add(new ValidationError
            {
                Source = "CodeMaster",
                Severity = error.Severity,
                ResourceType = error.ResourceType,
                Path = error.Path,
                JsonPointer = jsonPointer,
                ErrorCode = error.ErrorCode,
                Message = error.Message,
                Details = error.Details,
                Explanation = ValidationExplanationService.ForReference(
                    error.ErrorCode,
                    error.Path,
                    error.Details
                )
            });
        }
        
        return validationErrors;
    }
    
    public async Task<List<ValidationError>> FromReferenceErrorsAsync(List<ReferenceValidationError> errors, string rawBundleJson, Bundle bundle, CancellationToken cancellationToken = default)
    {
        var validationErrors = new List<ValidationError>();
        
        // Parse raw JSON for navigation - DO NOT use POCO serialization
        JsonElement rawJson;
        try
        {
            var jsonDoc = JsonDocument.Parse(rawBundleJson);
            rawJson = jsonDoc.RootElement;
        }
        catch
        {
            // JSON parsing failed - continue without navigation
            rawJson = default;
        }
        
        foreach (var error in errors)
        {
            string? jsonPointer = null;
            if (rawJson.ValueKind != JsonValueKind.Undefined)
            {
                jsonPointer = await _navigationService.ResolvePathAsync(rawJson, bundle, error.Path, error.ResourceType, error.EntryIndex, cancellationToken);
            }
            
            validationErrors.Add(new ValidationError
            {
                Source = "Reference",
                Severity = error.Severity,
                ResourceType = error.ResourceType,
                Path = error.Path,
                JsonPointer = jsonPointer,
                ErrorCode = error.ErrorCode,
                Message = error.Message,
                Details = error.Details,
                Explanation = ValidationExplanationService.ForReference(
                    error.ErrorCode,
                    error.Path,
                    error.Details
                )
            });
        }
        
        return validationErrors;
    }
    
    private string MapSeverity(OperationOutcome.IssueSeverity? severity)
    {
        return severity switch
        {
            OperationOutcome.IssueSeverity.Fatal => "error",
            OperationOutcome.IssueSeverity.Error => "error",
            OperationOutcome.IssueSeverity.Warning => "warning",
            OperationOutcome.IssueSeverity.Information => "info",
            _ => "error"
        };
    }
    
    /// <summary>
    /// Converts lint issues to unified validation errors.
    /// Lint errors are marked with source="LINT" and are advisory/best-effort.
    /// </summary>
    public async Task<List<ValidationError>> FromQualityFindingsAsync(
        IReadOnlyList<QualityFinding> findings,
        string? rawBundleJson,
        Bundle? bundle,
        CancellationToken cancellationToken = default)
    {
        var errors = new List<ValidationError>();
        
        // Parse raw JSON for navigation if available - DO NOT use POCO serialization
        JsonElement rawJson = default;
        if (!string.IsNullOrEmpty(rawBundleJson))
        {
            try
            {
                var jsonDoc = JsonDocument.Parse(rawBundleJson);
                rawJson = jsonDoc.RootElement;
            }
            catch
            {
                // JSON parsing failed - continue without navigation
            }
        }
        
        foreach (var issue in findings)
        {
            var error = new ValidationError
            {
                Source = "LINT", // Clearly marks this as best-effort lint check
                Severity = issue.Severity,
                ErrorCode = issue.RuleId,
                Message = issue.Message,
                ResourceType = issue.ResourceType,
                Path = issue.FhirPath,
                JsonPointer = issue.JsonPointer,
                Details = issue.Details ?? new Dictionary<string, object>(),
                Explanation = ValidationExplanationService.ForLint(issue.RuleId, issue.Message)
            };
            
            // Try to resolve navigation if we have raw JSON and a path
            if (rawJson.ValueKind != JsonValueKind.Undefined && !string.IsNullOrEmpty(issue.FhirPath))
            {
                try
                {
                    var jsonPointer = await _navigationService.ResolvePathAsync(
                        rawJson,
                        bundle,
                        issue.FhirPath,
                        issue.ResourceType,
                        null,
                        cancellationToken);
                    
                    // Update jsonPointer if resolved (QualityFinding may have precomputed one)
                    if (!string.IsNullOrEmpty(jsonPointer))
                    {
                        error.JsonPointer = jsonPointer;
                    }
                }
                catch
                {
                    // Navigation resolution failed - this is OK for lint errors
                    // They already have JsonPointer for basic location
                }
            }
            
            errors.Add(error);
        }
        
        return errors;
    }

    /// <summary>
    /// OBSOLETE: Use FromQualityFindingsAsync instead.
    /// Wrapper for backward compatibility during migration.
    /// </summary>
    [Obsolete("Use FromQualityFindingsAsync - clarifies that these findings are advisory, not blocking")]
    public async Task<List<ValidationError>> FromLintIssuesAsync(
        IReadOnlyList<LintIssue> lintIssues,
        string? rawBundleJson,
        Bundle? bundle,
        CancellationToken cancellationToken = default)
    {
        // LintIssue inherits from QualityFinding, safe to cast
        return await FromQualityFindingsAsync(lintIssues.Cast<QualityFinding>().ToList(), rawBundleJson, bundle, cancellationToken);
    }
    
    /// <summary>
    /// Converts spec hint issues to unified error format.
    /// METADATA-DRIVEN: Uses IsConditional flag from issue, no path-based inference.
    /// Spec hints are advisory and clearly marked as not enforced.
    /// </summary>
    public async Task<List<ValidationError>> FromSpecHintIssuesAsync(List<SpecHintIssue> issues, string rawBundleJson, Bundle? bundle, CancellationToken cancellationToken = default)
    {
        var errors = new List<ValidationError>();
        
        // Parse raw JSON for navigation - DO NOT use POCO serialization
        JsonElement rawJson;
        try
        {
            var jsonDoc = JsonDocument.Parse(rawBundleJson);
            rawJson = jsonDoc.RootElement;
        }
        catch
        {
            // JSON parsing failed - continue without navigation
            rawJson = default;
        }
        
        foreach (var issue in issues)
        {
            // METADATA-DRIVEN: Use IsConditional flag explicitly (no path parsing)
            bool isConditional = issue.IsConditional;
            
            var error = new ValidationError
            {
                Source = "SPEC_HINT",
                Severity = issue.Severity,
                ResourceType = issue.ResourceType,
                Path = issue.Path,
                JsonPointer = issue.JsonPointer,
                ErrorCode = isConditional ? "SPEC_REQUIRED_CONDITIONAL" : "MISSING_REQUIRED_FIELD",
                Message = $"{issue.Reason} This is advisory only and does not block validation.",
                Details = new Dictionary<string, object>
                {
                    ["reason"] = issue.Reason,
                    ["advisory"] = true,
                    ["source"] = "HL7",
                    ["isConditional"] = isConditional,
                    ["appliesToEach"] = issue.AppliesToEach
                },
                Explanation = ValidationExplanationService.ForSpecHint(issue.Reason, issue.Path)
            };
            
            // Add condition to details if present
            if (!string.IsNullOrWhiteSpace(issue.Condition))
            {
                error.Details["condition"] = issue.Condition;
            }
            
            // Add navigation context using raw JSON
            // SPEC_HINT FIX: If issue already has jsonPointer (instance-scoped), preserve it
            // Only resolve navigation if jsonPointer is missing
            if (string.IsNullOrEmpty(issue.JsonPointer) && 
                rawJson.ValueKind != JsonValueKind.Undefined && 
                !string.IsNullOrEmpty(issue.Path))
            {
                try
                {
                    var jsonPointer = await _navigationService.ResolvePathAsync(
                        rawJson, 
                        bundle,
                        issue.Path, 
                        issue.ResourceType, 
                        null,
                        cancellationToken);
                    
                    // Update jsonPointer if resolved
                    if (!string.IsNullOrEmpty(jsonPointer))
                    {
                        error.JsonPointer = jsonPointer;
                    }
                }
                catch
                {
                    // Navigation resolution failed - this is OK
                    // Spec hints already have JsonPointer for basic location
                }
            }
            
            errors.Add(error);
        }
        
        return errors;
    }
    
    private string? ExtractResourceType(string? path)
    {
        if (string.IsNullOrEmpty(path))
            return null;
        
        // Extract resource type from path like "Bundle.entry[2].resource.Observation.code"
        var segments = path.Split('.');
        foreach (var segment in segments)
        {
            if (segment.Length > 0 && char.IsUpper(segment[0]) && segment != "Bundle")
            {
                return segment.Split('[')[0];
            }
        }
        
        return null;
    }
    
    /// <summary>
    /// Extracts the field name from a path for clearer error messaging.
    /// Example: "Patient.communication[2].language" → "language"
    /// </summary>
    private string GetFieldName(string path)
    {
        if (string.IsNullOrEmpty(path))
            return path;
        
        // Get last segment after last dot
        var lastDotIndex = path.LastIndexOf('.');
        if (lastDotIndex >= 0 && lastDotIndex < path.Length - 1)
        {
            return path.Substring(lastDotIndex + 1);
        }
        
        return path;
    }
}