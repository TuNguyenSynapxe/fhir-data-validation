# Phase 4A: Terminology Export - Implementation Summary

**Status:** ✅ Complete  
**Date:** December 22, 2024

## Overview

Implemented comprehensive export functionality for CodeSystems supporting both FHIR JSON and CSV formats. Exports include terminology data only (concepts, metadata) without constraints or advisories.

## Components Implemented

### 1. Export Utility Functions
**File:** `frontend/src/utils/exportCodeSystem.ts` (~215 lines)

**Features:**
- `exportCodeSystemAsJson()` - Exports FHIR-aligned JSON
- `exportCodeSystemAsCsv()` - Exports flat or hierarchical CSV
- `getExportSummary()` - Provides export statistics
- `sanitizeFilename()` - Creates safe filenames from CodeSystem names
- `downloadFile()` - Browser download trigger

**FHIR JSON Export:**
- Includes resourceType field (FHIR standard)
- All CodeSystem metadata: url, version, name, title, status, description, publisher, content, count
- Complete concept array with nested hierarchies
- Removes undefined fields for cleaner output
- Formatted with 2-space indentation

**CSV Export:**
- Auto-detects hierarchy (includes parentCode if nested concepts exist)
- Columns: code, display, definition, parentCode (if hierarchical)
- Reuses `conceptsToCSV()` from csvParser utility
- Handles quoted fields and special characters
- Optional status column (future enhancement)

### 2. CodeSystem List Panel Integration
**File:** `frontend/src/components/terminology/CodeSystemListPanel.tsx` (updated)

