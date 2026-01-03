using Dapper;
using Npgsql;
using Pss.FhirProcessor.Persistence.Models;

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
                published_at AS PublishedAt
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
                published_at AS PublishedAt
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
}
