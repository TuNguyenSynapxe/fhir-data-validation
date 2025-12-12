using System.IO.Compression;
using System.Net.Http;
using System.Text.Json;
using Microsoft.Extensions.Logging;

namespace Pss.FhirProcessor.Playground.Api.Utilities;

/// <summary>
/// One-time utility to import official FHIR R4 examples from HL7 specification ZIP
/// </summary>
public class FhirExampleImporter
{
    private readonly ILogger<FhirExampleImporter> _logger;
    // Use HL7 FHIR R4 definitions package which contains examples
    private const string SpecZipUrl = "http://hl7.org/fhir/R4/definitions.json.zip";
    private const string TempDownloadPath = "temp/fhir-spec.zip";
    private const string TempExtractPath = "temp/fhir-spec-extracted";
    private const string TargetBasePath = "data/samples/r4";

    private static readonly string[] AllowedResources = new[]
    {
        "Patient",
        "Observation",
        "Encounter",
        "Organization",
        "Location",
        "Practitioner",
        "PractitionerRole",
        "Condition",
        "Procedure",
        "MedicationRequest"
    };

    public FhirExampleImporter(ILogger<FhirExampleImporter> logger)
    {
        _logger = logger;
    }

    public async Task<ImportResult> ImportExamplesAsync(bool forceRedownload = false)
    {
        var result = new ImportResult();

        try
        {
            _logger.LogInformation("Starting FHIR R4 example import from {Url}", SpecZipUrl);

            // Step 1: Download ZIP if not cached
            if (forceRedownload || !File.Exists(TempDownloadPath))
            {
                await DownloadSpecificationZipAsync();
            }
            else
            {
                _logger.LogInformation("Using cached specification ZIP: {Path}", TempDownloadPath);
            }

            // Step 2: Extract ZIP
            ExtractSpecificationZip();

            // Step 3: Process examples
            result = ProcessExampleFiles();

            // Step 4: Cleanup
            CleanupTempFiles();

            _logger.LogInformation("Import completed successfully: {Count} files imported", result.ImportedCount);
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to import FHIR examples");
            result.Errors.Add(ex.Message);
            return result;
        }
    }

    private async Task DownloadSpecificationZipAsync()
    {
        _logger.LogInformation("Downloading FHIR R4 specification ZIP from {Url}...", SpecZipUrl);

        Directory.CreateDirectory(Path.GetDirectoryName(TempDownloadPath)!);

        using var httpClient = new HttpClient();
        httpClient.Timeout = TimeSpan.FromMinutes(10); // Large file
        
        // Add user agent to avoid 405 errors
        httpClient.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0 (compatible; FhirExampleImporter/1.0)");

        try
        {
            var response = await httpClient.GetAsync(SpecZipUrl);
            response.EnsureSuccessStatusCode();

            await using var fileStream = File.Create(TempDownloadPath);
            await response.Content.CopyToAsync(fileStream);

            _logger.LogInformation("Downloaded {Size} bytes to {Path}", 
                new FileInfo(TempDownloadPath).Length, TempDownloadPath);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError("Failed to download: {Message}", ex.Message);
            _logger.LogInformation("Please manually download the ZIP from:");
            _logger.LogInformation("  {Url}", SpecZipUrl);
            _logger.LogInformation("And place it at:");
            _logger.LogInformation("  {Path}", Path.GetFullPath(TempDownloadPath));
            throw new InvalidOperationException(
                $"Failed to download FHIR specification. " +
                $"Please manually download from {SpecZipUrl} and place at {Path.GetFullPath(TempDownloadPath)}", 
                ex);
        }
    }

    private void ExtractSpecificationZip()
    {
        _logger.LogInformation("Extracting specification ZIP to {Path}...", TempExtractPath);

        if (Directory.Exists(TempExtractPath))
        {
            Directory.Delete(TempExtractPath, recursive: true);
        }

        Directory.CreateDirectory(TempExtractPath);

        ZipFile.ExtractToDirectory(TempDownloadPath, TempExtractPath);

        _logger.LogInformation("Extraction completed");
    }

