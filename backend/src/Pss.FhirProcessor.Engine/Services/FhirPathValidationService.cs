using Hl7.Fhir.ElementModel;
using Hl7.Fhir.Model;
using Hl7.Fhir.Serialization;
using Hl7.FhirPath;
using Microsoft.Extensions.Logging;
using Pss.FhirProcessor.Engine.DTOs;
using Pss.FhirProcessor.Engine.Interfaces;

namespace Pss.FhirProcessor.Engine.Services;

/// <summary>
/// Service for validating FHIRPath expressions using Firely R4 FHIRPath compiler.
/// This service validates syntax without evaluating the expression.
/// </summary>
public class FhirPathValidationService : IFhirPathValidationService
{
    private readonly IFhirModelResolverService _modelResolver;
    private readonly ILogger<FhirPathValidationService> _logger;

    public FhirPathValidationService(
        IFhirModelResolverService modelResolver,
        ILogger<FhirPathValidationService> logger)
    {
        _modelResolver = modelResolver;
        _logger = logger;
    }

    /// <summary>
    /// Validates a FHIRPath expression for syntax correctness.
    /// Uses TypedElement representation (FhirJsonNode + PocoStructureDefinitionSummaryProvider).
    /// Only compiles the expression - does NOT evaluate it.
    /// </summary>
    public async Task<FhirPathValidationResponse> ValidateFhirPathAsync(FhirPathValidationRequest request)
    {
        try
        {
            // Validate input
            if (string.IsNullOrWhiteSpace(request.FhirPath))
            {
                return new FhirPathValidationResponse
                {
                    IsValid = false,
                    Error = "FHIRPath expression cannot be empty"
                };
            }

            // Parse bundle JSON to create context if provided (optional for validation)
            ITypedElement? contextElement = null;
            if (!string.IsNullOrWhiteSpace(request.BundleJson))
            {
                try
                {
                    // Parse JSON to POCO using R4 parser
                    var parser = new FhirJsonParser();
                    var resource = parser.Parse<Resource>(request.BundleJson);
                    
                    // Create TypedElement from POCO
                    // In R4 SDK, ToTypedElement() works directly on POCO resources
                    contextElement = resource.ToTypedElement();
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to parse bundle JSON, continuing without context");
                    // Continue without context - we can still validate syntax
                }
            }

            // Compile the FHIRPath expression
            // This validates syntax without evaluation
            var compiler = new FhirPathCompiler();
            
            // Attempt to compile - this validates syntax
            var compiledExpression = compiler.Compile(request.FhirPath);

            // If compilation succeeds, the expression is syntactically valid
            _logger.LogInformation("FHIRPath expression validated successfully: {FhirPath}", request.FhirPath);
            
            return new FhirPathValidationResponse
            {
                IsValid = true,
                Error = null
            };
        }
        catch (Exception ex) when (ex.GetType().Name == "SyntaxErrorException")
        {
            // Syntax error in FHIRPath expression
            _logger.LogWarning(ex, "FHIRPath syntax error: {Message}", ex.Message);
            
            return new FhirPathValidationResponse
            {
                IsValid = false,
                Error = $"Syntax error: {ex.Message}"
            };
        }
        catch (Exception ex) when (ex.GetType().Name.Contains("FhirPath"))
        {
            // FHIRPath-specific error (e.g., unknown function, invalid symbol)
            _logger.LogWarning(ex, "FHIRPath validation error: {Message}", ex.Message);
            
            return new FhirPathValidationResponse
            {
                IsValid = false,
                Error = $"FHIRPath error: {ex.Message}"
            };
        }
        catch (Exception ex)
        {
            // Unexpected error
            _logger.LogError(ex, "Unexpected error validating FHIRPath expression");
            
            return new FhirPathValidationResponse
            {
                IsValid = false,
                Error = $"Validation error: {ex.Message}"
            };
        }
    }
}
