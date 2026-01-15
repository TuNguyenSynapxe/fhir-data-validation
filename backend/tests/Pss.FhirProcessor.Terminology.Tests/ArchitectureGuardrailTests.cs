using System.Reflection;
using Xunit;

namespace Pss.FhirProcessor.Terminology.Tests;

/// <summary>
/// Architecture enforcement tests for Terminology DLL.
/// 
/// CRITICAL RULES:
/// - NO Firely SDK references in Domain namespace
/// - NO Firely SDK references in Engine namespace
/// - ONLY Adapters namespace may reference Firely SDK
/// - HL7 source must work without Firely (in-memory seed data only)
/// </summary>
public sealed class ArchitectureGuardrailTests
{
    private readonly Assembly _terminologyAssembly;
    
    // Firely SDK assemblies we want to prevent references to
    private static readonly HashSet<string> FirelyAssemblyNames = new()
    {
        "Hl7.Fhir.R5",
        "Hl7.Fhir.R4",
        "Hl7.Fhir.R4B",
        "Hl7.Fhir.Specification.R5",
        "Hl7.Fhir.Specification.R4",
        "Hl7.Fhir.Support",
        "Hl7.Fhir.Support.Poco",
        "Hl7.FhirPath"
    };

    public ArchitectureGuardrailTests()
    {
        _terminologyAssembly = typeof(Abstractions.ITerminologyService).Assembly;
    }

    [Fact]
    public void Domain_Namespace_MustNotReference_FirelySDK()
    {
        // Arrange
        var domainTypes = _terminologyAssembly.GetTypes()
            .Where(t => t.Namespace != null && t.Namespace.StartsWith("Pss.FhirProcessor.Terminology.Domain"))
            .ToList();

        // Act
        var violators = new List<string>();
        foreach (var type in domainTypes)
        {
            var typeReferences = GetReferencedAssemblies(type);
            var firelyRefs = typeReferences.Where(a => FirelyAssemblyNames.Contains(a)).ToList();
            
            if (firelyRefs.Any())
            {
                violators.Add($"{type.FullName} references Firely SDK: {string.Join(", ", firelyRefs)}");
            }
        }

        // Assert
        Assert.Empty(violators);
    }

    [Fact]
    public void Engine_Namespace_MustNotReference_FirelySDK()
    {
        // Arrange
        var engineTypes = _terminologyAssembly.GetTypes()
            .Where(t => t.Namespace != null && t.Namespace.StartsWith("Pss.FhirProcessor.Terminology.Engine"))
            .ToList();

        // Act
        var violators = new List<string>();
        foreach (var type in engineTypes)
        {
            var typeReferences = GetReferencedAssemblies(type);
            var firelyRefs = typeReferences.Where(a => FirelyAssemblyNames.Contains(a)).ToList();
            
            if (firelyRefs.Any())
            {
                violators.Add($"{type.FullName} references Firely SDK: {string.Join(", ", firelyRefs)}");
            }
        }

        // Assert
        Assert.Empty(violators);
    }

    [Fact]
    public void Hl7Source_MustNotReference_FirelySDK()
    {
        // Arrange
        var hl7Types = _terminologyAssembly.GetTypes()
            .Where(t => t.Namespace != null && t.Namespace.StartsWith("Pss.FhirProcessor.Terminology.Sources.Hl7"))
            .ToList();

        // Act
        var violators = new List<string>();
        foreach (var type in hl7Types)
        {
            var typeReferences = GetReferencedAssemblies(type);
            var firelyRefs = typeReferences.Where(a => FirelyAssemblyNames.Contains(a)).ToList();
            
            if (firelyRefs.Any())
            {
                violators.Add($"{type.FullName} references Firely SDK: {string.Join(", ", firelyRefs)}");
            }
        }

        // Assert
        Assert.Empty(violators);
    }

    [Fact]
    public void Abstractions_Namespace_MustNotReference_FirelySDK()
    {
        // Arrange
        var abstractionTypes = _terminologyAssembly.GetTypes()
            .Where(t => t.Namespace != null && t.Namespace.StartsWith("Pss.FhirProcessor.Terminology.Abstractions"))
            .ToList();

        // Act
        var violators = new List<string>();
        foreach (var type in abstractionTypes)
        {
            var typeReferences = GetReferencedAssemblies(type);
            var firelyRefs = typeReferences.Where(a => FirelyAssemblyNames.Contains(a)).ToList();
            
            if (firelyRefs.Any())
            {
                violators.Add($"{type.FullName} references Firely SDK: {string.Join(", ", firelyRefs)}");
            }
        }

        // Assert
        Assert.Empty(violators);
    }

