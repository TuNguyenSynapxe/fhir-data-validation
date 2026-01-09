using System.IO.Compression;
using System.Text;
using System.Text.Json;
using FluentAssertions;
using Pss.FhirProcessor.Application.Projects.Import;
using Pss.FhirProcessor.Application.Projects.Import.Errors;

namespace Pss.FhirProcessor.Application.Tests.Projects.Import;

public class SimplifierPackageParserTests : IDisposable
{
    private readonly string _tempDir;
    private readonly SimplifierPackageParser _parser;

    public SimplifierPackageParserTests()
    {
        _tempDir = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());
        Directory.CreateDirectory(_tempDir);
        _parser = new SimplifierPackageParser();
    }

    public void Dispose()
    {
        if (Directory.Exists(_tempDir))
        {
            Directory.Delete(_tempDir, true);
        }
    }

    [Fact]
    public void ParsePackageManifest_ValidR5Package_Success()
    {
        // Arrange
        var zipPath = CreateValidR5Package();

        // Act
        var manifest = _parser.ParsePackageManifest(zipPath);

        // Assert
        manifest.Name.Should().Be("test.package");
        manifest.Version.Should().Be("1.0.0");
        manifest.Description.Should().Be("Test package");
        manifest.FhirVersion.Should().Be("5.0.0");
        manifest.CanonicalBase.Should().Be("http://example.com/fhir");
    }

    [Fact]
    public void ParsePackageManifest_MissingPackageJson_ThrowsException()
    {
        // Arrange
        var zipPath = CreateZipWithoutPackageJson();

        // Act & Assert
        var exception = Assert.Throws<ProjectImportException>(
            () => _parser.ParsePackageManifest(zipPath));

        exception.ErrorCode.Should().Be(ImportErrorCodes.MissingPackageJson);
        exception.Message.Should().Contain("package.json not found");
    }

    [Fact]
    public void ParsePackageManifest_UnsupportedFhirVersion_ThrowsException()
    {
        // Arrange
        var zipPath = CreatePackageWithUnsupportedVersion();

        // Act & Assert
        var exception = Assert.Throws<ProjectImportException>(
            () => _parser.ParsePackageManifest(zipPath));

        exception.ErrorCode.Should().Be(ImportErrorCodes.UnsupportedFhirVersion);
        exception.Message.Should().Contain("Unsupported FHIR version");
    }

    [Fact]
    public void ExtractJsonFiles_ValidPackage_ReturnsFiles()
    {
        // Arrange
        var zipPath = CreatePackageWithResources();

        // Act
        var files = _parser.ExtractJsonFiles(zipPath);

        // Assert
        files.Should().HaveCount(2);
        files.Should().ContainKey("StructureDefinition/Patient.json");
        files.Should().ContainKey("ValueSet/example.json");
    }

    [Fact]
    public void ExtractJsonFiles_NoJsonFiles_ThrowsException()
    {
        // Arrange
        var zipPath = CreateEmptyZipWithPackageJson();

        // Act & Assert
        var exception = Assert.Throws<ProjectImportException>(
            () => _parser.ExtractJsonFiles(zipPath));

        exception.ErrorCode.Should().Be(ImportErrorCodes.EmptyZip);
    }

    [Fact]
    public void ComputeHash_SameContent_SameHash()
    {
        // Arrange
        var content = "{\"resourceType\":\"Patient\"}";

        // Act
        var hash1 = SimplifierPackageParser.ComputeHash(content);
        var hash2 = SimplifierPackageParser.ComputeHash(content);

        // Assert
        hash1.Should().Be(hash2);
        hash1.Should().HaveLength(64); // SHA256 = 64 hex chars
    }

    [Fact]
    public void ComputeHash_DifferentContent_DifferentHash()
    {
        // Arrange
        var content1 = "{\"resourceType\":\"Patient\"}";
        var content2 = "{\"resourceType\":\"Observation\"}";

        // Act
        var hash1 = SimplifierPackageParser.ComputeHash(content1);
        var hash2 = SimplifierPackageParser.ComputeHash(content2);

        // Assert
        hash1.Should().NotBe(hash2);
    }

    private string CreateValidR5Package()
    {
        var zipPath = Path.Combine(_tempDir, "valid-r5.zip");
        using var archive = ZipFile.Open(zipPath, ZipArchiveMode.Create);

        var packageJson = new
        {
            name = "test.package",
            version = "1.0.0",
            description = "Test package",
            fhirVersions = new[] { "5.0.0" },
            canonical = "http://example.com/fhir"
        };

        var entry = archive.CreateEntry("package.json");
        using var stream = entry.Open();
        JsonSerializer.Serialize(stream, packageJson);

        return zipPath;
    }

    private string CreateZipWithoutPackageJson()
    {
        var zipPath = Path.Combine(_tempDir, "no-package.zip");
        using var archive = ZipFile.Open(zipPath, ZipArchiveMode.Create);

        var entry = archive.CreateEntry("dummy.txt");
        using var stream = entry.Open();
        using var writer = new StreamWriter(stream);
        writer.Write("dummy");

        return zipPath;
    }

    private string CreatePackageWithUnsupportedVersion()
    {
        var zipPath = Path.Combine(_tempDir, "unsupported.zip");
        using var archive = ZipFile.Open(zipPath, ZipArchiveMode.Create);

        var packageJson = new
        {
            name = "test.package",
            version = "1.0.0",
            fhirVersions = new[] { "4.0.1" } // R4, not R5
        };

        var entry = archive.CreateEntry("package.json");
        using var stream = entry.Open();
        JsonSerializer.Serialize(stream, packageJson);

        return zipPath;
    }

    private string CreatePackageWithResources()
    {
        var zipPath = Path.Combine(_tempDir, "with-resources.zip");
        using var archive = ZipFile.Open(zipPath, ZipArchiveMode.Create);

        // Add package.json
        var packageJson = new
        {
            name = "test.package",
            version = "1.0.0",
            fhirVersions = new[] { "5.0.0" }
        };
        var pkgEntry = archive.CreateEntry("package.json");
        using (var stream = pkgEntry.Open())
        {
            JsonSerializer.Serialize(stream, packageJson);
        }

        // Add StructureDefinition
        var sdEntry = archive.CreateEntry("StructureDefinition/Patient.json");
        using (var stream = sdEntry.Open())
        using (var writer = new StreamWriter(stream))
        {
            writer.Write("{\"resourceType\":\"StructureDefinition\"}");
        }

        // Add ValueSet
        var vsEntry = archive.CreateEntry("ValueSet/example.json");
        using (var stream = vsEntry.Open())
        using (var writer = new StreamWriter(stream))
        {
            writer.Write("{\"resourceType\":\"ValueSet\"}");
        }

        return zipPath;
    }

    private string CreateEmptyZipWithPackageJson()
    {
        var zipPath = Path.Combine(_tempDir, "empty.zip");
        using var archive = ZipFile.Open(zipPath, ZipArchiveMode.Create);

        var packageJson = new
        {
            name = "test.package",
            version = "1.0.0",
            fhirVersions = new[] { "5.0.0" }
        };

        var entry = archive.CreateEntry("package.json");
        using var stream = entry.Open();
        JsonSerializer.Serialize(stream, packageJson);

        return zipPath;
    }
}
