# Validation UI Enhancements

## Summary
Enhanced the Validation panel with three key improvements:
1. **FHIR Version Display**: Shows "FHIR R4 (4.0.1)" in header
2. **Source Filtering**: Compact dropdown to show/hide error sources
3. **Progressive Disclosure**: Structured explanations with "Show explanations" toggle

## Changes Made

### 1. New Component: ValidationSourceFilter.tsx
**Purpose**: Provides compact dropdown filter for validation sources

**Features**:
- Dropdown button showing "All" or "N selected"
- Checkboxes for each source (Lint, Reference, Firely, Business, CodeMaster, Spec Hints)
- Shows count for each source `(N)`
- "Select All" / "Deselect All" toggle
- Persists state in localStorage per project
- Only shows sources with errors > 0

**Location**: `frontend/src/components/playground/Validation/ValidationSourceFilter.tsx`

**API**:
```typescript
interface SourceFilterState {
  lint: boolean;
  reference: boolean;
  firely: boolean;
  business: boolean;
  codeMaster: boolean;
  specHint: boolean;
}

<ValidationSourceFilter
  filters={sourceFilters}
  onChange={handleFilterChange}
  counts={{ lint: 5, reference: 2, ... }}
/>
```

### 2. Enhanced: ValidationPanel.tsx
**Changes**:
- Added `sourceFilters` state with localStorage persistence
- Added `showExplanations` state with localStorage persistence
- Added FHIR R4 version display in header with tooltip
- Added ValidationSourceFilter in toolbar (when results exist)
- Added "Show explanations" checkbox in toolbar
- Removed legacy source badges
- Removed unused imports (HelpTooltip, getSourceBadgeColor, LINT_HELP)

**New State Management**:
```typescript
const [sourceFilters, setSourceFilters] = useState<SourceFilterState>(() => {
  const stored = localStorage.getItem(`validation-filters-${projectId}`);
  return stored ? JSON.parse(stored) : { lint: true, reference: true, ... };
});

const [showExplanations, setShowExplanations] = useState<boolean>(() => {
  const stored = localStorage.getItem(`validation-explanations-${projectId}`);
  return stored === 'true';
});
```

**Header Enhancement**:
```tsx
<span 
  className="text-gray-600 font-medium"
  title="Validation performed against HL7 FHIR R4 (4.0.1)"
>
  FHIR R4 (4.0.1)
</span>
```

### 3. Enhanced: ValidationResultList.tsx
**Changes**:
- Added `sourceFilters` prop
- Added `showExplanations` prop
- Applied source filtering before grouping
- Shows "No Matching Results" when all errors filtered out
- Passes `showExplanations` to GroupedErrorCard

**Filtering Logic**:
```typescript
const filteredErrors = sourceFilters ? errors.filter(error => {
  const source = normalizeSource(error.source);
  const filterMap = {
    'LINT': 'lint',
    'REFERENCE': 'reference',
    'FHIR': 'firely',
    'BUSINESS': 'business',
    'CODEMASTER': 'codeMaster',
    'SPEC_HINT': 'specHint',
  };
  const filterKey = filterMap[source];
  return filterKey ? sourceFilters[filterKey] : true;
}) : errors;
```

### 4. Enhanced: GroupedErrorCard.tsx
**Changes**:
- Added `showExplanations` prop
- Implemented path deduplication using `deduplicateByPath()`
- Changed count from occurrences to unique locations
- Refactored display for progressive disclosure:
  - **Compact (default)**: Path, count, one-line message, jump icon
  - **Expanded**: "What this means", "How to fix", affected paths
- Removed banner dismissal state (no longer needed)
- Deduplicated paths show count indicator `(N×)`

**Progressive Disclosure Structure**:
```tsx
{/* Compact summary (always visible) */}
<p className="text-xs text-gray-600 mb-2">
  {firstError.message}
</p>

{/* Progressive disclosure: Explanations (when enabled) */}
{showExplanations && (
  <div className="mb-3 p-3 bg-gray-50 border border-gray-200 rounded">
    {/* What this means */}
    <div className="mb-2">
      <p className="text-xs font-semibold text-gray-900 mb-1">
        What this means
      </p>
      <p className={`text-xs ${metadata.textColor}`}>
        {metadata.explanation}
      </p>
    </div>

    {/* How to fix (blocking errors only) */}
    {metadata.isBlocking && (
      <div>
        <p className="text-xs font-semibold text-gray-900 mb-1">
          How to fix
        </p>
        <p className="text-xs text-gray-700">
          Review the affected paths...
        </p>
      </div>
    )}

    {/* SPEC_HINT special explanation */}
    {isSpecHint && (
      <div className="mt-2 pt-2 border-t border-gray-300">
        <p className="text-xs font-semibold text-cyan-900 mb-1">
          Why am I seeing this?
        </p>
        ...
      </div>
    )}
  </div>
)}
```

