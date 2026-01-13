# Admin Project Management - Database Migration Assessment

## Executive Summary

**Current State:**
- **Admin** (authoring): Uses file-based storage → Shows 2 projects
- **Public** (anonymous validation): Uses PostgreSQL database → Shows 3 projects

**Problem:** Data inconsistency due to dual storage systems

**Solution:** Migrate admin to use the same PostgreSQL database

---

## Current Implementation Analysis

### 1. Dual Repository Pattern (NAME COLLISION ⚠️)

There are **TWO different `IProjectRepository` interfaces** with the same name:

#### A. File-Based Repository (Admin/Authoring)
```
Location: Pss.FhirProcessor.Playground.Api.Storage.IProjectRepository
Implementation: Pss.FhirProcessor.Playground.Api.Storage.ProjectRepository
Storage: Local file system (ProjectStorage folder)
Model: Project class (Api/Models/Project.cs)
```

**Interface Methods:**
```csharp
Task<Project> CreateAsync(Project project);
Task<Project?> GetAsync(Guid id);
Task<IEnumerable<ProjectMetadata>> ListAsync();
Task<Project> UpdateAsync(Project project);
Task<Project> SaveRulesAsync(Guid id, string rulesJson);
Task<Project> SaveCodeMasterAsync(Guid id, string codeMasterJson);
Task<Project> SaveSampleBundleAsync(Guid id, string bundleJson);
Task<Project> SaveValidationSettingsAsync(Guid id, string validationSettingsJson);
Task<bool> DeleteAsync(Guid id);
Task<bool> ExistsAsync(Guid id);
```

**Features:**
- Full CRUD operations
- Stores JSON files in `ProjectStorage/` directory
- Schema: Stores rules, codemaster, sample bundle, validation settings, features
- Used by: ProjectsController (admin authoring)

#### B. Database Repository (Public)
```
Location: Pss.FhirProcessor.Persistence.Repositories.IProjectRepository
Implementation: Pss.FhirProcessor.Persistence.Repositories.PostgresProjectRepository
Storage: PostgreSQL database (fhir_validation.projects table)
Model: ProjectRecord class (Persistence/Models/ProjectRecord.cs)
```

**Interface Methods:**
```csharp
Task<IReadOnlyList<ProjectRecord>> ListPublishedAsync(CancellationToken cancellationToken);
Task<ProjectRecord?> GetPublishedBySlugAsync(string slug, CancellationToken cancellationToken);
```

**Features:**
- READ-ONLY access to published projects
- Stores in PostgreSQL with slug-based access
- Schema: Only stores id, slug, name, description, ruleset_json, status, timestamps
- Used by: PublicProjectsController (anonymous validation)

### 2. Dependency Injection Configuration

**Program.cs (Line 97-101):**
```csharp
// Public validation repository (database)
builder.Services.AddScoped<Pss.FhirProcessor.Persistence.Repositories.IProjectRepository, PostgresProjectRepository>();

// Admin authoring repository (file-based)
builder.Services.AddScoped<Pss.FhirProcessor.Playground.Api.Storage.IProjectRepository, ProjectRepository>();
```

**Key Issue:** Two interfaces with same name but different namespaces - potential confusion!

### 3. Data Model Differences

| Field | File-Based (Project) | Database (ProjectRecord) | Migration Impact |
|-------|---------------------|--------------------------|------------------|
| Id | Guid ✅ | Guid ✅ | Compatible |
| Slug | ❌ Missing | string ✅ | **Must add** |
| Name | string ✅ | string ✅ | Compatible |
| Description | string? ✅ | string? ✅ | Compatible |
| FhirVersion | string ✅ | ❌ Missing | **Store in features** |
| Status | ❌ Missing | string ✅ | **Must add** |
| RulesJson | string? ✅ | string ✅ (ruleset_json) | Compatible |
| CodeMasterJson | string? ✅ | ❌ Missing | **Store in ruleset** |
| SampleBundleJson | string? ✅ | ❌ Missing | **Store in features** |
| ValidationSettingsJson | string? ✅ | ❌ Missing | **Store in features** |
| FeaturesJson | string? ✅ | ❌ Missing | **Store in features** |
| Features | ProjectFeatures ✅ | ❌ Missing | **Serialize to features JSONB** |
| CreatedAt | DateTime ✅ | DateTime ✅ | Compatible |
| UpdatedAt | DateTime ✅ | ❌ Missing | **Must add** |
| PublishedAt | ❌ Missing | DateTime? ✅ | **Must add** |

