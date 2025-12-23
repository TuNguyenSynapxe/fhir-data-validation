# Phase 3A: Frontend Data Contracts & API Integration - Summary

## Overview
Phase 3A implements the **data layer** for terminology authoring in the frontend. This includes TypeScript type definitions, API client functions, and error handling — but **no UI components or state management**.

---

## Files Created

### 1. Type Definitions
**File**: `frontend/src/types/terminology.ts`

**Purpose**: TypeScript interfaces matching backend C# models

**Key Types**:
- `CodeSystem`: Represents a FHIR CodeSystem (identity: `url`)
- `CodeSystemConcept`: Individual codes with hierarchical support (`concept[]`)
- `TerminologyConstraint`: Project-specific validation rules (identity: `id`)
- `AllowedAnswer`: Permitted code in a constraint (identity: `system` + `code`)
- `RuleAdvisory`: Detected issues (CODE_NOT_FOUND, DISPLAY_MISMATCH, etc.)
- `AdvisoryContext`: Context for advisory (constraint, code, system)
- `AdvisoryResponse`: Wrapper for advisory list with projectId

**Dependencies**: None (pure type definitions)

---

### 2. Error Handling Utilities
**File**: `frontend/src/utils/terminologyErrors.ts`

**Purpose**: Non-blocking error handling for API operations

**Key Functions**:
- `wrapTerminologyOperation()`: Wraps async functions, returns `TerminologyResult<T>`
- `parseTerminologyError()`: Parses Axios errors into `TerminologyError`
- `formatErrorMessage()`: User-friendly error formatting
- `getResultData()`: Safely extracts data from `TerminologyResult<T>`
- `logTerminologyError()`: Console logging with details

**Pattern**: 
```typescript
type TerminologyResult<T> = 
  | { success: true; data: T }
  | { success: false; error: TerminologyError };
```

**Dependencies**: Uses Axios error structure (type guards, no direct import)

---

### 3. CodeSystem API Client
**File**: `frontend/src/api/terminologyApi.ts`

**Purpose**: CRUD operations for CodeSystems

**Key Functions**:
- `getCodeSystemByUrl()`: Fetch by canonical URL
- `listCodeSystems(projectId)`: List all CodeSystems for a project
- `saveCodeSystem(projectId, codeSystem)`: Create or overwrite
- `deleteCodeSystem(projectId, url)`: Delete by URL
- `findConcept(system, code)`: Find concept by system+code

**Helper Functions**:
- `findConceptInList()`: Recursive search in concept hierarchy
- `flattenConcepts()`: Flatten hierarchy to flat list
- `validateCodeSystem()`: Client-side validation before save
- `findDuplicateCodes()`: Detect duplicate codes

**Pattern**: All functions return `TerminologyResult<T>`, errors never thrown

**Dependencies**: `httpClient`, `types/terminology`, `utils/terminologyErrors`

---

### 4. TerminologyConstraint API Client
**File**: `frontend/src/api/constraintApi.ts`

**Purpose**: CRUD operations for TerminologyConstraints

**Key Functions**:
- `getConstraintById(constraintId)`: Fetch by ID
- `listConstraints(projectId)`: List all constraints for a project
- `listConstraintsByResourceType(projectId, resourceType)`: Filter by resource type
- `listConstraintsByCodeSystem(projectId, codeSystemUrl)`: Find constraints referencing a CodeSystem
- `saveConstraint(projectId, constraint)`: Create or overwrite
- `deleteConstraint(projectId, constraintId)`: Delete by ID

**Helper Functions**:
- `validateConstraint()`: Client-side validation before save
- `hasAllowedAnswer()`: Check if answer exists
- `addAllowedAnswer()`: Immutable add
- `removeAllowedAnswer()`: Immutable remove
- `updateAllowedAnswer()`: Immutable update

**Pattern**: All functions return `TerminologyResult<T>`, errors never thrown

**Dependencies**: `httpClient`, `types/terminology`, `utils/terminologyErrors`

---

### 5. Rule Advisory API Client
**File**: `frontend/src/api/advisoryApi.ts`

**Purpose**: Read-only access to Rule Advisory detection

**Key Functions**:
- `getAdvisories(projectId)`: Fetch all advisories for a project

