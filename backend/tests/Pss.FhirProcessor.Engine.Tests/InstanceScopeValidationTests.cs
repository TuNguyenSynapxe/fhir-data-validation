using Xunit;
using Pss.FhirProcessor.Engine.Models;

namespace Pss.FhirProcessor.Engine.Tests;

/// <summary>
/// Tests for InstanceScope model validation.
/// Ensures filter conditions are valid before execution.
/// </summary>
public class InstanceScopeValidationTests
{
    [Fact]
    public void AllInstances_Validate_DoesNotThrow()
    {
        // Arrange
        var scope = new AllInstances();

        // Act & Assert
        var exception = Record.Exception(() => scope.Validate());
        Assert.Null(exception);
    }

    [Fact]
    public void FirstInstance_Validate_DoesNotThrow()
    {
        // Arrange
        var scope = new FirstInstance();

        // Act & Assert
        var exception = Record.Exception(() => scope.Validate());
        Assert.Null(exception);
    }

    [Fact]
    public void FilteredInstances_ValidCondition_DoesNotThrow()
    {
        // Arrange
        var scope = new FilteredInstances { ConditionFhirPath = "gender = 'male'" };

        // Act & Assert
        var exception = Record.Exception(() => scope.Validate());
        Assert.Null(exception);
    }

    [Theory]
    [InlineData("code.coding.code = 'HS'")]
    [InlineData("identifier.system = 'http://example.org'")]
    [InlineData("active = true")]
    [InlineData("birthDate.exists()")]
    public void FilteredInstances_ValidConditions_DoNotThrow(string condition)
    {
        // Arrange
        var scope = new FilteredInstances { ConditionFhirPath = condition };

        // Act & Assert
        var exception = Record.Exception(() => scope.Validate());
        Assert.Null(exception);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void FilteredInstances_EmptyCondition_Throws(string? condition)
    {
        // Arrange
        var scope = new FilteredInstances { ConditionFhirPath = condition! };

        // Act & Assert
        var exception = Assert.Throws<ArgumentException>(() => scope.Validate());
        Assert.Contains("condition cannot be empty", exception.Message);
    }

    [Theory]
    [InlineData("Bundle.entry.resource.gender = 'male'")]
    [InlineData("entry.resource.id.exists()")]
    public void FilteredInstances_BundleReference_Throws(string condition)
    {
        // Arrange
        var scope = new FilteredInstances { ConditionFhirPath = condition };

        // Act & Assert
        var exception = Assert.Throws<ArgumentException>(() => scope.Validate());
        Assert.Contains("must not reference Bundle structure", exception.Message);
    }
}
