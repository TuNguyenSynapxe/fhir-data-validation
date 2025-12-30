using Xunit;
using Pss.FhirProcessor.Engine.Services;

namespace Pss.FhirProcessor.Engine.Tests;

/// <summary>
/// Tests for field path validation.
/// Ensures paths are relative to resources and don't contain instance scope notation.
/// </summary>
public class FieldPathValidatorTests
{
    private readonly FieldPathValidator _validator;

    public FieldPathValidatorTests()
    {
        _validator = new FieldPathValidator();
    }

    #region Valid Paths

    [Theory]
    [InlineData("gender", "Patient")]
    [InlineData("birthDate", "Patient")]
    [InlineData("name.family", "Patient")]
    [InlineData("identifier.value", "Patient")]
    [InlineData("value[x]", "Observation")]
    [InlineData("code.coding.code", "Observation")]
    [InlineData("performer.display", "Observation")]
    [InlineData("name[0].family", "Patient")] // Nested array index is OK
    [InlineData("address.line[0]", "Patient")] // Nested array index is OK
    public void ValidateFieldPath_ValidPaths_DoesNotThrow(string fieldPath, string resourceType)
    {
        // Act & Assert
        var exception = Record.Exception(() => _validator.ValidateFieldPath(fieldPath, resourceType));
        Assert.Null(exception);
    }

    [Theory]
    [InlineData("gender", "Patient")]
    [InlineData("birthDate", "Patient")]
    [InlineData("name.family", "Patient")]
    public void CheckFieldPath_ValidPaths_ReturnsTrue(string fieldPath, string resourceType)
    {
        // Act
        var (isValid, errorMessage) = _validator.CheckFieldPath(fieldPath, resourceType);

        // Assert
        Assert.True(isValid);
        Assert.Null(errorMessage);
    }

    #endregion

    #region Invalid: Resource Type Prefix

    [Theory]
    [InlineData("Patient.gender", "Patient")]
    [InlineData("Patient.birthDate", "Patient")]
    [InlineData("Observation.value[x]", "Observation")]
    [InlineData("patient.gender", "Patient")] // Case insensitive
    public void ValidateFieldPath_WithResourceTypePrefix_Throws(string fieldPath, string resourceType)
    {
        // Act & Assert
        var exception = Assert.Throws<ArgumentException>(() =>
            _validator.ValidateFieldPath(fieldPath, resourceType));

        Assert.Contains("must not start with resource type", exception.Message);
        Assert.Contains(resourceType, exception.Message);
    }

    [Fact]
    public void ValidateFieldPath_ExactResourceTypeName_Throws()
    {
        // Act & Assert
        var exception = Assert.Throws<ArgumentException>(() =>
            _validator.ValidateFieldPath("Patient", "Patient"));

        Assert.Contains("must not start with resource type", exception.Message);
    }

    #endregion

    #region Invalid: Array Wildcard [*]

    [Theory]
    [InlineData("name[*].family", "Patient")]
    [InlineData("identifier[*].value", "Patient")]
    [InlineData("coding[*].code", "Observation")]
    public void ValidateFieldPath_WithArrayWildcard_Throws(string fieldPath, string resourceType)
    {
        // Act & Assert
        var exception = Assert.Throws<ArgumentException>(() =>
            _validator.ValidateFieldPath(fieldPath, resourceType));

        Assert.Contains("[*]", exception.Message);
        Assert.Contains("FHIRPath handles array traversal implicitly", exception.Message);
    }

    #endregion

    #region Invalid: Resource-Level Array Index [0]

    [Theory]
    [InlineData("[0].gender", "Patient")]
    [InlineData("[0]", "Patient")]
    [InlineData("[99].birthDate", "Patient")]
    public void ValidateFieldPath_StartsWithArrayIndex_Throws(string fieldPath, string resourceType)
    {
        // Act & Assert
        var exception = Assert.Throws<ArgumentException>(() =>
            _validator.ValidateFieldPath(fieldPath, resourceType));

        Assert.Contains("must not start with array index", exception.Message);
        Assert.Contains("FirstInstance", exception.Message);
    }

    #endregion

    #region Invalid: Resource-Level .where()

    [Theory]
    [InlineData("where(gender='male').birthDate", "Patient")]
    [InlineData(".where(code='X').value[x]", "Observation")]
    [InlineData("WHERE(id.exists()).gender", "Patient")] // Case insensitive
    public void ValidateFieldPath_StartsWithWhere_Throws(string fieldPath, string resourceType)
    {
        // Act & Assert
        var exception = Assert.Throws<ArgumentException>(() =>
            _validator.ValidateFieldPath(fieldPath, resourceType));

        Assert.Contains("must not start with '.where()'", exception.Message);
        Assert.Contains("FilteredInstances", exception.Message);
    }

    #endregion

    #region Invalid: Bundle References

    [Theory]
    [InlineData("Bundle.entry.resource.gender", "Patient")]
    [InlineData("entry.resource.gender", "Patient")]
    [InlineData("bundle.total", "Patient")] // Case insensitive
    public void ValidateFieldPath_WithBundleReference_Throws(string fieldPath, string resourceType)
    {
        // Act & Assert
        var exception = Assert.Throws<ArgumentException>(() =>
            _validator.ValidateFieldPath(fieldPath, resourceType));

        Assert.Contains("must not reference Bundle structure", exception.Message);
    }

    #endregion

    #region Invalid: Empty or Null

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void ValidateFieldPath_EmptyOrNull_Throws(string? fieldPath)
    {
        // Act & Assert
        var exception = Assert.Throws<ArgumentException>(() =>
            _validator.ValidateFieldPath(fieldPath!, "Patient"));

        Assert.Contains("cannot be empty", exception.Message);
    }

    #endregion

    #region CheckFieldPath Returns Error Message

    [Fact]
    public void CheckFieldPath_InvalidPath_ReturnsFalseWithMessage()
    {
        // Act
        var (isValid, errorMessage) = _validator.CheckFieldPath("Patient.gender", "Patient");

        // Assert
        Assert.False(isValid);
        Assert.NotNull(errorMessage);
        Assert.Contains("must not start with resource type", errorMessage);
    }

    #endregion
}
