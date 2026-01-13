# PostgreSQL Database Setup - Complete ✅

**Date**: 2026-01-04  
**Status**: Successfully initialized and running

## What Was Completed

### 1. Docker Configuration ✅
- Created [`docker-compose.yml`](docker-compose.yml) with PostgreSQL 16 Alpine
- **Custom Port**: 5433 (to avoid conflicts with local PostgreSQL)
- Health checks configured
- Volume persistence enabled (`postgres_data`)
- Network isolation configured

### 2. Database Schema ✅
- Created [`backend/database/init/001_schema.sql`](backend/database/init/001_schema.sql)
- **Projects table** with complete structure:
  - UUID primary key
  - Slug (unique, URL-friendly)
  - Name, description
  - Ruleset JSON (JSONB type)
  - Status (draft/published/archived)
  - Timestamps (created_at, updated_at, published_at)
  - Features metadata (JSONB)
- **Indexes** for performance:
  - Slug lookup
  - Status filtering
  - Published date sorting
  - Full-text search
- **Triggers**: Auto-update `updated_at` timestamp
- **Constraints**: Status validation, slug format validation

### 3. Seed Data ✅
- Created [`backend/database/init/002_seed_data.sql`](backend/database/init/002_seed_data.sql)
- Loaded 3 sample projects:
  1. **sg-core-patient** - Singapore Core Patient Validation
  2. **basic-observation** - Basic Observation Validation
  3. **draft-medication** - Draft Medication Validation (not published)

### 4. Backend Configuration ✅
- Updated [`appsettings.json`](backend/src/Pss.FhirProcessor.Playground.Api/appsettings.json)
- Connection string now uses **Port 5433**
- Backend configured to use Dapper + Npgsql
- PostgresProjectRepository ready to use

### 5. Documentation ✅
- Created [`backend/database/README.md`](backend/database/README.md) - Comprehensive guide
- Created [`DATABASE_QUICK_START.md`](DATABASE_QUICK_START.md) - Quick reference
- Created [`setup-database.sh`](setup-database.sh) - Automated setup script
- Created [`.env.example`](.env.example) - Environment template

### 6. Container Status ✅
```
Container: fhir_processor_postgres
Status:    Running (healthy)
Image:     postgres:16-alpine
Port:      0.0.0.0:5433 → 5432
Database:  fhir_validation
Projects:  4 total, 3 published
```

## Files Created/Modified

### New Files
```
docker-compose.yml
.env.example
setup-database.sh
DATABASE_QUICK_START.md
backend/database/README.md
backend/database/init/001_schema.sql
backend/database/init/002_seed_data.sql
```

### Modified Files
```
backend/src/Pss.FhirProcessor.Playground.Api/appsettings.json
  - Updated PostgreSQL port from 5432 → 5433
```

## Verification Results

### ✅ Container Running
```bash
$ docker-compose ps
NAME                      STATUS
fhir_processor_postgres   Up (healthy)
```

### ✅ Schema Initialized
```bash
$ docker exec fhir_processor_postgres psql -U postgres -d fhir_validation -c "\dt"
           List of relations
 Schema |   Name   | Type  |  Owner   
--------+----------+-------+----------
 public | projects | table | postgres
```

### ✅ Seed Data Loaded
```bash
$ docker exec fhir_processor_postgres psql -U postgres -d fhir_validation -c "SELECT slug, status FROM projects;"
           slug            |  status   
---------------------------+-----------
 draft-medication          | draft
 basic-observation         | published
 sample-validation-project | published
 sg-core-patient           | published
```

## Next Steps

### 1. Restart Backend API
The backend needs to be restarted to pick up the new connection string (Port 5433):

```bash
# If backend is running in a terminal, press Ctrl+C to stop it
# Then restart:
cd backend/src/Pss.FhirProcessor.Playground.Api
dotnet run
```

You should see in the logs:
```
[INFO] Persistence layer configured with PostgreSQL
```

### 2. Test API Endpoint
```bash
curl http://localhost:5000/api/public/projects | jq
```

