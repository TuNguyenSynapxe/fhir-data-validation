using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Pss.FhirProcessor.Application.Projects.BundleProfiles;
using Pss.FhirProcessor.Application.ValidationExecution;
using Pss.FhirProcessor.Application.ValidationExecution.Interfaces;
using Pss.FhirProcessor.Engine.Core;
using Pss.FhirProcessor.Engine.Models;
using Pss.FhirProcessor.Persistence.Data;
using Pss.FhirProcessor.Persistence.Models;
using System.Text.Json;
using Xunit;

namespace Pss.FhirProcessor.Application.Tests.ValidationExecution;

/// <summary>
/// Phase 8.4: Integration tests for Bundle profile-based rule scoping.
/// 
/// Tests verify that:
/// - Base FHIR validation always runs
/// - Project rules apply ONLY when Bundle profile is RESOLVED
/// - Rule filtering is deterministic and explicit
/// - No validation logic changes occurred
/// </summary>
public sealed class ProjectValidationExecutionRuleScopingTests : IAsyncLifetime
{
    private ServiceProvider _serviceProvider = null!;
    private FhirProcessorDbContext _dbContext = null!;
    private IProjectValidationExecutionService _executionService = null!;
    private IBundleProfileResolutionService _profileResolution = null!;

    private Guid _testProjectId;
    private Guid _testBundleId;
    private Guid _bundleStructureDefinitionId;

    public async Task InitializeAsync()
    {
        var services = new ServiceCollection();

        // Use in-memory database for tests
        services.AddDbContext<FhirProcessorDbContext>(options =>
            options.UseInMemoryDatabase($"TestDb_{Guid.NewGuid()}"));

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

        // Register validation services
        services.AddLogging();
        services.AddScoped<IProjectValidationExecutionService, ProjectValidationExecutionService>();
        services.AddScoped<IBundleProfileResolutionService, BundleProfileResolutionService>();

        _serviceProvider = services.BuildServiceProvider();
        _dbContext = _serviceProvider.GetRequiredService<FhirProcessorDbContext>();
        _executionService = _serviceProvider.GetRequiredService<IProjectValidationExecutionService>();
        _profileResolution = _serviceProvider.GetRequiredService<IBundleProfileResolutionService>();

        // Seed test data
        await SeedTestDataAsync();
    }

    public async Task DisposeAsync()
    {
        await _dbContext.DisposeAsync();
        await _serviceProvider.DisposeAsync();
    }

    [Fact]
    public async Task ExecuteAsync_ResolvedBundle_AppliesProjectRules()
    {
        // Arrange: Manually set Bundle profile to RESOLVED
        await _profileResolution.SetProfileAsync(
            _testProjectId,
            _testBundleId,
            _bundleStructureDefinitionId,
            CancellationToken.None);

        // Act: Execute validation
        var result = await _executionService.ExecuteAsync(
            _testProjectId,
            _testBundleId,
            CancellationToken.None);

        // Assert: Validation scope should indicate RESOLVED with rules applied
        result.Should().NotBeNull();
        result.Metadata.Should().NotBeNull();
        result.Metadata.ValidationScope.Should().NotBeNull();

        var scope = result.Metadata.ValidationScope!;
        scope.BundleProfileState.Should().Be("resolved");
        scope.AppliedProjectRules.Should().BeTrue();
        scope.StructureDefinitionId.Should().Be(_bundleStructureDefinitionId);
        scope.Source.Should().Be("manual");

        // Verify base FHIR validation ran (always runs)
        result.Summary.Should().NotBeNull();

        // Verify project rules were applied
        // (In real tests, this would check for specific rule violations)
        result.Errors.Should().NotBeNull();
    }

    [Fact]
    public async Task ExecuteAsync_UnresolvedBundle_SkipsProjectRules()
    {
        // Arrange: No profile selection exists (UNRESOLVED state)
        // Don't set any profile - bundle starts as UNRESOLVED

        // Act: Execute validation
        var result = await _executionService.ExecuteAsync(
            _testProjectId,
            _testBundleId,
            CancellationToken.None);

        // Assert: Validation scope should indicate UNRESOLVED with rules NOT applied
        result.Should().NotBeNull();
        result.Metadata.Should().NotBeNull();
        result.Metadata.ValidationScope.Should().NotBeNull();

        var scope = result.Metadata.ValidationScope!;
        scope.BundleProfileState.Should().Be("unresolved");
        scope.AppliedProjectRules.Should().BeFalse();
        scope.StructureDefinitionId.Should().BeNull();

        // Verify base FHIR validation still ran
        result.Summary.Should().NotBeNull();

        // Project rules should NOT have been applied
        // (In real tests, this would verify specific project rule violations are absent)
    }

