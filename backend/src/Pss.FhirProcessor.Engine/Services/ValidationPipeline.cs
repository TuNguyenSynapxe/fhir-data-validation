using System.Diagnostics;
using System.Text.Json;
using Hl7.Fhir.Model;
using Hl7.Fhir.Serialization;
using Pss.FhirProcessor.Engine.Models;
using Pss.FhirProcessor.Engine.Interfaces;

namespace Pss.FhirProcessor.Engine.Services;

/// <summary>
/// Orchestrates the complete validation pipeline as defined in docs/05_validation_pipeline.md
/// </summary>
public class ValidationPipeline : IValidationPipeline
{
    private readonly IFirelyValidationService _firelyService;
    private readonly IFhirPathRuleEngine _ruleEngine;
    private readonly ICodeMasterEngine _codeMasterEngine;
    private readonly IReferenceResolver _referenceResolver;
    private readonly IUnifiedErrorModelBuilder _errorBuilder;
    
    public ValidationPipeline(
        IFirelyValidationService firelyService,
        IFhirPathRuleEngine ruleEngine,
        ICodeMasterEngine codeMasterEngine,
        IReferenceResolver referenceResolver,
        IUnifiedErrorModelBuilder errorBuilder)
    {
        _firelyService = firelyService;
        _ruleEngine = ruleEngine;
        _codeMasterEngine = codeMasterEngine;
        _referenceResolver = referenceResolver;
        _errorBuilder = errorBuilder;
    }
    
    public async Task<ValidationResponse> ValidateAsync(ValidationRequest request, CancellationToken cancellationToken = default)
    {
        var stopwatch = Stopwatch.StartNew();
        var response = new ValidationResponse
        {
            Metadata = new ValidationMetadata
            {
                FhirVersion = request.FhirVersion
            }
        };
        
        try
        {
            // Step 1: Input Parsing
            Bundle? bundle;
            try
            {
                bundle = ParseBundle(request.BundleJson);
                if (bundle == null)
                {
                    response.Errors.Add(new ValidationError
                    {
                        Source = "FHIR",
                        Severity = "error",
                        ErrorCode = "INVALID_BUNDLE",
                        Message = "Failed to parse FHIR Bundle - bundle is null or empty"
                    });
                    
                    FinalizeSummary(response, stopwatch);
                    return response;
                }
            }
            catch (Exception parseEx)
            {
                response.Errors.Add(new ValidationError
                {
                    Source = "FHIR",
                    Severity = "error",
                    ErrorCode = "BUNDLE_PARSE_ERROR",
                    Message = $"Failed to parse FHIR Bundle: {parseEx.Message}",
                    Details = new Dictionary<string, object>
                    {
                        ["exception"] = parseEx.ToString()
                    }
                });
                
                FinalizeSummary(response, stopwatch);
                return response;
            }
            
            var ruleSet = ParseRuleSet(request.RulesJson);
            var codeMaster = ParseCodeMaster(request.CodeMasterJson);
            
            if (ruleSet != null)
            {
                response.Metadata.RulesVersion = ruleSet.Version;
            }
            
            // Step 2: Firely Structural Validation
            var firelyOutcome = await _firelyService.ValidateAsync(bundle, request.FhirVersion, cancellationToken);
            var firelyErrors = await _errorBuilder.FromFirelyIssuesAsync(firelyOutcome, bundle, cancellationToken);
            response.Errors.AddRange(firelyErrors);
            
            // Step 3: Business Rule Validation (FHIRPath)
            if (ruleSet?.Rules != null && ruleSet.Rules.Any())
            {
                var ruleErrors = await _ruleEngine.ValidateAsync(bundle, ruleSet, cancellationToken);
                var businessErrors = await _errorBuilder.FromRuleErrorsAsync(ruleErrors, bundle, cancellationToken);
                response.Errors.AddRange(businessErrors);
            }
            
            // Step 4: CodeMaster Validation
            if (codeMaster?.ScreeningTypes != null && codeMaster.ScreeningTypes.Any())
            {
                var codeMasterErrors = await _codeMasterEngine.ValidateAsync(bundle, codeMaster, cancellationToken);
                var cmErrors = await _errorBuilder.FromCodeMasterErrorsAsync(codeMasterErrors, bundle, cancellationToken);
                response.Errors.AddRange(cmErrors);
            }
            
            // Step 5: Reference Validation
            var referenceErrors = await _referenceResolver.ValidateAsync(bundle, cancellationToken);
            var refErrors = await _errorBuilder.FromReferenceErrorsAsync(referenceErrors, bundle, cancellationToken);
            response.Errors.AddRange(refErrors);
            
            // Steps 6-8: Error aggregation, navigation mapping, and unified model assembly
            // (Already done in error builder methods above)
            
            // Finalize summary
            FinalizeSummary(response, stopwatch);
        }
        catch (Exception ex)
        {
            response.Errors.Add(new ValidationError
            {
                Source = "FHIR",
                Severity = "error",
                ErrorCode = "PIPELINE_ERROR",
                Message = $"Validation pipeline error: {ex.Message}",
                Details = new Dictionary<string, object>
                {
                    ["exception"] = ex.ToString()
                }
            });
            
            FinalizeSummary(response, stopwatch);
        }
        
        return response;
    }
    
    private Bundle? ParseBundle(string bundleJson)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(bundleJson))
                return null;
            
            var parser = new FhirJsonParser();
            return parser.Parse<Bundle>(bundleJson);
        }
        catch (Exception ex)
        {
            // Log the actual parsing error for debugging
            Console.WriteLine($"Bundle parsing error: {ex.Message}");
            return null;
        }
    }
    
    private RuleSet? ParseRuleSet(string? rulesJson)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(rulesJson))
                return null;
            
            return JsonSerializer.Deserialize<RuleSet>(rulesJson, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });
        }
        catch
        {
            return null;
        }
    }
    
    private CodeMasterDefinition? ParseCodeMaster(string? codeMasterJson)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(codeMasterJson))
                return null;
            
            return JsonSerializer.Deserialize<CodeMasterDefinition>(codeMasterJson, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });
        }
        catch
        {
            return null;
        }
    }
    
    private void FinalizeSummary(ValidationResponse response, Stopwatch stopwatch)
    {
        stopwatch.Stop();
        response.Metadata.ProcessingTimeMs = stopwatch.ElapsedMilliseconds;
        
        response.Summary.TotalErrors = response.Errors.Count;
        response.Summary.ErrorCount = response.Errors.Count(e => e.Severity == "error");
        response.Summary.WarningCount = response.Errors.Count(e => e.Severity == "warning");
        response.Summary.InfoCount = response.Errors.Count(e => e.Severity == "info");
        
        response.Summary.FhirErrorCount = response.Errors.Count(e => e.Source == "FHIR");
        response.Summary.BusinessErrorCount = response.Errors.Count(e => e.Source == "Business");
        response.Summary.CodeMasterErrorCount = response.Errors.Count(e => e.Source == "CodeMaster");
        response.Summary.ReferenceErrorCount = response.Errors.Count(e => e.Source == "Reference");
    }
}