**Deduplication Logic**:
```typescript
const deduplicateByPath = (errors: ValidationError[]): Map<string, ValidationError[]> => {
  const pathGroups = new Map<string, ValidationError[]>();
  
  errors.forEach(error => {
    const normalizedPath = error.navigation?.jsonPointer || error.jsonPointer || error.path || 'unknown';
    if (!pathGroups.has(normalizedPath)) {
      pathGroups.set(normalizedPath, []);
    }
    pathGroups.get(normalizedPath)!.push(error);
  });
  
  return pathGroups;
};
```

**Count Display**:
- Changed from `(N occurrences)` to `(N locations)` in headline
- Added `(N×)` indicator for deduplicated paths with multiple instances
- Maintains resourceType breakdown badges

## User Experience Improvements

### Before
- All errors visible at once (no filtering)
- Verbose explanations always expanded
- Duplicate paths listed multiple times
- Source badges showed counts but couldn't filter
- No FHIR version visibility

### After
- **Compact by default**: Clean, scannable list showing only essential info
- **Selective filtering**: Hide entire sources with dropdown (e.g., turn off SPEC_HINT)
- **Progressive disclosure**: Click "Show explanations" to see structured guidance
- **Deduplicated paths**: Each unique path shown once with count indicator
- **FHIR version**: Always visible in header for context
- **Persistent preferences**: Filter and explanation settings saved per project

## Benefits

1. **Reduced Cognitive Load**: Default view is minimal and scannable
2. **Expert-Friendly**: Power users can expand explanations when needed
3. **Focused Workflow**: Filter out advisory sources to focus on blocking errors
4. **Cleaner Display**: Deduplication prevents repetitive path listings
5. **Context Awareness**: FHIR version always visible for reference
6. **Customization**: Per-project persistence of UI preferences

## Technical Notes

### localStorage Keys
- Filters: `validation-filters-${projectId}`
- Explanations: `validation-explanations-${projectId}`

### Type Safety
All new interfaces use TypeScript strict mode:
```typescript
interface SourceFilterState {
  lint: boolean;
  reference: boolean;
  firely: boolean;
  business: boolean;
  codeMaster: boolean;
  specHint: boolean;
}
```

### Null Safety
Proper null checking on `summary` object:
```typescript
counts={{
  lint: summary?.bySource?.lint || 0,
  reference: summary?.bySource?.reference || 0,
  ...
}}
```

### Backward Compatibility
- All props are optional with defaults
- No breaking changes to existing APIs
- Existing validation logic untouched

## Testing Checklist

✅ **FHIR Version Display**
- [ ] Version appears in header next to timestamp
- [ ] Tooltip shows on hover: "Validation performed against HL7 FHIR R4 (4.0.1)"
- [ ] Version visible even when no results

✅ **Source Filtering**
- [ ] Dropdown shows "All" when all sources enabled
- [ ] Dropdown shows "N selected" when some sources disabled
- [ ] Unchecking source hides entire group immediately
- [ ] "Select All" / "Deselect All" toggle works
- [ ] Filter state persists on page refresh (localStorage)
- [ ] Only sources with errors > 0 appear in dropdown
- [ ] Counts match actual error quantities

✅ **Progressive Disclosure**
- [ ] Default view is compact (path + count + message)
- [ ] "Show explanations" checkbox appears when results exist
- [ ] Checking toggle reveals "What this means" section
- [ ] Blocking errors show "How to fix" section
- [ ] SPEC_HINT groups show "Why am I seeing this?" explanation
- [ ] Explanation state persists on page refresh

✅ **Deduplication**
- [ ] Duplicate paths grouped under single entry
- [ ] Count indicator `(N×)` shows for deduplicated paths
- [ ] Headline shows unique location count (not total occurrences)
- [ ] Click on path navigates to first occurrence
- [ ] ResourceType breakdown still accurate

✅ **UI/UX**
- [ ] No layout shift when toggling explanations
- [ ] Dropdown closes when clicking outside
- [ ] Filter dropdown renders correctly on small screens
- [ ] Performance acceptable with 100+ errors
- [ ] Navigation still works on all paths
- [ ] Expand/collapse animations smooth

✅ **Regression Testing**
- [ ] Existing validation logic unchanged
- [ ] Error grouping still works (source + errorCode)
- [ ] Severity icons display correctly
- [ ] Blocking indicators accurate
- [ ] Navigation to paths functional
- [ ] ResourceType sub-grouping preserved

## Known Limitations

1. **Single PlaygroundPage Warning**: Existing unused variable `navigationFeedback` (unrelated to our changes)
2. **No Auto-Fix**: As specified, no auto-fix functionality added
3. **No Backend Changes**: All enhancements are frontend-only
4. **Filter Granularity**: Filters apply at source level, not individual error codes

## Future Enhancements (Out of Scope)

- Export filtered results to CSV/JSON
- Save filter presets (e.g., "Production Mode", "Debug Mode")
- Error code-level filtering (in addition to source-level)
- Custom error grouping rules
- Visualization: error count trends over validation runs
- Batch operations on filtered errors

---

**Implementation Date**: 2025-01-XX  
**Status**: ✅ Complete - Ready for testing  
**Breaking Changes**: None  
**Migration Required**: None  
