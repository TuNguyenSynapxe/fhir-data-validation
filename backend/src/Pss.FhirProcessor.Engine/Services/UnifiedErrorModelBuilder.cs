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
    
    public async Task<List<ValidationError>> FromFirelyIssuesAsync(OperationOutcome outcome, Bundle bundle, CancellationToken cancellationToken = default)
    {
        var errors = new List<ValidationError>();
        
        if (outcome?.Issue == null)
            return errors;
        
        foreach (var issue in outcome.Issue)
        {
            // Skip informational messages unless it's an actual validation issue
            if (issue.Severity == OperationOutcome.IssueSeverity.Information && 
                issue.Diagnostics?.Contains("passed") == true)
                continue;
            
            var path = issue.Expression?.FirstOrDefault() ?? issue.Location?.FirstOrDefault();
            var navigation = path != null 
                ? await _navigationService.ResolvePathAsync(bundle, path, null, cancellationToken)
                : null;
            
            errors.Add(new ValidationError
            {
                Source = "FHIR",
                Severity = MapSeverity(issue.Severity),
                ResourceType = ExtractResourceType(path),
                Path = path,
                JsonPointer = navigation?.JsonPointer,
                ErrorCode = issue.Code?.ToString()?.ToUpperInvariant(),
                Message = issue.Diagnostics ?? issue.Details?.Text ?? "FHIR validation error",
                Details = new Dictionary<string, object>
                {
                    ["issueType"] = issue.Code?.ToString() ?? "Unknown"
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