Expected response: Array of 3 published projects

### 3. Test Frontend
Open browser to:
```
http://localhost:5173/projects
```

You should see:
- 3 project cards displayed
- "Validate Bundle →" buttons
- Published dates
- Responsive grid layout

### 4. Verify End-to-End Flow
1. Go to http://localhost:5173/projects
2. Click "Validate Bundle" on any project
3. Should navigate to `/projects/{slug}/validate`
4. Upload a FHIR bundle JSON
5. See validation results with resizable tree/validation panels

## Database Management

### Daily Use
```bash
# Start database
docker-compose up -d postgres

# Stop database
docker-compose stop postgres

# View logs
docker-compose logs -f postgres

# Check status
docker-compose ps
```

### Maintenance
```bash
# Backup database
docker exec fhir_processor_postgres pg_dump -U postgres fhir_validation > backup.sql

# Restore database
docker exec -i fhir_processor_postgres psql -U postgres fhir_validation < backup.sql

# Reset database (⚠️ destroys all data)
docker-compose down -v
docker-compose up -d postgres
```

## Connection Details

**Host**: localhost  
**Port**: 5433 (⚠️ NOT 5432)  
**Database**: fhir_validation  
**User**: postgres  
**Password**: postgres  

**Connection String**:
```
Host=localhost;Database=fhir_validation;Username=postgres;Password=postgres;Port=5433
```

## Architecture Overview

```
┌─────────────────────────────────────────────┐
│         Frontend (React + Vite)             │
│         http://localhost:5173               │
│                                             │
│  - PublicProjectsPage (/projects)          │
│  - ProjectValidatePage (/{slug}/validate)  │
└─────────────────┬───────────────────────────┘
                  │ HTTP
                  ▼
┌─────────────────────────────────────────────┐
│         Backend API (.NET 8)                │
│         http://localhost:5000               │
│                                             │
│  - PublicProjectsController                 │
│  - PostgresProjectRepository                │
└─────────────────┬───────────────────────────┘
                  │ Npgsql + Dapper
                  ▼
┌─────────────────────────────────────────────┐
│     PostgreSQL 16 (Docker Container)        │
│     localhost:5433                          │
│                                             │
│  Database: fhir_validation                  │
│  Table: projects                            │
│    - 4 projects (3 published, 1 draft)      │
└─────────────────────────────────────────────┘
```

## Troubleshooting

### Backend can't connect
1. Verify container is running: `docker-compose ps`
2. Check port in appsettings.json is `5433`
3. Restart backend to pick up new connection string

### Port conflict
1. Check what's using port 5433: `lsof -i :5433`
2. Change port in `docker-compose.yml` (e.g., `5434:5432`)
3. Update `appsettings.json` to match new port

### Database not initialized
1. Stop: `docker-compose down -v`
2. Start: `docker-compose up -d postgres`
3. Wait 10 seconds, then verify

## Success Criteria

- [x] PostgreSQL container running on port 5433
- [x] Database `fhir_validation` created
- [x] Table `projects` with proper schema
- [x] 4 sample projects loaded (3 published)
- [x] Backend connection string updated
- [x] Indexes and constraints in place
- [x] Auto-update trigger working
- [x] Health check passing

## Additional Notes

### Why Port 5433?
To avoid conflicts with any existing PostgreSQL installation on the default port 5432.

### Why JSONB for ruleset_json?
- Allows PostgreSQL to index and query rule content
- Enables future filtering/searching within rulesets
- Better performance than plain TEXT
- Still treated as opaque string by repository layer

### Data Persistence
Data is persisted in Docker volume `postgres_data`. To completely remove data, use:
```bash
docker-compose down -v
```

### Production Considerations
For production deployment:
1. Change default password
2. Use environment variables for credentials
3. Enable SSL/TLS connections
4. Set up regular backups
5. Configure connection pooling
6. Adjust PostgreSQL memory settings
7. Implement monitoring and alerts

---

**Setup Complete!** 🎉

You now have a fully functional PostgreSQL database for the FHIR Processor V2 project.
