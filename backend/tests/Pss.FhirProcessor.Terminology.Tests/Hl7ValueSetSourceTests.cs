using Xunit;
using FluentAssertions;
using Pss.FhirProcessor.Terminology.Sources.Hl7;
using Pss.FhirProcessor.Terminology.Domain;

namespace Pss.FhirProcessor.Terminology.Tests;

/// <summary>
/// Tests for Hl7ValueSetSource seed-based implementation.
/// Verifies search, preview, and exists functionality without Firely.
/// </summary>
public sealed class Hl7ValueSetSourceTests
{
    [Fact]
    public void Layer_ReturnsHl7()
    {
        // Arrange
        var source = new Hl7ValueSetSource();
        
        // Act & Assert
        source.Layer.Should().Be(TerminologyLayer.Hl7);
    }
    
    [Fact]
    public async Task SearchAsync_WithoutQuery_ReturnsAllSeededValueSets()
    {
        // Arrange
        var source = new Hl7ValueSetSource();
        var request = new ValueSetSearchRequest();
        
        // Act
        var results = await source.SearchAsync(request);
        
        // Assert
        results.Should().HaveCountGreaterOrEqualTo(4); // At least the 4 required seed sets
        results.Should().Contain(vs => vs.Url == "http://hl7.org/fhir/ValueSet/administrative-gender");
        results.Should().Contain(vs => vs.Url == "http://hl7.org/fhir/ValueSet/observation-status");
        results.Should().Contain(vs => vs.Url == "http://hl7.org/fhir/ValueSet/marital-status");
        results.Should().Contain(vs => vs.Url == "http://hl7.org/fhir/ValueSet/condition-clinical");
    }
    
    [Fact]
    public async Task SearchAsync_WithQuery_FiltersResults()
    {
        // Arrange
        var source = new Hl7ValueSetSource();
        var request = new ValueSetSearchRequest { Query = "gender" };
        
        // Act
        var results = await source.SearchAsync(request);
        
        // Assert
        results.Should().Contain(vs => vs.Url == "http://hl7.org/fhir/ValueSet/administrative-gender");
        results.Should().NotContain(vs => vs.Url == "http://hl7.org/fhir/ValueSet/observation-status");
    }
    
    [Fact]
    public async Task SearchAsync_QueryIsCaseInsensitive()
    {
        // Arrange
        var source = new Hl7ValueSetSource();
        var request = new ValueSetSearchRequest { Query = "GENDER" };
        
        // Act
        var results = await source.SearchAsync(request);
        
        // Assert
        results.Should().Contain(vs => vs.Url == "http://hl7.org/fhir/ValueSet/administrative-gender");
    }
    
    [Fact]
    public async Task PreviewAsync_ForSeededValueSet_ReturnsCodes()
    {
        // Arrange
        var source = new Hl7ValueSetSource();
        
        // Act
        var preview = await source.PreviewAsync("http://hl7.org/fhir/ValueSet/administrative-gender");
        
        // Assert
        preview.Should().NotBeNull();
        preview!.Name.Should().Be("AdministrativeGender");
        preview.Codes.Should().HaveCount(4);
        preview.Codes.Should().Contain(c => c.Code == "male" && c.Display == "Male");
        preview.Codes.Should().Contain(c => c.Code == "female" && c.Display == "Female");
        preview.Codes.Should().Contain(c => c.Code == "other" && c.Display == "Other");
        preview.Codes.Should().Contain(c => c.Code == "unknown" && c.Display == "Unknown");
    }
    
    [Fact]
    public async Task PreviewAsync_CapsItemsToMaxItems()
    {
        // Arrange
        var source = new Hl7ValueSetSource();
        
        // Act - Request only 2 codes from marital-status (has 11 codes)
        var preview = await source.PreviewAsync("http://hl7.org/fhir/ValueSet/marital-status", maxItems: 2);
        
        // Assert
        preview.Should().NotBeNull();
        preview!.Codes.Should().HaveCount(2);
    }
    
    [Fact]
    public async Task PreviewAsync_ForNonExistentValueSet_ReturnsNull()
    {
        // Arrange
        var source = new Hl7ValueSetSource();
        
        // Act
        var preview = await source.PreviewAsync("http://example.org/ValueSet/does-not-exist");
        
        // Assert
        preview.Should().BeNull();
    }
    
    [Fact]
    public async Task ExistsAsync_ForSeededValueSet_ReturnsTrue()
    {
        // Arrange
        var source = new Hl7ValueSetSource();
        
        // Act
        var exists = await source.ExistsAsync("http://hl7.org/fhir/ValueSet/administrative-gender");
        
        // Assert
        exists.Should().BeTrue();
    }
    
    [Fact]
    public async Task ExistsAsync_ForNonExistentValueSet_ReturnsFalse()
    {
        // Arrange
        var source = new Hl7ValueSetSource();
        
        // Act
        var exists = await source.ExistsAsync("http://example.org/ValueSet/does-not-exist");
        
        // Assert
        exists.Should().BeFalse();
    }
    
    [Fact]
    public async Task ObservationStatusValueSet_HasExpectedCodes()
    {
        // Arrange
        var source = new Hl7ValueSetSource();
        
        // Act
        var preview = await source.PreviewAsync("http://hl7.org/fhir/ValueSet/observation-status");
        
        // Assert
        preview.Should().NotBeNull();
        preview!.Codes.Should().HaveCount(8);
        preview.Codes.Should().Contain(c => c.Code == "registered");
        preview.Codes.Should().Contain(c => c.Code == "preliminary");
        preview.Codes.Should().Contain(c => c.Code == "final");
        preview.Codes.Should().Contain(c => c.Code == "amended");
    }
    
    [Fact]
    public async Task ConditionClinicalValueSet_HasExpectedCodes()
    {
        // Arrange
        var source = new Hl7ValueSetSource();
        
        // Act
        var preview = await source.PreviewAsync("http://hl7.org/fhir/ValueSet/condition-clinical");
        
        // Assert
        preview.Should().NotBeNull();
        preview!.Codes.Should().HaveCount(6);
        preview.Codes.Should().Contain(c => c.Code == "active");
        preview.Codes.Should().Contain(c => c.Code == "inactive");
        preview.Codes.Should().Contain(c => c.Code == "resolved");
    }
}
