# 🗄️ PostgreSQL Database - Quick Reference

## ✅ Setup Complete

Your PostgreSQL database is now running in Docker with the FHIR Processor V2 schema initialized.

## 📊 Database Summary

- **Container**: `fhir_processor_postgres`
- **Image**: `postgres:16-alpine`
- **Port**: `5433` (host) → `5432` (container)
- **Database**: `fhir_validation`
- **User**: `postgres`
- **Password**: `postgres`

## 🚀 Quick Commands

### Container Management
```bash
# Start database
docker-compose up -d postgres

# Stop database
docker-compose stop postgres

# Restart database
docker-compose restart postgres

# View logs
docker-compose logs -f postgres

# Check status
docker-compose ps

# Remove database (⚠️ destroys data)
docker-compose down -v
```

### Database Access
```bash
# Connect with psql (from inside container)
docker exec -it fhir_processor_postgres psql -U postgres -d fhir_validation

# Run a query
docker exec fhir_processor_postgres psql -U postgres -d fhir_validation -c "SELECT * FROM projects;"

# Backup database
docker exec fhir_processor_postgres pg_dump -U postgres fhir_validation > backup.sql

# Restore database
docker exec -i fhir_processor_postgres psql -U postgres fhir_validation < backup.sql
```

## 📁 Database Structure

### Projects Table
```sql
CREATE TABLE projects (
    id UUID PRIMARY KEY,
    slug VARCHAR(255) UNIQUE,
    name VARCHAR(500) NOT NULL,
    description TEXT,
    ruleset_json JSONB NOT NULL,
    status VARCHAR(50) DEFAULT 'draft',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    published_at TIMESTAMPTZ,
    features JSONB DEFAULT '{}'
);
```

### Indexes
- `idx_projects_slug` - Fast slug lookup
- `idx_projects_status` - Filter by status
- `idx_projects_published_at` - Sort by published date
- `idx_projects_search` - Full-text search

## 🔍 Common Queries

```sql
-- List all published projects
SELECT slug, name, description FROM projects 
WHERE status = 'published' 
ORDER BY published_at DESC;

-- Get project by slug
SELECT * FROM projects WHERE slug = 'sg-core-patient';

-- Count projects by status
SELECT status, COUNT(*) FROM projects GROUP BY status;

-- View ruleset for a project
SELECT slug, ruleset_json FROM projects WHERE slug = 'basic-observation';

-- Update project status
UPDATE projects SET status = 'published', published_at = NOW() 
WHERE slug = 'draft-medication';
```

## 🌱 Seed Data

The database includes 3 sample projects:

1. **sg-core-patient** - Singapore Core Patient Validation
2. **basic-observation** - Basic Observation Validation  
3. **draft-medication** - Draft Medication Validation

## 🔧 Troubleshooting

### Backend can't connect to database
```bash
# 1. Check if container is running
docker-compose ps

# 2. Verify the container is healthy
docker inspect fhir_processor_postgres | grep -A5 Health

# 3. Check logs for errors
docker-compose logs postgres | tail -50

# 4. Verify connection string in appsettings.json
# Should be: "Port=5433" (NOT 5432)
```

### Port already in use
```bash
# Check what's using port 5433
lsof -i :5433

# Change port in docker-compose.yml if needed
# Update both docker-compose.yml and appsettings.json
```

### Database not initializing
```bash
# Stop and remove everything
docker-compose down -v

# Start fresh
docker-compose up -d postgres

# Wait 10 seconds, then check
docker exec fhir_processor_postgres psql -U postgres -d fhir_validation -c "\dt"
```

### Need to reset all data
```bash
# WARNING: This deletes all data!
docker-compose down -v
docker-compose up -d postgres
# Wait for initialization to complete
```

## 🔗 Connection Strings

### .NET (appsettings.json)
```json
{
  "ConnectionStrings": {
    "PostgreSQL": "Host=localhost;Database=fhir_validation;Username=postgres;Password=postgres;Port=5433"
  }
}
```

### Dapper (C#)
```csharp
using Npgsql;

var connectionString = "Host=localhost;Database=fhir_validation;Username=postgres;Password=postgres;Port=5433";
using var connection = new NpgsqlConnection(connectionString);
```

### psql (Command Line)
```bash
psql -h localhost -p 5433 -U postgres -d fhir_validation
```

## 📝 Next Steps

1. **Restart Backend** - The backend needs to be restarted to pick up the new connection string:
   ```bash
   # Stop current backend (Ctrl+C in terminal)
   cd backend/src/Pss.FhirProcessor.Playground.Api
   dotnet run
   ```

2. **Test API** - Verify the backend can connect:
   ```bash
   curl http://localhost:5000/api/public/projects | jq
   ```

3. **Test Frontend** - Open the public projects page:
   ```
   http://localhost:5173/projects
   ```

## 📚 Additional Resources

- Full documentation: [`backend/database/README.md`](backend/database/README.md)
- Schema file: [`backend/database/init/001_schema.sql`](backend/database/init/001_schema.sql)
- Seed data: [`backend/database/init/002_seed_data.sql`](backend/database/init/002_seed_data.sql)
- Docker Compose: [`docker-compose.yml`](docker-compose.yml)
