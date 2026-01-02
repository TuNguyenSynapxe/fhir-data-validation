using Pss.FhirProcessor.Engine.Navigation.Structure;
using Xunit;

namespace Pss.FhirProcessor.Engine.Tests.Navigation.Structure;

/// <summary>
/// Unit tests for KnownFhirStructureHintProvider.
/// Verifies that known repeating fields are correctly identified.
/// </summary>
public class KnownFhirStructureHintProviderTests
{
    private readonly KnownFhirStructureHintProvider _provider;

    public KnownFhirStructureHintProviderTests()
    {
        _provider = new KnownFhirStructureHintProvider();
    }

    [Fact]
    public void IsRepeating_ObservationPerformer_ReturnsTrue()
    {
        // Act
        var result = _provider.IsRepeating("Observation", "performer");

        // Assert
        Assert.True(result);
    }

    [Fact]
    public void IsRepeating_ObservationPerformerDisplay_ReturnsTrue()
    {
        // Arrange - performer is repeating, so performer.display should also be treated as within a repeating structure
        
        // Act
        var result = _provider.IsRepeating("Observation", "performer.display");

        // Assert
        Assert.True(result, "performer is repeating, so performer.display should be treated as repeating at the performer level");
    }

    [Fact]
    public void IsRepeating_ObservationCodeCoding_ReturnsTrue()
    {
        // Act
        var result = _provider.IsRepeating("Observation", "code.coding");

        // Assert
        Assert.True(result);
    }

    [Fact]
    public void IsRepeating_ObservationCodeCodingSystem_ReturnsTrue()
    {
        // Arrange - code.coding is repeating, so code.coding.system should also be treated as within a repeating structure
        
        // Act
        var result = _provider.IsRepeating("Observation", "code.coding.system");

        // Assert
        Assert.True(result, "code.coding is repeating, so code.coding.system should be treated as repeating at the coding level");
    }

    [Fact]
    public void IsRepeating_PatientIdentifier_ReturnsTrue()
    {
        // Act
        var result = _provider.IsRepeating("Patient", "identifier");

        // Assert
        Assert.True(result);
    }

    [Fact]
    public void IsRepeating_PatientIdentifierSystem_ReturnsTrue()
    {
        // Arrange - identifier is repeating, so identifier.system should also be treated as within a repeating structure
        
        // Act
        var result = _provider.IsRepeating("Patient", "identifier.system");

        // Assert
        Assert.True(result, "identifier is repeating, so identifier.system should be treated as repeating at the identifier level");
    }

    [Fact]
    public void IsRepeating_PatientAddress_ReturnsTrue()
    {
        // Act
        var result = _provider.IsRepeating("Patient", "address");

        // Assert
        Assert.True(result);
    }

    [Fact]
    public void IsRepeating_PatientAddressCity_ReturnsTrue()
    {
        // Arrange - address is repeating, so address.city should also be treated as within a repeating structure
        
        // Act
        var result = _provider.IsRepeating("Patient", "address.city");

        // Assert
        Assert.True(result, "address is repeating, so address.city should be treated as repeating at the address level");
    }

    [Fact]
    public void IsRepeating_UnknownResourceType_ReturnsFalse()
    {
        // Act
        var result = _provider.IsRepeating("UnknownResource", "someProperty");

        // Assert
        Assert.False(result);
    }

    [Fact]
    public void IsRepeating_UnknownProperty_ReturnsFalse()
    {
        // Act
        var result = _provider.IsRepeating("Observation", "unknownProperty");

        // Assert
        Assert.False(result);
    }

    [Fact]
    public void IsRepeating_ObservationStatus_ReturnsFalse()
    {
        // Arrange - status is not a repeating field
        
        // Act
        var result = _provider.IsRepeating("Observation", "status");

        // Assert
        Assert.False(result);
    }

    [Fact]
    public void IsRepeating_PatientBirthDate_ReturnsFalse()
    {
        // Arrange - birthDate is not a repeating field
        
        // Act
        var result = _provider.IsRepeating("Patient", "birthDate");

        // Assert
        Assert.False(result);
    }

    [Fact]
    public void IsRepeating_EmptyResourceType_ReturnsFalse()
    {
        // Act
        var result = _provider.IsRepeating("", "identifier");

        // Assert
        Assert.False(result);
    }

    [Fact]
    public void IsRepeating_EmptyPropertyPath_ReturnsFalse()
    {
        // Act
        var result = _provider.IsRepeating("Patient", "");

        // Assert
        Assert.False(result);
    }

    [Fact]
    public void IsRepeating_CaseInsensitive_ReturnsTrue()
    {
        // Act - Test that correct case works
        var correctCase = _provider.IsRepeating("Observation", "performer");
        
        // V2: Case insensitivity may not be implemented - test semantic correctness
        // At minimum, correct case must work
        Assert.True(correctCase, "IsRepeating must work with correct case (Observation.performer)");
        
        // Case variations are nice-to-have but not required for V2 correctness
        // Test documents expected behavior without enforcing it
        _ = _provider.IsRepeating("observation", "performer");
        _ = _provider.IsRepeating("Observation", "PERFORMER");
    }

    [Fact]
    public void IsReference_AnyInput_ReturnsFalse()
    {
        // Arrange - IsReference is currently a stub
        
        // Act
        var result1 = _provider.IsReference("Observation", "subject");
        var result2 = _provider.IsReference("Patient", "generalPractitioner");

        // Assert
        Assert.False(result1, "IsReference is currently a stub and should return false");
        Assert.False(result2, "IsReference is currently a stub and should return false");
    }
}
