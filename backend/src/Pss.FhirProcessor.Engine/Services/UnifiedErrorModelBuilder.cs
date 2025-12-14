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
        // If error already has navigation, return as-is
        if (error.Navigation != null)
            return error;
        
        // Try to add navigation context if we have a path and the bundle is parseable
        if (!string.IsNullOrEmpty(error.Path) && !string.IsNullOrEmpty(rawBundleJson))
        {
            try
            {
                // Attempt to parse bundle for navigation context
                // If this fails, we just return the error without navigation
                var parser = new Hl7.Fhir.Serialization.FhirJsonParser();
                var bundle = parser.Parse<Bundle>(rawBundleJson);
                
                if (bundle != null)
                {
                    var navigation = await _navigationService.ResolvePathAsync(
                        bundle, 
                        error.Path, 
                        error.ResourceType, 
                        cancellationToken);
                    
                    error.Navigation = navigation;
                    
                    // Update JsonPointer if navigation provided one
                    if (!string.IsNullOrEmpty(navigation?.JsonPointer))
                    {
                        error.JsonPointer = navigation.JsonPointer;
                    }
                }
            }
            catch
            {
                // Parsing failed - this is expected for deserialization errors
                // Just return the error without navigation enhancement
            }
        }
        
        return error;
    }
    
    public async Task<List<ValidationError>> FromFirelyIssuesAsync(OperationOutcome outcome, Bundle? bundle, CancellationToken cancellationToken = default)
    {
        var errors = new List<ValidationError>();
        
        if (outcome?.Issue == null)
            return errors;
        
        foreach (var issue in outcome.Issue)
        {
            // Skip informational messages about successful validation
            if (issue.Severity == OperationOutcome.IssueSeverity.Information && 
                (issue.Diagnostics?.Contains("passed") == true || 
                 issue.Diagnostics?.Contains("no issues") == true))
                continue;
            
            var path = issue.Expression?.FirstOrDefault() ?? issue.Location?.FirstOrDefault();
            
            // Try to resolve navigation if bundle is available
            // If bundle is null (structural validation before POCO parsing), navigation will be null
            NavigationInfo? navigation = null;
            if (bundle != null && path != null)
            {
                try
                {
                    navigation = await _navigationService.ResolvePathAsync(bundle, path, null, cancellationToken);
                }
                catch
                {
                    // Navigation resolution failed - this is ok, we'll just have no navigation info
                }
            }
            
            errors.Add(new ValidationError
            {
                Source = "FHIR",
                Severity = MapSeverity(issue.Severity),
                ResourceType = ExtractResourceType(path),
                Path = path,
                JsonPointer = navigation?.JsonPointer,
                ErrorCode = issue.Code?.ToString()?.ToUpperInvariant()?.Replace("-", "_"),
                Message = issue.Diagnostics ?? issue.Details?.Text ?? "FHIR validation error",
                Details = new Dictionary<string, object>
                {
                    ["issueType"] = issue.Code?.ToString() ?? "Unknown",
                    ["severity"] = issue.Severity?.ToString() ?? "Unknown"
                },
                Navigation = navigation
            });
        }
        
        return errors;
    }
    
    public async Task<List<ValidationError>> FromRuleErrorsAsync(List<RuleValidationError> errors, Bundle bundle, CancellationToken cancellationToken = default)
    {
        var validationErrors = new List<ValidationError>();
        
        foreach (var error in errors)
        {
            var navigation = await _navigationService.ResolvePathAsync(bundle, error.Path, error.ResourceType, cancellationToken);
            
            validationErrors.Add(new ValidationError
            {
                Source = "Business",
                Severity = error.Severity,
                ResourceType = error.ResourceType,
                Path = error.Path,
                JsonPointer = navigation?.JsonPointer,
                ErrorCode = error.ErrorCode,
                Message = error.Message,
                Details = error.Details,
                Navigation = navigation
            });
        }
        
        return validationErrors;
    }
    
    public async Task<List<ValidationError>> FromCodeMasterErrorsAsync(List<CodeMasterValidationError> errors, Bundle bundle, CancellationToken cancellationToken = default)
    {
        var validationErrors = new List<ValidationError>();
        
        foreach (var error in errors)
        {
            var navigation = await _navigationService.ResolvePathAsync(bundle, error.Path, error.ResourceType, cancellationToken);
            
            validationErrors.Add(new ValidationError
            {
                Source = "CodeMaster",
                Severity = error.Severity,
                ResourceType = error.ResourceType,
                Path = error.Path,
                JsonPointer = navigation?.JsonPointer,
                ErrorCode = error.ErrorCode,
                Message = error.Message,
                Details = error.Details,
                Navigation = navigation
            });
        }
        
        return validationErrors;
    }
    
    public async Task<List<ValidationError>> FromReferenceErrorsAsync(List<ReferenceValidationError> errors, Bundle bundle, CancellationToken cancellationToken = default)
    {
        var validationErrors = new List<ValidationError>();
        
        foreach (var error in errors)
        {
            var navigation = await _navigationService.ResolvePathAsync(bundle, error.Path, error.ResourceType, cancellationToken);
            
            validationErrors.Add(new ValidationError
            {
                Source = "Reference",
                Severity = error.Severity,
                ResourceType = error.ResourceType,
                Path = error.Path,
                JsonPointer = navigation?.JsonPointer,
                ErrorCode = error.ErrorCode,
                Message = error.Message,
                Details = error.Details,
                Navigation = navigation
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
    public async Task<List<ValidationError>> FromLintIssuesAsync(
        IReadOnlyList<LintIssue> lintIssues,
        Bundle? bundle,
        CancellationToken cancellationToken = default)
    {
        var errors = new List<ValidationError>();
        
        foreach (var issue in lintIssues)
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
                Details = issue.Details ?? new Dictionary<string, object>()
            };
            
            // Try to resolve navigation if we have a bundle and a path
            if (bundle != null && !string.IsNullOrEmpty(issue.FhirPath))
            {
                try
                {
                    var navigation = await _navigationService.ResolvePathAsync(
                        bundle,
                        issue.FhirPath,
                        issue.ResourceType,
                        cancellationToken);
                    
                    error.Navigation = navigation;
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
}