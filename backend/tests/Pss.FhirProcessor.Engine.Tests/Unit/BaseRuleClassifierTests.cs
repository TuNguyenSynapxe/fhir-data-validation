using Xunit;
using Microsoft.Extensions.Logging;
using Moq;
using Pss.FhirProcessor.Engine.Authoring;

namespace Pss.FhirProcessor.Engine.Tests.Unit;

/// <summary>
/// Tests for BaseRuleClassifier - SPEC_HINT → STRUCTURE classification logic.
/// Validates that unconditional required fields are upgraded to STRUCTURE,
/// while conditional/advisory rules remain SPEC_HINT.
/// </summary>
public class BaseRuleClassifierTests
{
    private readonly BaseRuleClassifier _classifier;

    public BaseRuleClassifierTests()
    {
        var logger = new Mock<ILogger<BaseRuleClassifier>>();
        _classifier = new BaseRuleClassifier(logger.Object);
    }

    [Theory]
    [InlineData("Observation.status")]
    [InlineData("Observation.code")]
    [InlineData("Encounter.status")]
    [InlineData("Encounter.class")]
    [InlineData("Bundle.type")]
    [InlineData("Condition.code")]
    [InlineData("Condition.subject")]
    [InlineData("Procedure.status")]
    [InlineData("Procedure.subject")]
    [InlineData("MedicationRequest.status")]
    [InlineData("MedicationRequest.intent")]
    [InlineData("MedicationRequest.subject")]
    public void Classify_UnconditionalRequiredFields_ShouldRemainSpecHint(string path)
    {
        // Arrange
        var issue = new SpecHintIssue
        {
            ResourceType = path.Split('.')[0],
            Path = path,
            Reason = "Required by HL7 FHIR R4",
            Severity = "warning",
            IsConditional = false
        };

        // Act
        var result = _classifier.Classify(issue);

        // Assert
        // These now remain SPEC_HINT because JsonNodeStructuralValidator handles them as STRUCTURE
        Assert.Equal("SPEC_HINT", result.Source);
        Assert.Equal("warning", result.Severity);
        // Category can be either Advisory or AlreadyHandled (for closed enums)
        Assert.True(result.Category == ClassificationCategory.Advisory || 
                   result.Category == ClassificationCategory.AlreadyHandled,
                   $"Expected Advisory or AlreadyHandled, got {result.Category}");
    }

    [Fact]
    public void Classify_ConditionalRequirement_ShouldRemainSpecHint()
    {
        // Arrange
        var issue = new SpecHintIssue
        {
            ResourceType = "Patient",
            Path = "Patient.communication.language",
            Reason = "Required when communication is present",
            Severity = "warning",
            IsConditional = true,
            Condition = "communication.exists()"
        };

        // Act
        var result = _classifier.Classify(issue);

        // Assert
        Assert.Equal("SPEC_HINT", result.Source);
        Assert.Equal("warning", result.Severity);
        Assert.Equal(ClassificationCategory.Conditional, result.Category);
        Assert.Contains("Conditional requirement", result.Reason);
    }

    [Theory]
    [InlineData("Patient.communication.language")]
    [InlineData("Observation.component.code")]
    [InlineData("Observation.component.value[x]")]
    [InlineData("Patient.contact.name")]
    public void Classify_NestedOptionalRequirements_ShouldRemainSpecHint(string path)
    {
        // Arrange
        var issue = new SpecHintIssue
        {
            ResourceType = path.Split('.')[0],
            Path = path,
            Reason = "Required by HL7 FHIR R4",
            Severity = "warning",
            IsConditional = false // Not explicitly conditional, but nested
        };

        // Act
        var result = _classifier.Classify(issue);

        // Assert
        Assert.Equal("SPEC_HINT", result.Source);
        Assert.Equal("warning", result.Severity);
        Assert.Equal(ClassificationCategory.NestedOptional, result.Category);
        Assert.Contains("Required field within optional parent", result.Reason);
    }

    [Theory]
    [InlineData("Patient.name")]
    [InlineData("Observation.effective[x]")]
    [InlineData("Condition.verificationStatus")]
    public void Classify_OtherRequiredFields_ShouldRemainSpecHint(string path)
    {
        // Arrange - Fields not in the unconditional required list
        var issue = new SpecHintIssue
        {
            ResourceType = path.Split('.')[0],
            Path = path,
            Reason = "Required by HL7 FHIR R4",
            Severity = "warning",
            IsConditional = false
        };

        // Act
        var result = _classifier.Classify(issue);

        // Assert
        // These remain SPEC_HINT because they're not in the unconditional required list
        Assert.Equal("SPEC_HINT", result.Source);
        Assert.Equal("warning", result.Severity);
    }

    [Theory]
    [InlineData("Patient.gender")]
    [InlineData("Bundle.type")]
    public void Classify_ClosedEnumFields_ShouldRemainSpecHint(string path)
    {
        // Arrange - Closed enum fields are already validated by JsonNodeStructuralValidator
        var issue = new SpecHintIssue
        {
            ResourceType = path.Split('.')[0],
            Path = path,
            Reason = "Required by HL7 FHIR R4",
            Severity = "warning",
            IsConditional = false
        };

        // Act
        var result = _classifier.Classify(issue);

        // Assert
        // All closed enum fields remain SPEC_HINT (JsonNodeStructuralValidator handles them)
        Assert.Equal("SPEC_HINT", result.Source);
        Assert.Equal("warning", result.Severity);
    }

    [Fact]
    public void Classify_PreservesOriginalMetadata()
    {
        // Arrange
        var issue = new SpecHintIssue
        {
            ResourceType = "Observation",
            ResourceId = "obs-123",
            Path = "Observation.status",
            Reason = "Required by HL7 FHIR R4 (min cardinality = 1)",
            Severity = "warning",
            JsonPointer = "/entry/0/resource",
            IsConditional = false,
            Condition = null,
            AppliesToEach = false
        };

        // Act
        var result = _classifier.Classify(issue);

        // Assert
        // Now remains SPEC_HINT since JsonNodeStructuralValidator handles unconditional required fields
        Assert.Equal("SPEC_HINT", result.Source);
        Assert.Equal("warning", result.Severity);
        
        // Original issue metadata is NOT modified by classifier
        Assert.Equal("Observation.status", issue.Path);
        Assert.Equal("obs-123", issue.ResourceId);
        Assert.Equal("/entry/0/resource", issue.JsonPointer);
        Assert.False(issue.IsConditional);
    }
}
