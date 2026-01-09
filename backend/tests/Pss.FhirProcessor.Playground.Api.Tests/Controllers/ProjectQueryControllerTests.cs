using System.Net;
using System.Text.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Pss.FhirProcessor.Application.Projects.Import;
using Pss.FhirProcessor.Persistence.Data;
using Pss.FhirProcessor.Persistence.Models;
using Pss.FhirProcessor.Playground.Api.Dtos;

namespace Pss.FhirProcessor.Playground.Api.Tests.Controllers;

/// <summary>
/// Phase 7.4: Integration tests for read-only project query APIs.
/// Tests GET endpoints for projects, artifacts, bundles, and rules.
/// </summary>
public class ProjectQueryControllerTests : IClassFixture<WebApplicationFactory<Program>>, IDisposable
{
    private readonly WebApplicationFactory<Program> _factory;
    private readonly HttpClient _client;
    private readonly string _dbName;
    private readonly string _tempDir;

    public ProjectQueryControllerTests(WebApplicationFactory<Program> factory)
    {
        _tempDir = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());
        Directory.CreateDirectory(_tempDir);
        _dbName = "TestDb_" + Guid.NewGuid();

        _factory = factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureServices(services =>
            {
                // Remove existing DbContext
                var descriptor = services.SingleOrDefault(
                    d => d.ServiceType == typeof(DbContextOptions<FhirProcessorDbContext>));
                if (descriptor != null)
                {
                    services.Remove(descriptor);
                }

                var contextDescriptor = services.SingleOrDefault(
                    d => d.ServiceType == typeof(FhirProcessorDbContext));
                if (contextDescriptor != null)
                {
                    services.Remove(contextDescriptor);
                }

                // Add in-memory database
                services.AddDbContext<FhirProcessorDbContext>(options =>
                {
                    options.UseInMemoryDatabase(_dbName);
                    options.EnableSensitiveDataLogging();
                });
            });
        });

        _client = _factory.CreateClient();
    }

    public void Dispose()
    {
        _client?.Dispose();
        if (Directory.Exists(_tempDir))
        {
            Directory.Delete(_tempDir, true);
        }
    }

    [Fact]
    public async Task GetAllProjects_EmptyDatabase_ReturnsEmptyList()
    {
        // Act
        var response = await _client.GetAsync("/api/v2/projects");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadAsStringAsync();
        var projects = JsonSerializer.Deserialize<List<ProjectListItemDto>>(content,
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

        projects.Should().NotBeNull();
        projects.Should().BeEmpty();
    }

    [Fact]
    public async Task GetAllProjects_WithImportedProject_ReturnsProjectWithCounts()
    {
        // Arrange
        var projectId = await SeedProjectViaImportAsync();

        // Act
        var response = await _client.GetAsync("/api/v2/projects");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadAsStringAsync();
        var projects = JsonSerializer.Deserialize<List<ProjectListItemDto>>(content,
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

        projects.Should().NotBeNull();
        projects.Should().HaveCount(1);

        var project = projects![0];
        project.ProjectId.Should().Be(projectId);
        project.Name.Should().Be("test.package v1.0.0");
        project.ArtifactCount.Should().Be(3);
        project.BundleCount.Should().Be(1);
        project.RuleCount.Should().Be(1);
    }

    [Fact]
    public async Task GetProjectDetails_ExistingProject_ReturnsDetailsWithCounts()
    {
        // Arrange
        var projectId = await SeedProjectViaImportAsync();

        // Act
        var response = await _client.GetAsync($"/api/v2/projects/{projectId}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadAsStringAsync();
        var details = JsonSerializer.Deserialize<ProjectDetailsDto>(content,
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

        details.Should().NotBeNull();
        details!.ProjectId.Should().Be(projectId);
        details.Name.Should().Be("test.package v1.0.0");
        details.Counts.ArtifactCount.Should().Be(3);
        details.Counts.BundleCount.Should().Be(1);
        details.Counts.RuleCount.Should().Be(1);
    }

    [Fact]
    public async Task GetProjectDetails_NonExistentProject_Returns404()
    {
        // Arrange
        var nonExistentId = Guid.NewGuid();

        // Act
        var response = await _client.GetAsync($"/api/v2/projects/{nonExistentId}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetProjectArtifacts_ExistingProject_ReturnsArtifactsWithoutJson()
    {
        // Arrange
        var projectId = await SeedProjectViaImportAsync();

        // Act
        var response = await _client.GetAsync($"/api/v2/projects/{projectId}/artifacts");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadAsStringAsync();
        var artifacts = JsonSerializer.Deserialize<List<ProjectArtifactDto>>(content,
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

        artifacts.Should().NotBeNull();
        artifacts.Should().HaveCount(3);

        // Verify no JSON content is returned
        var artifact = artifacts![0];
        artifact.ArtifactId.Should().NotBeEmpty();
        artifact.ResourceType.Should().NotBeNullOrEmpty();
        artifact.FileName.Should().NotBeNullOrEmpty();
        artifact.Hash.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task GetProjectBundles_ExistingProject_ReturnsBundlesWithoutJson()
    {
        // Arrange
        var projectId = await SeedProjectViaImportAsync();

        // Act
        var response = await _client.GetAsync($"/api/v2/projects/{projectId}/bundles");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadAsStringAsync();
        var bundles = JsonSerializer.Deserialize<List<ProjectBundleDto>>(content,
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

        bundles.Should().NotBeNull();
        bundles.Should().HaveCount(1);

        var bundle = bundles![0];
        bundle.BundleId.Should().NotBeEmpty();
        bundle.Name.Should().NotBeNullOrEmpty();
        bundle.Source.Should().Be(BundleSource.ImportedExample);
    }

    [Fact]
    public async Task GetProjectRules_ExistingProject_ReturnsRulesWithProvenance()
    {
        // Arrange
        var projectId = await SeedProjectViaImportAsync();

        // Act
        var response = await _client.GetAsync($"/api/v2/projects/{projectId}/rules");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadAsStringAsync();
        var rules = JsonSerializer.Deserialize<List<ProjectRuleDto>>(content,
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

        rules.Should().NotBeNull();
        rules.Should().HaveCount(1);

        // CRITICAL: Verify rule provenance is preserved
        var rule = rules![0];
        rule.RuleId.Should().NotBeEmpty();
        rule.Provenance.Should().Be(RuleProvenance.ImportedGenerated);
        rule.Title.Should().NotBeNullOrEmpty();
        rule.IsEnabled.Should().BeTrue();
    }

    [Fact]
    public async Task GetProjectArtifacts_NonExistentProject_Returns404()
    {
        // Arrange
        var nonExistentId = Guid.NewGuid();

        // Act
        var response = await _client.GetAsync($"/api/v2/projects/{nonExistentId}/artifacts");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetProjectBundles_NonExistentProject_Returns404()
    {
        // Arrange
        var nonExistentId = Guid.NewGuid();

        // Act
        var response = await _client.GetAsync($"/api/v2/projects/{nonExistentId}/bundles");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetProjectRules_NonExistentProject_Returns404()
    {
        // Arrange
        var nonExistentId = Guid.NewGuid();

        // Act
        var response = await _client.GetAsync($"/api/v2/projects/{nonExistentId}/rules");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    /// <summary>
    /// Seed a project using Phase 7.2 import service (simulates real import flow).
    /// </summary>
    private async Task<Guid> SeedProjectViaImportAsync()
    {
        var zipPath = CreateValidR5Package();

        using var scope = _factory.Services.CreateScope();
        var importService = scope.ServiceProvider.GetRequiredService<ProjectImportService>();

        var projectId = await importService.ImportPackageAsync(
            zipPath,
            PolicyMode.Strict,
            CancellationToken.None);

        return projectId;
    }

    /// <summary>
    /// Create a minimal valid R5 package for testing.
    /// </summary>
    private string CreateValidR5Package()
    {
        var zipPath = Path.Combine(_tempDir, "test-package.zip");

        using var archive = System.IO.Compression.ZipFile.Open(zipPath, System.IO.Compression.ZipArchiveMode.Create);

        // Add package.json
        var packageEntry = archive.CreateEntry("package.json");
        using (var writer = new StreamWriter(packageEntry.Open()))
        {
            writer.Write("""
            {
              "name": "test.package",
              "version": "1.0.0",
              "fhirVersions": ["5.0.0"]
            }
            """);
        }

        // Add StructureDefinition
        var sdEntry = archive.CreateEntry("StructureDefinition-Patient.json");
        using (var writer = new StreamWriter(sdEntry.Open()))
        {
            writer.Write("""
            {
              "resourceType": "StructureDefinition",
              "url": "http://example.com/StructureDefinition/Patient",
              "name": "PatientProfile",
              "status": "active",
              "kind": "resource",
              "type": "Patient"
            }
            """);
        }

        // Add ValueSet
        var vsEntry = archive.CreateEntry("ValueSet-Example.json");
        using (var writer = new StreamWriter(vsEntry.Open()))
        {
            writer.Write("""
            {
              "resourceType": "ValueSet",
              "url": "http://example.com/ValueSet/Example",
              "name": "ExampleValueSet",
              "status": "active"
            }
            """);
        }

        // Add Bundle
        var bundleEntry = archive.CreateEntry("Bundle-Example.json");
        using (var writer = new StreamWriter(bundleEntry.Open()))
        {
            writer.Write("""
            {
              "resourceType": "Bundle",
              "type": "collection",
              "entry": []
            }
            """);
        }

        return zipPath;
    }
}
