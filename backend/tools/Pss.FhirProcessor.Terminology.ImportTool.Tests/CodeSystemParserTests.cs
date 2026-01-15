using FluentAssertions;
using Pss.FhirProcessor.Terminology.ImportTool.Parsers;
using Xunit;

namespace Pss.FhirProcessor.Terminology.ImportTool.Tests;

public sealed class CodeSystemParserTests
{
    [Fact]
    public void Parse_ValidCodeSystem_ExtractsAllFields()
    {
        // Arrange
        var fixturePath = Path.Combine("Fixtures", "package", "CodeSystem-test-gender.json");
        var warnings = new List<string>();

        // Act
        var result = CodeSystemParser.Parse(fixturePath, warnings);

        // Assert
        result.Should().NotBeNull();
        result!.Url.Should().Be("http://example.org/fhir/CodeSystem/test-gender");
        result.Version.Should().Be("1.0.0");
        result.Name.Should().Be("TestGender");
        result.Title.Should().Be("Test Gender Codes");
        result.Publisher.Should().Be("Test Publisher");
        result.Description.Should().Be("Test gender code system for fixture data");
        
        result.Concepts.Should().HaveCount(3);
        result.Concepts[0].Code.Should().Be("M");
        result.Concepts[0].Display.Should().Be("Male");
        result.Concepts[1].Code.Should().Be("F");
        result.Concepts[1].Display.Should().Be("Female");
        result.Concepts[2].Code.Should().Be("O");
        result.Concepts[2].Display.Should().Be("Other");

        warnings.Should().BeEmpty();
    }

    [Fact]
    public void Parse_NestedConcepts_FlattensHierarchy()
    {
        // Arrange
        var fixturePath = Path.Combine("Fixtures", "package", "CodeSystem-test-status.json");
        var warnings = new List<string>();

        // Act
        var result = CodeSystemParser.Parse(fixturePath, warnings);

        // Assert
        result.Should().NotBeNull();
        result!.Concepts.Should().HaveCount(5); // 3 top-level + 2 nested
        
        // Should include nested concepts
        result.Concepts.Should().Contain(c => c.Code == "pending-review");
        result.Concepts.Should().Contain(c => c.Code == "pending-approval");

        warnings.Should().BeEmpty();
    }

    [Fact]
    public void Parse_MissingUrl_ReturnsNull()
    {
        // Arrange
        var tempFile = Path.GetTempFileName();
        File.WriteAllText(tempFile, @"{""resourceType"":""CodeSystem"",""name"":""Test""}");
        var warnings = new List<string>();

        try
        {
            // Act
            var result = CodeSystemParser.Parse(tempFile, warnings);

            // Assert
            result.Should().BeNull();
            warnings.Should().Contain(w => w.Contains("missing 'url'"));
        }
        finally
        {
            File.Delete(tempFile);
        }
    }
}
