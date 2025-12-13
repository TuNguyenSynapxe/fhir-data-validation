using System.Diagnostics;
using System.Text.Json;
using Hl7.Fhir.Model;
using Hl7.Fhir.Serialization;
using Pss.FhirProcessor.Engine.Models;
using Pss.FhirProcessor.Engine.Interfaces;
using Hl7.Fhir.Utility;

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
            // Step 1: Basic JSON validation (not FHIR structural)
            // Check for empty/null input and valid JSON syntax only
            var jsonValidation = ValidateBasicJson(request.BundleJson);
            if (!jsonValidation.IsValid)
            {
                response.Errors.AddRange(jsonValidation.Errors);
                FinalizeSummary(response, stopwatch);
                return response;
            }
            
            // Step 2: Firely Structural Validation (node-based, collects ALL issues)
            // This uses node-based validation to collect all structural issues without fail-fast
            // Pass raw JSON to avoid POCO deserialization issues
            var firelyOutcome = await _firelyService.ValidateAsync(request.BundleJson, request.FhirVersion, cancellationToken);
            var firelyErrors = await _errorBuilder.FromFirelyIssuesAsync(firelyOutcome, null, cancellationToken);
            response.Errors.AddRange(firelyErrors);
            
            // Step 3: Parse to POCO Bundle for business rule processing
            // Only parse if we need to run business rules, CodeMaster, or reference validation
            // If Firely found critical structural errors, we still continue to collect all errors
            Bundle? bundle = null;
            var ruleSet = ParseRuleSet(request.RulesJson);
            var codeMaster = ParseCodeMaster(request.CodeMasterJson);
            
            if (ruleSet != null)
            {
                response.Metadata.RulesVersion = ruleSet.Version;
            }
            
            // Try to parse bundle for downstream validation
            // If parsing fails here, we've already captured structural issues from Firely
            var bundleParseResult = ParseBundleWithContext(request.BundleJson);
            if (bundleParseResult.Success)
            {
                bundle = bundleParseResult.Bundle;
            }
            else
            {
                // Bundle couldn't be parsed to POCO - this is expected if there are structural errors
                // We've already collected Firely issues above, so we can't run business rules
                // Just log and continue
                Console.WriteLine($"Bundle POCO parsing failed (expected if structural errors exist): {bundleParseResult.Errors.FirstOrDefault()?.Message}");
            }
            
            // Step 4: Business Rule Validation (FHIRPath)
            // Only run if bundle was successfully parsed
            if (bundle != null && ruleSet?.Rules != null && ruleSet.Rules.Any())
            {
                var ruleErrors = await _ruleEngine.ValidateAsync(bundle, ruleSet, cancellationToken);
                var businessErrors = await _errorBuilder.FromRuleErrorsAsync(ruleErrors, bundle, cancellationToken);
                response.Errors.AddRange(businessErrors);
            }
            
            // Step 5: CodeMaster Validation
            // Only run if bundle was successfully parsed
            if (bundle != null && codeMaster?.ScreeningTypes != null && codeMaster.ScreeningTypes.Any())
            {
                var codeMasterErrors = await _codeMasterEngine.ValidateAsync(bundle, codeMaster, cancellationToken);
                var cmErrors = await _errorBuilder.FromCodeMasterErrorsAsync(codeMasterErrors, bundle, cancellationToken);
                response.Errors.AddRange(cmErrors);
            }
            
            // Step 6: Reference Validation
            // Only run if bundle was successfully parsed
            if (bundle != null)
            {
                var referenceErrors = await _referenceResolver.ValidateAsync(bundle, cancellationToken);
                var refErrors = await _errorBuilder.FromReferenceErrorsAsync(referenceErrors, bundle, cancellationToken);
                response.Errors.AddRange(refErrors);
            }
            
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
    
    /// <summary>
    /// Parses FHIR Bundle with detailed error context
    /// Distinguishes between empty input, JSON errors, and Firely deserialization errors
    /// </summary>
    private BundleParseResult ParseBundleWithContext(string bundleJson)
    {
        var result = new BundleParseResult { Success = false, Errors = new List<ValidationError>() };
        
        // Check 1: Empty or null input
        if (string.IsNullOrWhiteSpace(bundleJson))
        {
            result.Errors.Add(new ValidationError
            {
                Source = "FHIR",
                Severity = "error",
                ErrorCode = "INVALID_BUNDLE",
                Message = "Bundle JSON is null or empty. Please provide a valid FHIR Bundle.",
                Details = new Dictionary<string, object>
                {
                    ["reason"] = "NullOrEmpty"
                }
            });
            return result;
        }
        
        // Check 2: Valid JSON syntax
        try
        {
            using var jsonDoc = JsonDocument.Parse(bundleJson);
            // JSON is syntactically valid, continue to Firely parsing
        }
        catch (JsonException jsonEx)
        {
            result.Errors.Add(new ValidationError
            {
                Source = "FHIR",
                Severity = "error",
                ErrorCode = "INVALID_JSON",
                Message = $"Invalid JSON syntax: {jsonEx.Message}",
                Details = new Dictionary<string, object>
                {
                    ["lineNumber"] = jsonEx.LineNumber?.ToString() ?? "unknown",
                    ["bytePosition"] = jsonEx.BytePositionInLine?.ToString() ?? "unknown",
                    ["exceptionType"] = jsonEx.GetType().Name
                }
            });
            return result;
        }
        
        // Check 3: Firely POCO deserialization
        // This is where enum errors, type mismatches, and structural issues are caught
        try
        {
            var parser = new FhirJsonParser();
            var bundle = parser.Parse<Bundle>(bundleJson);
            
            if (bundle == null)
            {
                result.Errors.Add(new ValidationError
                {
                    Source = "FHIR",
                    Severity = "error",
                    ErrorCode = "INVALID_BUNDLE",
                    Message = "Failed to deserialize FHIR Bundle - parser returned null.",
                    Details = new Dictionary<string, object>
                    {
                        ["reason"] = "ParserReturnedNull"
                    }
                });
                return result;
            }
            
            // Success!
            result.Success = true;
            result.Bundle = bundle;
            return result;
        }
        catch (Exception firelyEx)
        {
            // This catches Firely-specific errors like:
            // - Invalid enum values (e.g., "completed" for Encounter.status)
            // - Unknown elements
            // - Type mismatches
            // - Mandatory fields missing
            
            // Use our mapper to extract detailed context
            var detailedError = FirelyExceptionMapper.MapToValidationError(firelyEx, bundleJson);
            result.Errors.Add(detailedError);
            
            // Also log for debugging
            Console.WriteLine($"Firely deserialization error: {firelyEx.GetType().Name}: {firelyEx.Message}");
            
            return result;
        }
    }
    
    /// <summary>
    /// Validates basic JSON syntax (not FHIR structural)
    /// Only checks for empty/null input and JSON syntax errors
    /// </summary>
    private JsonValidationResult ValidateBasicJson(string? json)
    {
        var result = new JsonValidationResult { IsValid = false, Errors = new List<ValidationError>() };
        
        // Check 1: Empty or null input
        if (string.IsNullOrWhiteSpace(json))
        {
            result.Errors.Add(new ValidationError
            {
                Source = "FHIR",
                Severity = "error",
                ErrorCode = "EMPTY_BUNDLE",
                Message = "Bundle JSON is null or empty. Please provide a valid FHIR Bundle.",
                Details = new Dictionary<string, object>
                {
                    ["reason"] = "NullOrEmpty"
                }
            });
            return result;
        }
        
        // Check 2: Valid JSON syntax
        try
        {
            using var jsonDoc = JsonDocument.Parse(json);
            // JSON is syntactically valid
            result.IsValid = true;
            return result;
        }
        catch (JsonException jsonEx)
        {
            result.Errors.Add(new ValidationError
            {
                Source = "FHIR",
                Severity = "error",
                ErrorCode = "INVALID_JSON",
                Message = $"Invalid JSON syntax: {jsonEx.Message}",
                Details = new Dictionary<string, object>
                {
                    ["lineNumber"] = jsonEx.LineNumber?.ToString() ?? "unknown",
                    ["bytePosition"] = jsonEx.BytePositionInLine?.ToString() ?? "unknown",
                    ["exceptionType"] = jsonEx.GetType().Name
                }
            });
            return result;
        }
    }
    
    /// <summary>
    /// Result of basic JSON validation
    /// </summary>
    private class JsonValidationResult
    {
        public bool IsValid { get; set; }
        public List<ValidationError> Errors { get; set; } = new();
    }
    
    /// <summary>
    /// Result of bundle parsing with detailed error context
    /// </summary>
    private class BundleParseResult
    {
        public bool Success { get; set; }
        public Bundle? Bundle { get; set; }
        public List<ValidationError> Errors { get; set; } = new();
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