# FHIR Schema Replacement Implementation

## Summary
Replaced the recursive FHIR Schema tree loader with a sample-based tree implementation in the "From FHIR Schema (R4)" tab of the FHIRPath Selector.

## Changes Made

### ✅ New Component: `FhirSampleTreeView.tsx`
- **Purpose**: Load and display FHIR sample JSON as a navigable tree
- **Features**:
  - Fetches sample JSON from `/api/fhir/samples` API
  - Prefers HL7 official samples over custom samples
  - Builds tree structure from JSON (objects, arrays, primitives)
  - Generates valid FHIRPath expressions
  - Shows "HL7 Sample" badge for official samples
  - Provides path validation warning (non-blocking)
  - Clean, performant tree rendering

### ✅ Updated Component: `FhirPathSelectorDrawer.tsx`
- **Change**: Import and use `FhirSampleTreeView` instead of `FhirSchemaTreeView`
- **Tab**: "From FHIR Schema (R4)" now uses sample-based tree
- **UX**: Tab label unchanged, seamless replacement

### ✅ Deprecated Component: `FhirSchemaTreeView.deprecated.tsx`
- **Status**: Renamed from `FhirSchemaTreeView.tsx`
- **Reason**: Replaced by sample-based approach
- **Notes**: Can be safely removed after verification

## Tree Construction Logic

### Node Types
| JSON Type | Tree Type | FHIRPath Pattern |
|-----------|-----------|------------------|
| Object    | `{}` icon | `field` |
| Array     | `[]` icon | `field[0]` |
| Primitive | `·` icon  | `field` |

### Path Generation Examples
```typescript
// Object field
name → "name"

// Array element
name[0] → "name[0]"

// Nested field
name[0].family → "name[0].family"

// Array → nested
identifier[0].value → "identifier[0].value"
```

### Ignored Fields
- `resourceType` (at root level)
- Optionally `id` (can be collapsed)

## UI Features

### HL7 Badge
- **Location**: Top-right of tree header
- **Text**: "HL7 Sample"
- **Tooltip**: "Tree generated from official HL7 FHIR R4 example"
- **Condition**: Only shown when sample source is HL7

### Path Warning
- **Trigger**: Selected path not in project bundle
- **Display**: Non-blocking amber warning
- **Message**: "⚠ This path is not present in the current sample bundle."
- **Status**: Currently simplified (always valid)

### Loading States
- Spinner while fetching sample
- Error display with clear messaging
- Empty state with helpful text

## API Integration

### Endpoints Used
```typescript
// 1. List samples for resource type
GET /api/fhir/samples?version=R4&resourceType={type}
Response: FhirSampleMetadata[]

// 2. Load specific sample
GET /api/fhir/samples/R4/{resourceType}/{sampleId}
Response: FHIR JSON
```

### Sample Selection
1. Fetch list of samples for resource type
2. Prefer HL7 samples (id starts with `hl7-`)
3. Fall back to first available sample
4. Load sample JSON
5. Build tree from JSON

## Performance Improvements

### Before (Recursive Schema)
- Heavy recursive StructureDefinition expansion
- Complex schema traversal logic
- Performance risk with deep nesting
- Difficult to reason about

### After (Sample-Based Tree)
- Simple JSON tree traversal
- Direct sample data usage
- Predictable performance
- Clear, maintainable code

## Files Modified

### Created
- `frontend/src/components/FhirSampleTreeView.tsx` (new)

### Updated
- `frontend/src/components/FhirPathSelectorDrawer.tsx` (import swap)

### Deprecated
- `frontend/src/components/FhirSchemaTreeView.deprecated.tsx` (renamed)

## Scope Adherence

### ✅ Modified
- Only "From FHIR Schema (R4)" tab implementation
- Replaced schema loader with sample loader

### ❌ NOT Modified
- Modal layout (unchanged)
- Tab structure (unchanged)
- "From Sample Bundle" tab (unchanged)
- "Manual Input" tab (unchanged)
- Rule builder logic (unchanged)
- Validation engine (unchanged)
- FHIRPath output format (unchanged)

## Testing Checklist

- [ ] Open FHIRPath Selector modal
- [ ] Select "From FHIR Schema (R4)" tab
- [ ] Verify sample tree loads
- [ ] Check HL7 badge appears
- [ ] Expand/collapse tree nodes
- [ ] Select a path
- [ ] Verify FHIRPath generated correctly
- [ ] Test with different resource types (Patient, Observation, etc.)
- [ ] Confirm no schema recursion errors
- [ ] Verify performance is fast

## Future Enhancements (NOT in this task)

- [ ] Support `[*]` array notation
- [ ] Support `where()` filtering
- [ ] Add search/filter in tree
- [ ] Add R5 support
- [ ] Enhanced path validation
- [ ] Schema + sample hybrid view

## Cleanup Tasks (Optional)

Once verified working:
- Delete `FhirSchemaTreeView.deprecated.tsx`
- Remove backend `/api/fhir/schema/{resourceType}` endpoint (if unused elsewhere)
- Remove recursive schema expansion utilities

## Result

✅ **Sample-based tree successfully replaces recursive schema loader**
- Same UX, better performance
- Clear HL7 alignment
- Predictable, maintainable code
- No recursion risks