    private ImportResult ProcessExampleFiles()
    {
        var result = new ImportResult();

        _logger.LogInformation("Processing example files...");

        // The definitions.json.zip contains JSON files directly (no examples subfolder)
        var jsonFiles = Directory.GetFiles(TempExtractPath, "*.json");
        _logger.LogInformation("Found {Count} JSON files in extracted folder", jsonFiles.Length);

        foreach (var jsonFile in jsonFiles)
        {
            try
            {
                ProcessSingleExample(jsonFile, result);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to process file: {File}", jsonFile);
                result.Errors.Add($"Error processing {Path.GetFileName(jsonFile)}: {ex.Message}");
            }
        }

        return result;
    }

    private void ProcessSingleExample(string sourceFile, ImportResult result)
    {
        var fileName = Path.GetFileName(sourceFile);
        
        // Skip non-example files (definitions.json.zip contains structure definitions too)
        // Example files typically contain "-example" in their name
        var fileNameLower = fileName.ToLowerInvariant();
        if (!fileNameLower.Contains("example") && 
            !fileNameLower.Contains("patient") &&
            !fileNameLower.Contains("observation") &&
            !fileNameLower.Contains("encounter") &&
            !fileNameLower.Contains("condition") &&
            !fileNameLower.Contains("procedure") &&
            !fileNameLower.Contains("medication") &&
            !fileNameLower.Contains("practitioner") &&
            !fileNameLower.Contains("organization") &&
            !fileNameLower.Contains("location"))
        {
            result.Skipped.Add($"{fileName} (not an example file)");
            return;
        }
        
        // Read and parse JSON
        var jsonContent = File.ReadAllText(sourceFile);
        
        using var doc = JsonDocument.Parse(jsonContent);
        var root = doc.RootElement;

        // Validate resourceType exists
        if (!root.TryGetProperty("resourceType", out var resourceTypeElement))
        {
            result.Skipped.Add($"{fileName} (no resourceType)");
            return;
        }

        var resourceType = resourceTypeElement.GetString();
        if (string.IsNullOrWhiteSpace(resourceType))
        {
            result.Skipped.Add($"{fileName} (empty resourceType)");
            return;
        }

        // Filter by allowed resources
        if (!AllowedResources.Contains(resourceType))
        {
            result.Skipped.Add($"{fileName} ({resourceType} not in allowed list)");
            return;
        }

        // Create target directory
        var targetFolder = Path.Combine(TargetBasePath, resourceType);
        Directory.CreateDirectory(targetFolder);

        // Generate target filename with hl7- prefix
        var baseFileName = Path.GetFileNameWithoutExtension(fileName);
        var targetFileName = $"hl7-{baseFileName}.json";
        var targetFilePath = Path.Combine(targetFolder, targetFileName);

        // Check for duplicates
        if (File.Exists(targetFilePath))
        {
            _logger.LogDebug("Skipping duplicate: {File}", targetFileName);
            result.Skipped.Add($"{fileName} (duplicate)");
            return;
        }

        // Copy file exactly as-is (no modifications)
        File.Copy(sourceFile, targetFilePath);

        result.ImportedFiles.Add(new ImportedFileInfo
        {
            ResourceType = resourceType,
            SourceFileName = fileName,
            TargetFileName = targetFileName,
            TargetPath = targetFilePath
        });

        result.ImportedCount++;

        _logger.LogDebug("Imported: {ResourceType}/{FileName}", resourceType, targetFileName);
    }

    private void CleanupTempFiles()
    {
        try
        {
            if (Directory.Exists(TempExtractPath))
            {
                Directory.Delete(TempExtractPath, recursive: true);
                _logger.LogInformation("Cleaned up temporary extraction folder");
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to cleanup temp files");
        }
    }
}

public class ImportResult
{
    public int ImportedCount { get; set; }
    public List<ImportedFileInfo> ImportedFiles { get; set; } = new();
    public List<string> Skipped { get; set; } = new();
    public List<string> Errors { get; set; } = new();
}

public class ImportedFileInfo
{
    public string ResourceType { get; set; } = string.Empty;
    public string SourceFileName { get; set; } = string.Empty;
    public string TargetFileName { get; set; } = string.Empty;
    public string TargetPath { get; set; } = string.Empty;
}
