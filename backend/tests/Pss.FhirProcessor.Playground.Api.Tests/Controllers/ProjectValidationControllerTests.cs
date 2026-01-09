using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Pss.FhirProcessor.Application.Projects.Import;
using Pss.FhirProcessor.Application.ValidationExecution;
using Pss.FhirProcessor.Application.ValidationExecution.Interfaces;
using Pss.FhirProcessor.Engine.Core;
using Pss.FhirProcessor.Engine.Models;
using Pss.FhirProcessor.Persistence.Data;
using Pss.FhirProcessor.Persistence.Models;
using Pss.FhirProcessor.Playground.Api.Dtos.Validation;
using Xunit;

namespace Pss.FhirProcessor.Playground.Api.Tests.Controllers;

/// <summary>
/// Phase 8.2: Integration tests for ProjectValidationController.
/// Tests HTTP → Application → InMemory DB → Mocked validation pipeline.
/// </summary>
public sealed class ProjectValidationControllerTests : IDisposable
{
    private readonly WebApplicationFactory<Program> _factory;
    private readonly HttpClient _client;
    private readonly string _dbName;
    private readonly string _tempDir;

    public ProjectValidationControllerTests()
    {
        _dbName = $"TestDb_{Guid.NewGuid()}";
        _tempDir = Path.Combine(Path.GetTempPath(), $"test_{Guid.NewGuid()}");
        Directory.CreateDirectory(_tempDir);

        // Create mock validation pipeline that returns empty ValidationResponse
        var mockPipeline = new Mock<IValidationPipeline>();
        mockPipeline
            .Setup(p => p.ValidateAsync(It.IsAny<ValidationRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ValidationResponse
            {
                Errors = new List<ValidationError>(),
                Summary = new ValidationSummary
                {
                    TotalErrors = 0,
                    ErrorCount = 0,
                    WarningCount = 0,
                    InfoCount = 0
                },
                Metadata = new ValidationMetadata
                {
                    Timestamp = DateTime.UtcNow,
                    FhirVersion = "5.0.0",
                    ProcessingTimeMs = 10
                }
            });

        _factory = new WebApplicationFactory<Program>()
            .WithWebHostBuilder(builder =>
            {
                builder.ConfigureServices(services =>
                {
                    // Replace DbContext with in-memory database
                    var descriptor = services.SingleOrDefault(
                        d => d.ServiceType == typeof(DbContextOptions<FhirProcessorDbContext>));
                    if (descriptor != null)
                    {
                        services.Remove(descriptor);
                    }

                    services.AddDbContext<FhirProcessorDbContext>(options =>
                    {
                        options.UseInMemoryDatabase(_dbName);
                    });

                    // Replace IValidationPipeline with mock
                    var pipelineDescriptor = services.SingleOrDefault(
                        d => d.ServiceType == typeof(IValidationPipeline));
                    if (pipelineDescriptor != null)
                    {
                        services.Remove(pipelineDescriptor);
                    }
                    services.AddSingleton(mockPipeline.Object);

                    // Register Phase 7.2 import services for realistic test data
                    services.AddScoped<SimplifierPackageParser>();
                    services.AddScoped<ArtifactClassifier>();
                    services.AddScoped<StructureDefinitionRuleGenerator>();
                    services.AddScoped<ProjectImportService>();

                    // Ensure Phase 8.1 service is registered
                    services.AddScoped<IProjectValidationExecutionService, ProjectValidationExecutionService>();
                });
            });

        _client = _factory.CreateClient();
    }

    public void Dispose()
    {
        _client.Dispose();
        _factory.Dispose();
        if (Directory.Exists(_tempDir))
        {
            Directory.Delete(_tempDir, true);
        }
    }

    [Fact]
    public async Task ExecuteValidation_ValidProjectAndBundle_Returns200Ok()
    {
        // Arrange: Import project with Phase 7.2 service
        var projectId = await SeedImportedProjectAsync();
        var bundleId = await GetFirstBundleIdAsync(projectId);

        // Act: Execute validation via HTTP
        var response = await _client.PostAsync(
            $"/api/v2/projects/{projectId}/bundles/{bundleId}/validate",
            null);

        // Assert: HTTP 200 OK with validation response
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var result = await response.Content.ReadFromJsonAsync<ExecuteValidationResponse>();
        result.Should().NotBeNull();
        result!.ProjectId.Should().Be(projectId);
        result.BundleId.Should().Be(bundleId);
        result.PolicyMode.Should().Be("strict");
        result.Issues.Should().NotBeNull();
        result.Summary.Should().NotBeNull();
        result.Summary.TotalErrors.Should().Be(0); // Mocked pipeline returns empty errors
    }

    [Fact]
    public async Task ExecuteValidation_ProjectNotFound_Returns404NotFound()
    {
        // Arrange: Non-existent project ID
        var projectId = Guid.NewGuid();
        var bundleId = Guid.NewGuid();

        // Act
        var response = await _client.PostAsync(
            $"/api/v2/projects/{projectId}/bundles/{bundleId}/validate",
            null);

        // Assert: HTTP 404 with error code
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);

        var error = await response.Content.ReadFromJsonAsync<ValidationExecutionErrorDto>();
        error.Should().NotBeNull();
        error!.Code.Should().Be(ValidationExecutionException.ErrorCodes.PROJECT_NOT_FOUND);
        error.Message.Should().Contain(projectId.ToString());
    }

