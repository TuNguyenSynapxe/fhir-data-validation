using FluentAssertions;
using Pss.FhirProcessor.Terminology.Sources.Hl7;
using Xunit;

namespace Pss.FhirProcessor.Terminology.Tests;

/// <summary>
/// Guardrail tests for canonical URL version handling.
/// 
/// CRITICAL RULES:
/// - Canonical version NEVER affects lookup/resolution
/// - Identity (canonical without version) is ALWAYS used for lookup
/// - Both versioned and non-versioned URLs must resolve to same ValueSet
/// - Version is metadata only, preserved for future use
/// 
/// These tests enforce version-safe terminology resolution.
/// DO NOT remove or weaken these tests.
/// </summary>
public class CanonicalVersionGuardrailTests
{
    private readonly Hl7ValueSetSource _source;

    public CanonicalVersionGuardrailTests()
    {
        _source = new Hl7ValueSetSource();
    }

    [Fact]
    public async Task PreviewAsync_WithVersionSuffix_ReturnsIdenticalCodesToBaseUrl()
    {
        // Arrange
        const string baseUrl = "http://hl7.org/fhir/ValueSet/administrative-gender";
        const string versionedUrl = "http://hl7.org/fhir/ValueSet/administrative-gender|5.0.0";

        // Act
        var basePreview = await _source.PreviewAsync(baseUrl, 10);
        var versionedPreview = await _source.PreviewAsync(versionedUrl, 10);

        // Assert
        versionedPreview.Should().NotBeNull("versioned URL should resolve to ValueSet");
        basePreview.Should().NotBeNull("base URL should resolve to ValueSet");
        
        versionedPreview!.Name.Should().Be(basePreview!.Name);
        versionedPreview.Codes.Should().HaveCount(basePreview.Codes.Count);
        versionedPreview.Codes.Should().BeEquivalentTo(basePreview.Codes);
    }

    [Fact]
    public async Task PreviewAsync_WithDifferentVersions_ReturnsSameValueSet()
    {
        // Arrange - simulate different FHIR versions requesting same ValueSet
        const string r4Version = "http://hl7.org/fhir/ValueSet/administrative-gender|4.0.1";
        const string r5Version = "http://hl7.org/fhir/ValueSet/administrative-gender|5.0.0";

        // Act
        var r4Preview = await _source.PreviewAsync(r4Version, 10);
        var r5Preview = await _source.PreviewAsync(r5Version, 10);

        // Assert - Both should resolve to same underlying ValueSet
        r4Preview.Should().NotBeNull();
        r5Preview.Should().NotBeNull();
        r4Preview!.Codes.Should().BeEquivalentTo(r5Preview!.Codes);
    }

    [Fact]
    public async Task ExistsAsync_WithVersionSuffix_ReturnsTrue()
    {
        // Arrange
        const string versionedUrl = "http://hl7.org/fhir/ValueSet/administrative-gender|5.0.0";

        // Act
        var exists = await _source.ExistsAsync(versionedUrl);

        // Assert
        exists.Should().BeTrue("versioned URL should resolve to existing ValueSet");
    }

    [Fact]
    public async Task ExistsAsync_WithAndWithoutVersion_ReturnsSameResult()
    {
        // Arrange
        const string baseUrl = "http://hl7.org/fhir/ValueSet/observation-status";
        const string versionedUrl = "http://hl7.org/fhir/ValueSet/observation-status|5.0.0";

        // Act
        var baseExists = await _source.ExistsAsync(baseUrl);
        var versionedExists = await _source.ExistsAsync(versionedUrl);

        // Assert
        baseExists.Should().BeTrue();
        versionedExists.Should().Be(baseExists, "version should not affect existence check");
    }

    [Fact]
    public async Task PreviewAsync_WithTrailingPipe_IgnoresEmptyVersion()
    {
        // Arrange - malformed URL with trailing pipe
        const string baseUrl = "http://hl7.org/fhir/ValueSet/marital-status";
        const string trailingPipeUrl = "http://hl7.org/fhir/ValueSet/marital-status|";

        // Act
        var basePreview = await _source.PreviewAsync(baseUrl, 10);
        var trailingPreview = await _source.PreviewAsync(trailingPipeUrl, 10);

        // Assert
        trailingPreview.Should().NotBeNull();
        trailingPreview!.Codes.Should().BeEquivalentTo(basePreview!.Codes);
    }

    [Fact]
    public async Task PreviewAsync_WithNonexistentValueSetVersioned_ReturnsNull()
    {
        // Arrange
        const string nonexistentUrl = "http://hl7.org/fhir/ValueSet/does-not-exist|5.0.0";

        // Act
        var preview = await _source.PreviewAsync(nonexistentUrl, 10);

        // Assert
        preview.Should().BeNull("non-existent ValueSet should return null regardless of version");
    }

    [Fact]
    public async Task ExistsAsync_WithNonexistentValueSetVersioned_ReturnsFalse()
    {
        // Arrange
        const string nonexistentUrl = "http://hl7.org/fhir/ValueSet/does-not-exist|5.0.0";

        // Act
        var exists = await _source.ExistsAsync(nonexistentUrl);

        // Assert
        exists.Should().BeFalse("non-existent ValueSet should not exist regardless of version");
    }

    [Fact]
    public async Task PreviewAsync_AllSeededValueSets_ResolveWithVersion()
    {
        // Arrange - All 4 seeded ValueSets in Hl7R5Registry
        var testCases = new[]
        {
            "http://hl7.org/fhir/ValueSet/administrative-gender|5.0.0",
            "http://hl7.org/fhir/ValueSet/observation-status|5.0.0",
            "http://hl7.org/fhir/ValueSet/marital-status|5.0.0",
            "http://hl7.org/fhir/ValueSet/condition-clinical|5.0.0"
        };

        // Act & Assert
        foreach (var url in testCases)
        {
            var preview = await _source.PreviewAsync(url, 10);
            preview.Should().NotBeNull($"{url} should resolve correctly");
            preview!.Codes.Should().NotBeEmpty($"{url} should have codes");
        }
    }
}