**Helper Functions**:
- `filterBySeverity()`: Filter by error/warning/info
- `groupByCode()`: Group by advisory code
- `countBySeverity()`: Count errors/warnings/info
- `findAdvisoriesForConstraint()`: Find advisories for specific constraint
- `findAdvisoriesForCodeSystem()`: Find advisories for specific CodeSystem
- `hasBlockingErrors()`: Check if errors should block operations (currently: always false)
- `formatAdvisoryMessage()`: Format message with context
- `shouldWarnUser()`: Check if warnings should be shown

**Pattern**: 
- Read-only (advisories are generated on-demand, never persisted)
- Non-blocking (failures return error, never thrown)
- Informational (advisories do NOT block save operations)

**Dependencies**: `httpClient`, `types/terminology`, `utils/terminologyErrors`

---

## Data Flow

### Example: Saving a CodeSystem
```
User action (UI)
  ↓
validateCodeSystem(codeSystem)  // Client-side validation
  ↓
saveCodeSystem(projectId, codeSystem)
  ↓
wrapTerminologyOperation(...)
  ↓
httpClient.post(...)  // Backend call
  ↓
Backend: ITerminologyService.SaveAsync()
  ↓
File written: {baseDataPath}/{projectId}/terminology/{sanitized-url}.json
  ↓
Response: 200 OK / 400 Bad Request / 500 Server Error
  ↓
parseTerminologyError() (if error)
  ↓
TerminologyResult<void>
  ↓
UI: Display success or error message
```

### Example: Fetching Advisories
```
User action (UI)
  ↓
getAdvisories(projectId)
  ↓
wrapTerminologyOperation(...)
  ↓
httpClient.get(...)  // Backend call
  ↓
Backend: IRuleAdvisoryService.DetectAdvisoriesAsync()
  ↓
Scans: terminology constraints + CodeSystems
  ↓
Detects: CODE_NOT_FOUND, DISPLAY_MISMATCH, etc.
  ↓
Response: AdvisoryResponse { projectId, advisories[] }
  ↓
TerminologyResult<AdvisoryResponse>
  ↓
UI: Display warnings/errors (informational only)
```

---

## Architectural Decisions

### 1. **Non-Blocking Error Handling**
- **Decision**: All API functions return `TerminologyResult<T>` instead of throwing errors
- **Rationale**: UI can decide how to handle errors (show inline, show toast, etc.) without try/catch everywhere
- **Trade-off**: Requires checking `result.success` before accessing `result.data`

### 2. **Last-Write-Wins Concurrency**
- **Decision**: No optimistic locking, no version tracking
- **Rationale**: Authoring-only system with low collaboration (spec requirement)
- **Risk**: If two users edit the same CodeSystem, last save wins (data loss possible)

### 3. **Client-Side Validation**
- **Decision**: Provide `validateCodeSystem()` and `validateConstraint()` helpers
- **Rationale**: Catch errors before network call (faster feedback)
- **Trade-off**: Validation logic duplicated (backend also validates)

### 4. **Immutable Helpers**
- **Decision**: `addAllowedAnswer()`, `removeAllowedAnswer()`, etc. return new objects
- **Rationale**: Works with React's immutability requirements (if UI uses React)
- **Trade-off**: More memory allocations (negligible for small objects)

### 5. **Advisory Non-Blocking**
- **Decision**: `hasBlockingErrors()` always returns `false`
- **Rationale**: Advisories are informational only (spec requirement)
- **Trade-off**: Users can save broken constraints (but advisories will warn them)

---

## Assumptions Made

1. **Backend Endpoints**:
   - CodeSystem endpoints: `/api/projects/{projectId}/terminology/codesystems`
   - Constraint endpoints: `/api/projects/{projectId}/terminology/constraints`
   - Advisory endpoint: `/api/projects/{projectId}/terminology/advisories`
   - **Note**: Some endpoints (e.g., `getCodeSystemByUrl`) assume query params — verify with actual backend routing

2. **HTTP Client**:
   - Assumes `httpClient.ts` uses Axios with interceptors
   - Assumes `VITE_API_BASE_URL` environment variable is set

3. **Error Codes**:
   - 404 → `NOT_FOUND`
   - 400 → `INVALID_REQUEST`
   - 500 → `SERVER_ERROR`
   - Network failure → `NETWORK_ERROR`

4. **Identity**:
   - CodeSystem: `url` is the primary key
   - Concept: `system` + `code` is the identity
   - Constraint: `id` is the primary key
   - AllowedAnswer: `system` + `code` is the identity

5. **UI Framework**:
   - No assumptions made (data layer is framework-agnostic)
   - Helpers like `addAllowedAnswer()` follow immutability for React compatibility

---

## Risks & TODOs

### Risks

