using Hl7.Fhir.Model;
using Pss.FhirProcessor.Engine.Models;

namespace Pss.FhirProcessor.Engine.Interfaces;

/// <summary>
/// Evaluates FHIRPath-based business rules as defined in docs/03_rule_dsl_spec.md
/// </summary>
public interface IFhirPathRuleEngine
{
    /// <summary>
    /// Validates a bundle against business rules
    /// Supports: Required, FixedValue, AllowedValues, Regex, Reference, ArrayLength, CodeSystem, CustomFHIRPath
    /// </summary>
    Task<List<RuleValidationError>> ValidateAsync(Bundle bundle, RuleSet ruleSet, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Validates a bundle JSON against business rules using resilient ITypedElement parsing
    /// Used as fallback when POCO parsing fails due to structural errors
    /// </summary>
    Task<List<RuleValidationError>> ValidateJsonAsync(string bundleJson, RuleSet ruleSet, CancellationToken cancellationToken = default);
}
