using Dapper;
using Npgsql;
using Pss.FhirProcessor.Persistence.Models;
using System.Text.RegularExpressions;

namespace Pss.FhirProcessor.Persistence.Repositories;

/// <summary>
/// PostgreSQL implementation of the project repository using Dapper.
/// This implementation is stateless, performs no caching, and treats
/// ruleset JSON as an opaque string.
/// </summary>
public sealed class PostgresProjectRepository : IProjectRepository
{
    private readonly NpgsqlConnection _connection;

    /// <summary>
    /// Initializes a new instance of the PostgresProjectRepository.
    /// </summary>
    /// <param name="connection">
    /// The database connection. Caller is responsible for lifecycle management.
    /// </param>
    public PostgresProjectRepository(NpgsqlConnection connection)
    {
        _connection = connection ?? throw new ArgumentNullException(nameof(connection));
    }

    /// <inheritdoc />
    public async Task<IReadOnlyList<ProjectRecord>> ListPublishedAsync(CancellationToken cancellationToken = default)
    {
        const string sql = @"
            SELECT 
                id,
                slug,
                name,
                description,
                ruleset_json AS RulesetJson,
                status,
                created_at AS CreatedAt,
                updated_at AS UpdatedAt,
                published_at AS PublishedAt,
                fhir_version AS FhirVersion,
                codemaster_json AS CodeMasterJson,
                sample_bundle_json AS SampleBundleJson,
                validation_settings_json AS ValidationSettingsJson,
                features AS FeaturesJson
            FROM projects
            WHERE status = 'published'
            ORDER BY published_at DESC";

        var command = new CommandDefinition(
            commandText: sql,
            cancellationToken: cancellationToken);

        var results = await _connection.QueryAsync<ProjectRecord>(command);
        
        return results.ToList();
    }

    /// <inheritdoc />
    public async Task<ProjectRecord?> GetPublishedBySlugAsync(string slug, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(slug))
        {
            return null;
        }

        const string sql = @"
            SELECT 
                id,
                slug,
                name,
                description,
                ruleset_json AS RulesetJson,
                status,
                created_at AS CreatedAt,
                updated_at AS UpdatedAt,
                published_at AS PublishedAt,
                fhir_version AS FhirVersion,
                codemaster_json AS CodeMasterJson,
                sample_bundle_json AS SampleBundleJson,
                validation_settings_json AS ValidationSettingsJson,
                features AS FeaturesJson
            FROM projects
            WHERE slug = @Slug
              AND status = 'published'
            LIMIT 1";

        var command = new CommandDefinition(
            commandText: sql,
            parameters: new { Slug = slug },
            cancellationToken: cancellationToken);

        var result = await _connection.QuerySingleOrDefaultAsync<ProjectRecord>(command);
        