#### 1. **Concurrency Conflicts** (HIGH)
- **Issue**: Last-write-wins means simultaneous edits lose data
- **Mitigation**: Document in user guide, consider adding "last modified" timestamp in UI
- **Long-term**: Add ETag or version field (requires backend change)

#### 2. **Broken References** (MEDIUM)
- **Issue**: User can delete a CodeSystem that is referenced in constraints
- **Mitigation**: Rule Advisory will detect `CODESYSTEM_NOT_FOUND`, but save is not blocked
- **Long-term**: Add "Are you sure?" dialog in UI when deleting CodeSystem

#### 3. **Network Failures** (MEDIUM)
- **Issue**: Save operation fails silently if network is down
- **Mitigation**: `wrapTerminologyOperation()` returns `NETWORK_ERROR`, UI must handle this
- **Long-term**: Add retry logic or offline queue (not in scope for Phase 3A)

#### 4. **Large CodeSystems** (LOW)
- **Issue**: Flattening or searching large hierarchies (1000+ concepts) may be slow
- **Mitigation**: Backend should paginate or support server-side search
- **Long-term**: Add pagination support (not in scope for Phase 3A)

#### 5. **Validation Drift** (LOW)
- **Issue**: Client-side validation (`validateCodeSystem()`) may drift from backend validation
- **Mitigation**: Backend is source of truth — client validation is just UX optimization
- **Long-term**: Generate client validation from backend schema (e.g., JSON Schema)

### TODOs

1. **Verify Backend Endpoints**: Confirm actual endpoint URLs match assumptions (especially query params in `getCodeSystemByUrl`)
2. **Add Unit Tests**: Test validation helpers, immutable helpers, error parsing
3. **Add JSDoc Examples**: Provide usage examples in JSDoc comments
4. **Add TypeScript Strict Mode**: Ensure all files compile with `strict: true`
5. **Add Retry Logic**: Implement exponential backoff for transient network errors
6. **Add Pagination**: Support large lists (e.g., 100+ CodeSystems)
7. **Add Caching**: Cache CodeSystem lookups to reduce redundant network calls

---

## Next Steps (Out of Scope for Phase 3A)

Phase 3A is **data layer only**. The following are out of scope:

- ❌ UI components (forms, tables, modals)
- ❌ State management (React Context, Zustand, Redux)
- ❌ Routing (navigation between pages)
- ❌ Authentication/Authorization
- ❌ Websocket/Server-Sent Events for real-time updates
- ❌ Offline support (Service Workers, IndexedDB)

These will be addressed in **Phase 3B** (UI implementation) and beyond.

---

## Usage Example

```typescript
import { listCodeSystems, saveCodeSystem } from './api/terminologyApi';
import { getAdvisories } from './api/advisoryApi';
import { getResultData, logTerminologyError } from './utils/terminologyErrors';

async function example() {
  // Fetch CodeSystems
  const result = await listCodeSystems('project-123');
  
  if (!result.success) {
    logTerminologyError(result.error);
    return;
  }
  
  const codeSystems = result.data;
  console.log('CodeSystems:', codeSystems);
  
  // Save a CodeSystem
  const newCodeSystem = {
    url: 'http://example.org/fhir/CodeSystem/example',
    status: 'active' as const,
    content: 'complete' as const,
    concept: [
      { code: 'A', display: 'Option A' }
    ]
  };
  
  const saveResult = await saveCodeSystem('project-123', newCodeSystem);
  
  if (!saveResult.success) {
    logTerminologyError(saveResult.error);
    return;
  }
  
  console.log('Saved successfully');
  
  // Fetch advisories
  const advisoryResult = await getAdvisories('project-123');
  
  if (advisoryResult.success) {
    const advisories = advisoryResult.data.advisories;
    const errors = advisories.filter(a => a.severity === 'error');
    console.log('Errors found:', errors.length);
  }
}
```

---

## Conclusion

Phase 3A provides a **complete data layer** for terminology authoring:
- ✅ Type-safe TypeScript interfaces
- ✅ Non-blocking error handling
- ✅ CRUD operations for CodeSystems and Constraints
- ✅ Read-only Rule Advisory access
- ✅ Client-side validation helpers
- ✅ Immutable data manipulation helpers

**No UI components** were created (as per requirements). The data layer is framework-agnostic and ready for integration with React, Vue, or vanilla JavaScript.

**Risks**: Last-write-wins concurrency, broken references, network failures (all documented).

**Next**: Phase 3B will implement the UI components on top of this data layer.
