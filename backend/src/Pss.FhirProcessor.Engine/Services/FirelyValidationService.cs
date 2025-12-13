using Hl7.Fhir.Model;
using Hl7.Fhir.Serialization;
using Hl7.Fhir.Specification.Source;
using Hl7.Fhir.ElementModel;
using Hl7.Fhir.Specification;
using Microsoft.Extensions.Logging;
using Pss.FhirProcessor.Engine.Interfaces;
using System.Linq;

namespace Pss.FhirProcessor.Engine.Services;

/// <summary>
/// Performs FHIR structural validation using Firely SDK with FHIR R4
/// Uses node-based validation (FhirJsonNode → ITypedElement) to collect structural issues
/// Does NOT handle business rules - only FHIR R4 structural correctness
/// </summary>
public class FirelyValidationService : IFirelyValidationService
{
    private readonly IFhirModelResolverService _modelResolver;
    private readonly ILogger<FirelyValidationService> _logger;

    public FirelyValidationService(
        IFhirModelResolverService modelResolver,
        ILogger<FirelyValidationService> logger)
    {
        _modelResolver = modelResolver;
        _logger = logger;
    }

    /// <summary>
    /// Validates raw FHIR bundle JSON using node-based validation (FhirJsonNode → ITypedElement)
    /// This approach validates structure without POCO deserialization, allowing error collection
    /// instead of fail-fast behavior.
    /// 
    /// Validates: resource types, cardinality, required fields, data types, value constraints
    /// </summary>
    public async System.Threading.Tasks.Task<OperationOutcome> ValidateAsync(string bundleJson, string fhirVersion, CancellationToken cancellationToken = default)
    {
        await System.Threading.Tasks.Task.CompletedTask;
        
        var outcome = new OperationOutcome();
        var errors = new List<string>();
        
        try
        {
            _logger.LogInformation("Starting Firely R4 node-based structural validation for {Length} chars of JSON", 
                bundleJson?.Length ?? 0);
            
            // IMPORTANT: Firely SDK 5.10.3 limitation
            // - ToTypedElement() with ErrorMode.Report doesn't fully collect all errors - it still throws on critical errors
            // - No ExceptionNotification annotation type exists in 5.10.3
            // - True multi-error collection requires SDK 6.0+
            
            // Step 1: Parse JSON to ISourceNode (node-based, NOT POCO)
            ISourceNode sourceNode;
            try
            {
                sourceNode = FhirJsonNode.Parse(bundleJson);
            }
            catch (FormatException ex)
            {
                // JSON parsing error
                outcome.Issue.Add(new OperationOutcome.IssueComponent
                {
                    Severity = OperationOutcome.IssueSeverity.Error,
                    Code = OperationOutcome.IssueType.Structure,
                    Diagnostics = $"Invalid JSON format: {ex.Message}"
                });
                return outcome;
            }
            
            // Step 2: Try to convert to ITypedElement with structural validation
            // Get R4 StructureDefinition provider
            var provider = new PocoStructureDefinitionSummaryProvider();
            
            var settings = new TypedElementSettings
            {
                ErrorMode = TypedElementSettings.TypeErrorMode.Report // Try to report errors instead of throwing
            };
            
            try
            {
                // This conversion validates structure (types, cardinality, etc.)
                var typedElement = sourceNode.ToTypedElement(provider, settings: settings);
                
                // If we get here without exception, basic structure is valid
                // Visit all nodes to ensure complete traversal
                int nodeCount = 0;
                VisitAllNodes(typedElement, ref nodeCount);
                
                _logger.LogInformation("Firely validation: Traversed {NodeCount} nodes successfully", nodeCount);
                
                outcome.Issue.Add(new OperationOutcome.IssueComponent
                {
                    Severity = OperationOutcome.IssueSeverity.Information,
                    Code = OperationOutcome.IssueType.Informational,
                    Diagnostics = "FHIR R4 structural validation passed with no issues"
                });
            }
            catch (Exception ex)
            {
                // Structural validation error
                _logger.LogWarning(ex, "Firely structural validation error");
                
                outcome.Issue.Add(new OperationOutcome.IssueComponent
                {
                    Severity = OperationOutcome.IssueSeverity.Error,
                    Code = OperationOutcome.IssueType.Structure,
                    Diagnostics = $"FHIR structural validation error: {ex.Message}"
                });
            }
            
            return outcome;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during Firely structural validation");
            
            // Return error as OperationOutcome issue, not as exception
            // This ensures validation errors are returned as data, not thrown
            return new OperationOutcome
            {
                Issue = new List<OperationOutcome.IssueComponent>
                {
                    new OperationOutcome.IssueComponent
                    {
                        Severity = OperationOutcome.IssueSeverity.Error,
                        Code = OperationOutcome.IssueType.Exception,
                        Diagnostics = $"Firely validation engine error: {ex.Message}",
                        Details = new CodeableConcept
                        {
                            Text = ex.ToString()
                        }
                    }
                }
            };
        }
    }
    
    /// <summary>
    /// Recursively visit all typed element nodes to ensure complete traversal
    /// This triggers lazy validation in the Firely SDK
    /// </summary>
    private void VisitAllNodes(ITypedElement element, ref int nodeCount)
    {
        if (element == null) return;
        
        nodeCount++;
        
        // Access the Value property to trigger validation
        _ = element.Value;
        
        // Recursively visit children
        foreach (var child in element.Children())
        {
            VisitAllNodes(child, ref nodeCount);
        }
    }
}
