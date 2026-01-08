namespace Pss.FhirProcessor.Engine.SdValidation;

/// <summary>
/// Phase 2.2: Explicit SD constraint enforcement policy.
/// 
/// Central source of truth for which SD constraints are enforced.
/// This is intentional scope control - not all SD constraints are validated.
/// 
/// Rationale:
/// - Enforced: Simple, deterministic, high-value constraints
/// - Deferred: Complex constraints requiring advanced logic or performance optimization
/// 
/// Phase 2.4: Added enforcement mode (Strict vs Permissive) for ambiguous ValueSets.
/// 
/// Future phases will expand Enforced and reduce Deferred.
/// </summary>
public static class SdEnforcementPolicy
{
    /// <summary>
    /// Phase 2.4: Global enforcement mode.
    /// Controls severity of ambiguous ValueSet violations.
    /// Default: Strict (errors). Set to Permissive for warnings.
    /// </summary>
    public static SdEnforcementMode CurrentMode { get; set; } = SdEnforcementMode.Strict;

    /// <summary>
    /// Constraint kinds enforced in Phase 2.3.
    /// Violations will produce ValidationError with Source=StructureDefinition.
    /// 
    /// Phase 2.3 additions: Pattern (primitives only), RequiredBinding (required strength only)
    /// </summary>
    public static readonly IReadOnlySet<SdConstraintKind> Enforced =
        new HashSet<SdConstraintKind>
        {
            SdConstraintKind.Cardinality,
            SdConstraintKind.FixedValue,
            SdConstraintKind.Pattern,
            SdConstraintKind.RequiredBinding
        };

    /// <summary>
    /// Constraint kinds deferred to future phases.
    /// Will be extracted but NOT validated.
    /// 
    /// Rationale:
    /// - Invariant: Complex FHIRPath expressions, handled by FhirPathRuleEngine
    /// </summary>
    public static readonly IReadOnlySet<SdConstraintKind> Deferred =
        new HashSet<SdConstraintKind>
        {
            SdConstraintKind.Invariant
        };

    /// <summary>
    /// Checks if a constraint kind should be enforced in current phase.
    /// </summary>
    public static bool IsEnforced(SdConstraintKind kind) => Enforced.Contains(kind);

    /// <summary>
    /// Checks if a constraint kind is deferred to future phases.
    /// </summary>
    public static bool IsDeferred(SdConstraintKind kind) => Deferred.Contains(kind);

    /// <summary>
    /// Gets human-readable explanation for why a constraint kind is deferred.
    /// </summary>
    public static string GetDeferralReason(SdConstraintKind kind) => kind switch
    {
        SdConstraintKind.Invariant => "FHIRPath invariants are handled by FhirPathRuleEngine, not SD validation layer",
        _ => "Unknown constraint kind or not deferred"
    };

    /// <summary>
    /// Phase 2.4: Resolves severity for SD violations based on enforcement mode.
    /// Phase 3.4: Added support for CyclicValueSetReference.
    /// 
    /// Validators detect violations (facts).
    /// Policy decides consequences (severity).
    /// Engine reports truth.
    /// </summary>
    /// <param name="constraintKind">The kind of constraint violated</param>
    /// <param name="reason">The specific violation reason</param>
    /// <returns>Error in Strict mode, Warning in Permissive mode</returns>
    public static string ResolveSeverity(SdConstraintKind constraintKind, SdViolationReason reason)
    {
        // Phase 2.4: Only ambiguous ValueSet violations are mode-dependent
        if (constraintKind == SdConstraintKind.RequiredBinding)
        {
            return reason switch
            {
                SdViolationReason.EntireSystemValueSet => CurrentMode == SdEnforcementMode.Strict ? "error" : "warning",
                SdViolationReason.ImportedValueSet => CurrentMode == SdEnforcementMode.Strict ? "error" : "warning",
                SdViolationReason.FilteredInclude => CurrentMode == SdEnforcementMode.Strict ? "error" : "warning",
                SdViolationReason.UnresolvableValueSet => CurrentMode == SdEnforcementMode.Strict ? "error" : "warning",
                SdViolationReason.CyclicValueSetReference => CurrentMode == SdEnforcementMode.Strict ? "error" : "warning",
                _ => "error" // Unknown reason defaults to error
            };
        }

        // All other constraints are always errors
        return "error";
    }
}
