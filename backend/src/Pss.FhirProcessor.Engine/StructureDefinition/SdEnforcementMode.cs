namespace Pss.FhirProcessor.Engine.SdValidation;

/// <summary>
/// Phase 2.4: Global enforcement mode for SD validation.
/// Controls whether ambiguous ValueSet structures are treated as errors or warnings.
/// </summary>
public enum SdEnforcementMode
{
    /// <summary>
    /// Strict mode (default): Ambiguous ValueSets are errors.
    /// Deterministic validation only - no assumptions.
    /// </summary>
    Strict,

    /// <summary>
    /// Permissive mode: Ambiguous ValueSets are warnings.
    /// Allows pragmatic validation when terminology infrastructure is unavailable.
    /// </summary>
    Permissive
}