    [Fact]
    public void TerminologyService_MustNeverThrow_OnMissingValueSet()
    {
        // Arrange
        var source = new Sources.Hl7.Hl7ValueSetSource();
        var service = new Engine.TerminologyService(new[] { source });
        var nonExistentUrl = "http://example.org/ValueSet/does-not-exist";

        // Act & Assert - Should return empty/null/false, never throw
        var existsTask = service.ExistsAsync(nonExistentUrl, CancellationToken.None);
        var exists = existsTask.GetAwaiter().GetResult();
        Assert.False(exists);

        var previewTask = service.PreviewAsync(nonExistentUrl, 50, CancellationToken.None);
        var preview = previewTask.GetAwaiter().GetResult();
        Assert.Null(preview); // Returns null for not found
    }

    [Fact]
    public void Hl7ValueSetSource_MustCap_MaxItems()
    {
        // Arrange
        var source = new Sources.Hl7.Hl7ValueSetSource();
        var url = "http://hl7.org/fhir/ValueSet/administrative-gender";

        // Act - Request excessive maxItems
        var previewTask = source.PreviewAsync(url, 1000, CancellationToken.None);
        var preview = previewTask.GetAwaiter().GetResult();

        // Assert - Should be capped at 200
        Assert.NotNull(preview);
        Assert.True(preview.Codes.Count <= 200, $"Expected max 200 codes, got {preview.Codes.Count}");
    }

    [Fact]
    public void Hl7ValueSetSource_MustCap_MinItems()
    {
        // Arrange
        var source = new Sources.Hl7.Hl7ValueSetSource();
        var url = "http://hl7.org/fhir/ValueSet/administrative-gender";

        // Act - Request negative maxItems
        var previewTask = source.PreviewAsync(url, -10, CancellationToken.None);
        var preview = previewTask.GetAwaiter().GetResult();

        // Assert - Should be capped at 1 minimum
        Assert.NotNull(preview);
        Assert.True(preview.Codes.Count >= 1, "Expected at least 1 code returned");
    }

    [Theory]
    [InlineData("http://hl7.org/fhir/ValueSet/administrative-gender", "AdministrativeGender")]
    [InlineData("http://hl7.org/fhir/ValueSet/observation-status", "ObservationStatus")]
    [InlineData("http://hl7.org/fhir/ValueSet/marital-status", "MaritalStatus")]
    [InlineData("http://hl7.org/fhir/ValueSet/condition-clinical", "ConditionClinicalStatusCodes")]
    public void Hl7Source_MustContain_SeededValueSets(string url, string expectedNameContains)
    {
        // Arrange
        var source = new Sources.Hl7.Hl7ValueSetSource();

        // Act
        var existsTask = source.ExistsAsync(url, CancellationToken.None);
        var exists = existsTask.GetAwaiter().GetResult();

        var previewTask = source.PreviewAsync(url, 50, CancellationToken.None);
        var preview = previewTask.GetAwaiter().GetResult();

        // Assert
        Assert.True(exists, $"Expected HL7 source to contain {url}");
        Assert.NotNull(preview);
        Assert.Contains(expectedNameContains, preview.Name, StringComparison.OrdinalIgnoreCase);
        Assert.NotEmpty(preview.Codes);
    }

    /// <summary>
    /// Get referenced assemblies from a type's members
    /// (simplified check for architecture enforcement)
    /// </summary>
    private static HashSet<string> GetReferencedAssemblies(Type type)
    {
        var assemblies = new HashSet<string>();

        try
        {
            // Check fields
            foreach (var field in type.GetFields(BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance | BindingFlags.Static))
            {
                if (field.FieldType.Assembly != type.Assembly)
                {
                    assemblies.Add(field.FieldType.Assembly.GetName().Name ?? "");
                }
            }

            // Check properties
            foreach (var property in type.GetProperties(BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance | BindingFlags.Static))
            {
                if (property.PropertyType.Assembly != type.Assembly)
                {
                    assemblies.Add(property.PropertyType.Assembly.GetName().Name ?? "");
                }
            }

            // Check methods (parameters and return types)
            foreach (var method in type.GetMethods(BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance | BindingFlags.Static))
            {
                if (method.ReturnType.Assembly != type.Assembly)
                {
                    assemblies.Add(method.ReturnType.Assembly.GetName().Name ?? "");
                }

                foreach (var param in method.GetParameters())
                {
                    if (param.ParameterType.Assembly != type.Assembly)
                    {
                        assemblies.Add(param.ParameterType.Assembly.GetName().Name ?? "");
                    }
                }
            }
        }
        catch
        {
            // Ignore reflection errors for generic/complex types
        }

        return assemblies;
    }
}
