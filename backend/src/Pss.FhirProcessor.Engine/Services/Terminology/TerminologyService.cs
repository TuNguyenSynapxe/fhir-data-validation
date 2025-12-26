using System.Text.Json;
using Microsoft.Extensions.Logging;
using Pss.FhirProcessor.Engine.Models.Terminology;
using Pss.FhirProcessor.Engine.Interfaces;

namespace Pss.FhirProcessor.Engine.Services.Terminology;

/// <summary>
/// File-based implementation of ITerminologyService.
/// Stores CodeSystems as JSON files in a project-specific folder.
/// 
/// Storage structure:
/// {baseDataPath}/{projectId}/terminology/{url-hash}.json
/// 
/// Note: This is a simple implementation suitable for authoring scenarios.
/// For production with many CodeSystems, consider database storage.
/// </summary>
public class TerminologyService : ITerminologyService
{
    private readonly ILogger<TerminologyService> _logger;
    private readonly string _baseDataPath;
    private readonly JsonSerializerOptions _jsonOptions;

    // In-memory cache for loaded CodeSystems (optional optimization)
    private readonly Dictionary<string, Dictionary<string, CodeSystem>> _cache = new();

    public TerminologyService(ILogger<TerminologyService> logger, string baseDataPath)
    {
        _logger = logger;
        _baseDataPath = baseDataPath;
        _jsonOptions = new JsonSerializerOptions
        {
            WriteIndented = true,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            PropertyNameCaseInsensitive = true
        };
    }

    public async Task<CodeSystem?> GetCodeSystemByUrlAsync(string url, CancellationToken cancellationToken = default)
    {
        _logger.LogDebug("Getting CodeSystem by URL: {Url}", url);

        // Search all projects (or could be scoped to specific project if needed)
        var projectDirs = Directory.GetDirectories(_baseDataPath);
        
        foreach (var projectDir in projectDirs)
        {
            var terminologyDir = Path.Combine(projectDir, "terminology");
            if (!Directory.Exists(terminologyDir))
                continue;

            var files = Directory.GetFiles(terminologyDir, "*.json");
            foreach (var file in files)
            {
                try
                {
                    var json = await File.ReadAllTextAsync(file, cancellationToken);
                    var codeSystem = JsonSerializer.Deserialize<CodeSystem>(json, _jsonOptions);
                    
                    if (codeSystem?.Url == url)
                    {
                        _logger.LogDebug("Found CodeSystem: {Url}", url);
                        return codeSystem;
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to load CodeSystem from file: {File}", file);
                }
            }
        }

        _logger.LogDebug("CodeSystem not found: {Url}", url);
        return null;
    }

    public async Task<List<CodeSystem>> ListCodeSystemsAsync(string projectId, CancellationToken cancellationToken = default)
    {
        _logger.LogDebug("Listing CodeSystems for project: {ProjectId}", projectId);

        var terminologyDir = GetTerminologyDirectory(projectId);
        var codeSystems = new List<CodeSystem>();

        if (!Directory.Exists(terminologyDir))
        {
            _logger.LogDebug("Terminology directory does not exist for project: {ProjectId}", projectId);
            return codeSystems;
        }

        var files = Directory.GetFiles(terminologyDir, "*.json");
        _logger.LogDebug("Found {Count} CodeSystem files", files.Length);

        foreach (var file in files)
        {
            try
            {
                var json = await File.ReadAllTextAsync(file, cancellationToken);
                var codeSystem = JsonSerializer.Deserialize<CodeSystem>(json, _jsonOptions);
                
                if (codeSystem != null)
                {
                    codeSystems.Add(codeSystem);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to load CodeSystem from file: {File}", file);
            }
        }

        _logger.LogInformation("Loaded {Count} CodeSystems for project {ProjectId}", codeSystems.Count, projectId);
        return codeSystems;
    }

    public async Task SaveCodeSystemAsync(string projectId, CodeSystem codeSystem, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Saving CodeSystem: {Url} for project: {ProjectId}", codeSystem.Url, projectId);

        var terminologyDir = GetTerminologyDirectory(projectId);
        Directory.CreateDirectory(terminologyDir);

        // Generate filename from URL (use hash to avoid filesystem issues)
        var fileName = GenerateFileName(codeSystem.Url);
        var filePath = Path.Combine(terminologyDir, fileName);

        // PHASE 1 STABILIZATION: Atomic write with temp file to prevent corruption
        var tempFilePath = filePath + ".tmp";
        
        try
        {
            var json = JsonSerializer.Serialize(codeSystem, _jsonOptions);
            await File.WriteAllTextAsync(tempFilePath, json, cancellationToken);
            
            // Atomic rename: overwrites existing file if present
            File.Move(tempFilePath, filePath, overwrite: true);
            
            _logger.LogInformation("CodeSystem saved: {FilePath}", filePath);
        }
        catch
        {
            // Clean up temp file if atomic write failed
            if (File.Exists(tempFilePath))
            {
                try { File.Delete(tempFilePath); } catch { /* Ignore cleanup errors */ }
            }
            throw;
        }
    }

    public async Task<bool> DeleteCodeSystemAsync(string projectId, string url, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Deleting CodeSystem: {Url} from project: {ProjectId}", url, projectId);

        var terminologyDir = GetTerminologyDirectory(projectId);
        if (!Directory.Exists(terminologyDir))
        {
            _logger.LogDebug("Terminology directory does not exist");
            return false;
        }

        var fileName = GenerateFileName(url);
        var filePath = Path.Combine(terminologyDir, fileName);

        if (File.Exists(filePath))
        {
            File.Delete(filePath);
            _logger.LogInformation("CodeSystem deleted: {FilePath}", filePath);
            return true;
        }

        _logger.LogDebug("CodeSystem file not found: {FilePath}", filePath);
        return false;
    }

    public async Task<CodeSystemConcept?> FindConceptAsync(string system, string code, CancellationToken cancellationToken = default)
    {
        _logger.LogDebug("Finding concept: {System}#{Code}", system, code);

        var codeSystem = await GetCodeSystemByUrlAsync(system, cancellationToken);
        if (codeSystem == null)
        {
            _logger.LogDebug("CodeSystem not found: {System}", system);
            return null;
        }

        return FindConceptRecursive(codeSystem.Concept, code);
    }

    private CodeSystemConcept? FindConceptRecursive(List<CodeSystemConcept> concepts, string code)
    {
        foreach (var concept in concepts)
        {
            if (concept.Code == code)
            {
                return concept;
            }

            // Search in child concepts (hierarchical)
            if (concept.Concept != null)
            {
                var found = FindConceptRecursive(concept.Concept, code);
                if (found != null)
                {
                    return found;
                }
            }
        }

        return null;
    }

    private string GetTerminologyDirectory(string projectId)
    {
        return Path.Combine(_baseDataPath, projectId, "terminology");
    }

    private string GenerateFileName(string url)
    {
        // Generate a safe filename from URL
        // Option 1: Use the last segment of the URL
        var lastSegment = url.Split('/').Last();
        
        // Remove any characters that are invalid for filenames
        var safeFileName = string.Join("_", lastSegment.Split(Path.GetInvalidFileNameChars()));
        
        return $"{safeFileName}.json";
    }
}
