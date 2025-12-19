using Xunit;
using Xunit.Abstractions;

namespace Pss.FhirProcessor.Engine.Tests;

/// <summary>
/// Debug test to inspect Reference schema structure
/// </summary>
public class DebugReferenceSchemaTest
{
    private readonly ITestOutputHelper _output;

    public DebugReferenceSchemaTest(ITestOutputHelper output)
    {
        _output = output;
    }

    [Fact]
    public async Task InspectReferenceSchema()
    {
        // Arrange
        var schemaService = TestHelper.CreateFhirSchemaService();

        // Act
        var schema = await schemaService.GetResourceSchemaAsync("Reference", CancellationToken.None);

        // Assert & Output
        if (schema == null)
        {
            _output.WriteLine("❌ Reference schema is NULL!");
            return;
        }
        
        _output.WriteLine($"✅ Reference schema loaded");
        _output.WriteLine($"   ElementName: {schema.ElementName}");
        _output.WriteLine($"   Path: {schema.Path}");
        _output.WriteLine($"   Type: {schema.Type}");
        _output.WriteLine($"   Children count: {schema.Children.Count}");
        _output.WriteLine("");
        _output.WriteLine("Children:");
        
        foreach (var child in schema.Children.Take(20))
        {
            _output.WriteLine($"  - {child.ElementName}: Type={child.Type}, Min={child.Min}, Max={child.Max}");
        }

        // Check for expected properties
        var reference = schema.Children.FirstOrDefault(c => c.ElementName == "reference");
        var display = schema.Children.FirstOrDefault(c => c.ElementName == "display");
        var type = schema.Children.FirstOrDefault(c => c.ElementName == "type");

        _output.WriteLine("");
        _output.WriteLine($"Has 'reference' property: {reference != null}");
        _output.WriteLine($"Has 'display' property: {display != null}");
        _output.WriteLine($"Has 'type' property: {type != null}");
    }
}
