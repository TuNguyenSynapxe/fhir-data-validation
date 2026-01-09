using System.IO.Compression;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Pss.FhirProcessor.Application.Projects.Import.Errors;
using Pss.FhirProcessor.Application.Projects.Import.ImportModels;

namespace Pss.FhirProcessor.Application.Projects.Import;

/// <summary>
/// Parses Simplifier-compatible R5 package ZIP files.
/// Extracts package manifest and enumerates FHIR resources.
/// </summary>
public sealed class SimplifierPackageParser
{
    private static readonly string[] SupportedFhirVersions = { "5.0.0", "5.0", "R5" };

    /// <summary>
    /// Parses a Simplifier package ZIP file.
    /// </summary>
    /// <param name="zipFilePath">Path to the ZIP file.</param>
    /// <returns>Package manifest and list of JSON file entries.</returns>
    /// <exception cref="ProjectImportException">Thrown when parsing fails.</exception>
    public ParsedPackageManifest ParsePackageManifest(string zipFilePath)
    {
        if (!File.Exists(zipFilePath))
        {
            throw new ProjectImportException(
                ImportErrorCodes.InvalidZipStructure,
                $"ZIP file not found: {zipFilePath}");
        }

        using var archive = ZipFile.OpenRead(zipFilePath);

        // Find package.json
        var packageEntry = archive.Entries.FirstOrDefault(e =>
            e.FullName.Equals("package.json", StringComparison.OrdinalIgnoreCase) ||
            e.FullName.Equals("package/package.json", StringComparison.OrdinalIgnoreCase));

        if (packageEntry == null)
        {
            throw new ProjectImportException(
                ImportErrorCodes.MissingPackageJson,
                "package.json not found in ZIP");
        }

        // Parse package.json
        using var packageStream = packageEntry.Open();
        using var packageReader = new StreamReader(packageStream);
        var packageJson = packageReader.ReadToEnd();

        JsonDocument packageDoc;
        try
        {
            packageDoc = JsonDocument.Parse(packageJson);
        }
        catch (JsonException ex)
        {
            throw new ProjectImportException(
                ImportErrorCodes.InvalidPackageJson,
                "Failed to parse package.json",
                ex);
        }

        var root = packageDoc.RootElement;

        // Extract required fields
        if (!root.TryGetProperty("name", out var nameElement))
        {
            throw new ProjectImportException(
                ImportErrorCodes.InvalidPackageJson,
                "package.json missing 'name' field");
        }

        if (!root.TryGetProperty("version", out var versionElement))
        {
            throw new ProjectImportException(
                ImportErrorCodes.InvalidPackageJson,
                "package.json missing 'version' field");
        }

        if (!root.TryGetProperty("fhirVersions", out var fhirVersionsElement) ||
            fhirVersionsElement.ValueKind != JsonValueKind.Array)
        {
            throw new ProjectImportException(
                ImportErrorCodes.InvalidPackageJson,
                "package.json missing or invalid 'fhirVersions' array");
        }

        // Validate FHIR version
        var fhirVersion = fhirVersionsElement.EnumerateArray()
            .Select(v => v.GetString())
            .FirstOrDefault(v => SupportedFhirVersions.Contains(v, StringComparer.OrdinalIgnoreCase));

        if (fhirVersion == null)
        {
            var declaredVersions = string.Join(", ", fhirVersionsElement.EnumerateArray()
                .Select(v => v.GetString() ?? "null"));

            throw new ProjectImportException(
                ImportErrorCodes.UnsupportedFhirVersion,
                $"Unsupported FHIR version. Expected R5 (5.0.0), found: {declaredVersions}");
        }

        // Optional fields
        root.TryGetProperty("description", out var descElement);
        root.TryGetProperty("canonical", out var canonicalElement);

        return new ParsedPackageManifest
        {
            Name = nameElement.GetString() ?? throw new ProjectImportException(
                ImportErrorCodes.InvalidPackageJson,
                "package.json 'name' is null"),
            Version = versionElement.GetString() ?? throw new ProjectImportException(
                ImportErrorCodes.InvalidPackageJson,
                "package.json 'version' is null"),
            Description = descElement.ValueKind != JsonValueKind.Undefined
                ? descElement.GetString()
                : null,
            FhirVersion = fhirVersion,
            CanonicalBase = canonicalElement.ValueKind != JsonValueKind.Undefined
                ? canonicalElement.GetString()
                : null,
            AdditionalMetadata = packageJson
        };
    }

    /// <summary>
    /// Extracts all JSON files from the ZIP and returns their content.
    /// </summary>
    /// <param name="zipFilePath">Path to the ZIP file.</param>
    /// <returns>Dictionary mapping file paths to JSON content.</returns>
    public Dictionary<string, string> ExtractJsonFiles(string zipFilePath)
    {
        var jsonFiles = new Dictionary<string, string>();

        using var archive = ZipFile.OpenRead(zipFilePath);

        var entries = archive.Entries
            .Where(e => e.FullName.EndsWith(".json", StringComparison.OrdinalIgnoreCase))
            .Where(e => e.Length > 0)
            .Where(e => !e.FullName.Equals("package.json", StringComparison.OrdinalIgnoreCase))
            .Where(e => !e.FullName.Equals("package/package.json", StringComparison.OrdinalIgnoreCase));

        foreach (var entry in entries)
        {
            using var stream = entry.Open();
            using var reader = new StreamReader(stream);
            var content = reader.ReadToEnd();

            // Normalize path separators
            var normalizedPath = entry.FullName.Replace('\\', '/');

            jsonFiles[normalizedPath] = content;
        }

        if (jsonFiles.Count == 0)
        {
            throw new ProjectImportException(
                ImportErrorCodes.EmptyZip,
                "No FHIR resource JSON files found in ZIP");
        }

        return jsonFiles;
    }

    /// <summary>
    /// Computes SHA256 hash of a string.
    /// </summary>
    public static string ComputeHash(string content)
    {
        var bytes = Encoding.UTF8.GetBytes(content);
        var hashBytes = SHA256.HashData(bytes);
        return Convert.ToHexString(hashBytes).ToLowerInvariant();
    }
}
