# Feature Flags Implementation Guide

## Overview

Feature flags are **per-project** controls that enable access to experimental or preview features. They are opt-in only and safe to add to existing projects.

## Architecture

### Backend Components

1. **ProjectFeatures.cs** - Feature flag model
   ```csharp
   public class ProjectFeatures
   {
       public bool TreeRuleAuthoring { get; set; } = false;
   }
   ```

2. **Project.cs** - Added `Features` property
   - Stored as `FeaturesJson` (internal, not exposed in API)
   - Deserialized to `Features` object on load
   - Always returned in API responses (never null)

3. **ProjectRepository.cs** - Serialization logic
   - `SerializeFeatures()` - Converts Features → FeaturesJson before save
   - `DeserializeFeatures()` - Converts FeaturesJson → Features after load
   - Defaults to `{}` if not set

### API Response Format

```json
GET /api/projects/{id}

{
  "id": "abc-123",
  "name": "Demo Project",
  "features": {
    "treeRuleAuthoring": false
  }
}
```

## Current Features

### treeRuleAuthoring

**Purpose**: Enable tree-based rule authoring UI (Advanced Rules Preview)

**Default**: `false` (opt-in only)

**Frontend Behavior**: 
- When `true`: Shows "Advanced Rules (Preview)" section in Rules tab
- When `false`: Section hidden

**Backend Impact**: None (UI-only feature flag)

---

## How to Enable Features

### File-Based Storage (Current)

Since the current implementation uses file-based JSON storage:

#### Option 1: Manual JSON Edit

1. Locate project file: `backend/src/Pss.FhirProcessor.Playground.Api/ProjectStorage/{projectId}.json`

2. Add/update the `featuresJson` field:
   ```json
   {
     "id": "abc-123",
     "name": "Demo Project",
     "featuresJson": "{\"treeRuleAuthoring\":true}"
   }
   ```

3. Save file - API will automatically deserialize on next request

#### Option 2: Using PowerShell/Bash

**PowerShell**:
```powershell
$projectId = "your-project-id"
$file = "ProjectStorage/$projectId.json"
$json = Get-Content $file | ConvertFrom-Json
$json.featuresJson = '{"treeRuleAuthoring":true}'
$json | ConvertTo-Json -Depth 10 | Set-Content $file
```

**Bash**:
```bash
PROJECT_ID="your-project-id"
FILE="ProjectStorage/$PROJECT_ID.json"
jq '.featuresJson = "{\"treeRuleAuthoring\":true}"' $FILE > temp.json && mv temp.json $FILE
```

### Database Storage (Future)

When migrated to PostgreSQL:

```sql
-- Enable for specific project
UPDATE projects
SET features = jsonb_set(
  COALESCE(features, '{}'::jsonb),
  '{treeRuleAuthoring}',
  'true'::jsonb
)
WHERE id = 'your-project-id';

-- Verify
SELECT id, name, features FROM projects WHERE id = 'your-project-id';
```

See: `backend/docs/migrations/001_add_features_column.sql`

---

## Testing

### 1. Verify Default Behavior

**Test**: Create new project
```bash
curl -X POST http://localhost:5000/api/projects \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Project","fhirVersion":"R4"}'
```

**Expected Response**:
```json
{
  "id": "...",
  "name": "Test Project",
  "features": {
    "treeRuleAuthoring": false
  }
}
```

✅ Feature defaults to `false`

### 2. Verify Existing Projects

**Test**: Get existing project (created before feature flag implementation)
```bash
curl http://localhost:5000/api/projects/{id}
```

**Expected Response**:
```json
{
  "features": {
    "treeRuleAuthoring": false
  }
}
```

✅ Backward compatible - no errors, defaults to `false`

### 3. Enable Feature

**Test**: Manually edit project JSON file to add `"featuresJson": "{\"treeRuleAuthoring\":true}"`

**Test**: Get project again
```bash
curl http://localhost:5000/api/projects/{id}
```

**Expected Response**:
```json
{
  "features": {
    "treeRuleAuthoring": true
  }
}
```

✅ Feature enabled for this project only

### 4. Frontend Integration

**Test**: Open project in frontend UI

**With feature disabled**:
- "Advanced Rules (Preview)" section NOT visible in Rules tab

**With feature enabled**:
- "Advanced Rules (Preview)" section visible in Rules tab
- Can expand/collapse section
- TreeBasedRuleCreator component loads

---

## Safety Guarantees

✅ **Per-Project**: Flags are project-specific, not global  
✅ **Opt-In**: Default is `false`, must be manually enabled  
✅ **Backward Compatible**: Existing projects work without changes  
✅ **Non-Breaking**: API response always includes `features` (never null)  
✅ **No Auto-Enable**: No code automatically enables features  
✅ **Safe Storage**: Empty JSON `{}` if not set  

---

## Adding New Features

To add a new feature flag:

### 1. Update ProjectFeatures.cs

```csharp
public class ProjectFeatures
{
    public bool TreeRuleAuthoring { get; set; } = false;
    public bool YourNewFeature { get; set; } = false;  // Add this
}
```

### 2. Document in this README

Add section describing:
- Purpose
- Default value
- Frontend behavior
- Backend impact

### 3. Update Frontend Types

```typescript
// frontend/src/types/project.ts
export interface ProjectFeatures {
  treeRuleAuthoring?: boolean;
  yourNewFeature?: boolean;  // Add this
}
```

### 4. Frontend Usage

```typescript
{project.features?.yourNewFeature && (
  <YourNewComponent />
)}
```

---

## Troubleshooting

### Issue: Features not appearing in API response

**Cause**: Repository not deserializing features

**Fix**: Ensure `DeserializeFeatures()` is called in `GetAsync()` and `ListAsync()`

### Issue: Features always false even when enabled

**Cause**: `featuresJson` field not being serialized correctly

**Check**: File should contain `"featuresJson": "{\"treeRuleAuthoring\":true}"`  
**Not**: `"featuresJson": "{"treeRuleAuthoring":true}"` (escaping issue)

### Issue: Null reference error on Features property

**Cause**: Features not initialized

**Fix**: Ensure `Features = new ProjectFeatures()` in repository deserialization

---

## Migration Path (Future)

When moving to database storage:

1. Run migration: `001_add_features_column.sql`
2. Update repository to use SQL instead of file storage
3. Keep serialization/deserialization logic
4. Feature flags continue to work identically

---

## Compliance

✅ Follows specification requirements:
- ❌ No global flags
- ❌ No auto-enable
- ❌ No UI toggles yet (manual only)
- ❌ No schema refactors
- ❌ No breaking changes
- ✅ Per-project control
- ✅ Backward compatible
- ✅ Opt-in only
- ✅ Safe defaults

**Design Principle**: "Feature flags are opt-in controls, not shortcuts."

---

**Implementation Date**: December 17, 2025  
**Status**: ✅ Complete and tested
