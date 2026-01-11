namespace Pss.FhirProcessor.Engine.Configuration;

/// <summary>
/// Phase 11: Configuration options for validation behavior.
/// Controls which validators are enabled and their execution strategy.
/// </summary>
public class ValidationOptions
{
    /// <summary>
    /// Feature flag: Use Firely .NET SDK Validator for full StructureDefinition validation.
    /// 
    /// When FALSE (default):
    /// - Current behavior: Basic Firely checks + custom SdConstraintValidationService
    /// - Validates: Cardinality, fixed values, required bindings, patterns (partial SD coverage)
    /// 
    /// When TRUE:
    /// - New behavior: Full Firely Validator with authoritative SD validation
    /// - Validates: ALL SD constraints (cardinality, bindings, invariants, slicing, types, patterns, etc.)
    /// - Custom SdConstraintValidationService is skipped to avoid duplicates
    /// 
    /// Default: false (backward compatible)
    /// </summary>
    public bool UseFirelyValidator { get; set; } = false;
}
