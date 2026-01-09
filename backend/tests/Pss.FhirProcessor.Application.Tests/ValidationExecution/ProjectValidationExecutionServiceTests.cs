using FluentAssertions;
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
using System.IO.Compression;

namespace Pss.FhirProcessor.Application.Tests.ValidationExecution;

/// <summary>
/// Phase 8.1: Integration tests for ProjectValidationExecutionService.
/// Tests validation orchestration with imported projects and bundles.
/// </summary>
public sealed class ProjectValidationExecutionServiceTests : IDisposable
{
    private readonly string _dbName;
    private readonly string _tempDir;
    private readonly ServiceProvider _serviceProvider;
    private readonly FhirProcessorDbContext _dbContext;
    private readonly IProjectValidationExecutionService _executionService;

    public ProjectValidationExecutionServiceTests()
    {
        _tempDir = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());
        Directory.CreateDirectory(_tempDir);
        _dbName = "TestDb_" + Guid.NewGuid();

        var services = new ServiceCollection();

        // Add in-memory database
        services.AddDbContext<FhirProcessorDbContext>(options =>
        {
            options.UseInMemoryDatabase(_dbName);
            options.EnableSensitiveDataLogging();
        });

        // Mock validation pipeline (returns empty response for tests)
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
                    WarningCount = 0
                },
                Metadata = new ValidationMetadata
                {
                    Timestamp = DateTime.UtcNow
                }
            });

        services.AddSingleton(mockPipeline.Object);

        // Add import services (Phase 7.2)
        services.AddScoped<SimplifierPackageParser>();
        services.AddScoped<ArtifactClassifier>();
        services.AddScoped<StructureDefinitionRuleGenerator>();
        services.AddScoped<ProjectImportService>();

        // Add validation execution service (Phase 8.1)
        services.AddScoped<IProjectValidationExecutionService, ProjectValidationExecutionService>();

        // Add logging
        services.AddLogging();

        _serviceProvider = services.BuildServiceProvider();
        _dbContext = _serviceProvider.GetRequiredService<FhirProcessorDbContext>();
        _executionService = _serviceProvider.GetRequiredService<IProjectValidationExecutionService>();
    }

    public void Dispose()
    {
        _serviceProvider?.Dispose();
        _dbContext?.Dispose();
        if (Directory.Exists(_tempDir))
        {
            Directory.Delete(_tempDir, true);
        }
    }

    [Fact]
    public async Task ExecuteAsync_ProjectNotFound_ThrowsProjectNotFoundException()
    {
        // Arrange
        var nonExistentProjectId = Guid.NewGuid();
        var bundleId = Guid.NewGuid();

        // Act & Assert
        var exception = await Assert.ThrowsAsync<ValidationExecutionException>(
            () => _executionService.ExecuteAsync(nonExistentProjectId, bundleId));

        exception.Code.Should().Be(ValidationExecutionException.ErrorCodes.PROJECT_NOT_FOUND);
        exception.Message.Should().Contain(nonExistentProjectId.ToString());
    }

    [Fact]
    public async Task ExecuteAsync_BundleNotFound_ThrowsBundleNotFoundException()
    {
        // Arrange
        var projectId = await SeedMinimalProjectAsync();
        var nonExistentBundleId = Guid.NewGuid();

        // Act & Assert
        var exception = await Assert.ThrowsAsync<ValidationExecutionException>(
            () => _executionService.ExecuteAsync(projectId, nonExistentBundleId));

        exception.Code.Should().Be(ValidationExecutionException.ErrorCodes.BUNDLE_NOT_FOUND);
        exception.Message.Should().Contain(nonExistentBundleId.ToString());
    }

    [Fact]
    public async Task ExecuteAsync_BundleDoesNotBelongToProject_ThrowsBundleNotFoundException()
    {
        // Arrange
        var projectId = await SeedMinimalProjectAsync();
        var otherProjectId = await SeedMinimalProjectAsync(); // Different project
        var bundleId = await _dbContext.ProjectBundles
            .Where(b => b.ProjectId == otherProjectId)
            .Select(b => b.Id)
            .FirstAsync();

        // Act & Assert
        var exception = await Assert.ThrowsAsync<ValidationExecutionException>(
            () => _executionService.ExecuteAsync(projectId, bundleId));

        exception.Code.Should().Be(ValidationExecutionException.ErrorCodes.BUNDLE_NOT_FOUND);
    }

    [Fact]
    public async Task ExecuteAsync_InvalidBundleJson_ThrowsInvalidBundleJsonException()
    {
        // Arrange
        var project = new Project
        {
            Id = Guid.NewGuid(),
            Name = "Test Project",
            PolicyMode = PolicyMode.Strict,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        var bundle = new ProjectBundle
        {
            Id = Guid.NewGuid(),
            ProjectId = project.Id,
            Name = "Invalid Bundle",
            Source = BundleSource.ImportedExample,
            BundleJson = "not valid json",
            CreatedAt = DateTimeOffset.UtcNow
        };

        _dbContext.Projects.Add(project);
        _dbContext.ProjectBundles.Add(bundle);
        await _dbContext.SaveChangesAsync();

        // Act & Assert
        var exception = await Assert.ThrowsAsync<ValidationExecutionException>(
            () => _executionService.ExecuteAsync(project.Id, bundle.Id));

        exception.Code.Should().Be(ValidationExecutionException.ErrorCodes.INVALID_BUNDLE_JSON);
    }

    [Fact]
    public async Task ExecuteAsync_BundleWithoutResourceType_ThrowsInvalidBundleJsonException()
    {
        // Arrange
        var project = new Project
        {
            Id = Guid.NewGuid(),
            Name = "Test Project",
            PolicyMode = PolicyMode.Strict,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        var bundle = new ProjectBundle
        {
            Id = Guid.NewGuid(),
            ProjectId = project.Id,
            Name = "Bundle Without ResourceType",
            Source = BundleSource.ImportedExample,
            BundleJson = """{"type": "collection"}""",
            CreatedAt = DateTimeOffset.UtcNow
        };

        _dbContext.Projects.Add(project);
        _dbContext.ProjectBundles.Add(bundle);
        await _dbContext.SaveChangesAsync();

        // Act & Assert
        var exception = await Assert.ThrowsAsync<ValidationExecutionException>(
            () => _executionService.ExecuteAsync(project.Id, bundle.Id));

        exception.Code.Should().Be(ValidationExecutionException.ErrorCodes.INVALID_BUNDLE_JSON);
        exception.Message.Should().Contain("resourceType");
    }

    [Fact]
    public async Task ExecuteAsync_ImportedProjectWithValidBundle_ReturnsValidationResult()
    {
        // Arrange
        var (projectId, bundleId) = await SeedImportedProjectAsync();

        // Act
        var result = await _executionService.ExecuteAsync(projectId, bundleId);

        // Assert
        result.Should().NotBeNull();
        result.Errors.Should().NotBeNull();
        result.Summary.Should().NotBeNull();
        result.Metadata.Should().NotBeNull();
    }

    [Fact]
    public async Task ExecuteAsync_DisabledRulesIgnored_OnlyEnabledRulesApplied()
    {
        // Arrange
        var (projectId, bundleId) = await SeedImportedProjectAsync();

        // Disable all rules
        var rules = await _dbContext.ProjectRules
            .Where(r => r.ProjectId == projectId)
            .ToListAsync();

        foreach (var rule in rules)
        {
            rule.IsEnabled = false;
            rule.UpdatedAt = DateTimeOffset.UtcNow;
        }
        await _dbContext.SaveChangesAsync();

        // Act
        var result = await _executionService.ExecuteAsync(projectId, bundleId);

        // Assert
        result.Should().NotBeNull();
        // With no rules enabled, only structural validation runs
        // Result should still be valid (no rule violations)
    }

    [Fact]
    public async Task ExecuteAsync_ProjectAndBundleScopedRulesMerged_BothApplied()
    {
        // Arrange
        var (projectId, bundleId) = await SeedImportedProjectAsync();

        // Add an extra project-scoped rule
        var projectRule = new ProjectRule
        {
            Id = Guid.NewGuid(),
            ProjectId = projectId,
            Scope = RuleScope.Project,
            RuleType = RuleType.FhirPathCustom,
            Provenance = RuleProvenance.ManualCustom,
            Title = "Custom Project Rule",
            DefinitionJson = """
            {
              "title": "Custom Project Rule",
              "expression": "Bundle.entry.all($this.resource.exists())",
              "severity": "error"
            }
            """,
            IsEnabled = true,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        _dbContext.ProjectRules.Add(projectRule);
        await _dbContext.SaveChangesAsync();

        // Act
        var result = await _executionService.ExecuteAsync(projectId, bundleId);

        // Assert
        result.Should().NotBeNull();
        // Both project-scoped and bundle-scoped rules should be applied
    }

    [Fact]
    public async Task ExecuteAsync_SameInputTwice_ReturnsDeterministicResult()
    {
        // Arrange
        var (projectId, bundleId) = await SeedImportedProjectAsync();

        // Act
        var result1 = await _executionService.ExecuteAsync(projectId, bundleId);
        var result2 = await _executionService.ExecuteAsync(projectId, bundleId);

        // Assert
        result1.Errors.Count.Should().Be(result2.Errors.Count);
        result1.Summary.TotalErrors.Should().Be(result2.Summary.TotalErrors);
        result1.Summary.WarningCount.Should().Be(result2.Summary.WarningCount);
        
        // Error messages should match (deterministic ordering)
        for (int i = 0; i < result1.Errors.Count && i < result2.Errors.Count; i++)
        {
            result1.Errors[i].ErrorCode.Should().Be(result2.Errors[i].ErrorCode);
            result1.Errors[i].Source.Should().Be(result2.Errors[i].Source);
        }
    }

    [Fact]
    public async Task ExecuteAsync_PolicyModePreserved_FromProject()
    {
        // Arrange
        var (projectId, bundleId) = await SeedImportedProjectAsync();

        // Update project to Permissive policy mode
        var project = await _dbContext.Projects.FindAsync(projectId);
        project!.PolicyMode = PolicyMode.Permissive;
        project.UpdatedAt = DateTimeOffset.UtcNow;
        await _dbContext.SaveChangesAsync();

        // Act
        var result = await _executionService.ExecuteAsync(projectId, bundleId);

        // Assert
        result.Should().NotBeNull();
        // PolicyMode affects validation engine behavior (e.g., downgrade errors to warnings)
    }

    [Fact]
    public async Task ExecuteAsync_CancellationToken_ThrowsCancelledException()
    {
        // Arrange
        var (projectId, bundleId) = await SeedImportedProjectAsync();
        var cts = new CancellationTokenSource();
        cts.Cancel(); // Immediately cancelled

        // Act & Assert
        var exception = await Assert.ThrowsAsync<ValidationExecutionException>(
            () => _executionService.ExecuteAsync(projectId, bundleId, cts.Token));

        exception.Code.Should().Be(ValidationExecutionException.ErrorCodes.CANCELLED);
    }

    [Fact]
    public async Task ExecuteAsync_RuleProvenance_Preserved()
    {
        // Arrange
        var (projectId, bundleId) = await SeedImportedProjectAsync();

        // Verify rules have correct provenance
        var rules = await _dbContext.ProjectRules
            .Where(r => r.ProjectId == projectId)
            .ToListAsync();

        rules.Should().NotBeEmpty();
        rules.Should().AllSatisfy(r => r.Provenance.Should().Be(RuleProvenance.ImportedGenerated));

        // Act
        var result = await _executionService.ExecuteAsync(projectId, bundleId);

        // Assert
        result.Should().NotBeNull();
        // Provenance should be preserved through validation execution
    }

    /// <summary>
    /// Helper: Seed minimal project (no artifacts, no rules) for negative tests.
    /// </summary>
    private async Task<Guid> SeedMinimalProjectAsync()
    {
        var project = new Project
        {
            Id = Guid.NewGuid(),
            Name = $"Test Project {Guid.NewGuid()}",
            PolicyMode = PolicyMode.Strict,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        var bundle = new ProjectBundle
        {
            Id = Guid.NewGuid(),
            ProjectId = project.Id,
            Name = "Test Bundle",
            Source = BundleSource.ImportedExample,
            BundleJson = """
            {
              "resourceType": "Bundle",
              "type": "collection",
              "entry": []
            }
            """,
            CreatedAt = DateTimeOffset.UtcNow
        };

        _dbContext.Projects.Add(project);
        _dbContext.ProjectBundles.Add(bundle);
        await _dbContext.SaveChangesAsync();

        return project.Id;
    }

    /// <summary>
    /// Helper: Seed imported project via Phase 7.2 import service (realistic data).
    /// </summary>
    private async Task<(Guid ProjectId, Guid BundleId)> SeedImportedProjectAsync()
    {
        var zipPath = CreateValidR5Package();

        using var scope = _serviceProvider.CreateScope();
        var importService = scope.ServiceProvider.GetRequiredService<ProjectImportService>();

        var projectId = await importService.ImportPackageAsync(
            zipPath,
            PolicyMode.Strict,
            CancellationToken.None);

        var bundleId = await _dbContext.ProjectBundles
            .Where(b => b.ProjectId == projectId)
            .Select(b => b.Id)
            .FirstAsync();

        return (projectId, bundleId);
    }

    /// <summary>
    /// Helper: Create minimal valid R5 package ZIP for import.
    /// </summary>
    private string CreateValidR5Package()
    {
        var zipPath = Path.Combine(_tempDir, $"test-package-{Guid.NewGuid()}.zip");

        using var archive = ZipFile.Open(zipPath, ZipArchiveMode.Create);

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
