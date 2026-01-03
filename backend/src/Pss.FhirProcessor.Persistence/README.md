# Pss.FhirProcessor.Persistence

**Minimal, production-safe persistence layer for published validation projects.**

## Design Principles

This layer is **engine-agnostic**, **stateless**, and **JSON-preserving**.

### Key Constraints

✅ **Engine Independence**
- DOES NOT reference `Pss.FhirProcessor.Engine`
- DOES NOT contain validation logic
- DOES NOT parse or validate FHIR models
- DOES NOT deserialize ruleset JSON

✅ **Read-Only Access**
- Only supports retrieval of **published** projects
- No create/update/delete operations
- No authoring logic

✅ **Minimal Dependencies**
- Npgsql (PostgreSQL driver)
- Dapper (micro-ORM)
- System.Text.Json (built-in)

❌ **NOT Allowed**
- Entity Framework
- ASP.NET packages
- Validation engine references

## Project Structure

```
Pss.FhirProcessor.Persistence/
├── Models/
│   └── ProjectRecord.cs          # Simple data record
├── Repositories/
│   ├── IProjectRepository.cs     # Repository contract
│   └── PostgresProjectRepository.cs  # Dapper implementation
└── Pss.FhirProcessor.Persistence.csproj
```

## Domain Model

### ProjectRecord

Simple immutable record representing a validation project:

```csharp
public sealed record ProjectRecord
{
    public Guid Id { get; init; }
    public string Slug { get; init; }           // URL-friendly ID
    public string Name { get; init; }
    public string? Description { get; init; }
    public string RulesetJson { get; init; }    // ⚠️ Opaque JSON string
    public string Status { get; init; }         // 'draft' | 'published'
    public DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset? PublishedAt { get; init; }
}
```

**Critical:** `RulesetJson` is kept as a raw string to avoid coupling to the Engine.

## Repository Contract

### IProjectRepository

```csharp
public interface IProjectRepository
{
    // List all published projects (newest first)
    Task<IReadOnlyList<ProjectRecord>> ListPublishedAsync(CancellationToken);
    
    // Get single published project by slug
    Task<ProjectRecord?> GetPublishedBySlugAsync(string slug, CancellationToken);
}
```

**Guarantees:**
- Only returns projects with `status = 'published'`
- Returns `null` (not exception) if project not found
- Never deserializes `ruleset_json`

## Implementation

### PostgresProjectRepository

Dapper-based implementation:

```csharp
public sealed class PostgresProjectRepository : IProjectRepository
{
    private readonly NpgsqlConnection _connection;
    
    public PostgresProjectRepository(NpgsqlConnection connection)
    {
        _connection = connection;
    }
    
    // ... implementation details
}
```

**Characteristics:**
- Stateless (no caching)
- No logging (caller's responsibility)
- No retry logic (handled by caller)
- Parameterized SQL only
- Maps `JSONB` column to `string`

## Database Schema

**Assumes this table exists** (no migrations provided):

```sql
CREATE TABLE projects (
    id UUID PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT NULL,
    ruleset_json JSONB NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('draft', 'published')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_at TIMESTAMPTZ NULL
);

CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_slug ON projects(slug);
```

## Usage

### Dependency Injection (API Layer)

```csharp
// In API startup
services.AddScoped<NpgsqlConnection>(sp =>
{
    var connString = configuration.GetConnectionString("PostgreSQL");
    return new NpgsqlConnection(connString);
});

services.AddScoped<IProjectRepository, PostgresProjectRepository>();
```

### Example Usage

```csharp
public class ProjectController
{
    private readonly IProjectRepository _repository;
    
    public ProjectController(IProjectRepository repository)
    {
        _repository = repository;
    }
    
    [HttpGet("projects")]
    public async Task<IActionResult> ListProjects(CancellationToken ct)
    {
        var projects = await _repository.ListPublishedAsync(ct);
        return Ok(projects);
    }
    
    [HttpGet("projects/{slug}")]
    public async Task<IActionResult> GetProject(string slug, CancellationToken ct)
    {
        var project = await _repository.GetPublishedBySlugAsync(slug, ct);
        
        if (project == null)
            return NotFound();
        
        return Ok(project);
    }
}
```

## Testing

The repository is unit-testable by mocking `IDbConnection`:

```csharp
[Fact]
public async Task GetPublishedBySlugAsync_ReturnsNull_WhenNotFound()
{
    // Arrange
    var mockConnection = new Mock<NpgsqlConnection>();
    // ... setup mock
    
    var repository = new PostgresProjectRepository(mockConnection.Object);
    
    // Act
    var result = await repository.GetPublishedBySlugAsync("nonexistent", CancellationToken.None);
    
    // Assert
    Assert.Null(result);
}
```

## Design Decisions

### Why Dapper (not EF Core)?

- **Lightweight**: Minimal overhead for simple queries
- **Explicit SQL**: Full control over query performance
- **No change tracking**: Stateless by design
- **No migrations**: Schema managed separately
- **Fast startup**: No model scanning

### Why Opaque JSON?

Keeping `RulesetJson` as a string ensures:
- **Zero coupling** to Engine domain model
- **Safe to evolve** ruleset schema independently
- **Cache-friendly** (no deserialization until needed)
- **Persistence is dumb** (no validation logic leaks)

### Why Read-Only?

This MVP layer focuses on **runtime validation consumption**, not authoring:
- Authoring UI will use separate write repository later
- Clear separation of read (runtime) vs write (authoring) concerns
- Simplifies security model (read-only connection strings)

## Future Enhancements (Out of Scope)

These are **NOT implemented** in this MVP layer:

- ❌ Write operations (create/update/delete)
- ❌ Draft project access
- ❌ Versioning/audit history
- ❌ Caching layer
- ❌ Connection pooling (handled by Npgsql)
- ❌ Retry policies (handled by Polly in API layer)
- ❌ Logging (handled by API layer)

## Dependencies

```xml
<PackageReference Include="Npgsql" Version="8.0.5" />
<PackageReference Include="Dapper" Version="2.1.28" />
```

**No other dependencies allowed.**

## Build

```bash
cd backend
dotnet build src/Pss.FhirProcessor.Persistence
```

## License

Same as parent project.
