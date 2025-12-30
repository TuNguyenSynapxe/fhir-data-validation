using Pss.FhirProcessor.Engine.Models;

namespace Pss.FhirProcessor.Engine.Validation;

/// <summary>
/// Service responsible for resolving the effective severity of a validation error.
/// Implements the severity downgrade logic based on ValidationClass:
/// - Contract & Structural: Never downgrade (deterministic validations)
/// - Advisory: May downgrade for low-confidence or heuristic validations
/// </summary>
public interface ISeverityResolver
{
    /// <summary>
    /// Resolves the effective severity for a validation error.
    /// </summary>
    /// <param name="configuredSeverity">The severity configured in the rule (e.g., "error", "warning")</param>
    /// <param name="validationClass">The validation classification (Contract, Structural, Advisory)</param>
    /// <param name="downgradeReason">Output parameter explaining why severity was downgraded (if applicable)</param>
    /// <param name="isHeuristic">Whether this is a heuristic/low-confidence validation</param>
    /// <param name="isSpecHint">Whether this is a SpecHint advisory</param>
    /// <returns>The effective severity to emit</returns>
    string ResolveSeverity(
        string configuredSeverity,
        ValidationClass validationClass,
        out string? downgradeReason,
        bool isHeuristic = false,
        bool isSpecHint = false);
}

/// <summary>
/// Default implementation of severity resolution logic.
/// </summary>
public class SeverityResolver : ISeverityResolver
{
    public string ResolveSeverity(
        string configuredSeverity,
        ValidationClass validationClass,
        out string? downgradeReason,
        bool isHeuristic = false,
        bool isSpecHint = false)
    {
        downgradeReason = null;

        // 1. Contract & Structural rules are NEVER downgraded
        //    These are deterministic validations that enforce contracts or FHIR compliance
        if (validationClass == ValidationClass.Contract || validationClass == ValidationClass.Structural)
        {
            return configuredSeverity;
        }

        // 2. Advisory rules MAY be downgraded
        //    These are heuristic or guidance-based validations where confidence may be low
        if (validationClass == ValidationClass.Advisory)
        {
            // SpecHint: Always advisory warnings (HL7 required field guidance)
            if (isSpecHint)
            {
                if (configuredSeverity == "error")
                {
                    downgradeReason = "SpecHint advisory: HL7 required field guidance";
                    return "warning";
                }
            }

            // Generic heuristic: Downgrade errors to warnings when confidence is low
            if (isHeuristic)
            {
                if (configuredSeverity == "error")
                {
                    downgradeReason = "Low confidence heuristic validation";
                    return "warning";
                }
            }
        }

        return configuredSeverity;
    }
}
