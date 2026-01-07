# Database Setup Guide

## Overview
PostgreSQL database for FHIR Processor V2 project storage and validation rulesets.

## Quick Start

### 1. Start PostgreSQL Container
```bash
# From project root
docker-compose up -d postgres

# Check status
docker-compose ps

# View logs
docker-compose logs -f postgres
```

### 2. Verify Connection
```bash
# Using psql (if installed locally)
psql -h localhost -p 5433 -U postgres -d fhir_validation

# Or using Docker
docker exec -it fhir_processor_postgres psql -U postgres -d fhir_validation
```

### 3. Update Connection String
Update `backend/src/Pss.FhirProcessor.Playground.Api/appsettings.json`:
```json
{
  "ConnectionStrings": {
    "PostgreSQL": "Host=localhost;Database=fhir_validation;Username=postgres;Password=postgres;Port=5433"
  }
}
```

## Schema Details

### Tables

#### `projects`
Stores validation project metadata and rulesets.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| slug | VARCHAR(255) | URL-friendly identifier (unique) |
| name | VARCHAR(500) | Project name |
| description | TEXT | Project description |
| ruleset_json | JSONB | Complete validation ruleset |
| status | VARCHAR(50) | draft/published/archived |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |
| published_at | TIMESTAMPTZ | Publication timestamp |
| features | JSONB | Additional metadata |

### Indexes
- `idx_projects_slug` - Fast lookup by slug
- `idx_projects_status` - Filter by status
- `idx_projects_published_at` - Sort by published date
- `idx_projects_search` - Full-text search

## Database Management

### Stop Database
```bash
docker-compose stop postgres
```

### Start Database
```bash
docker-compose start postgres
```

### Restart Database
```bash
docker-compose restart postgres
```

### Remove Database (⚠️ destroys data)
```bash
docker-compose down -v
```

### Backup Database
```bash
docker exec fhir_processor_postgres pg_dump -U postgres fhir_validation > backup.sql
```

### Restore Database
```bash
docker exec -i fhir_processor_postgres psql -U postgres fhir_validation < backup.sql
```

## Database Access

### Configuration
- **Host**: localhost
- **Port**: 5433 (mapped from container 5432)
- **Database**: fhir_validation
- **User**: postgres
- **Password**: postgres

### psql Commands
```sql
-- List all tables
\dt

-- Describe projects table
\d projects

-- List published projects
SELECT slug, name, status FROM projects WHERE status = 'published';

-- View project details
SELECT * FROM projects WHERE slug = 'sg-core-patient';

-- Count projects by status
SELECT status, COUNT(*) FROM projects GROUP BY status;
```

## Seed Data

The database initializes with sample projects:

1. **sg-core-patient** - Singapore Core Patient validation
2. **basic-observation** - Basic Observation validation
3. **draft-medication** - Draft project (not published)

## Troubleshooting

### Container won't start
```bash
# Check logs
docker-compose logs postgres

# Check if port 5433 is in use
lsof -i :5433

# Remove and recreate
docker-compose down
docker-compose up -d postgres
```

### Connection refused
- Verify container is running: `docker-compose ps`
- Check port mapping: Should be `5433:5432`
- Update appsettings.json to use Port=5433

### Schema not initialized
```bash
# Manually run init scripts
docker exec -i fhir_processor_postgres psql -U postgres fhir_validation < backend/database/init/001_schema.sql
docker exec -i fhir_processor_postgres psql -U postgres fhir_validation < backend/database/init/002_seed_data.sql
```

### Reset database completely
```bash
# Stop and remove volumes
docker-compose down -v

# Start fresh
docker-compose up -d postgres
```

## Production Considerations

For production deployment:

1. **Security**
   - Change default password
   - Use environment variables for credentials
   - Enable SSL/TLS connections
   - Restrict network access

2. **Performance**
   - Adjust PostgreSQL memory settings
   - Enable query logging and monitoring
   - Set up connection pooling
   - Regular VACUUM and ANALYZE

3. **Backup**
   - Automated daily backups
   - Point-in-time recovery (WAL archiving)
   - Offsite backup storage
   - Regular backup testing

4. **Monitoring**
   - Connection count
   - Query performance
   - Disk usage
   - Replication lag (if applicable)
