using Xunit;
using Xunit.Abstractions;

namespace Pss.FhirProcessor.Engine.Tests;

/// <summary>
/// Debug test to understand schema structure
/// </summary>
public class DebugSchemaTest
{
    private readonly ITestOutputHelper _output;

    public DebugSchemaTest(ITestOutputHelper output)
    {
        _output = output;
    }

    [Fact]
    public async Task InspectEncounterSchema()
    {
        // Arrange
        var schemaService = TestHelper.CreateFhirSchemaService();

        // Act
        var schema = await schemaService.GetResourceSchemaAsync("Encounter", CancellationToken.None);

        // Assert
        Assert.NotNull(schema);
        
        _output.WriteLine($"Encounter schema - ElementName: {schema.ElementName}, Path: {schema.Path}");
        _output.WriteLine($"Children count: {schema.Children.Count}");
        _output.WriteLine("");
        
        foreach (var child in schema.Children.Take(30))
        {
            _output.WriteLine($"  - {child.ElementName}: Min={child.Min}, Max={child.Max}, Type={child.Type}, IsRequired={child.IsRequired}");
        }

        var statusChild = schema.Children.FirstOrDefault(c => c.ElementName == "status");
        if (statusChild != null)
        {
            _output.WriteLine($"\nstatus field FOUND: Min={statusChild.Min}, Max={statusChild.Max}, IsRequired={statusChild.IsRequired}");
        }
        else
        {
            _output.WriteLine("\nstatus field NOT FOUND in direct children!");
        }
    }

    [Fact]
    public async Task InspectObservationSchema()
    {
        // Arrange
        var schemaService = TestHelper.CreateFhirSchemaService();

        // Act
        var schema = await schemaService.GetResourceSchemaAsync("Observation", CancellationToken.None);

        // Assert
        Assert.NotNull(schema);
        
        _output.WriteLine($"Observation schema - ElementName: {schema.ElementName}, Path: {schema.Path}");
        _output.WriteLine($"Children count: {schema.Children.Count}");
        _output.WriteLine("");
        
        foreach (var child in schema.Children.Take(30))
        {
            _output.WriteLine($"  - {child.ElementName}: Min={child.Min}, Max={child.Max}, Type={child.Type}, IsRequired={child.IsRequired}");
        }

        var statusChild = schema.Children.FirstOrDefault(c => c.ElementName == "status");
        if (statusChild != null)
        {
            _output.WriteLine($"\nstatus field FOUND: Min={statusChild.Min}, Max={statusChild.Max}, IsRequired={statusChild.IsRequired}");
        }
        else
        {
            _output.WriteLine("\nstatus field NOT FOUND in direct children!");
        }
    }
}