### 4. Database Schema Gap Analysis

**Current Schema (001_schema.sql):**
```sql
CREATE TABLE projects (
    id UUID PRIMARY KEY,
    slug VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(500) NOT NULL,
    description TEXT,
    ruleset_json JSONB NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('draft', 'published', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_at TIMESTAMPTZ,
    features JSONB
);
```

**Missing Fields for Admin:**
- ❌ `fhir_version` - Can store in features JSONB or add column
- ❌ `codemaster_json` - Store in ruleset_json or add separate column
- ❌ `sample_bundle_json` - Store in features JSONB
- ❌ `validation_settings_json` - Store in features JSONB

---

## Migration Strategy

### Option 1: Extend Database Schema (RECOMMENDED ✅)

**Pros:**
- Clear separation of concerns
- Easy to query specific fields
- Better performance (indexed columns)
- Supports future features (search, filtering)

**Cons:**
- Schema migration required
- More columns to maintain

**Implementation:**
```sql
-- Migration: 003_admin_support.sql
ALTER TABLE projects
ADD COLUMN fhir_version VARCHAR(10) DEFAULT 'R4',
ADD COLUMN codemaster_json JSONB,
ADD COLUMN sample_bundle_json TEXT,
ADD COLUMN validation_settings_json JSONB;

-- Update indexes
CREATE INDEX idx_projects_fhir_version ON projects(fhir_version);
```

### Option 2: Store Everything in JSONB (Alternative)

**Pros:**
- No schema changes
- Flexible for future fields
- Simpler migration

**Cons:**
- Harder to query/index
- Large JSONB blobs
- Performance concerns

**Implementation:**
```sql
-- Store in features JSONB:
{
  "fhirVersion": "R4",
  "sampleBundle": "...",
  "validationSettings": {...}
}

-- Store in ruleset_json:
{
  "rules": [...],
  "codeMaster": {...}
}
```

---

## Migration Plan (4 Phases)

### Phase 1: Schema Migration ✅

**Tasks:**
1. Create `003_admin_support.sql` migration
2. Add missing columns to projects table
3. Update indexes and constraints
4. Test migration on dev database

**SQL Script:**
```sql
-- 003_admin_support.sql
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS fhir_version VARCHAR(10) DEFAULT 'R4',
ADD COLUMN IF NOT EXISTS codemaster_json JSONB,
ADD COLUMN IF NOT EXISTS sample_bundle_json TEXT,
ADD COLUMN IF NOT EXISTS validation_settings_json JSONB,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Update existing records
UPDATE projects SET fhir_version = 'R4' WHERE fhir_version IS NULL;
```

### Phase 2: Extend PostgresProjectRepository 🔨

**Tasks:**
1. Add CRUD methods to `Pss.FhirProcessor.Persistence.Repositories.IProjectRepository`
2. Implement in `PostgresProjectRepository`
3. Keep existing read-only methods (backward compatibility)
4. Add new methods for admin operations

