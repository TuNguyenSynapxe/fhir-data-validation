using System.IO.Compression;
using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Pss.FhirProcessor.Persistence.Data;
using Pss.FhirProcessor.Playground.Api.Dtos;

namespace Pss.FhirProcessor.Playground.Api.Tests.Controllers;

/// <summary>
/// Integration tests for ProjectImportController.
/// Tests the full HTTP → Application → Database flow.
/// </summary>
public class ProjectImportControllerTests : IClassFixture<WebApplicationFactory<Program>>, IDisposable
{
    private readonly WebApplicationFactory<Program> _factory;
    private readonly HttpClient _client;
    private readonly string _tempDir;
    private readonly string _dbName; // Shared database name for this test instance

    public ProjectImportControllerTests(WebApplicationFactory<Program> factory)
    {
        _tempDir = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());
        Directory.CreateDirectory(_tempDir);
        _dbName = "TestDb_" + Guid.NewGuid(); // Store database name

        // Create factory with in-memory database
        _factory = factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureServices(services =>
            {
                // Remove existing DbContext registration
                var descriptor = services.SingleOrDefault(
                    d => d.ServiceType == typeof(DbContextOptions<FhirProcessorDbContext>));
                if (descriptor != null)
                {
                    services.Remove(descriptor);
                }

                // Also remove the registration itself
                var contextDescriptor = services.SingleOrDefault(
                    d => d.ServiceType == typeof(FhirProcessorDbContext));
                if (contextDescriptor != null)
                {
                    services.Remove(contextDescriptor);
                }

                // Add in-memory database for testing
                services.AddDbContext<FhirProcessorDbContext>(options =>
                {
                    options.UseInMemoryDatabase(_dbName); // Use instance field
                    options.EnableSensitiveDataLogging();
                });
            });
        });

        _client = _factory.CreateClient();
    }

    public void Dispose()
    {
        _client.Dispose();
        if (Directory.Exists(_tempDir))
        {
            Directory.Delete(_tempDir, true);
        }
    }

    [Fact]
    public async Task ImportProject_ValidR5Package_Returns201WithCounts()
    {
        // Arrange
        var zipPath = CreateValidR5Package();

        // Act
        var response = await UploadZipFile(zipPath);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Created);

        var content = await response.Content.ReadAsStringAsync();
        var result = JsonSerializer.Deserialize<ImportProjectResponseDto>(content, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        result.Should().NotBeNull();
        result!.ProjectId.Should().NotBeEmpty();
        result.ArtifactCount.Should().Be(3); // 1 SD + 1 VS + 1 Bundle
        result.BundleCount.Should().Be(1);
        result.RuleCount.Should().Be(1); // Generated from SD
        result.PolicyMode.Should().Be("Strict");
    }

    [Fact]
    public async Task ImportProject_NoFile_Returns400()
    {
        // Act
        var response = await _client.PostAsync("/api/admin/projects/import", null);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task ImportProject_EmptyFile_Returns400()
    {
        // Arrange
        var content = new MultipartFormDataContent();
        content.Add(new ByteArrayContent(Array.Empty<byte>()), "file", "empty.zip");

        // Act
        var response = await _client.PostAsync("/api/admin/projects/import", content);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var error = await DeserializeError(response);
        error.Error.Should().Be("EmptyFile");
    }

    [Fact]
    public async Task ImportProject_NonZipFile_Returns400()
    {
        // Arrange
        var content = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent("not a zip"u8.ToArray());
        fileContent.Headers.ContentType = new MediaTypeHeaderValue("text/plain");
        content.Add(fileContent, "file", "test.txt");

        // Act
        var response = await _client.PostAsync("/api/admin/projects/import", content);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var error = await DeserializeError(response);
        error.Error.Should().Be("InvalidFileType");
    }

    [Fact]
    public async Task ImportProject_MissingPackageJson_Returns400()
    {
        // Arrange
        var zipPath = CreateZipWithoutPackageJson();

        // Act
        var response = await UploadZipFile(zipPath);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var error = await DeserializeError(response);
        error.Error.Should().Be("IMPORT_MISSING_PACKAGE_JSON");
    }

    [Fact]
    public async Task ImportProject_UnsupportedFhirVersion_Returns400()
    {
        // Arrange
        var zipPath = CreateR4Package();

        // Act
        var response = await UploadZipFile(zipPath);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var error = await DeserializeError(response);
        error.Error.Should().Be("IMPORT_UNSUPPORTED_FHIR_VERSION");
        error.Message.Should().Contain("R5");
    }

    [Fact]
    public async Task ImportProject_DuplicateCanonicalUrl_Returns422()
    {
        // Arrange
        var zipPath = CreatePackageWithDuplicateCanonical();

        // Act
        var response = await UploadZipFile(zipPath);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);

        var error = await DeserializeError(response);
        error.Error.Should().Be("IMPORT_DUPLICATE_CANONICAL_URL");
    }

    [Fact]
    public async Task ImportProject_DatabaseCreatesCompleteGraph()
    {
        // Arrange
        var zipPath = CreateValidR5Package();

        // Act
        var response = await UploadZipFile(zipPath);
        
        // Log response for debugging
        if (!response.IsSuccessStatusCode)
        {
            var errorContent = await response.Content.ReadAsStringAsync();
            throw new Exception($"Import failed with {response.StatusCode}: {errorContent}");
        }

        var result = await JsonSerializer.DeserializeAsync<ImportProjectResponseDto>(
            await response.Content.ReadAsStreamAsync(),
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

        result.Should().NotBeNull();

        // Assert - Query database directly
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<FhirProcessorDbContext>();

        var project = await dbContext.Projects
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == result!.ProjectId);

        project.Should().NotBeNull();

        // Query collections separately for in-memory database
        var artifacts = await dbContext.ProjectArtifacts
            .Where(a => a.ProjectId == result!.ProjectId)
            .ToListAsync();
        var bundles = await dbContext.ProjectBundles
            .Where(b => b.ProjectId == result!.ProjectId)
            .ToListAsync();
        var rules = await dbContext.ProjectRules
            .Where(r => r.ProjectId == result!.ProjectId)
            .ToListAsync();
        var publicLinks = await dbContext.ProjectPublicLinks
            .Where(l => l.ProjectId == result!.ProjectId)
            .ToListAsync();

        artifacts.Should().HaveCount(3);
        bundles.Should().HaveCount(1);
        rules.Should().HaveCount(1);
        publicLinks.Should().HaveCount(1);
        publicLinks.First().Enabled.Should().BeFalse(); // Disabled by default
    }

    private async Task<HttpResponseMessage> UploadZipFile(string zipPath)
    {
        using var content = new MultipartFormDataContent();
        var fileBytes = await File.ReadAllBytesAsync(zipPath);
        var fileContent = new ByteArrayContent(fileBytes);
        fileContent.Headers.ContentType = new MediaTypeHeaderValue("application/zip");
        content.Add(fileContent, "file", Path.GetFileName(zipPath));

        return await _client.PostAsync("/api/admin/projects/import", content);
    }

    private static async Task<ImportErrorResponseDto> DeserializeError(HttpResponseMessage response)
    {
        var content = await response.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<ImportErrorResponseDto>(content, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        })!;
    }

    private string CreateValidR5Package()
    {
        var zipPath = Path.Combine(_tempDir, "valid-r5.zip");
        using var archive = ZipFile.Open(zipPath, ZipArchiveMode.Create);

        // package.json
        AddJsonEntry(archive, "package.json", new
        {
            name = "test.package",
            version = "1.0.0",
            fhirVersions = new[] { "5.0.0" },
            canonical = "http://example.com/fhir"
        });

        // StructureDefinition
        AddJsonEntry(archive, "StructureDefinition/Patient.json", new
        {
            resourceType = "StructureDefinition",
            url = "http://example.com/StructureDefinition/Patient",
            name = "PatientProfile",
            title = "Patient Profile"
        });

        // ValueSet
        AddJsonEntry(archive, "ValueSet/example.json", new
        {
            resourceType = "ValueSet",
            url = "http://example.com/ValueSet/example"
        });

        // Bundle
        AddJsonEntry(archive, "examples/bundle.json", new
        {
            resourceType = "Bundle",
            type = "collection",
            id = "example-bundle"
        });

        return zipPath;
    }

    private string CreateZipWithoutPackageJson()
    {
        var zipPath = Path.Combine(_tempDir, "no-package.zip");
        using var archive = ZipFile.Open(zipPath, ZipArchiveMode.Create);

        var entry = archive.CreateEntry("dummy.txt");
        using var stream = entry.Open();
        using var writer = new StreamWriter(stream);
        writer.Write("test");

        return zipPath;
    }

    private string CreateR4Package()
    {
        var zipPath = Path.Combine(_tempDir, "r4.zip");
        using var archive = ZipFile.Open(zipPath, ZipArchiveMode.Create);

        AddJsonEntry(archive, "package.json", new
        {
            name = "r4.package",
            version = "1.0.0",
            fhirVersions = new[] { "4.0.1" } // R4, not R5
        });

        return zipPath;
    }

    private string CreatePackageWithDuplicateCanonical()
    {
        var zipPath = Path.Combine(_tempDir, "duplicate.zip");
        using var archive = ZipFile.Open(zipPath, ZipArchiveMode.Create);

        AddJsonEntry(archive, "package.json", new
        {
            name = "test.package",
            version = "1.0.0",
            fhirVersions = new[] { "5.0.0" }
        });

        // Two SDs with same canonical URL
        AddJsonEntry(archive, "StructureDefinition/Patient1.json", new
        {
            resourceType = "StructureDefinition",
            url = "http://example.com/StructureDefinition/Patient" // Duplicate
        });

        AddJsonEntry(archive, "StructureDefinition/Patient2.json", new
        {
            resourceType = "StructureDefinition",
            url = "http://example.com/StructureDefinition/Patient" // Duplicate
        });

        return zipPath;
    }

    private static void AddJsonEntry(ZipArchive archive, string entryName, object data)
    {
        var entry = archive.CreateEntry(entryName);
        using var stream = entry.Open();
        JsonSerializer.Serialize(stream, data);
    }
}
