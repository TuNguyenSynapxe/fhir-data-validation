using System.Diagnostics;
using System.Text.Json;
using Hl7.Fhir.Model;
using Hl7.Fhir.Serialization;
using Microsoft.Extensions.Logging;
using Pss.FhirProcessor.Engine.Models;
using Pss.FhirProcessor.Engine.Interfaces;
using Hl7.Fhir.Utility;
using Pss.FhirProcessor.Engine.Validation.QuestionAnswer;

namespace Pss.FhirProcessor.Engine.Services;

/// <summary>
/// Orchestrates the complete validation pipeline as defined in docs/05_validation_pipeline.md
/// Pipeline: JSON sanity → Lint (best-effort) → SPEC_HINT (advisory, debug only) → Firely (authoritative) → Business Rules → CodeMaster → References
/// </summary>
public class ValidationPipeline : IValidationPipeline
{
    private readonly ILintValidationService _lintService;
    private readonly ISpecHintService _specHintService;
    private readonly IFirelyValidationService _firelyService;
    private readonly IFhirPathRuleEngine _ruleEngine;
    private readonly ICodeMasterEngine _codeMasterEngine;
    private readonly IReferenceResolver _referenceResolver;
    private readonly IUnifiedErrorModelBuilder _errorBuilder;
    private readonly ISystemRuleSuggestionService _suggestionService;
    private readonly QuestionAnswerValidator? _questionAnswerValidator;
    private readonly ILogger<ValidationPipeline> _logger;
    