**New Interface Methods:**
```csharp
// READ operations (existing)
Task<IReadOnlyList<ProjectRecord>> ListPublishedAsync(CancellationToken ct);
Task<ProjectRecord?> GetPublishedBySlugAsync(string slug, CancellationToken ct);

// NEW: Admin CRUD operations
Task<ProjectRecord> CreateAsync(ProjectRecord project, CancellationToken ct);
Task<ProjectRecord?> GetByIdAsync(Guid id, CancellationToken ct);
Task<IReadOnlyList<ProjectRecord>> ListAllAsync(CancellationToken ct); // All statuses
Task<ProjectRecord> UpdateAsync(ProjectRecord project, CancellationToken ct);
Task<bool> DeleteAsync(Guid id, CancellationToken ct);
Task<bool> ExistsAsync(Guid id, CancellationToken ct);

// NEW: Slug management
Task<bool> SlugExistsAsync(string slug, CancellationToken ct);
Task<string> GenerateUniqueSlugAsync(string name, CancellationToken ct);

// NEW: Status management
Task<ProjectRecord> PublishAsync(Guid id, CancellationToken ct);
Task<ProjectRecord> UnpublishAsync(Guid id, CancellationToken ct);
Task<ProjectRecord> ArchiveAsync(Guid id, CancellationToken ct);
```

### Phase 3: Update ProjectService and Controllers 🔧

**Tasks:**
1. Update `ProjectService` to use database repository
2. Add mapping between `Project` (API model) and `ProjectRecord` (DB model)
3. Update `ProjectsController` to work with new service
4. Keep file repository as fallback (optional migration path)

**Mapping Layer:**
```csharp
public static class ProjectMapper
{
    public static ProjectRecord ToRecord(Project project)
    {
        return new ProjectRecord
        {
            Id = project.Id,
            Slug = GenerateSlug(project.Name), // Auto-generate if missing
            Name = project.Name,
            Description = project.Description,
            RulesetJson = project.RulesJson ?? "{}",
            Status = "draft", // Default status
            FhirVersion = project.FhirVersion,
            CodeMasterJson = project.CodeMasterJson,
            SampleBundleJson = project.SampleBundleJson,
            ValidationSettingsJson = project.ValidationSettingsJson,
            FeaturesJson = project.FeaturesJson,
            CreatedAt = project.CreatedAt,
            UpdatedAt = project.UpdatedAt
        };
    }
    
    public static Project ToProject(ProjectRecord record)
    {
        return new Project
        {
            Id = record.Id,
            Name = record.Name,
            Description = record.Description,
            FhirVersion = record.FhirVersion ?? "R4",
            RulesJson = record.RulesetJson,
            CodeMasterJson = record.CodeMasterJson,
            SampleBundleJson = record.SampleBundleJson,
            ValidationSettingsJson = record.ValidationSettingsJson,
            FeaturesJson = record.FeaturesJson,
            CreatedAt = record.CreatedAt,
            UpdatedAt = record.UpdatedAt,
            Features = DeserializeFeatures(record.FeaturesJson)
        };
    }
}
```

### Phase 4: Data Migration & Cleanup 🗄️

**Tasks:**
1. Migrate existing file-based projects to database
2. Verify data integrity
3. Remove file-based repository (or keep as backup)
4. Update documentation

**Migration Script:**
```csharp
public class FileToDbMigrationService
{
    public async Task MigrateAllProjects()
    {
        var fileRepo = new ProjectRepository(_logger);
        var dbRepo = new PostgresProjectRepository(_connection);
        
        var projects = await fileRepo.ListAsync();
        
        foreach (var metadata in projects)
        {
            var project = await fileRepo.GetAsync(metadata.Id);
            if (project == null) continue;
            
            var record = ProjectMapper.ToRecord(project);
            await dbRepo.CreateAsync(record);
            
            _logger.LogInformation("Migrated project {Id} - {Name}", project.Id, project.Name);
        }
    }
}
```

---

## Risk Assessment

### High Risk ⚠️
1. **Data Loss**: File-based projects not migrated → **Mitigation:** Backup files before migration
2. **Downtime**: Schema changes require restart → **Mitigation:** Use migrations, zero-downtime deploy
3. **Slug Conflicts**: Auto-generated slugs may collide → **Mitigation:** Add uniqueness check with retry