**Features:**
- Export dropdown button on each CodeSystem card
- Appears on hover (opacity transition)
- Two options: "Export as JSON" and "Export as CSV"
- Click handlers stop propagation (don't trigger card click)
- Positioned next to navigation arrow

**UI Changes:**
- Import Download and ChevronDown icons
- Added export menu state management
- Modified card layout to include export button area
- Added relative positioning for dropdown menu

### 3. CodeSystem Editor Integration
**File:** `frontend/src/components/terminology/TerminologyManagementScreen.tsx` (updated)

**Features:**
- Export dropdown in header area next to breadcrumb
- Always visible (not hover-based)
- Same two options: JSON and CSV
- Export handlers close menu after triggering download

**UI Changes:**
- Breadcrumb area now flex layout with space-between
- Export button on right side of header
- Consistent dropdown styling with list panel

## Export Formats

### JSON Export Format
```json
{
  "resourceType": "CodeSystem",
  "url": "http://example.org/fhir/CodeSystem/patient-status",
  "version": "1.0.0",
  "name": "PatientStatus",
  "title": "Patient Status Codes",
  "status": "active",
  "description": "Codes representing patient status values",
  "publisher": "Example Healthcare Organization",
  "content": "complete",
  "count": 5,
  "concept": [
    {
      "code": "active",
      "display": "Active Patient",
      "definition": "A patient who is currently receiving care"
    }
  ]
}
```

**Includes:**
- ✅ resourceType: "CodeSystem" (FHIR standard)
- ✅ All metadata fields
- ✅ Nested concept hierarchies
- ✅ Designations and properties (if present)
- ❌ Constraints (not included - terminology only)
- ❌ Advisories (not included)

### CSV Flat Format
```csv
code,display,definition
active,Active Patient,A patient who is currently receiving care
inactive,Inactive Patient,A patient who is no longer receiving care
```

**Columns:**
- `code` - Unique concept identifier
- `display` - Human-readable label
- `definition` - Detailed explanation

### CSV Hierarchical Format
```csv
code,display,definition,parentCode
status,Patient Status,Top-level category,
active,Active,Patient is active,status
active-inpatient,Active Inpatient,Currently admitted,active
```

**Additional Column:**
- `parentCode` - Parent concept code (empty for root-level)

**Hierarchy Detection:**
- Automatic: Checks if any concept has child concepts
- If detected, includes parentCode column
- Flattens nested structure to flat table

## User Flow

### Export from List View
1. Navigate to Terminology tab
2. Hover over CodeSystem card
3. Export button appears
4. Click Export → Choose JSON or CSV
5. File downloads immediately

### Export from Editor View
1. Open CodeSystem editor
2. Click Export button in header
3. Choose JSON or CSV
4. File downloads immediately

### Filename Convention
- Based on CodeSystem name
- Sanitized (alphanumeric, hyphens, underscores only)
- Includes extension: `.json` or `.csv`
- Example: `PatientStatus.json`, `patient-status.csv`

## What's NOT Exported

✅ **Included (Terminology Only):**
- CodeSystem metadata
- All concepts (nested hierarchies preserved)
- Designations (translations, synonyms)
- Properties (concept attributes)

❌ **Excluded:**
- Constraints referencing the CodeSystem
- Advisory messages
- Usage statistics
- Project-specific metadata

This follows Phase 4A requirement: "Export terminology only (no constraints or advisories)"

## Technical Implementation Details

### File Download Mechanism
```typescript
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
```

- Creates Blob with appropriate MIME type
- Generates object URL
- Programmatically clicks hidden link
- Cleans up DOM and memory

### Hierarchy Detection
```typescript
function hasHierarchy(codeSystem: CodeSystem): boolean {
  return concepts.some(concept => 
    concept.concept && concept.concept.length > 0
  );
}
```

- Recursively checks for child concepts
- Automatically enables parentCode column if hierarchy detected

### Filename Sanitization
```typescript
function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
```

- Replaces special characters with hyphens
- Removes consecutive hyphens
- Trims leading/trailing hyphens

## Edge Cases Handled

### Export from Unsaved Changes
- ✅ Exports current in-memory state
- ✅ Includes unsaved edits
- ⚠️ User should save before exporting if they want persisted data

### Empty CodeSystem
- ✅ Exports with empty concept array
- ✅ JSON: `"concept": []`
- ✅ CSV: Only headers, no data rows

### Special Characters in Names
- ✅ Filenames sanitized (spaces → hyphens)
- ✅ CSV fields quoted if contain commas
- ✅ JSON properly escaped

### Nested Hierarchies
- ✅ JSON: Preserves full nested structure
- ✅ CSV: Flattened with parentCode column
- ✅ Deep nesting supported (recursive)

### Missing Optional Fields
- ✅ JSON: Undefined fields removed for cleaner output
- ✅ CSV: Empty cells for missing values

## Known Limitations

### 1. No Batch Export
- **Limitation:** Can only export one CodeSystem at a time
- **Workaround:** Click export for each CodeSystem individually
- **Future Enhancement:** Add "Export All" button with ZIP packaging

### 2. CSV Loses Some Data
- **Limitation:** CSV doesn't support designations, properties, meta
- **Data Loss:** Translation, synonyms, custom properties not exported
- **Workaround:** Use JSON export for complete data

### 3. No Export Configuration
- **Limitation:** Can't customize which fields to include/exclude
- **Fixed Format:** Always exports all available fields
- **Future Enhancement:** Add export options dialog

### 4. No Progress Indicator
- **Limitation:** Large CodeSystems export silently
- **UX Issue:** No feedback during processing
- **Future Enhancement:** Add loading toast for >1000 concepts

### 5. No Export History
- **Limitation:** No record of what was exported when
- **Audit Gap:** Can't track exports for compliance
- **Future Enhancement:** Add export audit log

## Testing Performed

### Manual Testing
✅ Export flat CodeSystem as JSON  
✅ Export flat CodeSystem as CSV  
✅ Export hierarchical CodeSystem as JSON (nested preserved)  
✅ Export hierarchical CodeSystem as CSV (with parentCode)  
✅ Export from list view (hover button)  
✅ Export from editor view (header button)  
✅ Filename sanitization (special chars removed)  
✅ Download triggers correctly  
✅ File format validation (JSON parseable, CSV loadable)

### Example Files Created
- `examples/export-json-example.json` - FHIR JSON format
- `examples/export-csv-flat-example.csv` - Flat CSV
- `examples/export-csv-hierarchical-example.csv` - Hierarchical CSV with parentCode

## Files Created/Modified

### Created
- `frontend/src/utils/exportCodeSystem.ts` (215 lines) - Export utilities
- `examples/export-json-example.json` - JSON export example
- `examples/export-csv-flat-example.csv` - Flat CSV example
- `examples/export-csv-hierarchical-example.csv` - Hierarchical CSV example
- `docs/PHASE_4A_EXPORT_IMPLEMENTATION.md` - This documentation

### Modified
- `frontend/src/components/terminology/CodeSystemListPanel.tsx`
  - Added Download, ChevronDown icon imports
  - Added export menu state and handlers
  - Modified CodeSystemCard to include export dropdown
  - Added hover-based export button UI

- `frontend/src/components/terminology/TerminologyManagementScreen.tsx`
  - Added export utilities import
  - Added export menu state
  - Added export handlers
  - Modified header layout to include export button

## Build Status

✅ **Frontend:** Compiles successfully  
✅ **TypeScript:** No errors  
✅ **Bundle Size:** 656 KB (slightly larger due to export utils)

## Future Enhancements

### High Priority
1. **Batch Export with ZIP:**
   - Export multiple CodeSystems as single ZIP file
   - Requires JSZip library
   - One JSON/CSV per CodeSystem in ZIP

2. **Export Options Dialog:**
   - Choose which fields to include
   - Select concept depth (limit hierarchy levels)
   - Include/exclude empty fields

### Medium Priority
1. **Export Templates:**
   - Preset export configurations
   - "Minimal" (code + display only)
   - "Complete" (all fields)
   - "Import-ready" (optimized for re-import)

2. **Export Preview:**
   - Show first few rows before downloading
   - Confirm export format looks correct
   - Estimate file size

3. **Export to Clipboard:**
   - Copy JSON/CSV to clipboard
   - Useful for quick sharing
   - No file download needed

### Low Priority
1. **Export Statistics:**
   - Show concept count, hierarchy depth
   - Estimate export time for large CodeSystems
   - Warn if >1000 concepts

2. **Export Scheduling:**
   - Schedule periodic exports
   - Email export files
   - Backup automation

3. **Custom CSV Column Order:**
   - Reorder columns in CSV export
   - Add/remove optional columns
   - Save column preferences

## Summary

Phase 4A successfully implements CodeSystem export with:
- ✅ FHIR JSON export (complete, standards-compliant)
- ✅ CSV export (flat and hierarchical)
- ✅ Terminology only (no constraints/advisories)
- ✅ UI integration (list view + editor view)
- ✅ Automatic hierarchy detection
- ✅ Clean filename generation
- ✅ Browser download trigger

The implementation provides a solid foundation for users to:
- Backup terminology data
- Share CodeSystems with other systems
- Generate human-readable documentation (CSV)
- Migrate terminologies between projects
- Archive terminology versions

Export functionality complements the import feature (Phase 4B) to provide complete import/export workflows.