        return result;
    }

    // ========================================================================
    // ADMIN CRUD OPERATIONS
    // ========================================================================

    /// <inheritdoc />
    public async Task<ProjectRecord> CreateAsync(ProjectRecord project, CancellationToken cancellationToken = default)
    {
        // Generate slug if not provided
        var slug = string.IsNullOrWhiteSpace(project.Slug) 
            ? await GenerateUniqueSlugAsync(project.Name, cancellationToken) 
            : project.Slug;

        const string sql = @"
            INSERT INTO projects (
                slug, name, description, ruleset_json, status, 
                fhir_version, codemaster_json, sample_bundle_json, 
                validation_settings_json, features
            )
            VALUES (
                @Slug, @Name, @Description, @RulesetJson::jsonb, @Status,
                @FhirVersion, @CodeMasterJson::jsonb, @SampleBundleJson,
                @ValidationSettingsJson::jsonb, @FeaturesJson::jsonb
            )
            RETURNING 
                id, slug, name, description, ruleset_json AS RulesetJson, status,
                created_at AS CreatedAt, updated_at AS UpdatedAt, published_at AS PublishedAt,
                fhir_version AS FhirVersion, codemaster_json AS CodeMasterJson,
                sample_bundle_json AS SampleBundleJson, validation_settings_json AS ValidationSettingsJson,
                features AS FeaturesJson";

        var command = new CommandDefinition(
            commandText: sql,
            parameters: new
            {
                Slug = slug,
                project.Name,
                project.Description,
                RulesetJson = project.RulesetJson ?? "{}",
                Status = string.IsNullOrWhiteSpace(project.Status) ? "draft" : project.Status,
                FhirVersion = string.IsNullOrWhiteSpace(project.FhirVersion) ? "R4" : project.FhirVersion,
                CodeMasterJson = project.CodeMasterJson,
                project.SampleBundleJson,
                ValidationSettingsJson = project.ValidationSettingsJson,
                FeaturesJson = project.FeaturesJson ?? "{}"
            },
            cancellationToken: cancellationToken);

        var result = await _connection.QuerySingleAsync<ProjectRecord>(command);
        return result;
    }

    /// <inheritdoc />
    public async Task<ProjectRecord?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        const string sql = @"
            SELECT 
                id, slug, name, description, ruleset_json AS RulesetJson, status,
                created_at AS CreatedAt, updated_at AS UpdatedAt, published_at AS PublishedAt,
                fhir_version AS FhirVersion, codemaster_json AS CodeMasterJson,
                sample_bundle_json AS SampleBundleJson, validation_settings_json AS ValidationSettingsJson,
                features AS FeaturesJson
            FROM projects
            WHERE id = @Id";

        var command = new CommandDefinition(
            commandText: sql,
            parameters: new { Id = id },
            cancellationToken: cancellationToken);

        return await _connection.QuerySingleOrDefaultAsync<ProjectRecord>(command);
    }

    /// <inheritdoc />
    public async Task<IReadOnlyList<ProjectRecord>> ListAllAsync(CancellationToken cancellationToken = default)
    {
        const string sql = @"
            SELECT 
                id, slug, name, description, ruleset_json AS RulesetJson, status,
                created_at AS CreatedAt, updated_at AS UpdatedAt, published_at AS PublishedAt,
                fhir_version AS FhirVersion, codemaster_json AS CodeMasterJson,
                sample_bundle_json AS SampleBundleJson, validation_settings_json AS ValidationSettingsJson,
                features AS FeaturesJson
            FROM projects
            ORDER BY updated_at DESC";

        var command = new CommandDefinition(
            commandText: sql,
            cancellationToken: cancellationToken);

        var results = await _connection.QueryAsync<ProjectRecord>(command);
        return results.ToList();
    }

    /// <inheritdoc />
    public async Task<ProjectRecord> UpdateAsync(ProjectRecord project, CancellationToken cancellationToken = default)
    {
        const string sql = @"
            UPDATE projects
            SET 
                slug = @Slug,
                name = @Name,
                description = @Description,
                ruleset_json = @RulesetJson::jsonb,
                status = @Status,
                fhir_version = @FhirVersion,
                codemaster_json = @CodeMasterJson::jsonb,
                sample_bundle_json = @SampleBundleJson,
                validation_settings_json = @ValidationSettingsJson::jsonb,
                features = @FeaturesJson::jsonb,
                updated_at = NOW()
            WHERE id = @Id
            RETURNING 
                id, slug, name, description, ruleset_json AS RulesetJson, status,
                created_at AS CreatedAt, updated_at AS UpdatedAt, published_at AS PublishedAt,
                fhir_version AS FhirVersion, codemaster_json AS CodeMasterJson,
                sample_bundle_json AS SampleBundleJson, validation_settings_json AS ValidationSettingsJson,
                features AS FeaturesJson";

        var command = new CommandDefinition(
            commandText: sql,
            parameters: new
            {
                project.Id,
                project.Slug,
                project.Name,
                project.Description,
                RulesetJson = project.RulesetJson ?? "{}",
                project.Status,
                project.FhirVersion,
                CodeMasterJson = project.CodeMasterJson,
                project.SampleBundleJson,
                ValidationSettingsJson = project.ValidationSettingsJson,
                FeaturesJson = project.FeaturesJson ?? "{}"
            },
            cancellationToken: cancellationToken);

        var result = await _connection.QuerySingleOrDefaultAsync<ProjectRecord>(command);
        
        if (result == null)
        {
            throw new InvalidOperationException($"Project with Id {project.Id} not found");
        }

        return result;
    }

    /// <inheritdoc />
    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        const string sql = "DELETE FROM projects WHERE id = @Id";

        var command = new CommandDefinition(
            commandText: sql,
            parameters: new { Id = id },
            cancellationToken: cancellationToken);

        var rowsAffected = await _connection.ExecuteAsync(command);
        return rowsAffected > 0;
    }

    /// <inheritdoc />
    public async Task<bool> ExistsAsync(Guid id, CancellationToken cancellationToken = default)
    {
        const string sql = "SELECT EXISTS(SELECT 1 FROM projects WHERE id = @Id)";

        var command = new CommandDefinition(
            commandText: sql,
            parameters: new { Id = id },
            cancellationToken: cancellationToken);

        return await _connection.ExecuteScalarAsync<bool>(command);
    }

    // ========================================================================
    // SLUG MANAGEMENT
    // ========================================================================

    /// <inheritdoc />
    public async Task<bool> SlugExistsAsync(string slug, Guid? excludeId = null, CancellationToken cancellationToken = default)
    {
        var sql = "SELECT EXISTS(SELECT 1 FROM projects WHERE slug = @Slug";
        
        if (excludeId.HasValue)
        {
            sql += " AND id != @ExcludeId";
        }
        
        sql += ")";

        var command = new CommandDefinition(
            commandText: sql,
            parameters: new { Slug = slug, ExcludeId = excludeId },
            cancellationToken: cancellationToken);

        return await _connection.ExecuteScalarAsync<bool>(command);
    }

    /// <inheritdoc />
    public async Task<string> GenerateUniqueSlugAsync(string name, CancellationToken cancellationToken = default)
    {
        var baseSlug = SlugifyName(name);
        var slug = baseSlug;
        var counter = 1;

        while (await SlugExistsAsync(slug, null, cancellationToken))
        {
            counter++;
            slug = $"{baseSlug}-{counter}";
        }

        return slug;
    }

    /// <summary>
    /// Converts a project name to a URL-friendly slug.
    /// </summary>
    private static string SlugifyName(string name)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            return "project";
        }

        // Convert to lowercase
        var slug = name.ToLowerInvariant();

        // Replace spaces and underscores with hyphens
        slug = Regex.Replace(slug, @"[\s_]+", "-");

        // Remove invalid characters (keep only a-z, 0-9, and hyphens)
        slug = Regex.Replace(slug, @"[^a-z0-9\-]", "");

        // Remove consecutive hyphens
        slug = Regex.Replace(slug, @"-{2,}", "-");

        // Trim hyphens from start and end
        slug = slug.Trim('-');

        // Ensure not empty
        return string.IsNullOrWhiteSpace(slug) ? "project" : slug;
    }

    // ========================================================================
    // STATUS MANAGEMENT
    // ========================================================================

    /// <inheritdoc />
    public async Task<ProjectRecord> PublishAsync(Guid id, CancellationToken cancellationToken = default)
    {
        const string sql = @"
            UPDATE projects
            SET 
                status = 'published',
                published_at = NOW(),
                updated_at = NOW()
            WHERE id = @Id
            RETURNING 
                id, slug, name, description, ruleset_json AS RulesetJson, status,
                created_at AS CreatedAt, updated_at AS UpdatedAt, published_at AS PublishedAt,
                fhir_version AS FhirVersion, codemaster_json AS CodeMasterJson,
                sample_bundle_json AS SampleBundleJson, validation_settings_json AS ValidationSettingsJson,
                features AS FeaturesJson";

        var command = new CommandDefinition(
            commandText: sql,
            parameters: new { Id = id },
            cancellationToken: cancellationToken);

        var result = await _connection.QuerySingleOrDefaultAsync<ProjectRecord>(command);
        
        if (result == null)
        {
            throw new InvalidOperationException($"Project with Id {id} not found");
        }

        return result;
    }

    /// <inheritdoc />
    public async Task<ProjectRecord> UnpublishAsync(Guid id, CancellationToken cancellationToken = default)
    {
        const string sql = @"
            UPDATE projects
            SET 
                status = 'draft',
                published_at = NULL,
                updated_at = NOW()
            WHERE id = @Id
            RETURNING 
                id, slug, name, description, ruleset_json AS RulesetJson, status,
                created_at AS CreatedAt, updated_at AS UpdatedAt, published_at AS PublishedAt,
                fhir_version AS FhirVersion, codemaster_json AS CodeMasterJson,
                sample_bundle_json AS SampleBundleJson, validation_settings_json AS ValidationSettingsJson,
                features AS FeaturesJson";

        var command = new CommandDefinition(
            commandText: sql,
            parameters: new { Id = id },
            cancellationToken: cancellationToken);

        var result = await _connection.QuerySingleOrDefaultAsync<ProjectRecord>(command);
        
        if (result == null)
        {
            throw new InvalidOperationException($"Project with Id {id} not found");
        }

        return result;
    }

    /// <inheritdoc />
    public async Task<ProjectRecord> ArchiveAsync(Guid id, CancellationToken cancellationToken = default)
    {
        const string sql = @"
            UPDATE projects
            SET 
                status = 'archived',
                updated_at = NOW()
            WHERE id = @Id
            RETURNING 
                id, slug, name, description, ruleset_json AS RulesetJson, status,
                created_at AS CreatedAt, updated_at AS UpdatedAt, published_at AS PublishedAt,
                fhir_version AS FhirVersion, codemaster_json AS CodeMasterJson,
                sample_bundle_json AS SampleBundleJson, validation_settings_json AS ValidationSettingsJson,
                features AS FeaturesJson";

        var command = new CommandDefinition(
            commandText: sql,
            parameters: new { Id = id },
            cancellationToken: cancellationToken);

        var result = await _connection.QuerySingleOrDefaultAsync<ProjectRecord>(command);
        
        if (result == null)
        {
            throw new InvalidOperationException($"Project with Id {id} not found");
        }

        return result;
    }
}