### Medium Risk ⚠️
1. **Model Mismatch**: Project vs ProjectRecord fields differ → **Mitigation:** Comprehensive mapping layer
2. **API Breaking Changes**: Frontend may break if models change → **Mitigation:** Version API, use DTOs
3. **Transaction Safety**: Multiple writes need atomicity → **Mitigation:** Use database transactions

### Low Risk ℹ️
1. **Performance**: Database slower than files → **Mitigation:** Add proper indexes
2. **Connection Pool**: Many requests may exhaust pool → **Mitigation:** Configure Npgsql pool settings

---

## Rollback Plan

**If migration fails:**
1. Keep file-based repository code intact (don't delete)
2. Use feature flag to switch between implementations
3. Restore database from backup if corrupted
4. Revert to file storage via DI configuration

```csharp
// Feature flag approach
if (useDatabase)
{
    builder.Services.AddScoped<IProjectRepository, PostgresProjectRepository>();
}
else
{
    builder.Services.AddScoped<IProjectRepository, FileProjectRepository>();
}
```

---

## Testing Strategy

### Unit Tests
- ✅ PostgresProjectRepository CRUD operations
- ✅ ProjectMapper bidirectional conversion
- ✅ Slug generation and uniqueness
- ✅ Status transitions (draft → published → archived)

### Integration Tests
- ✅ End-to-end project lifecycle (create → update → publish → delete)
- ✅ File-to-database migration
- ✅ Frontend API compatibility
- ✅ Concurrent access (locking, race conditions)

### Manual Testing
- ✅ Create project in admin → Verify appears in public (when published)
- ✅ Update project → Verify changes persist
- ✅ Delete project → Verify removed from database
- ✅ Publish project → Verify appears in public list

---

## Effort Estimate

| Phase | Task | Effort | Priority |
|-------|------|--------|----------|
| 1 | Schema Migration SQL | 2 hours | P0 |
| 2 | Extend PostgresProjectRepository | 4 hours | P0 |
| 3 | Create Mapping Layer | 3 hours | P0 |
| 4 | Update ProjectService | 3 hours | P0 |
| 5 | Update ProjectsController | 2 hours | P0 |
| 6 | Data Migration Script | 3 hours | P1 |
| 7 | Update Frontend (if needed) | 2 hours | P1 |
| 8 | Testing (unit + integration) | 4 hours | P0 |
| 9 | Documentation | 2 hours | P2 |
| **Total** | | **25 hours** | |

**Timeline:** 3-4 days for one developer

---

## Recommendation

**Use Option 1 (Extend Database Schema)** for the following reasons:

1. ✅ **Performance**: Indexed columns for fast queries
2. ✅ **Maintainability**: Clear schema, easy to understand
3. ✅ **Scalability**: Supports future features (search, filtering, pagination)
4. ✅ **Consistency**: Single source of truth for all projects
5. ✅ **Safety**: Database transactions prevent data corruption

**Next Steps:**
1. Review and approve this assessment
2. Create schema migration script (Phase 1)
3. Extend PostgresProjectRepository (Phase 2)
4. Update admin services and controllers (Phase 3)
5. Migrate existing file-based projects (Phase 4)
6. Test thoroughly and deploy

---

## Questions to Resolve

1. **Slug Generation**: Should slugs be auto-generated or user-provided?
   - Recommendation: Auto-generate from name, allow manual override

2. **File Repository**: Keep as backup or delete completely?
   - Recommendation: Keep code but remove from DI, mark as deprecated

3. **Existing Files**: Migrate automatically or manually?
   - Recommendation: Automatic migration script with verification

4. **Status Workflow**: Should drafts auto-publish or require explicit action?
   - Recommendation: Require explicit publish action (safety)

5. **Frontend Impact**: Will API response format change?
   - Recommendation: Keep Project DTO structure, map internally

---

**Document Status:** Ready for Review
**Author:** GitHub Copilot
**Date:** 2026-01-05
**Version:** 1.0
