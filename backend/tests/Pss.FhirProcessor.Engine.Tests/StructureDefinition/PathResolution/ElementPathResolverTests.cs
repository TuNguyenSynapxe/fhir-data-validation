using FluentAssertions;
using Hl7.Fhir.Model;
using Microsoft.Extensions.Logging.Abstractions;
using Pss.FhirProcessor.Engine.SdValidation.PathResolution;
using Xunit;

namespace Pss.FhirProcessor.Engine.Tests.StructureDefinition.PathResolution;

/// <summary>
/// Phase 3.1: Tests for generic element path resolution.
/// Validates nested paths, repeating elements, choice types, missing paths.
/// </summary>
public class ElementPathResolverTests
{
    private readonly ElementPathResolver _resolver;
    private readonly Hl7.Fhir.Introspection.ModelInspector _inspector;

    public ElementPathResolverTests()
    {
        _resolver = new ElementPathResolver(NullLogger<ElementPathResolver>.Instance);
        _inspector = Hl7.Fhir.Introspection.ModelInspector.ForAssembly(typeof(Bundle).Assembly);
    }

    [Fact]
    public void ResolveValues_SimplePath_ReturnsSingleValue()
    {
        // Arrange
        var bundle = new Bundle
        {
            Type = Bundle.BundleType.Collection
        };

        // Act
        var results = _resolver.ResolveValues(bundle, "Bundle.type", _inspector).ToList();

        // Assert
        results.Should().HaveCount(1);
        results[0].Value.Should().NotBeNull();
        results[0].IsMissing.Should().BeFalse();
    }

    [Fact]
    public void ResolveValues_RepeatingElements_ReturnsMultipleValues()
    {
        // Arrange
        var bundle = new Bundle
        {
            Entry = new List<Bundle.EntryComponent>
            {
                new Bundle.EntryComponent { FullUrl = "http://example.org/Patient/1" },
                new Bundle.EntryComponent { FullUrl = "http://example.org/Patient/2" },
                new Bundle.EntryComponent { FullUrl = "http://example.org/Patient/3" }
            }
        };

        // Act
        var results = _resolver.ResolveValues(bundle, "Bundle.entry", _inspector).ToList();

        // Assert
        results.Should().HaveCount(3);
        results.All(r => !r.IsMissing).Should().BeTrue();
        results.All(r => r.Value is Bundle.EntryComponent).Should().BeTrue();
    }

    [Fact]
    public void ResolveValues_NestedPath_ReturnsNestedValues()
    {
        // Arrange
        var bundle = new Bundle
        {
            Entry = new List<Bundle.EntryComponent>
            {
                new Bundle.EntryComponent { FullUrl = "http://example.org/Patient/1" },
                new Bundle.EntryComponent { FullUrl = "http://example.org/Patient/2" }
            }
        };

        // Act
        var results = _resolver.ResolveValues(bundle, "Bundle.entry.fullUrl", _inspector).ToList();

        // Assert
        results.Should().HaveCount(2);
        results.All(r => !r.IsMissing).Should().BeTrue();
        // FullUrl values resolved
        results.All(r => r.Value != null).Should().BeTrue();
    }

    [Fact]
    public void ResolveValues_MissingPath_ReturnsIsMissingTrue()
    {
        // Arrange
        var bundle = new Bundle
        {
            Type = Bundle.BundleType.Collection
            // No entries
        };

        // Act
        var results = _resolver.ResolveValues(bundle, "Bundle.entry", _inspector).ToList();

        // Assert
        results.Should().HaveCount(1);
        results[0].IsMissing.Should().BeTrue();
        results[0].Value.Should().BeNull();
    }

    [Fact]
    public void ResolveValues_ChoiceType_ResolvesCorrectly()
    {
        // Arrange
        var extension = new Extension
        {
            Url = "http://example.org/test",
            Value = new FhirString("test value")
        };

        // Act - using [x] suffix
        var resultsWithSuffix = _resolver.ResolveValues(extension, "Extension.value[x]", _inspector).ToList();

        // Assert
        resultsWithSuffix.Should().HaveCount(1);
        resultsWithSuffix[0].IsMissing.Should().BeFalse();
        resultsWithSuffix[0].Value.Should().NotBeNull();
    }

    [Fact]
    public void ResolveValues_ChoiceTypeWithoutSuffix_ResolvesCorrectly()
    {
        // Arrange
        var extension = new Extension
        {
            Url = "http://example.org/test",
            Value = new Integer(42)
        };

        // Act - without [x] suffix
        var results = _resolver.ResolveValues(extension, "Extension.value", _inspector).ToList();

        // Assert
        results.Should().HaveCount(1);
        results[0].IsMissing.Should().BeFalse();
        results[0].Value.Should().NotBeNull();
    }

    [Fact]
    public void ResolveValues_NullRoot_ReturnsIsMissingTrue()
    {
        // Act
        var results = _resolver.ResolveValues(null!, "Bundle.type", _inspector).ToList();

        // Assert
        results.Should().HaveCount(1);
        results[0].IsMissing.Should().BeTrue();
        results[0].Value.Should().BeNull();
    }

    [Fact]
    public void ResolveValues_EmptyPath_ReturnsIsMissingTrue()
    {
        // Arrange
        var bundle = new Bundle();

        // Act
        var results = _resolver.ResolveValues(bundle, "", _inspector).ToList();

        // Assert
        results.Should().HaveCount(1);
        results[0].IsMissing.Should().BeTrue();
    }

    [Fact]
    public void ResolveValues_InvalidPath_ReturnsIsMissingTrue()
    {
        // Arrange
        var bundle = new Bundle();

        // Act
        var results = _resolver.ResolveValues(bundle, "Bundle.nonexistentProperty", _inspector).ToList();

        // Assert
        results.Should().HaveCount(1);
        results[0].IsMissing.Should().BeTrue();
    }

    [Fact]
    public void ResolveValues_MultipleNestedRepeatingElements_ReturnsCorrectCount()
    {
        // Arrange
        var bundle = new Bundle
        {
            Entry = new List<Bundle.EntryComponent>
            {
                new Bundle.EntryComponent 
                { 
                    Request = new Bundle.RequestComponent { Method = Bundle.HTTPVerb.GET }
                },
                new Bundle.EntryComponent 
                { 
                    Request = new Bundle.RequestComponent { Method = Bundle.HTTPVerb.POST }
                },
                new Bundle.EntryComponent 
                { 
                    // No request
                }
            }
        };

        // Act
        var results = _resolver.ResolveValues(bundle, "Bundle.entry.request", _inspector).ToList();

        // Assert
        results.Should().HaveCount(2); // Only entries with request
        results.All(r => r.Value is Bundle.RequestComponent).Should().BeTrue();
        results.All(r => !r.IsMissing).Should().BeTrue();
    }
}