    public ValidationPipeline(
        ILintValidationService lintService,
        ISpecHintService specHintService,
        IFirelyValidationService firelyService,
        IFhirPathRuleEngine ruleEngine,
        ICodeMasterEngine codeMasterEngine,
        IReferenceResolver referenceResolver,
        IUnifiedErrorModelBuilder errorBuilder,
        ISystemRuleSuggestionService suggestionService,
        ILogger<ValidationPipeline> logger,
        QuestionAnswerValidator? questionAnswerValidator = null)
    {
        _lintService = lintService;
        _specHintService = specHintService;
        _firelyService = firelyService;
        _ruleEngine = ruleEngine;
        _codeMasterEngine = codeMasterEngine;
        _referenceResolver = referenceResolver;
        _errorBuilder = errorBuilder;
        _suggestionService = suggestionService;
        _questionAnswerValidator = questionAnswerValidator;
        _logger = logger;
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
            // Step 0: Basic JSON validation (not FHIR structural)
            // Check for empty/null input and valid JSON syntax only
            var jsonValidation = ValidateBasicJson(request.BundleJson);
            if (!jsonValidation.IsValid)
            {
                response.Errors.AddRange(jsonValidation.Errors);
                FinalizeSummary(response, stopwatch);
                return response;
            }
            
            // Step 1: Lint Validation (advisory quality checks)
            // ONLY runs in "full" analysis mode
            // Does NOT block Firely validation - all lint errors are advisory
            var validationMode = request.ValidationMode ?? "standard";
            // Support both new (standard/full) and legacy (fast/debug) mode names
            var isFullAnalysis = validationMode.Equals("full", StringComparison.OrdinalIgnoreCase) || 
                               validationMode.Equals("debug", StringComparison.OrdinalIgnoreCase);
            var shouldRunLint = isFullAnalysis;
            
            _logger.LogDebug("Validation mode: {ValidationMode}, Lint enabled: {LintEnabled}", validationMode, shouldRunLint);
            
            if (shouldRunLint)
            {
                _logger.LogDebug("Running Lint validation in full analysis mode");
                var lintIssues = await _lintService.ValidateAsync(request.BundleJson, request.FhirVersion, cancellationToken);
                var lintErrors = await _errorBuilder.FromQualityFindingsAsync(lintIssues, null, cancellationToken);
                _logger.LogInformation("Lint validation completed: {IssueCount} issues found", lintErrors.Count);
                response.Errors.AddRange(lintErrors);
            }
            
            // Step 1.5: SPEC_HINT - Advisory HL7 Required Field Hints (full analysis mode only)
            // Surfaces HL7 FHIR required field guidance without enforcing validation
            // Does NOT block validation, does NOT overlap with Firely
            // Only checks for missing HL7-mandated fields to help developers
            // JSON-BASED: ALWAYS runs, even when Firely parsing fails
            _logger.LogInformation("=== SPECHINT CHECKPOINT 1: ValidationMode={Mode}, IsFullAnalysis={IsFullAnalysis}", 
                validationMode, isFullAnalysis);
            
            if (isFullAnalysis)
            {
                _logger.LogInformation("=== SPECHINT CHECKPOINT 2: Starting JSON-based SpecHint validation");
                
                // Parse bundle for optional POCO-based advanced hints
                // This is OPTIONAL - SpecHint will run with JSON-only if this fails
                var earlyParseResult = ParseBundleWithContext(request.BundleJson);
                _logger.LogInformation("=== SPECHINT CHECKPOINT 3: Early parse result - Success={Success}, HasBundle={HasBundle}", 
                    earlyParseResult.Success, earlyParseResult.Bundle != null);
                
                // ALWAYS call SpecHint with JSON, pass POCO only if available
                Bundle? bundlePoco = earlyParseResult.Success ? earlyParseResult.Bundle : null;
                _logger.LogInformation("=== SPECHINT CHECKPOINT 4: Calling SpecHintService.CheckAsync (POCO available: {HasPoco})", 
                    bundlePoco != null);
                
                var specHintIssues = await _specHintService.CheckAsync(request.BundleJson, request.FhirVersion, bundlePoco, cancellationToken);
                _logger.LogInformation("=== SPECHINT CHECKPOINT 5: SpecHint check completed: {IssueCount} issues found", specHintIssues.Count);
                
                if (specHintIssues.Any())
                {
                    _logger.LogInformation("=== SPECHINT CHECKPOINT 6: Building error models for {IssueCount} spec hint issues", specHintIssues.Count);
                    var specHintErrors = await _errorBuilder.FromSpecHintIssuesAsync(specHintIssues, bundlePoco, cancellationToken);
                    response.Errors.AddRange(specHintErrors);
                }
            }
            else
            {
                _logger.LogInformation("=== SPECHINT CHECKPOINT X: Not in full analysis mode (mode={Mode}), skipping SpecHint", validationMode);
            }
            
            // Step 2: Firely Structural Validation (authoritative)
            // This is the source of truth for FHIR compliance
            // Uses node-based validation to collect structural issues
            var firelyOutcome = await _firelyService.ValidateAsync(request.BundleJson, request.FhirVersion, cancellationToken);
            var firelyErrors = await _errorBuilder.FromFirelyIssuesAsync(firelyOutcome, null, cancellationToken);
            response.Errors.AddRange(firelyErrors);
            
            var firelyErrorCount = firelyErrors.Count(e => e.Source == "FHIR" && e.Severity == "error");
            _logger.LogInformation("Firely validation completed: {ErrorCount} structural errors found", firelyErrorCount);
            
            // Note: Removed fallback lint check - Lint only runs in full analysis mode
            // In standard mode, only Firely structural validation, business rules, and reference validation run
            
            // Step 3: Parse to POCO Bundle for business rule processing
            // Even if Firely found structural errors, we still attempt parsing to get as many errors as possible
            // Use lenient parser to maximize success rate
            Bundle? bundle = null;
            var ruleSet = ParseRuleSet(request.RulesJson);
            var codeMaster = ParseCodeMaster(request.CodeMasterJson);
            
            if (ruleSet != null)
            {
                response.Metadata.RulesVersion = ruleSet.Version;
            }
            
            // Try to parse bundle for downstream validation
            // Use lenient parsing with error suppression to maximize parsing success
            var bundleParseResult = ParseBundleWithContext(request.BundleJson);
            if (bundleParseResult.Success)
            {
                bundle = bundleParseResult.Bundle;
            }
            else
            {
                // Bundle couldn't be parsed to POCO
                // Try even more lenient parsing by wrapping in try-catch and ignoring all errors
                try
                {
                    var parser = new FhirJsonParser(new ParserSettings
                    {
                        AcceptUnknownMembers = true,
                        AllowUnrecognizedEnums = true,
                        PermissiveParsing = true
                    });
                    bundle = parser.Parse<Bundle>(request.BundleJson);
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Even lenient Bundle parsing failed: {ex.Message}");
                    // Continue without bundle - we've already captured Firely structural errors
                }
            }
            
            // Step 4: Business Rule Validation (FHIRPath)
            // CRITICAL: Always attempt to run business rules even if Firely failed
            // This ensures users get all possible errors in one validation run
            if (ruleSet?.Rules != null && ruleSet.Rules.Any())
            {
                try
                {
                    if (bundle != null)
                    {
                        // Use POCO-based validation (preferred, more complete)
                        var ruleErrors = await _ruleEngine.ValidateAsync(bundle, ruleSet, cancellationToken);
                        var businessErrors = await _errorBuilder.FromRuleErrorsAsync(ruleErrors, bundle, cancellationToken);
                        response.Errors.AddRange(businessErrors);
                    }
                    else
                    {
                        // Fallback: Use JSON-based validation with ITypedElement
                        // This works even when POCO parsing fails due to structural errors
                        Console.WriteLine("Using JSON fallback for business rule validation");
                        var ruleErrors = await _ruleEngine.ValidateJsonAsync(request.BundleJson, ruleSet, cancellationToken);
                        var businessErrors = await _errorBuilder.FromRuleErrorsAsync(ruleErrors, null, cancellationToken);
                        response.Errors.AddRange(businessErrors);
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Business rule validation failed: {ex.Message}");
                    // Continue to collect other errors
                }
            }
            
            // Step 4.5: QuestionAnswer Validation (Phase 3D)
            // Validates Question/Answer constraints based on QuestionAnswer rules
            if (_questionAnswerValidator != null && bundle != null && ruleSet?.Rules != null && ruleSet.Rules.Any())
            {
                try
                {
                    // Extract projectId from request if available
                    var projectId = request.ProjectId ?? "default";
                    
                    var questionAnswerResult = await _questionAnswerValidator.ValidateAsync(bundle, ruleSet, projectId, cancellationToken);
                    var qaErrors = await _errorBuilder.FromRuleErrorsAsync(questionAnswerResult.Errors, bundle, cancellationToken);
                    response.Errors.AddRange(qaErrors);
                    
                    // Log advisory notes
                    foreach (var note in questionAnswerResult.AdvisoryNotes)
                    {
                        _logger.LogInformation("QuestionAnswer advisory: {Note}", note);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "QuestionAnswer validation failed");
                    // Continue to collect other errors
                }
            }
            
            // Step 5: CodeMaster Validation
            // CRITICAL: Always attempt to run CodeMaster even if Firely failed
            if (bundle != null && codeMaster?.ScreeningTypes != null && codeMaster.ScreeningTypes.Any())
            {
                try
                {
                    var codeMasterErrors = await _codeMasterEngine.ValidateAsync(bundle, codeMaster, cancellationToken);
                    var cmErrors = await _errorBuilder.FromCodeMasterErrorsAsync(codeMasterErrors, bundle, cancellationToken);
                    response.Errors.AddRange(cmErrors);
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"CodeMaster validation failed: {ex.Message}");
                    // Continue to collect other errors
                }
            }
            
            // Step 6: Reference Validation
            // CRITICAL: Always attempt to run reference validation even if Firely failed
            // Pass validation settings to apply reference resolution policies
            if (bundle != null)
            {
                try
                {
                    var referenceErrors = await _referenceResolver.ValidateAsync(bundle, request.ValidationSettings, cancellationToken);
                    var refErrors = await _errorBuilder.FromReferenceErrorsAsync(referenceErrors, bundle, cancellationToken);
                    response.Errors.AddRange(refErrors);
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Reference validation failed: {ex.Message}");
                    // Continue to collect other errors
                }
            }
            
            // Step 7: Error aggregation, navigation mapping, and unified model assembly
            // (Already done in error builder methods above)
            
            // Step 8: System Rule Suggestions (debug mode only)
            // Generates deterministic pattern-based rule suggestions from sample data
            // Only runs if Firely validation succeeded and debug mode is enabled
            if (validationMode.Equals("debug", StringComparison.OrdinalIgnoreCase) && 
                bundle != null && 
                !response.Errors.Any(e => e.Source == "FHIR" && e.Severity == "error"))
            {
                var specHintIssues = response.Errors
                    .Where(e => e.Source == "SPEC_HINT")
                    .Select(e => new SpecHintIssue
                    {
                        ResourceType = e.ResourceType ?? "",
                        Path = e.Path ?? "",
                        Reason = e.Message,
                        Severity = e.Severity
                    })
                    .ToList();
                    
                var suggestions = await _suggestionService.GenerateSuggestionsAsync(
                    bundle, 
                    ruleSet, 
                    specHintIssues, 
                    cancellationToken);
                    
                response.Suggestions = suggestions;
            }
            
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
        // Use lenient parser settings to allow SPEC_HINT to run even with structural errors
        try
        {
            var parserSettings = new ParserSettings
            {
                AcceptUnknownMembers = true,  // Ignore unknown properties (for SPEC_HINT)
                AllowUnrecognizedEnums = true // Allow invalid enum values
            };
            var parser = new FhirJsonParser(parserSettings);
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
        
        response.Summary.LintErrorCount = response.Errors.Count(e => e.Source == "LINT");
        response.Summary.FhirErrorCount = response.Errors.Count(e => e.Source == "FHIR");
        response.Summary.BusinessErrorCount = response.Errors.Count(e => e.Source == "Business");
        response.Summary.CodeMasterErrorCount = response.Errors.Count(e => e.Source == "CodeMaster");
        response.Summary.ReferenceErrorCount = response.Errors.Count(e => e.Source == "Reference");
    }
}