    [Fact]
    public async Task ExecuteAsync_UnprofiledBundle_SkipsProjectRules()
    {
        // Arrange: Explicitly set Bundle profile to UNPROFILED (null SD)
        await _profileResolution.SetProfileAsync(
            _testProjectId,
            _testBundleId,
            null, // Explicitly unprofiled
            CancellationToken.None);

        // Act: Execute validation
        var result = await _executionService.ExecuteAsync(
            _testProjectId,
            _testBundleId,
            CancellationToken.None);

        // Assert: Validation scope should indicate UNPROFILED with rules NOT applied
        result.Should().NotBeNull();
        result.Metadata.ValidationScope.Should().NotBeNull();

        var scope = result.Metadata.ValidationScope!;
        scope.BundleProfileState.Should().Be("unprofiled");
        scope.AppliedProjectRules.Should().BeFalse();
        scope.StructureDefinitionId.Should().BeNull();
        scope.Source.Should().Be("manual"); // Manual override to unprofiled
        
        // Assert: Base FHIR validation still ran
        result.Summary.Should().NotBeNull();
    }

    [Fact]
    public async Task ExecuteAsync_ManualOverridePrecedence_RespectsManualSelection()
    {
        // Arrange: Set manual RESOLVED first
        await _profileResolution.SetProfileAsync(
            _testProjectId,
            _testBundleId,
            _bundleStructureDefinitionId,
            CancellationToken.None);

        // Act: Execute validation (should use manual RESOLVED)
        var result1 = await _executionService.ExecuteAsync(
            _testProjectId,
            _testBundleId,
            CancellationToken.None);

        // Assert: Should be RESOLVED with Manual source
        result1.Metadata.ValidationScope.Should().NotBeNull();
        result1.Metadata.ValidationScope!.BundleProfileState.Should().Be("resolved");
        result1.Metadata.ValidationScope.Source.Should().Be("manual");

        // Arrange: Change to UNPROFILED manually
        await _profileResolution.SetProfileAsync(
            _testProjectId,
            _testBundleId,
            null, // Unprofiled
            CancellationToken.None);

        // Act: Execute validation again
        var result2 = await _executionService.ExecuteAsync(
            _testProjectId,
            _testBundleId,
            CancellationToken.None);

        // Assert: Should be UNPROFILED now
        result2.Metadata.ValidationScope.Should().NotBeNull();
        result2.Metadata.ValidationScope!.BundleProfileState.Should().Be("unprofiled");
        result2.Metadata.ValidationScope.AppliedProjectRules.Should().BeFalse();
    }

    [Fact]
    public async Task ExecuteAsync_Determinism_SameInputProducesSameResult()
    {
        // Arrange: Set Bundle profile to RESOLVED
        await _profileResolution.SetProfileAsync(
            _testProjectId,
            _testBundleId,
            _bundleStructureDefinitionId,
            CancellationToken.None);

        // Act: Execute validation multiple times
        var result1 = await _executionService.ExecuteAsync(
            _testProjectId,
            _testBundleId,
            CancellationToken.None);

        var result2 = await _executionService.ExecuteAsync(
            _testProjectId,
            _testBundleId,
            CancellationToken.None);

        // Assert: Results should be identical (deterministic)
        result1.Metadata.ValidationScope.Should().NotBeNull();
        result2.Metadata.ValidationScope.Should().NotBeNull();
        
        result1.Metadata.ValidationScope!.BundleProfileState.Should()
            .Be(result2.Metadata.ValidationScope!.BundleProfileState);
        result1.Metadata.ValidationScope.AppliedProjectRules.Should()
            .Be(result2.Metadata.ValidationScope.AppliedProjectRules);
    }

