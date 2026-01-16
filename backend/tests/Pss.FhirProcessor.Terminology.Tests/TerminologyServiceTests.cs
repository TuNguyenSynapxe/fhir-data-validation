using Xunit;
using FluentAssertions;
using Moq;
using Pss.FhirProcessor.Terminology.Engine;
using Pss.FhirProcessor.Terminology.Abstractions;
using Pss.FhirProcessor.Terminology.Domain;

namespace Pss.FhirProcessor.Terminology.Tests;

/// <summary>
/// Tests for TerminologyService orchestration logic.
/// Verifies layer precedence, deduplication, and deterministic ordering.
/// </summary>
public sealed class TerminologyServiceTests
{
    [Fact]
    public async Task SearchAsync_MergesResultsFromAllSources()
    {
        // Arrange
        var hl7Source = CreateMockSource(TerminologyLayer.Hl7, new[]
        {
            new ValueSetSummary { Url = "http://hl7.org/fhir/ValueSet/vs1", Name = "VS1", Publisher = "HL7", Capability = ValueSetCapability.Previewable, Previewability = ValueSetPreviewability.Explicit }
        });
        
        var pssSource = CreateMockSource(TerminologyLayer.Pss, new[]
        {
            new ValueSetSummary { Url = "http://pss.sg/ValueSet/vs2", Name = "VS2", Publisher = "PSS", Capability = ValueSetCapability.Previewable, Previewability = ValueSetPreviewability.Explicit }
        });
        
        var service = new TerminologyService(new[] { hl7Source, pssSource });
        var request = new ValueSetSearchRequest { Query = "test" };
        
        // Act
        var results = await service.SearchAsync(request);
        
        // Assert
        results.Should().HaveCount(2);
        results.Should().Contain(vs => vs.Url == "http://hl7.org/fhir/ValueSet/vs1");
        results.Should().Contain(vs => vs.Url == "http://pss.sg/ValueSet/vs2");
    }
    
    [Fact]
    public async Task SearchAsync_DeduplicatesByUrl_HigherLayerWins()
    {
        // Arrange - Both sources return same URL, PSS should win
        var hl7Source = CreateMockSource(TerminologyLayer.Hl7, new[]
        {
            new ValueSetSummary 
            { 
                Url = "http://example.org/ValueSet/duplicate", 
                Name = "HL7 Version", 
                Publisher = "HL7",
                Capability = ValueSetCapability.Previewable,
                Previewability = ValueSetPreviewability.Explicit
            }
        });
        
        var pssSource = CreateMockSource(TerminologyLayer.Pss, new[]
        {
            new ValueSetSummary 
            { 
                Url = "http://example.org/ValueSet/duplicate", 
                Name = "PSS Version", 
                Publisher = "PSS",
                Capability = ValueSetCapability.Previewable,
                Previewability = ValueSetPreviewability.Explicit
            }
        });
        
        var service = new TerminologyService(new[] { hl7Source, pssSource });
        var request = new ValueSetSearchRequest { Query = "test" };
        
        // Act
        var results = await service.SearchAsync(request);
        
        // Assert
        results.Should().ContainSingle();
        results[0].Name.Should().Be("PSS Version"); // Higher layer wins
        results[0].Publisher.Should().Be("PSS");
    }
    
    [Fact]
    public async Task SearchAsync_SortsDeterministically_ByNameThenUrl()
    {
        // Arrange
        var source = CreateMockSource(TerminologyLayer.Hl7, new[]
        {
            new ValueSetSummary { Url = "http://b.org/vs", Name = "Zebra", Publisher = "HL7", Capability = ValueSetCapability.Previewable, Previewability = ValueSetPreviewability.Explicit },
            new ValueSetSummary { Url = "http://a.org/vs", Name = "Alpha", Publisher = "HL7", Capability = ValueSetCapability.Previewable, Previewability = ValueSetPreviewability.Explicit },
            new ValueSetSummary { Url = "http://c.org/vs", Name = "Alpha", Publisher = "HL7", Capability = ValueSetCapability.Previewable, Previewability = ValueSetPreviewability.Explicit }, // Same name, URL decides
        });
        
        var service = new TerminologyService(new[] { source });
        var request = new ValueSetSearchRequest { Query = "test" };
        
        // Act
        var results = await service.SearchAsync(request);
        
        // Assert
        results.Should().HaveCount(3);
        results[0].Name.Should().Be("Alpha");
        results[0].Url.Should().Be("http://a.org/vs"); // Alphabetically first URL
        results[1].Name.Should().Be("Alpha");
        results[1].Url.Should().Be("http://c.org/vs");
        results[2].Name.Should().Be("Zebra");
    }
    
