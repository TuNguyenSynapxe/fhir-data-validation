using FluentAssertions;
using Pss.FhirProcessor.Terminology.ImportTool.Models;
using Pss.FhirProcessor.Terminology.ImportTool.Parsers;
using Xunit;

namespace Pss.FhirProcessor.Terminology.ImportTool.Tests;

public sealed class ValueSetParserTests
{
    [Fact]
    public void Parse_ExplicitExpansion_UsesExplicitCodesStrategy()
    {
        // Arrange
        var fixturePath = Path.Combine("Fixtures", "package", "ValueSet-test-gender-vs.json");
        var warnings = new List<string>();

        // Act
        var result = ValueSetParser.Parse(fixturePath, warnings);

        // Assert
        result.Should().NotBeNull();
        result!.Url.Should().Be("http://example.org/fhir/ValueSet/test-gender-vs");
        result.ExpansionStrategy.Should().Be(ExpansionStrategyType.ExplicitCodes);
        result.Capability.Should().Be(ValueSetCapabilityType.Previewable);
        
        result.ExplicitCodes.Should().HaveCount(2);
        result.ExplicitCodes![0].Code.Should().Be("M");
        result.ExplicitCodes[0].Display.Should().Be("Male");
        result.ExplicitCodes[0].System.Should().Be("http://example.org/fhir/CodeSystem/test-gender");

        result.ComposeIncludes.Should().BeNull();
        warnings.Should().BeEmpty();
    }

    [Fact]
    public void Parse_ComposeInclude_UsesComposeIncludesStrategy()
    {
        // Arrange
        var fixturePath = Path.Combine("Fixtures", "package", "ValueSet-test-status-compose.json");
        var warnings = new List<string>();

        // Act
        var result = ValueSetParser.Parse(fixturePath, warnings);

        // Assert
        result.Should().NotBeNull();
        result!.Url.Should().Be("http://example.org/fhir/ValueSet/test-status-compose");
        result.ExpansionStrategy.Should().Be(ExpansionStrategyType.ComposeIncludes);
        result.Capability.Should().Be(ValueSetCapabilityType.Previewable);
        
        result.ComposeIncludes.Should().HaveCount(1);
        result.ComposeIncludes![0].System.Should().Be("http://example.org/fhir/CodeSystem/test-status");
        result.ComposeIncludes[0].IncludeAll.Should().BeFalse();
        result.ComposeIncludes[0].Concepts.Should().HaveCount(2);
        result.ComposeIncludes[0].Concepts.Should().Contain("active");
        result.ComposeIncludes[0].Concepts.Should().Contain("inactive");

        result.ExplicitCodes.Should().BeNull();
        warnings.Should().BeEmpty();
    }

    [Fact]
    public void Parse_ComposeWithFilter_MarksAsUnsupported()
    {
        // Arrange
        var tempFile = Path.GetTempFileName();
        File.WriteAllText(tempFile, @"{
            ""resourceType"": ""ValueSet"",
            ""url"": ""http://example.org/test"",
            ""name"": ""Test"",
            ""compose"": {
                ""include"": [{
                    ""system"": ""http://example.org/system"",
                    ""filter"": [{""property"": ""status"", ""op"": ""="", ""value"": ""active""}]
                }]
            }
        }");
        var warnings = new List<string>();

        try
        {
            // Act
            var result = ValueSetParser.Parse(tempFile, warnings);

            // Assert
            result.Should().NotBeNull();
            result!.ExpansionStrategy.Should().Be(ExpansionStrategyType.Unsupported);
            result.Capability.Should().Be(ValueSetCapabilityType.Computed);
            warnings.Should().Contain(w => w.Contains("filter") && w.Contains("unsupported"));
        }
        finally
        {
            File.Delete(tempFile);
        }
    }

    [Fact]
    public void Parse_ExternalSystemSNOMED_MarkedAsExternalSystem()
    {
        // Arrange
        var tempFile = Path.GetTempFileName();
        File.WriteAllText(tempFile, @"{
            ""resourceType"": ""ValueSet"",
            ""url"": ""http://example.org/snomed-vs"",
            ""name"": ""SNOMEDValueSet"",
            ""compose"": {
                ""include"": [{
                    ""system"": ""http://snomed.info/sct""
                }]
            }
        }");
        var warnings = new List<string>();

        try
        {
            // Act
            var result = ValueSetParser.Parse(tempFile, warnings);

            // Assert
            result.Should().NotBeNull();
            result!.Capability.Should().Be(ValueSetCapabilityType.ExternalSystem);
        }
        finally
        {
            File.Delete(tempFile);
        }
    }

    [Fact]
    public void Parse_ExternalSystemLOINC_MarkedAsExternalSystem()
    {
        // Arrange
        var tempFile = Path.GetTempFileName();
        File.WriteAllText(tempFile, @"{
            ""resourceType"": ""ValueSet"",
            ""url"": ""http://example.org/loinc-vs"",
            ""name"": ""LOINCValueSet"",
            ""compose"": {
                ""include"": [{
                    ""system"": ""http://loinc.org""
                }]
            }
        }");
        var warnings = new List<string>();

        try
        {
            // Act
            var result = ValueSetParser.Parse(tempFile, warnings);

            // Assert
            result.Should().NotBeNull();
            result!.Capability.Should().Be(ValueSetCapabilityType.ExternalSystem);
        }
        finally
        {
            File.Delete(tempFile);
        }
    }

    [Fact]
    public void Parse_ValueSetImport_MarkedAsComputed()
    {
        // Arrange
        var tempFile = Path.GetTempFileName();
        File.WriteAllText(tempFile, @"{
            ""resourceType"": ""ValueSet"",
            ""url"": ""http://example.org/imported-vs"",
            ""name"": ""ImportedValueSet"",
            ""compose"": {
                ""include"": [{
                    ""valueSet"": [""http://example.org/base-vs""]
                }]
            }
        }");
        var warnings = new List<string>();

        try
        {
            // Act
            var result = ValueSetParser.Parse(tempFile, warnings);

            // Assert
            result.Should().NotBeNull();
            result!.Capability.Should().Be(ValueSetCapabilityType.Computed);
        }
        finally
        {
            File.Delete(tempFile);
        }
    }
}
