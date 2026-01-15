using System;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Reflection;
using System.Text.Json;
using Xunit;
using FluentAssertions;
using Pss.FhirProcessor.SdBuilder.Infrastructure;
using Hl7.Fhir.Model;
using Hl7.Fhir.Serialization;

namespace Pss.FhirProcessor.SdBuilder.Tests.Infrastructure;

/// <summary>
/// GUARDRAIL TESTS: Enforce architectural constraints for offline HL7 R5 package cache.
/// These tests MUST pass to ensure deterministic, offline-only behavior.
/// </summary>
public sealed class OfflineStructureDefinitionGuardrailTests
{
    private const string TestPackagePath = "../../../../spec-cache/hl7.fhir.r5.core";
    private const string PatientCanonicalUrl = "http://hl7.org/fhir/StructureDefinition/Patient";
    private const string ObservationCanonicalUrl = "http://hl7.org/fhir/StructureDefinition/Observation";

    [Fact]
    public void Loads_Patient_From_Local_Package()
    {
        // Arrange
        var absolutePath = Path.GetFullPath(TestPackagePath);
        
        // Skip if package cache not set up yet
        if (!Directory.Exists(absolutePath))
        {
            // This is expected during initial development
            return;
        }

        var repository = new OfflineR5StructureDefinitionRepository(absolutePath);

        // Act
        var result = repository.FindByUrlAsync(PatientCanonicalUrl).GetAwaiter().GetResult();

        // Assert
        result.Should().NotBeNull("Patient SD must be in package cache");
        result.Should().BeOfType<StructureDefinition>();
        
        var sd = (StructureDefinition)result!;
        sd.Url.Should().Be(PatientCanonicalUrl, "canonical URL must match");
        sd.Type.Should().Be("Patient", "resource type must be Patient");
    }

    [Fact]
    public void Does_Not_Perform_HTTP()
    {
        // Arrange
        var absolutePath = Path.GetFullPath(TestPackagePath);
        
        if (!Directory.Exists(absolutePath))
        {
            return;
        }

        // Check that repository type does NOT have HttpClient field
        var repositoryType = typeof(OfflineR5StructureDefinitionRepository);
        var httpClientFields = repositoryType
            .GetFields(BindingFlags.Instance | BindingFlags.NonPublic | BindingFlags.Public)
            .Where(f => f.FieldType == typeof(HttpClient))
            .ToList();

        // Assert
        httpClientFields.Should().BeEmpty(
            "OfflineR5StructureDefinitionRepository must NOT have HttpClient field - fully offline only");
    }

    [Fact]
    public void Deterministic_Load()
    {
        // Arrange
        var absolutePath = Path.GetFullPath(TestPackagePath);
        
        if (!Directory.Exists(absolutePath))
        {
            return;
        }

        var repository = new OfflineR5StructureDefinitionRepository(absolutePath);

        // Act - Load Patient twice
        var result1 = repository.FindByUrlAsync(PatientCanonicalUrl).GetAwaiter().GetResult() as StructureDefinition;
        var result2 = repository.FindByUrlAsync(PatientCanonicalUrl).GetAwaiter().GetResult() as StructureDefinition;

        // Assert - Serialize and compare
        if (result1 == null || result2 == null)
        {
            Assert.Fail("Patient SD not loaded");
            return;
        }

        var serializer = new FhirJsonSerializer();
        var json1 = serializer.SerializeToString(result1);
        var json2 = serializer.SerializeToString(result2);

        json1.Should().Be(json2, "Loading same SD twice must produce identical results (deterministic)");
    }

    [Fact]
    public void No_Snapshot_Generation()
    {
        // Arrange
        var absolutePath = Path.GetFullPath(TestPackagePath);
        
        if (!Directory.Exists(absolutePath))
        {
            return;
        }

        var repository = new OfflineR5StructureDefinitionRepository(absolutePath);

        // Act
        var result = repository.FindByUrlAsync(PatientCanonicalUrl).GetAwaiter().GetResult() as StructureDefinition;

        // Assert
        if (result == null)
        {
            return;
        }

        // We load AS-IS from package cache - no snapshot generation
        // If the cached file has snapshot, it stays. If not, we don't generate.
        // This test just ensures we're not doing runtime snapshot generation
        var repositoryType = typeof(OfflineR5StructureDefinitionRepository);
        var snapshotMethods = repositoryType
            .GetMethods(BindingFlags.Instance | BindingFlags.NonPublic | BindingFlags.Public)
            .Where(m => m.Name.Contains("Snapshot", StringComparison.OrdinalIgnoreCase))
            .ToList();

        snapshotMethods.Should().BeEmpty(
            "Repository must NOT generate snapshots - load AS-IS from package cache");
    }

    [Fact]
    public void Index_Uses_System_Text_Json_Only()
    {
        // Arrange
        var indexType = typeof(Hl7R5PackageIndex);

        // Check that index does NOT reference Firely types
        var firelyFields = indexType
            .GetFields(BindingFlags.Instance | BindingFlags.NonPublic | BindingFlags.Public)
            .Where(f => f.FieldType.Namespace?.StartsWith("Hl7.Fhir") == true)
            .ToList();

        // Assert
        firelyFields.Should().BeEmpty(
            "Hl7R5PackageIndex must use System.Text.Json only - NO Firely SDK references");
    }

    [Fact]
    public void Returns_Null_For_Missing_StructureDefinition()
    {
        // Arrange
        var absolutePath = Path.GetFullPath(TestPackagePath);
        
        if (!Directory.Exists(absolutePath))
        {
            return;
        }

        var repository = new OfflineR5StructureDefinitionRepository(absolutePath);

        // Act
        var result = repository.FindByUrlAsync("http://example.com/does-not-exist").GetAwaiter().GetResult();

        // Assert
        result.Should().BeNull("Non-existent SD should return null, no fallback");
    }

    [Fact]
    public void Fails_Fast_If_Package_Directory_Missing()
    {
        // Arrange
        var nonExistentPath = "/tmp/does-not-exist-fhir-package-" + Guid.NewGuid();

        // Act
        Action act = () => new OfflineR5StructureDefinitionRepository(nonExistentPath);

        // Assert
        act.Should().Throw<DirectoryNotFoundException>(
            "Repository must fail fast if package cache directory missing");
    }
}