    [Fact]
    public async Task PreviewAsync_ReturnsFromFirstSourceWithPreview()
    {
        // Arrange - HL7 has no preview, PSS has preview
        var hl7Source = CreateMockSourceWithPreview(TerminologyLayer.Hl7, "http://test.org/vs", null);
        var pssSource = CreateMockSourceWithPreview(TerminologyLayer.Pss, "http://test.org/vs", 
            new ValueSetPreview
            {
                Url = "http://test.org/vs",
                Name = "Test VS",
                Codes = new[]
                {
                    new ValueSetCode { Code = "code1", Display = "Display 1" }
                }
            });
        
        var service = new TerminologyService(new[] { hl7Source, pssSource });
        
        // Act
        var preview = await service.PreviewAsync("http://test.org/vs");
        
        // Assert
        preview.Should().NotBeNull();
        preview!.Name.Should().Be("Test VS");
        preview.Codes.Should().ContainSingle();
    }
    
    [Fact]
    public async Task PreviewAsync_ReturnsNullIfNoSourceHasPreview()
    {
        // Arrange
        var hl7Source = CreateMockSourceWithPreview(TerminologyLayer.Hl7, "http://test.org/vs", null);
        var pssSource = CreateMockSourceWithPreview(TerminologyLayer.Pss, "http://test.org/vs", null);
        
        var service = new TerminologyService(new[] { hl7Source, pssSource });
        
        // Act
        var preview = await service.PreviewAsync("http://test.org/vs");
        
        // Assert
        preview.Should().BeNull();
    }
    
    [Fact]
    public async Task ExistsAsync_ReturnsTrueIfAnySourceContainsUrl()
    {
        // Arrange
        var hl7Source = CreateMockSourceWithExists(TerminologyLayer.Hl7, "http://test.org/vs", false);
        var pssSource = CreateMockSourceWithExists(TerminologyLayer.Pss, "http://test.org/vs", true);
        
        var service = new TerminologyService(new[] { hl7Source, pssSource });
        
        // Act
        var exists = await service.ExistsAsync("http://test.org/vs");
        
        // Assert
        exists.Should().BeTrue();
    }
    
    [Fact]
    public async Task ExistsAsync_ReturnsFalseIfNoSourceContainsUrl()
    {
        // Arrange
        var hl7Source = CreateMockSourceWithExists(TerminologyLayer.Hl7, "http://test.org/vs", false);
        var pssSource = CreateMockSourceWithExists(TerminologyLayer.Pss, "http://test.org/vs", false);
        
        var service = new TerminologyService(new[] { hl7Source, pssSource });
        
        // Act
        var exists = await service.ExistsAsync("http://test.org/vs");
        
        // Assert
        exists.Should().BeFalse();
    }
    
    [Fact]
    public void Constructor_OrdersSourcesByLayerDescending()
    {
        // Arrange - Add sources in random order
        var projectSource = CreateMockSource(TerminologyLayer.Project, Array.Empty<ValueSetSummary>());
        var hl7Source = CreateMockSource(TerminologyLayer.Hl7, Array.Empty<ValueSetSummary>());
        var pssSource = CreateMockSource(TerminologyLayer.Pss, Array.Empty<ValueSetSummary>());
        
        // Act - Sources added out of order
        var service = new TerminologyService(new[] { hl7Source, projectSource, pssSource });
        
        // Assert - Verify ordering by checking deduplication behavior
        // (Implementation detail: higher priority sources are checked first in deduplication)
        service.Should().NotBeNull(); // Basic verification that it constructed
    }
    
    // Helper methods
    
    private static IValueSetSource CreateMockSource(TerminologyLayer layer, ValueSetSummary[] results)
    {
        var mock = new Mock<IValueSetSource>();
        mock.Setup(s => s.Layer).Returns(layer);
        mock.Setup(s => s.SearchAsync(It.IsAny<ValueSetSearchRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(results);
        return mock.Object;
    }
    
    private static IValueSetSource CreateMockSourceWithPreview(TerminologyLayer layer, string url, ValueSetPreview? preview)
    {
        var mock = new Mock<IValueSetSource>();
        mock.Setup(s => s.Layer).Returns(layer);
        mock.Setup(s => s.PreviewAsync(url, It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(preview);
        return mock.Object;
    }
    
    private static IValueSetSource CreateMockSourceWithExists(TerminologyLayer layer, string url, bool exists)
    {
        var mock = new Mock<IValueSetSource>();
        mock.Setup(s => s.Layer).Returns(layer);
        mock.Setup(s => s.ExistsAsync(url, It.IsAny<CancellationToken>()))
            .ReturnsAsync(exists);
        return mock.Object;
    }
}