    [Fact]
    public async Task ExecuteValidation_BundleNotFound_Returns404NotFound()
    {
        // Arrange: Valid project, non-existent bundle
        var projectId = await SeedImportedProjectAsync();
        var bundleId = Guid.NewGuid();

        // Act
        var response = await _client.PostAsync(
            $"/api/v2/projects/{projectId}/bundles/{bundleId}/validate",
            null);

        // Assert: HTTP 404 with error code
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);

        var error = await response.Content.ReadFromJsonAsync<ValidationExecutionErrorDto>();
        error.Should().NotBeNull();
        error!.Code.Should().Be(ValidationExecutionException.ErrorCodes.BUNDLE_NOT_FOUND);
        error.Message.Should().Contain(bundleId.ToString());
    }

    [Fact]
    public async Task ExecuteValidation_BundleDoesNotBelongToProject_Returns404NotFound()
    {
        // Arrange: Two projects, bundle belongs to project A, request with project B
        var projectIdA = await SeedImportedProjectAsync();
        var projectIdB = await SeedImportedProjectAsync();
        var bundleIdA = await GetFirstBundleIdAsync(projectIdA);

        // Act: Try to validate project B's non-existent bundle (actually belongs to A)
        var response = await _client.PostAsync(
            $"/api/v2/projects/{projectIdB}/bundles/{bundleIdA}/validate",
            null);

        // Assert: HTTP 404 (bundle not found in project B's context)
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);

        var error = await response.Content.ReadFromJsonAsync<ValidationExecutionErrorDto>();
        error.Should().NotBeNull();
        error!.Code.Should().Be(ValidationExecutionException.ErrorCodes.BUNDLE_NOT_FOUND);
    }

    [Fact]
    public async Task ExecuteValidation_InvalidBundleJson_Returns400BadRequest()
    {
        // Arrange: Project with invalid bundle JSON
        var projectId = await SeedProjectWithInvalidBundleAsync();
        var bundleId = await GetFirstBundleIdAsync(projectId);

        // Act
        var response = await _client.PostAsync(
            $"/api/v2/projects/{projectId}/bundles/{bundleId}/validate",
            null);

        // Assert: HTTP 400 with error code
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var error = await response.Content.ReadFromJsonAsync<ValidationExecutionErrorDto>();
        error.Should().NotBeNull();
        error!.Code.Should().Be(ValidationExecutionException.ErrorCodes.INVALID_BUNDLE_JSON);
        error.Message.Should().Contain("JSON");
    }

    [Fact]
    public async Task ExecuteValidation_WithPolicyModeInRequest_UsesSpecifiedMode()
    {
        // Arrange
        var projectId = await SeedImportedProjectAsync();
        var bundleId = await GetFirstBundleIdAsync(projectId);

        var request = new ExecuteValidationRequest
        {
            PolicyMode = "permissive"
        };

        // Act
        var response = await _client.PostAsJsonAsync(
            $"/api/v2/projects/{projectId}/bundles/{bundleId}/validate",
            request);

        // Assert: HTTP 200 OK with specified policy mode
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var result = await response.Content.ReadFromJsonAsync<ExecuteValidationResponse>();
        result.Should().NotBeNull();
        result!.PolicyMode.Should().Be("permissive");
    }

    [Fact]
    public async Task ExecuteValidation_SameInputTwice_ReturnsDeterministicResult()
    {
        // Arrange
        var projectId = await SeedImportedProjectAsync();
        var bundleId = await GetFirstBundleIdAsync(projectId);

        // Act: Execute validation twice
        var response1 = await _client.PostAsync(
            $"/api/v2/projects/{projectId}/bundles/{bundleId}/validate",
            null);

        var response2 = await _client.PostAsync(
            $"/api/v2/projects/{projectId}/bundles/{bundleId}/validate",
            null);

        // Assert: Both requests return same results (deterministic)
        response1.StatusCode.Should().Be(HttpStatusCode.OK);
        response2.StatusCode.Should().Be(HttpStatusCode.OK);

        var result1 = await response1.Content.ReadFromJsonAsync<ExecuteValidationResponse>();
        var result2 = await response2.Content.ReadFromJsonAsync<ExecuteValidationResponse>();

        result1.Should().NotBeNull();
        result2.Should().NotBeNull();
        result1!.Summary.TotalErrors.Should().Be(result2!.Summary.TotalErrors);
        result1.Summary.WarningCount.Should().Be(result2.Summary.WarningCount);
        result1.Issues.Count.Should().Be(result2.Issues.Count);
    }

    [Fact]
    public async Task ExecuteValidation_CancellationToken_Returns499ClientClosedRequest()
    {
        // Arrange
        var projectId = await SeedImportedProjectAsync();
        var bundleId = await GetFirstBundleIdAsync(projectId);

        // Create mock pipeline that throws OperationCanceledException
        var mockPipeline = new Mock<IValidationPipeline>();
        mockPipeline
            .Setup(p => p.ValidateAsync(It.IsAny<ValidationRequest>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new OperationCanceledException("Validation cancelled"));

        // Create new factory with cancellation mock
        using var factory = new WebApplicationFactory<Program>()
            .WithWebHostBuilder(builder =>
            {
                builder.ConfigureServices(services =>
                {
                    var descriptor = services.SingleOrDefault(
                        d => d.ServiceType == typeof(DbContextOptions<FhirProcessorDbContext>));
                    if (descriptor != null)
                    {
                        services.Remove(descriptor);
                    }

                    services.AddDbContext<FhirProcessorDbContext>(options =>
                    {
                        options.UseInMemoryDatabase(_dbName);
                    });

                    var pipelineDescriptor = services.SingleOrDefault(
                        d => d.ServiceType == typeof(IValidationPipeline));
                    if (pipelineDescriptor != null)
                    {
                        services.Remove(pipelineDescriptor);
                    }
                    services.AddSingleton(mockPipeline.Object);

                    services.AddScoped<SimplifierPackageParser>();
                    services.AddScoped<ArtifactClassifier>();
                    services.AddScoped<StructureDefinitionRuleGenerator>();
                    services.AddScoped<ProjectImportService>();
                    services.AddScoped<IProjectValidationExecutionService, ProjectValidationExecutionService>();
                });
            });

        using var client = factory.CreateClient();

        // Act
        var response = await client.PostAsync(
            $"/api/v2/projects/{projectId}/bundles/{bundleId}/validate",
            null);

        // Assert: HTTP 499 (Client Closed Request)
        response.StatusCode.Should().Be((HttpStatusCode)499);

        var error = await response.Content.ReadFromJsonAsync<ValidationExecutionErrorDto>();
        error.Should().NotBeNull();
        error!.Code.Should().Be(ValidationExecutionException.ErrorCodes.CANCELLED);
    }

    // Helper methods

    /// <summary>
    /// Seed a project by importing a valid R5 package via Phase 7.2 service.
    /// </summary>
    private async Task<Guid> SeedImportedProjectAsync()
    {
        using var scope = _factory.Services.CreateScope();
        var importService = scope.ServiceProvider.GetRequiredService<ProjectImportService>();

        var packagePath = CreateValidR5Package();
        var projectId = await importService.ImportPackageAsync(
            packagePath,
            PolicyMode.Strict,
            CancellationToken.None);

        return projectId;
    }

    /// <summary>
    /// Seed a project with invalid bundle JSON for testing error cases.
    /// </summary>
    private async Task<Guid> SeedProjectWithInvalidBundleAsync()
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<FhirProcessorDbContext>();

        var project = new Project
        {
            Id = Guid.NewGuid(),
            Name = "Test Project with Invalid Bundle",
            PolicyMode = PolicyMode.Strict,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var bundle = new ProjectBundle
        {
            Id = Guid.NewGuid(),
            ProjectId = project.Id,
            Name = "Invalid Bundle",
            BundleJson = "not valid json", // Invalid JSON
            CreatedAt = DateTime.UtcNow
        };

        dbContext.Projects.Add(project);
        dbContext.ProjectBundles.Add(bundle);
        await dbContext.SaveChangesAsync();

        return project.Id;
    }

    /// <summary>
    /// Get the first bundle ID for a project.
    /// </summary>
    private async Task<Guid> GetFirstBundleIdAsync(Guid projectId)
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<FhirProcessorDbContext>();

        var bundle = await dbContext.ProjectBundles
            .Where(b => b.ProjectId == projectId)
            .FirstOrDefaultAsync();

        if (bundle == null)
        {
            throw new InvalidOperationException($"No bundles found for project {projectId}");
        }

        return bundle.Id;
    }

    /// <summary>
    /// Create a minimal valid R5 package ZIP for import testing.
    /// </summary>
    private string CreateValidR5Package()
    {
        var packageDir = Path.Combine(_tempDir, $"package_{Guid.NewGuid()}");
        Directory.CreateDirectory(packageDir);

        // Create package.json
        var packageJson = new
        {
            name = "test.r5.package",
            version = "1.0.0",
            fhirVersions = new[] { "5.0.0" }
        };
        File.WriteAllText(
            Path.Combine(packageDir, "package.json"),
            JsonSerializer.Serialize(packageJson, new JsonSerializerOptions { WriteIndented = true }));

        // Create example StructureDefinition
        var structureDefinition = new
        {
            resourceType = "StructureDefinition",
            id = "test-patient",
            url = "http://example.org/StructureDefinition/test-patient",
            name = "TestPatient",
            status = "draft",
            kind = "resource",
            @abstract = false,
            type = "Patient"
        };
        File.WriteAllText(
            Path.Combine(packageDir, "StructureDefinition-test-patient.json"),
            JsonSerializer.Serialize(structureDefinition, new JsonSerializerOptions { WriteIndented = true }));

        // Create example Bundle
        var bundle = new
        {
            resourceType = "Bundle",
            id = "test-bundle",
            type = "collection",
            entry = new[]
            {
                new
                {
                    resource = new
                    {
                        resourceType = "Patient",
                        id = "patient-1",
                        name = new[]
                        {
                            new
                            {
                                family = "Doe",
                                given = new[] { "John" }
                            }
                        }
                    }
                }
            }
        };
        File.WriteAllText(
            Path.Combine(packageDir, "bundle-example.json"),
            JsonSerializer.Serialize(bundle, new JsonSerializerOptions { WriteIndented = true }));

        // Create ZIP file
        var zipPath = Path.Combine(_tempDir, $"package_{Guid.NewGuid()}.zip");
        System.IO.Compression.ZipFile.CreateFromDirectory(packageDir, zipPath);

        return zipPath;
    }
}
