using FluentAssertions;
using Xunit;

namespace Pss.FhirProcessor.Terminology.ImportTool.Tests;

public sealed class Hl7R5ImporterTests
{
    [Fact]
    public async Task ImportAsync_WithFixtureData_GeneratesThreeFiles()
    {
        // Arrange
        var inputPath = Path.Combine("Fixtures", "package");
        var outputPath = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());
        Directory.CreateDirectory(outputPath);

        try
        {
            var importer = new Hl7R5Importer();

            // Act
            var result = await importer.ImportAsync(inputPath, outputPath);

            // Assert
            result.CodeSystemCount.Should().Be(6);
            result.ValueSetCount.Should().Be(6);
            result.IndexEntryCount.Should().Be(12); // 6 CodeSystems + 6 ValueSets

            // Verify files exist
            File.Exists(Path.Combine(outputPath, "hl7-r5-codesystems.json")).Should().BeTrue();
            File.Exists(Path.Combine(outputPath, "hl7-r5-valuesets.json")).Should().BeTrue();
            File.Exists(Path.Combine(outputPath, "hl7-r5-index.json")).Should().BeTrue();
        }
        finally
        {
            if (Directory.Exists(outputPath))
            {
                Directory.Delete(outputPath, true);
            }
        }
    }

    [Fact]
    public async Task ImportAsync_OutputIsDeterministic_SortedByUrl()
    {
        // Arrange
        var inputPath = Path.Combine("Fixtures", "package");
        var outputPath = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());
        Directory.CreateDirectory(outputPath);

        try
        {
            var importer = new Hl7R5Importer();

            // Act
            await importer.ImportAsync(inputPath, outputPath);

            // Read index and verify sorting
            var indexPath = Path.Combine(outputPath, "hl7-r5-index.json");
            var indexJson = await File.ReadAllTextAsync(indexPath);
            var index = System.Text.Json.JsonSerializer.Deserialize<List<Dictionary<string, object>>>(indexJson);

            // Assert - URLs should be in alphabetical order
            index.Should().NotBeNull();
            var urls = index!.Select(e => e["url"].ToString()).ToList();
            urls.Should().BeInAscendingOrder();
        }
        finally
        {
            if (Directory.Exists(outputPath))
            {
                Directory.Delete(outputPath, true);
            }
        }
    }
}
