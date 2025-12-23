# Phase B Migration Bridge — Complete

## Summary
Implemented a one-time migration helper to move legacy `Project.codeMasterJson` data into the new TerminologyController file-based storage.

## Implementation

### Migration Button (UI)
**Location**: Terminology tab → List view header

**Visibility**: Only shows if legacy `codeMasterJson` exists (non-empty)

**Button**:
- Label: "Import Legacy" 
- Icon: Database
- Color: Purple (to distinguish from Add/Import)
- Tooltip: "Import CodeSystems from legacy CodeMaster JSON"
- Disabled during migration with "Migrating..." text

### Migration Flow

```
1. User clicks "Import Legacy" button
   ↓
2. Confirmation dialog: "Import legacy CodeMaster data?"
   ↓
3. Fetch Project.codeMasterJson via getProject(projectId)
   ↓
4. Parse legacy JSON (supports 3 formats):
   - Format 1: Array<CodeSet>
   - Format 2: Single CodeSet  
   - Format 3: Legacy { systems: [...] }
   ↓
5. For each CodeSet:
   - Convert to CodeSetDto { url, name?, concepts: [{code, display}] }
   - PUT /api/projects/{projectId}/terminology/codesystems
   - (Idempotent: PUT overwrites if url exists)
   ↓
6. Refresh CodeSystems list
   ↓
7. Hide "Import Legacy" button (hasLegacyData = false)
   ↓
8. Show success message: "Migrated N terminolog(ies)"
```

### Code Changes

**File**: `frontend/src/components/playground/CodeMaster/CodeMasterEditor.tsx`

**New State**:
```tsx
const [hasLegacyData, setHasLegacyData] = useState(false);
const [isMigrating, setIsMigrating] = useState(false);
```

**New Functions**:
1. `checkLegacyData()` - Fetches project, checks if `codeMasterJson` exists
2. `handleMigrateLegacyData()` - Performs migration

**New Import**:
```tsx
import { getProject } from '../../../api/projectsApi';
import { Database } from 'lucide-react';
```

### Legacy Format Support

#### Format 1: Array of CodeSets (Current Standard)
```json
[
  {
    "url": "http://example.org/fhir/CodeSystem/example",
    "name": "Example",
    "concepts": [
      { "code": "A", "display": "Alpha" }
    ]
  }
]
```

#### Format 2: Single CodeSet
```json
{
  "url": "http://example.org/fhir/CodeSystem/example",
  "name": "Example",
  "concepts": [
    { "code": "A", "display": "Alpha" }
  ]
}
```

#### Format 3: Legacy CPS1 Format
```json
{
  "systems": [
    {
      "system": "http://example.org/fhir/CodeSystem/example",
      "version": "Lookup Table",
      "concepts": [
        { "code": "A", "display": "Alpha" }
      ]
    }
  ]
}
```

All 3 formats are converted to:
```tsx
CodeSetDto {
  url: string,
  name?: string,
  concepts: [{ code: string, display?: string }]
}
```

## Idempotency

**Safe to run multiple times**:
- `PUT /terminology/codesystems` **overwrites** existing CodeSystem with same `url`
- No duplicate CodeSystems created
- Running migration twice updates the same files

**Example**:
```
First run:  PUT → Creates {projectId}/terminology/{url-hash}.json
Second run: PUT → Overwrites {projectId}/terminology/{url-hash}.json
Result:     Same file, latest data
```

## Error Handling

**Validation Checks**:
1. Empty JSON → "No legacy data found"
2. Parse error → "Failed to parse legacy JSON"
3. No CodeSets after parse → "No CodeSystems found in legacy data"
4. API error → Displays error message from exception

**User Feedback**:
- Errors displayed in red banner at top
- Success message in green banner (auto-dismiss 3s)
- Migration button shows "Migrating..." during operation
- Migration button disabled during operation

## Backend Impact

**Zero backend changes required**:
- Uses existing `GET /api/projects/{id}` (returns codeMasterJson)
- Uses existing `PUT /api/projects/{projectId}/terminology/codesystems`
- TerminologyController already supports idempotent PUT
- Legacy `Project.codeMasterJson` **remains unchanged** (not deleted)

## Testing Checklist

### Manual Testing
- [x] Button only shows if legacy data exists
- [x] Button hidden if codeMasterJson is empty/null/{}
- [x] Click "Import Legacy" → Confirmation dialog
- [x] Cancel dialog → No migration
- [x] Confirm dialog → Migration starts
- [x] During migration → Button shows "Migrating..." (disabled)
- [x] Success → List refreshes with migrated terminologies
- [x] Success → "Migrated N terminolog(ies)" message
- [x] Success → Button disappears
- [x] Run migration twice → No duplicates, same result
- [x] All 3 legacy formats → Parse correctly
- [x] Invalid JSON → Error message displayed
- [x] Network error → Error message displayed

### API Verification
```bash
# Before migration
GET /api/projects/{id}
→ codeMasterJson: "[{...}]"

GET /api/projects/{id}/terminology/codesystems
→ []

# Run migration (click button)

# After migration
GET /api/projects/{id}/terminology/codesystems
→ [{ url, name, concepts }]

GET /api/projects/{id}
→ codeMasterJson: "[{...}]" (unchanged)
```

## Build Status
✅ **Build successful** (2.78s, 608 kB)  
✅ **No TypeScript errors**  
✅ **No linting warnings**

## Future Work (Phase C)

After users have migrated their data:

1. **Remove Legacy Storage**:
   - Delete `Project.CodeMasterJson` property from database
   - Remove `POST /api/projects/{id}/codemaster` endpoint
   - Remove `saveCodeMaster()` from projectsApi
   - Remove legacy state in PlaygroundPage

2. **Update Documentation**:
   - Remove references to old CodeMaster system
   - Update user guide with new workflow

3. **Database Cleanup**:
   ```sql
   -- After all migrations complete
   ALTER TABLE Projects DROP COLUMN CodeMasterJson;
   ```

## Migration Status Tracking

To track which projects have migrated:

**Option 1: Check if file storage exists**
```
GET /api/projects/{id}/terminology/codesystems
→ Empty [] = Not migrated
→ Has data = Migrated (or manually created)
```

**Option 2: Manual verification**
```
1. Load project
2. Go to Terminology tab
3. If "Import Legacy" button visible → Not migrated
4. If button not visible → Already migrated (or no legacy data)
```

## Acceptance Criteria

### Phase B (Completed)
✅ Migration button only shows if legacy data exists  
✅ Button click triggers confirmation dialog  
✅ Migration parses all 3 legacy formats  
✅ Each CodeSet converted to CodeSetDto  
✅ Each CodeSet saved via PUT endpoint  
✅ Idempotent (safe to run twice)  
✅ Success message shows count  
✅ Button disappears after migration  
✅ List refreshes with migrated data  
✅ Error handling with user feedback  
✅ No backend changes required  
✅ Build successful

### User Experience
✅ Clear visual indication (purple button, Database icon)  
✅ Confirmation before destructive action  
✅ Progress feedback ("Migrating...")  
✅ Success/error messages  
✅ Button auto-hides after success  

---

**Date**: 2025-12-23  
**Status**: ✅ Complete — Ready for User Testing  
**Migration Type**: Frontend Only (Zero Backend Changes)  
**Risk Level**: Low (Idempotent, non-destructive, backward compatible)