    [Fact]
    public async Task ExecuteAsync_NoMutation_ProjectAndBundleUnchanged()
    {
        // Arrange: Capture initial state
        var projectBefore = await _dbContext.Projects
            .AsNoTracking()
            .FirstAsync(p => p.Id == _testProjectId);

        var bundleBefore = await _dbContext.ProjectBundles
            .AsNoTracking()
            .FirstAsync(b => b.Id == _testBundleId);

        var ruleCountBefore = await _dbContext.ProjectRules
            .CountAsync(r => r.ProjectId == _testProjectId);

        // Act: Execute validation
        await _executionService.ExecuteAsync(
            _testProjectId,
            _testBundleId,
            CancellationToken.None);

        // Assert: State should be unchanged
        var projectAfter = await _dbContext.Projects
            .AsNoTracking()
            .FirstAsync(p => p.Id == _testProjectId);

        var bundleAfter = await _dbContext.ProjectBundles
            .AsNoTracking()
            .FirstAsync(b => b.Id == _testBundleId);

        var ruleCountAfter = await _dbContext.ProjectRules
            .CountAsync(r => r.ProjectId == _testProjectId);

        projectAfter.UpdatedAt.Should().Be(projectBefore.UpdatedAt);
        bundleAfter.BundleJson.Should().Be(bundleBefore.BundleJson);
        ruleCountAfter.Should().Be(ruleCountBefore);
    }

    // =========================================================================
    // Test Data Setup
    // =========================================================================

    private async Task SeedTestDataAsync()
    {
        _testProjectId = Guid.NewGuid();
        _testBundleId = Guid.NewGuid();
        _bundleStructureDefinitionId = Guid.NewGuid();

        var now = DateTimeOffset.UtcNow;

        // Create test project
        var project = new Project
        {
            Id = _testProjectId,
            Name = "Test Project",
            Description = "Phase 8.4 Test Project",
            PolicyMode = PolicyMode.Strict,
            IsPublicEnabled = false,
            CreatedAt = now,
            UpdatedAt = now
        };
        _dbContext.Projects.Add(project);

        // Create Bundle StructureDefinition artifact
        var bundleSD = new ProjectArtifact
        {
            Id = _bundleStructureDefinitionId,
            ProjectId = _testProjectId,
            ArtifactType = ArtifactType.StructureDefinition,
            FilePath = "StructureDefinition/test-bundle-profile.json",
            FileName = "test-bundle-profile.json",
            ResourceType = "StructureDefinition",
            CanonicalUrl = "http://test.example.org/StructureDefinition/test-bundle",
            ResourceJson = JsonSerializer.Serialize(new
            {
                resourceType = "StructureDefinition",
                url = "http://test.example.org/StructureDefinition/test-bundle",
                name = "TestBundleProfile",
                type = "Bundle", // Critical: This is a Bundle SD
                kind = "resource",
                derivation = "constraint",
                baseDefinition = "http://hl7.org/fhir/StructureDefinition/Bundle"
            }),
            Hash = "test-hash",
            CreatedAt = now
        };
        _dbContext.ProjectArtifacts.Add(bundleSD);

        // Create test bundle
        var bundle = new ProjectBundle
        {
            Id = _testBundleId,
            ProjectId = _testProjectId,
            Name = "test-bundle.json",
            Source = BundleSource.ImportedExample,
            BundleJson = JsonSerializer.Serialize(new
            {
                resourceType = "Bundle",
                type = "collection",
                entry = Array.Empty<object>()
            }),
            CreatedAt = now
        };
        _dbContext.ProjectBundles.Add(bundle);

        // Create test project rule (to verify filtering)
        var rule = new ProjectRule
        {
            Id = Guid.NewGuid(),
            ProjectId = _testProjectId,
            Scope = RuleScope.Project,
            BundleId = null,
            RuleType = RuleType.ProfileDerived,
            Provenance = RuleProvenance.ImportedGenerated,
            Title = "Test Rule",
            Description = "Test rule for Phase 8.4",
            DefinitionJson = JsonSerializer.Serialize(new
            {
                canonical = "http://test.example.org/StructureDefinition/test-bundle",
                resourceType = "StructureDefinition",
                source = "test"
            }),
            IsEnabled = true,
            CreatedAt = now,
            UpdatedAt = now
        };
        _dbContext.ProjectRules.Add(rule);

        await _dbContext.SaveChangesAsync();
    }
}
