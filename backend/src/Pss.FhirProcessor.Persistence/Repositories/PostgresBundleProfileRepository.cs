using System.Data;
using Dapper;
using Microsoft.Extensions.Logging;
using Npgsql;
using Pss.FhirProcessor.Persistence.Models;

namespace Pss.FhirProcessor.Persistence.Repositories;

/// <summary>
/// PostgreSQL implementation of bundle profile repository.
/// </summary>
public sealed class PostgresBundleProfileRepository : IBundleProfileRepository
{
    private readonly string _connectionString;
    private readonly ILogger<PostgresBundleProfileRepository> _logger;

    public PostgresBundleProfileRepository(
        string connectionString,
        ILogger<PostgresBundleProfileRepository> logger)
    {
        _connectionString = connectionString ?? throw new ArgumentNullException(nameof(connectionString));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<IReadOnlyList<BundleProfileRecord>> GetByProjectIdAsync(
        Guid projectId,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT 
                id AS Id,
                project_id AS ProjectId,
                name AS Name,
                description AS Description,
                canonical_url AS CanonicalUrl,
                structure_definition_json AS StructureDefinitionJson,
                is_default AS IsDefault,
                created_at AS CreatedAt,
                updated_at AS UpdatedAt
            FROM bundle_profiles
            WHERE project_id = @ProjectId
            ORDER BY is_default DESC, name ASC
            """;

        await using var connection = new NpgsqlConnection(_connectionString);
        var records = await connection.QueryAsync<BundleProfileRecord>(
            sql,
            new { ProjectId = projectId });

        return records.ToList();
    }

    public async Task<BundleProfileRecord?> GetDefaultByProjectIdAsync(
        Guid projectId,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT 
                id AS Id,
                project_id AS ProjectId,
                name AS Name,
                description AS Description,
                canonical_url AS CanonicalUrl,
                structure_definition_json AS StructureDefinitionJson,
                is_default AS IsDefault,
                created_at AS CreatedAt,
                updated_at AS UpdatedAt
            FROM bundle_profiles
            WHERE project_id = @ProjectId AND is_default = TRUE
            LIMIT 1
            """;

        await using var connection = new NpgsqlConnection(_connectionString);
        return await connection.QuerySingleOrDefaultAsync<BundleProfileRecord>(
            sql,
            new { ProjectId = projectId });
    }

    public async Task<BundleProfileRecord?> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT 
                id AS Id,
                project_id AS ProjectId,
                name AS Name,
                description AS Description,
                canonical_url AS CanonicalUrl,
                structure_definition_json AS StructureDefinitionJson,
                is_default AS IsDefault,
                created_at AS CreatedAt,
                updated_at AS UpdatedAt
            FROM bundle_profiles
            WHERE id = @Id
            """;

        await using var connection = new NpgsqlConnection(_connectionString);
        return await connection.QuerySingleOrDefaultAsync<BundleProfileRecord>(
            sql,
            new { Id = id });
    }

    public async Task<BundleProfileRecord> CreateAsync(
        BundleProfileRecord record,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            INSERT INTO bundle_profiles (
                id,
                project_id,
                name,
                description,
                canonical_url,
                structure_definition_json,
                is_default,
                created_at,
                updated_at
            )
            VALUES (
                @Id,
                @ProjectId,
                @Name,
                @Description,
                @CanonicalUrl,
                @StructureDefinitionJson,
                @IsDefault,
                @CreatedAt,
                @UpdatedAt
            )
            RETURNING 
                id AS Id,
                project_id AS ProjectId,
                name AS Name,
                description AS Description,
                canonical_url AS CanonicalUrl,
                structure_definition_json AS StructureDefinitionJson,
                is_default AS IsDefault,
                created_at AS CreatedAt,
                updated_at AS UpdatedAt
            """;

        await using var connection = new NpgsqlConnection(_connectionString);
        var created = await connection.QuerySingleAsync<BundleProfileRecord>(sql, record);

        _logger.LogInformation(
            "Created bundle profile {ProfileId} for project {ProjectId}",
            created.Id,
            created.ProjectId);

        return created;
    }

    public async Task<BundleProfileRecord> UpdateAsync(
        BundleProfileRecord record,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            UPDATE bundle_profiles
            SET
                name = @Name,
                description = @Description,
                canonical_url = @CanonicalUrl,
                structure_definition_json = @StructureDefinitionJson,
                is_default = @IsDefault,
                updated_at = @UpdatedAt
            WHERE id = @Id
            RETURNING 
                id AS Id,
                project_id AS ProjectId,
                name AS Name,
                description AS Description,
                canonical_url AS CanonicalUrl,
                structure_definition_json AS StructureDefinitionJson,
                is_default AS IsDefault,
                created_at AS CreatedAt,
                updated_at AS UpdatedAt
            """;

        await using var connection = new NpgsqlConnection(_connectionString);
        var updated = await connection.QuerySingleAsync<BundleProfileRecord>(sql, record);

        _logger.LogInformation(
            "Updated bundle profile {ProfileId} for project {ProjectId}",
            updated.Id,
            updated.ProjectId);

        return updated;
    }

    public async Task DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        const string sql = "DELETE FROM bundle_profiles WHERE id = @Id";

        await using var connection = new NpgsqlConnection(_connectionString);
        var rowsAffected = await connection.ExecuteAsync(sql, new { Id = id });

        if (rowsAffected > 0)
        {
            _logger.LogInformation("Deleted bundle profile {ProfileId}", id);
        }
    }
}
