using FluentAssertions;
using Pss.FhirProcessor.Terminology.Utils;
using Xunit;

namespace Pss.FhirProcessor.Terminology.Tests;

/// <summary>
/// Unit tests for CanonicalParser.
/// Verifies correct parsing of FHIR canonical URLs with version suffixes.
/// </summary>
public class CanonicalParserTests
{
    [Fact]
    public void Parse_UrlWithVersion_ReturnsIdentityAndVersion()
    {
        // Arrange
        const string canonical = "http://hl7.org/fhir/ValueSet/administrative-gender|5.0.0";

        // Act
        var (identity, version) = CanonicalParser.Parse(canonical);

        // Assert
        identity.Should().Be("http://hl7.org/fhir/ValueSet/administrative-gender");
        version.Should().Be("5.0.0");
    }

    [Fact]
    public void Parse_UrlWithoutVersion_ReturnsIdentityOnly()
    {
        // Arrange
        const string canonical = "http://hl7.org/fhir/ValueSet/administrative-gender";

        // Act
        var (identity, version) = CanonicalParser.Parse(canonical);

        // Assert
        identity.Should().Be("http://hl7.org/fhir/ValueSet/administrative-gender");
        version.Should().BeNull();
    }

    [Fact]
    public void Parse_UrlWithComplexVersion_ReturnsFullVersion()
    {
        // Arrange
        const string canonical = "http://hl7.org/fhir/ValueSet/observation-status|5.0.0-ballot1";

        // Act
        var (identity, version) = CanonicalParser.Parse(canonical);

        // Assert
        identity.Should().Be("http://hl7.org/fhir/ValueSet/observation-status");
        version.Should().Be("5.0.0-ballot1");
    }

    [Fact]
    public void Parse_UrlWithTrailingPipe_ReturnsIdentityWithoutVersion()
    {
        // Arrange
        const string canonical = "http://hl7.org/fhir/ValueSet/marital-status|";

        // Act
        var (identity, version) = CanonicalParser.Parse(canonical);

        // Assert
        identity.Should().Be("http://hl7.org/fhir/ValueSet/marital-status");
        version.Should().BeNull();
    }

    [Fact]
    public void Parse_UrlWithMultiplePipes_TakesFirstPipeAsDelimiter()
    {
        // Arrange - edge case: version contains pipe
        const string canonical = "http://hl7.org/fhir/ValueSet/test|1.0|beta";

        // Act
        var (identity, version) = CanonicalParser.Parse(canonical);

        // Assert
        identity.Should().Be("http://hl7.org/fhir/ValueSet/test");
        version.Should().Be("1.0|beta");
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Parse_NullOrWhitespace_ThrowsArgumentException(string? canonical)
    {
        // Act
        var act = () => CanonicalParser.Parse(canonical!);

        // Assert
        act.Should().Throw<ArgumentException>()
            .WithMessage("*cannot be null or whitespace*");
    }

    [Fact]
    public void Parse_UrlStartingWithPipe_ThrowsArgumentException()
    {
        // Arrange
        const string canonical = "|5.0.0";

        // Act
        var act = () => CanonicalParser.Parse(canonical);

        // Assert
        act.Should().Throw<ArgumentException>()
            .WithMessage("*cannot start with '|'*");
    }

    [Fact]
    public void GetIdentity_UrlWithVersion_ReturnsIdentityOnly()
    {
        // Arrange
        const string canonical = "http://hl7.org/fhir/ValueSet/condition-clinical|5.0.0";

        // Act
        var identity = CanonicalParser.GetIdentity(canonical);

        // Assert
        identity.Should().Be("http://hl7.org/fhir/ValueSet/condition-clinical");
    }

    [Fact]
    public void GetIdentity_UrlWithoutVersion_ReturnsOriginalUrl()
    {
        // Arrange
        const string canonical = "http://hl7.org/fhir/ValueSet/condition-clinical";

        // Act
        var identity = CanonicalParser.GetIdentity(canonical);

        // Assert
        identity.Should().Be(canonical);
    }

    [Fact]
    public void Parse_PreservesUrlCaseSensitivity()
    {
        // Arrange - FHIR URLs are case-sensitive
        const string canonical = "http://HL7.org/FHIR/ValueSet/Administrative-Gender|5.0.0";

        // Act
        var (identity, version) = CanonicalParser.Parse(canonical);

        // Assert
        identity.Should().Be("http://HL7.org/FHIR/ValueSet/Administrative-Gender");
        version.Should().Be("5.0.0");
    }

    [Fact]
    public void Parse_HandlesRelativeUrls()
    {
        // Arrange
        const string canonical = "ValueSet/custom-codes|1.0.0";

        // Act
        var (identity, version) = CanonicalParser.Parse(canonical);

        // Assert
        identity.Should().Be("ValueSet/custom-codes");
        version.Should().Be("1.0.0");
    }
}
