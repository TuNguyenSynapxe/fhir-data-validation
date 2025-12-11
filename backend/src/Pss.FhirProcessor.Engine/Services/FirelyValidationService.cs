using Hl7.Fhir.Model;
using Hl7.Fhir.Specification.Source;
using Hl7.Fhir.Validation;
using Pss.FhirProcessor.Engine.Interfaces;

namespace Pss.FhirProcessor.Engine.Services;

/// <summary>
/// Performs FHIR structural validation using Firely SDK
/// Does NOT handle business rules - only FHIR structural correctness
/// </summary>
public class FirelyValidationService : IFirelyValidationService
{
    public async Task<OperationOutcome> ValidateAsync(Bundle bundle, string fhirVersion, CancellationToken cancellationToken = default)
    {
        try
        {
            // Initialize Firely validator with base FHIR specification
            var source = ZipSource.CreateValidationSource();
            var settings = ValidationSettings.CreateDefault();
            settings.ResourceResolver = source;
            settings.GenerateSnapshot = true;
            settings.ResolveExternalReferences = false;
            
            var validator = new Validator(settings);
            
            // Validate the bundle structure
            var result = validator.Validate(bundle);
            
            // Convert validation result to OperationOutcome
            var outcome = new OperationOutcome();
            
            if (result.Issue == null || result.Issue.Count == 0)
            {
                outcome.Issue.Add(new OperationOutcome.IssueComponent
                {
                    Severity = OperationOutcome.IssueSeverity.Information,
                    Code = OperationOutcome.IssueType.Informational,
                    Diagnostics = "FHIR structural validation passed"
                });
            }
            else
            {
                // Add all validation issues
                foreach (var issue in result.Issue)
                {
                    outcome.Issue.Add(new OperationOutcome.IssueComponent
                    {
                        Severity = MapSeverity(issue.Severity),
                        Code = MapIssueType(issue.Code),
                        Diagnostics = issue.Details?.Text ?? issue.Diagnostics,
                        Expression = issue.Expression,
                        Location = issue.Location
                    });
                }
            }
            
            return await System.Threading.Tasks.Task.FromResult(outcome);
        }
        catch (Exception ex)
        {
            // Return error as OperationOutcome
            var outcome = new OperationOutcome();
            outcome.Issue.Add(new OperationOutcome.IssueComponent
            {
                Severity = OperationOutcome.IssueSeverity.Fatal,
                Code = OperationOutcome.IssueType.Exception,
                Diagnostics = $"Firely validation error: {ex.Message}"
            });
            return outcome;
        }
    }
    
    private static OperationOutcome.IssueSeverity MapSeverity(OperationOutcome.IssueSeverity? severity)
    {
        return severity ?? OperationOutcome.IssueSeverity.Error;
    }
    
    private static OperationOutcome.IssueType MapIssueType(OperationOutcome.IssueType? code)
    {
        return code ?? OperationOutcome.IssueType.Unknown;
    }
}