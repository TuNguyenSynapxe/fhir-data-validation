using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Pss.FhirProcessor.Application.Projects.Queries;
using Pss.FhirProcessor.Persistence.Data;
using Pss.FhirProcessor.Persistence.Models;

namespace Pss.FhirProcessor.Application.Tests.Projects.Queries;

/// <summary>
/// Phase 10.1: Tests for ProjectStructureDefinitionQueryService.
/// Validates read-model exposure of Phase 10.0 classification results.
/// </summary>
public class ProjectStructureDefinitionQueryServiceTests : IDisposable
{
    private readonly FhirProcessorDbContext _dbContext;
    private readonly ProjectStructureDefinitionQueryService _service;
    private readonly string _testDbName;

    public ProjectStructureDefinitionQueryServiceTests()
    {
        _testDbName = $"TestDb_{Guid.NewGuid()}";
        var options = new DbContextOptionsBuilder<FhirProcessorDbContext>()
            .UseInMemoryDatabase(_testDbName)
            .Options;

        _dbContext = new FhirProcessorDbContext(options);
        _service = new ProjectStructureDefinitionQueryService(_dbContext);
    }

    [Fact]
    public async Task GetPromotedStructureDefinitions_ProjectWithPromotedSDs_ReturnsAll()
    {
        // Arrange
        var projectId = Guid.NewGuid();
        var project = new Project
        {
            Id = projectId,
            Name = "Test Project",
            PolicyMode = PolicyMode.Strict,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        _dbContext.Projects.Add(project);

        // Create 3 promoted SDs (2 ValidationProfile + 1 BundleProfile)
        var sd1 = CreatePromotedSD(projectId, "Patient", "MyPatient", StructureDefinitionRole.ValidationProfile);
        var sd2 = CreatePromotedSD(projectId, "Observation", "MyObservation", StructureDefinitionRole.ValidationProfile);
        var sd3 = CreatePromotedSD(projectId, "Bundle", "MyBundle", StructureDefinitionRole.BundleProfile);

        _dbContext.ProjectArtifacts.AddRange(sd1, sd2, sd3);

        // Create 1 non-promoted SD (SupportingArtifact)
        var sd4 = CreateNonPromotedSD(projectId, "Extension");
        _dbContext.ProjectArtifacts.Add(sd4);

        await _dbContext.SaveChangesAsync();

        // Act
        var results = await _service.GetPromotedStructureDefinitionsAsync(projectId);

        // Assert
        results.Should().HaveCount(3, "only promoted SDs should be returned");
        results.Should().Contain(r => r.Name == "MyPatient");
        results.Should().Contain(r => r.Name == "MyObservation");
        results.Should().Contain(r => r.Name == "MyBundle");
        results.Should().NotContain(r => r.ResourceType == "Extension");

        // Verify roles
        results.Count(r => r.Role == StructureDefinitionRole.ValidationProfile).Should().Be(2);
        results.Count(r => r.Role == StructureDefinitionRole.BundleProfile).Should().Be(1);
    }

    [Fact]
    public async Task GetPromotedStructureDefinitions_ProjectWithNoPromotedSDs_ReturnsEmptyList()
    {
        // Arrange
        var projectId = Guid.NewGuid();
        var project = new Project
        {
            Id = projectId,
            Name = "Test Project",
            PolicyMode = PolicyMode.Strict,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        _dbContext.Projects.Add(project);

        // Create only non-promoted SDs
        var sd1 = CreateNonPromotedSD(projectId, "Extension");
        var sd2 = CreateNonPromotedSD(projectId, "Extension");
        _dbContext.ProjectArtifacts.AddRange(sd1, sd2);

        await _dbContext.SaveChangesAsync();

        // Act
        var results = await _service.GetPromotedStructureDefinitionsAsync(projectId);

        // Assert
        results.Should().BeEmpty("project has no promoted SDs");
    }

    [Fact]
    public async Task GetPromotedStructureDefinitions_ProjectWithMixedArtifacts_ReturnsOnlySDs()
    {
        // Arrange
        var projectId = Guid.NewGuid();
        var project = new Project
        {
            Id = projectId,
            Name = "Test Project",
            PolicyMode = PolicyMode.Strict,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        _dbContext.Projects.Add(project);

        // Create promoted SD
        var sd = CreatePromotedSD(projectId, "Patient", "MyPatient", StructureDefinitionRole.ValidationProfile);
        _dbContext.ProjectArtifacts.Add(sd);

        // Create non-SD artifacts (ValueSet, CodeSystem)
        var vs = new ProjectArtifact
        {
            Id = Guid.NewGuid(),
            ProjectId = projectId,
            ArtifactType = ArtifactType.ValueSet,
            FilePath = "ValueSet/test.json",
            FileName = "test.json",
            ResourceType = "ValueSet",
            CanonicalUrl = "http://example.com/ValueSet/test",
            ResourceJson = """{"resourceType":"ValueSet","name":"TestValueSet"}""",
            Hash = "hash",
            CreatedAt = DateTimeOffset.UtcNow
        };
        _dbContext.ProjectArtifacts.Add(vs);

        await _dbContext.SaveChangesAsync();

        // Act
        var results = await _service.GetPromotedStructureDefinitionsAsync(projectId);

        // Assert
        results.Should().HaveCount(1, "only SDs should be returned, not ValueSets");
        results[0].Name.Should().Be("MyPatient");
    }

    [Fact]
    public async Task GetPromotedStructureDefinitions_ExtractsNameFromTitle()
    {
        // Arrange
        var projectId = Guid.NewGuid();
        var project = new Project
        {
            Id = projectId,
            Name = "Test Project",
            PolicyMode = PolicyMode.Strict,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        _dbContext.Projects.Add(project);

        var sd = new ProjectArtifact
        {
            Id = Guid.NewGuid(),
            ProjectId = projectId,
            ArtifactType = ArtifactType.StructureDefinition,
            FilePath = "StructureDefinition/Patient.json",
            FileName = "Patient.json",
            ResourceType = "StructureDefinition",
            CanonicalUrl = "http://example.com/StructureDefinition/Patient",
            ResourceJson = """
            {
              "resourceType": "StructureDefinition",
              "title": "My Patient Profile",
              "name": "MyPatientProfile",
              "type": "Patient"
            }
            """,
            Hash = "hash",
            StructureDefinitionRole = StructureDefinitionRole.ValidationProfile,
            IsPromoted = true,
            CreatedAt = DateTimeOffset.UtcNow
        };
        _dbContext.ProjectArtifacts.Add(sd);

        await _dbContext.SaveChangesAsync();

        // Act
        var results = await _service.GetPromotedStructureDefinitionsAsync(projectId);

        // Assert
        results.Should().HaveCount(1);
        results[0].Name.Should().Be("My Patient Profile", "title field should be preferred");
        results[0].ResourceType.Should().Be("Patient");
    }

    [Fact]
    public async Task GetPromotedStructureDefinitions_FallsBackToNameWhenNoTitle()
    {
        // Arrange
        var projectId = Guid.NewGuid();
        var project = new Project
        {
            Id = projectId,
            Name = "Test Project",
            PolicyMode = PolicyMode.Strict,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        _dbContext.Projects.Add(project);

        var sd = new ProjectArtifact
        {
            Id = Guid.NewGuid(),
            ProjectId = projectId,
            ArtifactType = ArtifactType.StructureDefinition,
            FilePath = "StructureDefinition/Patient.json",
            FileName = "Patient.json",
            ResourceType = "StructureDefinition",
            CanonicalUrl = "http://example.com/StructureDefinition/Patient",
            ResourceJson = """
            {
              "resourceType": "StructureDefinition",
              "name": "MyPatientProfile",
              "type": "Patient"
            }
            """,
            Hash = "hash",
            StructureDefinitionRole = StructureDefinitionRole.ValidationProfile,
            IsPromoted = true,
            CreatedAt = DateTimeOffset.UtcNow
        };
        _dbContext.ProjectArtifacts.Add(sd);

        await _dbContext.SaveChangesAsync();

        // Act
        var results = await _service.GetPromotedStructureDefinitionsAsync(projectId);

        // Assert
        results.Should().HaveCount(1);
        results[0].Name.Should().Be("MyPatientProfile", "name field should be used when title is missing");
    }

    [Fact]
    public async Task GetPromotedStructureDefinitions_FallsBackToFilenameWhenNoTitleOrName()
    {
        // Arrange
        var projectId = Guid.NewGuid();
        var project = new Project
        {
            Id = projectId,
            Name = "Test Project",
            PolicyMode = PolicyMode.Strict,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        _dbContext.Projects.Add(project);

        var sd = new ProjectArtifact
        {
            Id = Guid.NewGuid(),
            ProjectId = projectId,
            ArtifactType = ArtifactType.StructureDefinition,
            FilePath = "StructureDefinition/MyPatient.json",
            FileName = "MyPatient.json",
            ResourceType = "StructureDefinition",
            CanonicalUrl = "http://example.com/StructureDefinition/Patient",
            ResourceJson = """
            {
              "resourceType": "StructureDefinition",
              "type": "Patient"
            }
            """,
            Hash = "hash",
            StructureDefinitionRole = StructureDefinitionRole.ValidationProfile,
            IsPromoted = true,
            CreatedAt = DateTimeOffset.UtcNow
        };
        _dbContext.ProjectArtifacts.Add(sd);

        await _dbContext.SaveChangesAsync();

        // Act
        var results = await _service.GetPromotedStructureDefinitionsAsync(projectId);

        // Assert
        results.Should().HaveCount(1);
        results[0].Name.Should().Be("MyPatient", "filename without extension should be used as fallback");
    }

    [Fact]
    public async Task GetPromotedStructureDefinitions_OrderedDeterministically()
    {
        // Arrange
        var projectId = Guid.NewGuid();
        var project = new Project
        {
            Id = projectId,
            Name = "Test Project",
            PolicyMode = PolicyMode.Strict,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        _dbContext.Projects.Add(project);

        // Create SDs with alphabetically sortable filenames
        var sd1 = CreatePromotedSD(projectId, "Patient", "Patient", StructureDefinitionRole.ValidationProfile, "C_Patient.json");
        var sd2 = CreatePromotedSD(projectId, "Observation", "Observation", StructureDefinitionRole.ValidationProfile, "A_Observation.json");
        var sd3 = CreatePromotedSD(projectId, "Bundle", "Bundle", StructureDefinitionRole.BundleProfile, "B_Bundle.json");

        _dbContext.ProjectArtifacts.AddRange(sd1, sd2, sd3);
        await _dbContext.SaveChangesAsync();

        // Act
        var results = await _service.GetPromotedStructureDefinitionsAsync(projectId);

        // Assert
        results.Should().HaveCount(3);
        results[0].Name.Should().Be("Observation", "ordered by filename");
        results[1].Name.Should().Be("Bundle");
        results[2].Name.Should().Be("Patient");
    }

    [Fact]
    public async Task ProjectExists_ExistingProject_ReturnsTrue()
    {
        // Arrange
        var projectId = Guid.NewGuid();
        var project = new Project
        {
            Id = projectId,
            Name = "Test Project",
            PolicyMode = PolicyMode.Strict,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        _dbContext.Projects.Add(project);
        await _dbContext.SaveChangesAsync();

        // Act
        var exists = await _service.ProjectExistsAsync(projectId);

        // Assert
        exists.Should().BeTrue();
    }

    [Fact]
    public async Task ProjectExists_NonExistingProject_ReturnsFalse()
    {
        // Arrange
        var projectId = Guid.NewGuid();

        // Act
        var exists = await _service.ProjectExistsAsync(projectId);

        // Assert
        exists.Should().BeFalse();
    }

    // Helper methods

    private ProjectArtifact CreatePromotedSD(
        Guid projectId,
        string resourceType,
        string name,
        StructureDefinitionRole role,
        string fileName = "test.json")
    {
        return new ProjectArtifact
        {
            Id = Guid.NewGuid(),
            ProjectId = projectId,
            ArtifactType = ArtifactType.StructureDefinition,
            FilePath = $"StructureDefinition/{fileName}",
            FileName = fileName,
            ResourceType = "StructureDefinition",
            CanonicalUrl = $"http://example.com/StructureDefinition/{name}",
            ResourceJson = $$"""
            {
              "resourceType": "StructureDefinition",
              "name": "{{name}}",
              "type": "{{resourceType}}"
            }
            """,
            Hash = "hash",
            StructureDefinitionRole = role,
            IsPromoted = true,
            CreatedAt = DateTimeOffset.UtcNow
        };
    }

    private ProjectArtifact CreateNonPromotedSD(Guid projectId, string resourceType)
    {
        return new ProjectArtifact
        {
            Id = Guid.NewGuid(),
            ProjectId = projectId,
            ArtifactType = ArtifactType.StructureDefinition,
            FilePath = $"StructureDefinition/{resourceType}.json",
            FileName = $"{resourceType}.json",
            ResourceType = "StructureDefinition",
            CanonicalUrl = $"http://example.com/StructureDefinition/{resourceType}",
            ResourceJson = $$"""
            {
              "resourceType": "StructureDefinition",
              "name": "{{resourceType}}",
              "type": "{{resourceType}}"
            }
            """,
            Hash = "hash",
            StructureDefinitionRole = StructureDefinitionRole.SupportingArtifact,
            IsPromoted = false,
            CreatedAt = DateTimeOffset.UtcNow
        };
    }

    public void Dispose()
    {
        _dbContext?.Dispose();
    }
}
