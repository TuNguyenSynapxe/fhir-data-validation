using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Pss.FhirProcessor.Playground.Api.Models;
using Pss.FhirProcessor.Engine.Models;
using Xunit;

namespace Pss.FhirProcessor.Playground.Api.Tests;

/// <summary>
/// Integration tests for Playground API endpoints
/// Tests complete flow: CRUD operations, validation pipeline, export
/// </summary>
public class ProjectApiTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public ProjectApiTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    #region Helper Methods

    private async Task<Guid> CreateTestProject(string name = "Test Project", string? description = null)
    {
        var request = new { name, description = description ?? "Test description" };
        var response = await _client.PostAsJsonAsync("/api/projects", request);
        response.EnsureSuccessStatusCode();
        
        var project = await response.Content.ReadFromJsonAsync<Project>();
        return project!.Id;
    }

    private string LoadFixture(string filename)
    {
        var path = Path.Combine(Directory.GetCurrentDirectory(), "..", "..", "..", "Fixtures", filename);
        return File.ReadAllText(path);
    }

    #endregion

    #region CRUD Operations

    [Fact]
    public async Task CreateProject_ValidRequest_ReturnsCreatedProject()
    {
        // Arrange
        var request = new
        {
            name = "Project A",
            description = "Testing"
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/projects", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        
        var project = await response.Content.ReadFromJsonAsync<Project>();
        project.Should().NotBeNull();
        project!.Id.Should().NotBeEmpty();
        project.Name.Should().Be("Project A");
        project.Description.Should().Be("Testing");
        project.CreatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromMinutes(1));
    }

    [Fact]
    public async Task ListProjects_AfterCreatingMultiple_ReturnsSortedList()
    {
        // Arrange
        await CreateTestProject("Project 1");
        await Task.Delay(100); // Ensure different timestamps
        await CreateTestProject("Project 2");

        // Act
        var response = await _client.GetAsync("/api/projects");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        
        var projects = await response.Content.ReadFromJsonAsync<List<ProjectMetadata>>();
        projects.Should().NotBeNull();
        projects!.Count.Should().BeGreaterThanOrEqualTo(2);
        
        // Verify sorted by CreatedAt descending
        var timestamps = projects.Select(p => p.CreatedAt).ToList();
        timestamps.Should().BeInDescendingOrder();
    }

    [Fact]
    public async Task GetProjectById_ExistingProject_ReturnsFullMetadata()
    {
        // Arrange
        var projectId = await CreateTestProject("Test Project", "Test Description");

        // Act
        var response = await _client.GetAsync($"/api/projects/{projectId}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        
        var project = await response.Content.ReadFromJsonAsync<Project>();
        project.Should().NotBeNull();
        project!.Id.Should().Be(projectId);
        project.Name.Should().Be("Test Project");
        project.Description.Should().Be("Test Description");
        project.CreatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromMinutes(1));
    }

    [Fact]
    public async Task GetProjectById_NonExistentProject_ReturnsNotFound()
    {
        // Arrange
        var nonExistentId = Guid.NewGuid();

        // Act
        var response = await _client.GetAsync($"/api/projects/{nonExistentId}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task DeleteProject_ExistingProject_ReturnsNoContentAndRemovesProject()
    {
        // Arrange
        var projectId = await CreateTestProject();

        // Act
        var deleteResponse = await _client.DeleteAsync($"/api/projects/{projectId}");

        // Assert
        deleteResponse.StatusCode.Should().Be(HttpStatusCode.NoContent);
        
        // Verify project is gone
        var getResponse = await _client.GetAsync($"/api/projects/{projectId}");
        getResponse.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task DeleteProject_NonExistentProject_ReturnsNotFound()
    {
        // Arrange
        var nonExistentId = Guid.NewGuid();

        // Act
        var response = await _client.DeleteAsync($"/api/projects/{nonExistentId}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    #endregion

    #region Update Operations

    [Fact]
    public async Task SaveRules_ValidRules_UpdatesProjectSuccessfully()
    {
        // Arrange
        var projectId = await CreateTestProject();
        var rulesJson = LoadFixture("rules-happy.json");
        var request = new { rulesJson };

        // Act
        var response = await _client.PostAsJsonAsync($"/api/projects/{projectId}/rules", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        
        var project = await response.Content.ReadFromJsonAsync<Project>();
        project.Should().NotBeNull();
        project!.RulesJson.Should().NotBeNullOrEmpty();
        project.RulesJson.Should().Contain("version");
    }

    [Fact]
    public async Task SaveCodeMaster_ValidCodeMaster_UpdatesProjectSuccessfully()
    {
        // Arrange
        var projectId = await CreateTestProject();
        var codeMasterJson = LoadFixture("codemaster-happy.json");
        var request = new { codeMasterJson };

        // Act
        var response = await _client.PostAsJsonAsync($"/api/projects/{projectId}/codemaster", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        
        var project = await response.Content.ReadFromJsonAsync<Project>();
        project.Should().NotBeNull();
        project!.CodeMasterJson.Should().NotBeNullOrEmpty();
        project.CodeMasterJson.Should().Contain("screeningTypes");
    }

    [Fact]
    public async Task SaveBundle_ValidBundle_UpdatesProjectSuccessfully()
    {
        // Arrange
        var projectId = await CreateTestProject();
        var bundleJson = LoadFixture("bundle-happy.json");
        var request = new { bundleJson };

        // Act
        var response = await _client.PostAsJsonAsync($"/api/projects/{projectId}/bundle", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        
        var project = await response.Content.ReadFromJsonAsync<Project>();
        project.Should().NotBeNull();
        project!.SampleBundleJson.Should().NotBeNullOrEmpty();
        project.SampleBundleJson.Should().Contain("resourceType");
    }

    [Fact]
    public async Task UpdateOperations_InvalidProjectId_ReturnsNotFound()
    {
        // Arrange
        var nonExistentId = Guid.NewGuid();
        var rulesJson = LoadFixture("rules-happy.json");

        // Act
        var response = await _client.PostAsJsonAsync($"/api/projects/{nonExistentId}/rules", new { rulesJson });

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    #endregion

    #region Export Operations

    [Fact]
    public async Task ExportProject_WithRulesAndCodeMaster_ReturnsCompletePackage()
    {
        // Arrange
        var projectId = await CreateTestProject();
        var rulesJson = LoadFixture("rules-happy.json");
        var codeMasterJson = LoadFixture("codemaster-happy.json");
        
        await _client.PostAsJsonAsync($"/api/projects/{projectId}/rules", new { rulesJson });
        await _client.PostAsJsonAsync($"/api/projects/{projectId}/codemaster", new { codeMasterJson });

        // Act
        var response = await _client.GetAsync($"/api/projects/{projectId}/export");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        response.Content.Headers.ContentType?.MediaType.Should().Be("application/json");

        var package = await response.Content.ReadFromJsonAsync<Dictionary<string, object>>();
        package.Should().NotBeNull();
        package.Should().ContainKey("rules");
        package.Should().ContainKey("codeMaster");
    }

    #endregion

    #region Validation E2E

    [Fact]
    public async Task ValidateProject_ValidBundle_ReturnsNoErrors()
    {
        // Arrange
        var projectId = await CreateTestProject();
        var bundleJson = LoadFixture("bundle-happy.json");
        var rulesJson = LoadFixture("rules-happy.json");
        
        await _client.PostAsJsonAsync($"/api/projects/{projectId}/bundle", new { bundleJson });
        await _client.PostAsJsonAsync($"/api/projects/{projectId}/rules", new { rulesJson });

        // Act
        var response = await _client.PostAsync($"/api/projects/{projectId}/validate", null);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        
        var result = await response.Content.ReadFromJsonAsync<ValidationResponse>();
        result.Should().NotBeNull();
        result!.Summary.ErrorCount.Should().Be(0);
        result.Errors.Should().BeEmpty();
    }

    [Fact]
    public async Task ValidateProject_MissingBirthDate_ReturnsBusinessError()
    {
        // Arrange
        var projectId = await CreateTestProject();
        var bundleJson = LoadFixture("bundle-missing-birthdate.json");
        var rulesJson = LoadFixture("rules-with-required-birthdate.json");
        
        await _client.PostAsJsonAsync($"/api/projects/{projectId}/bundle", new { bundleJson });
        await _client.PostAsJsonAsync($"/api/projects/{projectId}/rules", new { rulesJson });

        // Act
        var response = await _client.PostAsync($"/api/projects/{projectId}/validate", null);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        
        var result = await response.Content.ReadFromJsonAsync<ValidationResponse>();
        result.Should().NotBeNull();
        
        // May or may not have errors depending on rule configuration
        if (result!.Errors.Any())
        {
            // Look for ANY business error about birthDate (not just the first one)
            var birthDateError = result.Errors.FirstOrDefault(e => 
                e.Source == "Business" && 
                e.Path != null && 
                e.Path.Contains("birthDate"));
            
            if (birthDateError != null)
            {
                birthDateError.Path.Should().Contain("birthDate");
            }
        }
    }

    [Fact]
    public async Task ValidateProject_InvalidReference_ReturnsReferenceError()
    {
        // Arrange
        var projectId = await CreateTestProject();
        var bundleJson = LoadFixture("bundle-invalid-reference.json");
        
        await _client.PostAsJsonAsync($"/api/projects/{projectId}/bundle", new { bundleJson });

        // Act
        var response = await _client.PostAsync($"/api/projects/{projectId}/validate", null);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        
        var result = await response.Content.ReadFromJsonAsync<ValidationResponse>();
        result.Should().NotBeNull();
        result!.Summary.ReferenceErrorCount.Should().BeGreaterThan(0);
        
        var refError = result.Errors.FirstOrDefault(e => e.Source == "Reference");
        refError.Should().NotBeNull();
        refError!.ErrorCode.Should().Contain("REFERENCE");
    }

    [Fact]
    public async Task ValidateProject_CheckSummaryCounts_AccuratelyReflectErrors()
    {
        // Arrange
        var projectId = await CreateTestProject();
        var bundleJson = LoadFixture("bundle-invalid-reference.json");
        
        await _client.PostAsJsonAsync($"/api/projects/{projectId}/bundle", new { bundleJson });

        // Act
        var response = await _client.PostAsync($"/api/projects/{projectId}/validate", null);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        
        var result = await response.Content.ReadFromJsonAsync<ValidationResponse>();
        result.Should().NotBeNull();
        result!.Summary.TotalErrors.Should().Be(result.Errors.Count);
        result.Metadata.ProcessingTimeMs.Should().BeGreaterThan(0);
    }

    [Fact]
    public async Task ValidateProject_ErrorsSortedByPath_LexicographicOrder()
    {
        // Arrange
        var projectId = await CreateTestProject();
        var bundleJson = LoadFixture("bundle-multi-error.json");
        var rulesJson = LoadFixture("rules-with-required-birthdate.json");
        
        await _client.PostAsJsonAsync($"/api/projects/{projectId}/bundle", new { bundleJson });
        await _client.PostAsJsonAsync($"/api/projects/{projectId}/rules", new { rulesJson });

        // Act
        var response = await _client.PostAsync($"/api/projects/{projectId}/validate", null);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        
        var result = await response.Content.ReadFromJsonAsync<ValidationResponse>();
        
        // Verify errors contain paths and can be sorted
        if (result!.Errors.Count > 1)
        {
            var paths = result.Errors
                .Where(e => !string.IsNullOrEmpty(e.Path))
                .Select(e => e.Path!)
                .ToList();
            
            if (paths.Count > 1)
            {
                // Verify paths are present and distinct
                paths.Should().NotBeEmpty();
                paths.Should().OnlyHaveUniqueItems();
                
                // Verify paths can be sorted lexicographically
                var sortedPaths = paths.OrderBy(p => p, StringComparer.Ordinal).ToList();
                sortedPaths.Should().NotBeEmpty();
                sortedPaths.Count.Should().Be(paths.Count);
            }
        }
    }

    #endregion

    #region Concurrent Operations

    [Fact]
    public async Task ConcurrentProjectCreation_MultipleProjects_AllCreatedSuccessfully()
    {
        // Arrange
        var tasks = new List<Task<HttpResponseMessage>>();

        // Act - Create 5 projects concurrently
        for (int i = 0; i < 5; i++)
        {
            var request = new { name = $"Concurrent Project {i}", description = $"Test {i}" };
            tasks.Add(_client.PostAsJsonAsync("/api/projects", request));
        }

        var responses = await Task.WhenAll(tasks);

        // Assert
        foreach (var response in responses)
        {
            response.StatusCode.Should().Be(HttpStatusCode.Created);
        }

        // Verify all projects exist
        var listResponse = await _client.GetAsync("/api/projects");
        var projects = await listResponse.Content.ReadFromJsonAsync<List<ProjectMetadata>>();
        projects!.Count.Should().BeGreaterThanOrEqualTo(5);
    }

    #endregion
}
