using Xunit;
using Pss.FhirProcessor.Engine.Models;
using Pss.FhirProcessor.Engine.Validation;

namespace Pss.FhirProcessor.Engine.Tests.Validation;

/// <summary>
/// Tests for ValidationClass-aware severity resolution.
/// Ensures Contract and Structural validations are never downgraded,
/// while Advisory validations can be downgraded for heuristics/SpecHints.
/// </summary>
public class SeverityResolverTests
{
    private readonly SeverityResolver _resolver = new();

    [Fact]
    public void Contract_Error_NeverDowngraded_EvenIfHeuristic()
    {
        // Contract validations (QuestionAnswer system/code mapping) are HARD ERRORS
        var severity = _resolver.ResolveSeverity(
            configuredSeverity: "error",
            validationClass: ValidationClass.Contract,
            downgradeReason: out var reason,
            isHeuristic: true,
            isSpecHint: false);

        Assert.Equal("error", severity);
        Assert.Null(reason); // No downgrade occurred
    }

    [Fact]
    public void Contract_Error_NeverDowngraded_EvenIfSpecHint()
    {
        // Contract validations should never be SpecHint anyway, but test defensive behavior
        var severity = _resolver.ResolveSeverity(
            configuredSeverity: "error",
            validationClass: ValidationClass.Contract,
            downgradeReason: out var reason,
            isHeuristic: false,
            isSpecHint: true);

        Assert.Equal("error", severity);
        Assert.Null(reason);
    }

    [Fact]
    public void Structural_Error_NeverDowngraded()
    {
        // Structural FHIR validations are never downgraded
        var severity = _resolver.ResolveSeverity(
            configuredSeverity: "error",
            validationClass: ValidationClass.Structural,
            downgradeReason: out var reason,
            isHeuristic: true,
            isSpecHint: false);

        Assert.Equal("error", severity);
        Assert.Null(reason);
    }

    [Fact]
    public void Advisory_Error_DowngradedToWarning_WhenSpecHint()
    {
        // SpecHint errors are downgraded to warnings (HL7 required field guidance)
        var severity = _resolver.ResolveSeverity(
            configuredSeverity: "error",
            validationClass: ValidationClass.Advisory,
            downgradeReason: out var reason,
            isHeuristic: false,
            isSpecHint: true);

        Assert.Equal("warning", severity);
        Assert.NotNull(reason);
        Assert.Contains("SpecHint", reason);
    }

    [Fact]
    public void Advisory_Error_DowngradedToWarning_WhenHeuristic()
    {
        // Heuristic errors are downgraded to warnings (low confidence)
        var severity = _resolver.ResolveSeverity(
            configuredSeverity: "error",
            validationClass: ValidationClass.Advisory,
            downgradeReason: out var reason,
            isHeuristic: true,
            isSpecHint: false);

        Assert.Equal("warning", severity);
        Assert.NotNull(reason);
        Assert.Contains("heuristic", reason);
    }

    [Fact]
    public void Advisory_Warning_NotDowngraded()
    {
        // Warnings stay as warnings (no downgrade to info)
        var severity = _resolver.ResolveSeverity(
            configuredSeverity: "warning",
            validationClass: ValidationClass.Advisory,
            downgradeReason: out var reason,
            isHeuristic: true,
            isSpecHint: true);

        Assert.Equal("warning", severity);
        Assert.Null(reason); // No downgrade occurred
    }

    [Fact]
    public void Advisory_Info_NotDowngraded()
    {
        // Info stays as info
        var severity = _resolver.ResolveSeverity(
            configuredSeverity: "info",
            validationClass: ValidationClass.Advisory,
            downgradeReason: out var reason,
            isHeuristic: true,
            isSpecHint: true);

        Assert.Equal("info", severity);
        Assert.Null(reason);
    }

    [Fact]
    public void Contract_Warning_PreservedAsWarning()
    {
        // Contract warning stays warning (no upgrade)
        var severity = _resolver.ResolveSeverity(
            configuredSeverity: "warning",
            validationClass: ValidationClass.Contract,
            downgradeReason: out var reason,
            isHeuristic: false,
            isSpecHint: false);

        Assert.Equal("warning", severity);
        Assert.Null(reason);
    }

    [Fact]
    public void Structural_Warning_PreservedAsWarning()
    {
        // Structural warning stays warning
        var severity = _resolver.ResolveSeverity(
            configuredSeverity: "warning",
            validationClass: ValidationClass.Structural,
            downgradeReason: out var reason,
            isHeuristic: false,
            isSpecHint: false);

        Assert.Equal("warning", severity);
        Assert.Null(reason);
    }
}
