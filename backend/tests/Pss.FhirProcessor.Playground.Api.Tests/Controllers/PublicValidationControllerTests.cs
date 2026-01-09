using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Pss.FhirProcessor.Application.Projects.Import;
using Pss.FhirProcessor.Application.Public.Dtos;
using Pss.FhirProcessor.Application.ValidationExecution;
using Pss.FhirProcessor.Application.ValidationExecution.Interfaces;
using Pss.FhirProcessor.Engine.Core;
using Pss.FhirProcessor.Engine.Models;
using Pss.FhirProcessor.Persistence.Data;
using Pss.FhirProcessor.Persistence.Models;
using Xunit;

namespace Pss.FhirProcessor.Playground.Api.Tests.Controllers;

/// <summary>
/// Phase 9.5a: Integration tests for PublicValidationController.
/// Tests read-only public API for resolving links and validating bundles.
/// </summary>
public sealed class PublicValidationControllerTests : IDisposable
{
    private readonly WebApplicationFactory<Program> _factory;
    private readonly HttpClient _client;
    private readonly string _dbName;

    public PublicValidationControllerTests()
    {
        _dbName = $"TestDb_{Guid.NewGuid()}";

        // Create mock validation pipeline that returns deterministic results
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

                    // Register import services for test data setup
                    services.AddScoped<SimplifierPackageParser>();
                    services.AddScoped<ArtifactClassifier>();
                    services.AddScoped<StructureDefinitionRuleGenerator>();
                    services.AddScoped<ProjectImportService>();

                    // Ensure Phase 8.1 validation service is registered
                    services.AddScoped<IProjectValidationExecutionService, ProjectValidationExecutionService>();
                });
            });

        _client = _factory.CreateClient();
    }

    public void Dispose()
    {
        _client?.Dispose();
        _factory?.Dispose();
    }

    /// <summary>
    /// Test: Valid enabled link → 200 + bundles list
    /// </summary>
    [Fact]
    public async Task ResolvePublicLink_ValidEnabledLink_Returns200WithBundlesList()
    {
        // Arrange: Create project with public link enabled
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<FhirProcessorDbContext>();

        var projectId = Guid.NewGuid();
        var publicId = $"test-public-{Guid.NewGuid():N}";

        var project = new Project
        {
            Id = projectId,
            Name = "Test Public Project",
            PolicyMode = PolicyMode.Strict,
            IsPublicEnabled = true,
            PublicId = publicId,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        var publicLink = new ProjectPublicLink
        {
            Id = Guid.NewGuid(),
            ProjectId = projectId,
            PublicId = publicId,
            Enabled = true,
            CreatedAt = DateTimeOffset.UtcNow
        };

        var bundle1 = new ProjectBundle
        {
            Id = Guid.NewGuid(),
            ProjectId = projectId,
            Name = "Test Bundle 1",
            Source = BundleSource.ImportedExample,
            BundleJson = "{\"resourceType\":\"Bundle\"}",
            CreatedAt = DateTimeOffset.UtcNow
        };

        var bundle2 = new ProjectBundle
        {
            Id = Guid.NewGuid(),
            ProjectId = projectId,
            Name = "Test Bundle 2",
            Source = BundleSource.ImportedExample,
            BundleJson = "{\"resourceType\":\"Bundle\"}",
            CreatedAt = DateTimeOffset.UtcNow
        };

        dbContext.Projects.Add(project);
        dbContext.ProjectPublicLinks.Add(publicLink);
        dbContext.ProjectBundles.AddRange(bundle1, bundle2);
        await dbContext.SaveChangesAsync();

        // Act
        var response = await _client.GetAsync($"/api/public/links/{publicId}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var result = await response.Content.ReadFromJsonAsync<PublicLinkResolveResponseDto>();
        result.Should().NotBeNull();
        result!.PublicId.Should().Be(publicId);
        result.ProjectId.Should().Be(projectId);
        result.ProjectName.Should().Be("Test Public Project");
        result.PolicyMode.Should().Be("strict");
        result.Bundles.Should().HaveCount(2);
        result.Bundles.Should().Contain(b => b.Title == "Test Bundle 1" && b.BundleId == bundle1.Id);
        result.Bundles.Should().Contain(b => b.Title == "Test Bundle 2" && b.BundleId == bundle2.Id);
    }

    /// <summary>
    /// Test: Link not found → 404 + PUBLIC_LINK_NOT_FOUND
    /// </summary>
    [Fact]
    public async Task ResolvePublicLink_LinkNotFound_Returns404()
    {
        // Act
        var response = await _client.GetAsync("/api/public/links/nonexistent-link-123");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);

        var error = await response.Content.ReadFromJsonAsync<PublicApiErrorDto>();
        error.Should().NotBeNull();
        error!.Code.Should().Be("PUBLIC_LINK_NOT_FOUND");
        error.Message.Should().Contain("not found");
    }

    /// <summary>
    /// Test: Link disabled → 403 + PUBLIC_LINK_DISABLED
    /// </summary>
    [Fact]
    public async Task ResolvePublicLink_LinkDisabled_Returns403()
    {
        // Arrange: Create project with disabled public link
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<FhirProcessorDbContext>();

        var projectId = Guid.NewGuid();
        var publicId = $"test-disabled-{Guid.NewGuid():N}";

        var project = new Project
        {
            Id = projectId,
            Name = "Test Project",
            PolicyMode = PolicyMode.Strict,
            IsPublicEnabled = true,
            PublicId = publicId,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        var publicLink = new ProjectPublicLink
        {
            Id = Guid.NewGuid(),
            ProjectId = projectId,
            PublicId = publicId,
            Enabled = false, // DISABLED
            CreatedAt = DateTimeOffset.UtcNow
        };

        dbContext.Projects.Add(project);
        dbContext.ProjectPublicLinks.Add(publicLink);
        await dbContext.SaveChangesAsync();

        // Act
        var response = await _client.GetAsync($"/api/public/links/{publicId}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);

        var error = await response.Content.ReadFromJsonAsync<PublicApiErrorDto>();
        error.Should().NotBeNull();
        error!.Code.Should().Be("PUBLIC_LINK_DISABLED");
        error.Message.Should().Contain("disabled");
    }

    /// <summary>
    /// Test: Project IsPublicEnabled=false → 403 + PUBLIC_LINK_DISABLED
    /// </summary>
    [Fact]
    public async Task ResolvePublicLink_ProjectPublicDisabled_Returns403()
    {
        // Arrange: Create project with IsPublicEnabled=false
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<FhirProcessorDbContext>();

        var projectId = Guid.NewGuid();
        var publicId = $"test-project-disabled-{Guid.NewGuid():N}";

        var project = new Project
        {
            Id = projectId,
            Name = "Test Project",
            PolicyMode = PolicyMode.Strict,
            IsPublicEnabled = false, // PROJECT PUBLIC DISABLED
            PublicId = publicId,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        var publicLink = new ProjectPublicLink
        {
            Id = Guid.NewGuid(),
            ProjectId = projectId,
            PublicId = publicId,
            Enabled = true, // Link enabled but project disabled
            CreatedAt = DateTimeOffset.UtcNow
        };

        dbContext.Projects.Add(project);
        dbContext.ProjectPublicLinks.Add(publicLink);
        await dbContext.SaveChangesAsync();

        // Act
        var response = await _client.GetAsync($"/api/public/links/{publicId}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);

        var error = await response.Content.ReadFromJsonAsync<PublicApiErrorDto>();
        error.Should().NotBeNull();
        error!.Code.Should().Be("PUBLIC_LINK_DISABLED");
    }

    /// <summary>
    /// Test: Bundles returned only for that project
    /// </summary>
    [Fact]
    public async Task ResolvePublicLink_OnlyProjectBundles_ReturnsCorrectBundles()
    {
        // Arrange: Create two projects, ensure only correct project's bundles returned
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<FhirProcessorDbContext>();

        var project1Id = Guid.NewGuid();
        var project2Id = Guid.NewGuid();
        var publicId1 = $"test-project1-{Guid.NewGuid():N}";
        var publicId2 = $"test-project2-{Guid.NewGuid():N}";

        var project1 = new Project
        {
            Id = project1Id,
            Name = "Project 1",
            PolicyMode = PolicyMode.Strict,
            IsPublicEnabled = true,
            PublicId = publicId1,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        var project2 = new Project
        {
            Id = project2Id,
            Name = "Project 2",
            PolicyMode = PolicyMode.Strict,
            IsPublicEnabled = true,
            PublicId = publicId2,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        var publicLink1 = new ProjectPublicLink
        {
            Id = Guid.NewGuid(),
            ProjectId = project1Id,
            PublicId = publicId1,
            Enabled = true,
            CreatedAt = DateTimeOffset.UtcNow
        };

        var publicLink2 = new ProjectPublicLink
        {
            Id = Guid.NewGuid(),
            ProjectId = project2Id,
            PublicId = publicId2,
            Enabled = true,
            CreatedAt = DateTimeOffset.UtcNow
        };

        var bundle1 = new ProjectBundle
        {
            Id = Guid.NewGuid(),
            ProjectId = project1Id,
            Name = "Project 1 Bundle",
            Source = BundleSource.ImportedExample,
            BundleJson = "{\"resourceType\":\"Bundle\"}",
            CreatedAt = DateTimeOffset.UtcNow
        };

        var bundle2 = new ProjectBundle
        {
            Id = Guid.NewGuid(),
            ProjectId = project2Id,
            Name = "Project 2 Bundle",
            Source = BundleSource.ImportedExample,
            BundleJson = "{\"resourceType\":\"Bundle\"}",
            CreatedAt = DateTimeOffset.UtcNow
        };

        dbContext.Projects.AddRange(project1, project2);
        dbContext.ProjectPublicLinks.AddRange(publicLink1, publicLink2);
        dbContext.ProjectBundles.AddRange(bundle1, bundle2);
        await dbContext.SaveChangesAsync();

        // Act: Resolve project 1
        var response = await _client.GetAsync($"/api/public/links/{publicId1}");

        // Assert: Only project 1 bundles returned
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var result = await response.Content.ReadFromJsonAsync<PublicLinkResolveResponseDto>();
        result.Should().NotBeNull();
        result!.Bundles.Should().HaveCount(1);
        result.Bundles.Should().Contain(b => b.Title == "Project 1 Bundle" && b.BundleId == bundle1.Id);
        result.Bundles.Should().NotContain(b => b.BundleId == bundle2.Id);
    }

    /// <summary>
    /// Test: Valid enabled link + bundle belongs to project → 200 with validation payload
    /// </summary>
    [Fact]
    public async Task ValidateBundle_ValidLinkAndBundle_Returns200WithValidationPayload()
    {
        // Arrange
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<FhirProcessorDbContext>();

        var projectId = Guid.NewGuid();
        var bundleId = Guid.NewGuid();
        var publicId = $"test-validate-{Guid.NewGuid():N}";

        var project = new Project
        {
            Id = projectId,
            Name = "Test Project",
            PolicyMode = PolicyMode.Strict,
            IsPublicEnabled = true,
            PublicId = publicId,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        var publicLink = new ProjectPublicLink
        {
            Id = Guid.NewGuid(),
            ProjectId = projectId,
            PublicId = publicId,
            Enabled = true,
            CreatedAt = DateTimeOffset.UtcNow
        };

        var bundle = new ProjectBundle
        {
            Id = bundleId,
            ProjectId = projectId,
            Name = "Test Bundle",
            Source = BundleSource.ImportedExample,
            BundleJson = "{\"resourceType\":\"Bundle\",\"type\":\"collection\",\"entry\":[]}",
            CreatedAt = DateTimeOffset.UtcNow
        };

        dbContext.Projects.Add(project);
        dbContext.ProjectPublicLinks.Add(publicLink);
        dbContext.ProjectBundles.Add(bundle);
        await dbContext.SaveChangesAsync();

        // Act
        var response = await _client.PostAsJsonAsync(
            $"/api/public/links/{publicId}/bundles/{bundleId}/validate",
            new PublicExecuteValidationRequestDto());

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var result = await response.Content.ReadFromJsonAsync<PublicExecuteValidationResponseDto>();
        result.Should().NotBeNull();
        result!.PublicId.Should().Be(publicId);
        result.ProjectId.Should().Be(projectId);
        result.BundleId.Should().Be(bundleId);
        result.Validation.Should().NotBeNull();
        result.Validation.Issues.Should().NotBeNull();
        result.Validation.Summary.Should().NotBeNull();
    }

    /// <summary>
    /// Test: Link not found → 404
    /// </summary>
    [Fact]
    public async Task ValidateBundle_LinkNotFound_Returns404()
    {
        // Act
        var response = await _client.PostAsJsonAsync(
            $"/api/public/links/nonexistent-{Guid.NewGuid()}/bundles/{Guid.NewGuid()}/validate",
            new PublicExecuteValidationRequestDto());

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);

        var error = await response.Content.ReadFromJsonAsync<PublicApiErrorDto>();
        error.Should().NotBeNull();
        error!.Code.Should().Be("PUBLIC_LINK_NOT_FOUND");
    }

    /// <summary>
    /// Test: Link disabled → 403
    /// </summary>
    [Fact]
    public async Task ValidateBundle_LinkDisabled_Returns403()
    {
        // Arrange
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<FhirProcessorDbContext>();

        var projectId = Guid.NewGuid();
        var bundleId = Guid.NewGuid();
        var publicId = $"test-disabled-validate-{Guid.NewGuid():N}";

        var project = new Project
        {
            Id = projectId,
            Name = "Test Project",
            PolicyMode = PolicyMode.Strict,
            IsPublicEnabled = true,
            PublicId = publicId,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        var publicLink = new ProjectPublicLink
        {
            Id = Guid.NewGuid(),
            ProjectId = projectId,
            PublicId = publicId,
            Enabled = false, // DISABLED
            CreatedAt = DateTimeOffset.UtcNow
        };

        var bundle = new ProjectBundle
        {
            Id = bundleId,
            ProjectId = projectId,
            Name = "Test Bundle",
            Source = BundleSource.ImportedExample,
            BundleJson = "{\"resourceType\":\"Bundle\"}",
            CreatedAt = DateTimeOffset.UtcNow
        };

        dbContext.Projects.Add(project);
        dbContext.ProjectPublicLinks.Add(publicLink);
        dbContext.ProjectBundles.Add(bundle);
        await dbContext.SaveChangesAsync();

        // Act
        var response = await _client.PostAsJsonAsync(
            $"/api/public/links/{publicId}/bundles/{bundleId}/validate",
            new PublicExecuteValidationRequestDto());

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);

        var error = await response.Content.ReadFromJsonAsync<PublicApiErrorDto>();
        error.Should().NotBeNull();
        error!.Code.Should().Be("PUBLIC_LINK_DISABLED");
    }

    /// <summary>
    /// Test: Bundle not in project → 404 BUNDLE_NOT_FOUND
    /// </summary>
    [Fact]
    public async Task ValidateBundle_BundleNotInProject_Returns404()
    {
        // Arrange
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<FhirProcessorDbContext>();

        var projectId = Guid.NewGuid();
        var otherProjectId = Guid.NewGuid();
        var bundleId = Guid.NewGuid();
        var publicId = $"test-wrong-bundle-{Guid.NewGuid():N}";

        var project = new Project
        {
            Id = projectId,
            Name = "Test Project",
            PolicyMode = PolicyMode.Strict,
            IsPublicEnabled = true,
            PublicId = publicId,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        var publicLink = new ProjectPublicLink
        {
            Id = Guid.NewGuid(),
            ProjectId = projectId,
            PublicId = publicId,
            Enabled = true,
            CreatedAt = DateTimeOffset.UtcNow
        };

        // Bundle belongs to DIFFERENT project
        var bundle = new ProjectBundle
        {
            Id = bundleId,
            ProjectId = otherProjectId, // WRONG PROJECT
            Name = "Test Bundle",
            Source = BundleSource.ImportedExample,
            BundleJson = "{\"resourceType\":\"Bundle\"}",
            CreatedAt = DateTimeOffset.UtcNow
        };

        dbContext.Projects.Add(project);
        dbContext.ProjectPublicLinks.Add(publicLink);
        dbContext.ProjectBundles.Add(bundle);
        await dbContext.SaveChangesAsync();

        // Act
        var response = await _client.PostAsJsonAsync(
            $"/api/public/links/{publicId}/bundles/{bundleId}/validate",
            new PublicExecuteValidationRequestDto());

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);

        var error = await response.Content.ReadFromJsonAsync<PublicApiErrorDto>();
        error.Should().NotBeNull();
        error!.Code.Should().Be("BUNDLE_NOT_FOUND");
    }

    /// <summary>
    /// Test: Cancellation token respected → 499
    /// NOTE: Skipped - in-memory mock doesn't actually cancel, real integration would test this properly
    /// </summary>
    [Fact(Skip = "Cancellation testing requires real async operations, not feasible with mocked pipeline")]
    public async Task ValidateBundle_CancellationRespected_Returns499()
    {
        // Arrange
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<FhirProcessorDbContext>();

        var projectId = Guid.NewGuid();
        var bundleId = Guid.NewGuid();
        var publicId = $"test-cancel-{Guid.NewGuid():N}";

        var project = new Project
        {
            Id = projectId,
            Name = "Test Project",
            PolicyMode = PolicyMode.Strict,
            IsPublicEnabled = true,
            PublicId = publicId,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        var publicLink = new ProjectPublicLink
        {
            Id = Guid.NewGuid(),
            ProjectId = projectId,
            PublicId = publicId,
            Enabled = true,
            CreatedAt = DateTimeOffset.UtcNow
        };

        var bundle = new ProjectBundle
        {
            Id = bundleId,
            ProjectId = projectId,
            Name = "Test Bundle",
            Source = BundleSource.ImportedExample,
            BundleJson = "{\"resourceType\":\"Bundle\"}",
            CreatedAt = DateTimeOffset.UtcNow
        };

        dbContext.Projects.Add(project);
        dbContext.ProjectPublicLinks.Add(publicLink);
        dbContext.ProjectBundles.Add(bundle);
        await dbContext.SaveChangesAsync();

        // Act: Cancel immediately
        using var cts = new CancellationTokenSource();
        cts.Cancel();

        var response = await _client.PostAsJsonAsync(
            $"/api/public/links/{publicId}/bundles/{bundleId}/validate",
            new PublicExecuteValidationRequestDto(),
            cts.Token);

        // Assert: 499 or TaskCanceledException
        // Note: In-memory mock won't actually cancel, but we verify the endpoint handles it
        (response.StatusCode == (HttpStatusCode)499 || response.StatusCode == HttpStatusCode.RequestTimeout)
            .Should().BeTrue();
    }
}
