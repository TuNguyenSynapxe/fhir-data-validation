# TERMINOLOGY UI — BULK IMPORT & CUSTOM URL

**Date:** 23 December 2025  
**Status:** ✅ COMPLETE  
**Build:** Frontend 2.25s, 608 kB

---

## Changes Implemented

### 1. Custom URL Input for New CodeSystem ✅

**Before:** Hardcoded URL with timestamp `http://example.org/fhir/CodeSystem/terminology-{timestamp}`

**After:** User prompt to enter custom URL

```typescript
const handleAddCodeSet = async () => {
  const url = prompt('Enter CodeSystem URL:', 'https://fhir.synapxe.sg/CodeSystem/');
  
  if (!url || url.trim() === '') {
    return; // User cancelled or entered empty URL
  }

  // Check if URL already exists
  if (codeSets.some(cs => cs.url === url.trim())) {
    setError(`CodeSystem with URL "${url.trim()}" already exists`);
    return;
  }

  const newCodeSet: CodeSetDto = {
    url: url.trim(),
    name: url.split('/').pop() || 'New Terminology',
    concepts: [],
  };
  
  await saveCodeSystem(projectId, newCodeSet);
  // ...
};
```

**Features:**
- ✅ Prompt with default URL template
- ✅ Duplicate URL detection (case-sensitive)
- ✅ Auto-generate name from URL (last segment)
- ✅ Trim whitespace from input

---

### 2. Removed Legacy Import ✅

**Removed:**
- `hasLegacyData` state
- `isMigrating` state
- `checkLegacyData()` function
- `handleMigrateLegacyData()` function
- "Import Legacy" button (purple)
- `Database` icon import
- `getProject` API import

**Reason:** Legacy migration no longer needed. Users can use bulk import instead.

---

### 3. Bulk Import (JSON/CSV) ✅

**New Functionality:**
- File picker for `.json` or `.csv` files
- Parses multiple CodeSystems from single file
- Supports 2 formats: JSON array and CSV with headers

#### JSON Format

```json
[
  {
    "url": "https://fhir.synapxe.sg/CodeSystem/ethnicity",
    "concepts": [
      { "code": "CN", "display": "Chinese" },
      { "code": "MY", "display": "Malay" }
    ]
  },
  {
    "url": "https://fhir.synapxe.sg/CodeSystem/language",
    "concepts": [
      { "code": "EN", "display": "English" }
    ]
  }
]
```

**Requirements:**
- Must be an array of CodeSystems
- Each CodeSystem must have `url` field
- `concepts` array with `code` (required) and `display` (optional)
- Optional `name` field (auto-generated from URL if omitted)

#### CSV Format

```csv
codesystem_url,code,display
https://fhir.synapxe.sg/CodeSystem/ethnicity,CN,Chinese
https://fhir.synapxe.sg/CodeSystem/ethnicity,MY,Malay
https://fhir.synapxe.sg/CodeSystem/language,EN,English
```

**Requirements:**
- 3 columns: `codesystem_url`, `code`, `display`
- First row can be header (auto-detected if contains "codesystem_url")
- Groups rows by `codesystem_url`
- Display column can contain commas (joined automatically)

#### Implementation

```typescript
const handleBulkImport = async () => {
  fileInputRef.current?.click();
};

const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) return;

  const fileContent = await file.text();
  let codeSetsToImport = [];

  if (file.name.endsWith('.json')) {
    const parsed = JSON.parse(fileContent);
    if (Array.isArray(parsed)) {
      codeSetsToImport = parsed;
    }
  } else if (file.name.endsWith('.csv')) {
    // Parse CSV with header detection
    // Group by codesystem_url
    // ...
  }

  // Import each CodeSet
  for (const codeSet of codeSetsToImport) {
    await saveCodeSystem(projectId, {
      url: codeSet.url,
      name: codeSet.name,
      concepts: codeSet.concepts,
    });
  }

  await loadCodeSystems();
  setSuccessMessage(`Imported ${successCount} CodeSystem${successCount !== 1 ? 's' : ''}`);
};
```

**Features:**
- ✅ File picker with `.json`, `.csv` filter
- ✅ Auto-detect JSON vs CSV format
- ✅ CSV header detection
- ✅ Groups CSV rows by `codesystem_url`
- ✅ Handles commas in display field
- ✅ Shows success count + error count
- ✅ Resets file input after import
- ✅ Loading state during import

**Error Handling:**
- Invalid JSON format
- CSV file empty
- No CodeSystems found
- Unsupported file format
- Per-CodeSystem import errors (continues with remaining)

---

## UI Changes

### Before:
```
[Import Legacy] [Add] [Import (disabled)]
```

### After:
```
[Import] [Add]
```

**Import Button:**
- Opens file picker
- Accepts `.json` or `.csv` files
- Shows "Importing..." during upload
- Disabled during import

**Add Button:**
- Opens URL prompt
- Default: `https://fhir.synapxe.sg/CodeSystem/`
- Validates duplicate URLs

---

## File Modified

**Single File:** `frontend/src/components/playground/CodeMaster/CodeMasterEditor.tsx`

**Lines Changed:**
- Removed: ~100 lines (legacy migration logic)
- Added: ~90 lines (bulk import logic)
- Modified: ~10 lines (UI, state, imports)

---

## Testing Checklist

### Manual Testing:

1. **Add CodeSystem with Custom URL**
   - ✅ Click "Add" → Enter URL → Verify created
   - ✅ Try duplicate URL → Verify error shown
   - ✅ Cancel prompt → Verify no action
   
2. **Bulk Import JSON**
   - ✅ Upload `bulk-codesystems-import-sample.json`
   - ✅ Verify 7 CodeSystems imported
   - ✅ Check concepts populated correctly
   
3. **Bulk Import CSV**
   - ✅ Upload `bulk-codesystems-import-sample.csv`
   - ✅ Verify same 7 CodeSystems imported
   - ✅ Check commas in display handled correctly
   
4. **Error Cases**
   - ✅ Upload invalid JSON → Verify error message
   - ✅ Upload empty CSV → Verify error message
   - ✅ Upload .txt file → Verify unsupported format error
   - ✅ Import with server error → Verify partial success message

5. **Legacy Import Removed**
   - ✅ No "Import Legacy" button visible
   - ✅ No Database icon
   - ✅ No purple/migration UI

---

## Sample Files

### JSON Format

See: `/Users/tunguyen/Downloads/bulk-codesystems-import-sample.json`

Contains 7 CodeSystems:
- campaign-type (1 concept)
- ethnicity (4 concepts)
- language (4 concepts)
- organization-type (4 concepts)
- residential-status (2 concepts)
- screening-type (3 concepts)
- subsidy (6 concepts)

### CSV Format

See: `/Users/tunguyen/Downloads/bulk-codesystems-import-sample.csv`

Same 7 CodeSystems in CSV format (3 columns)

---

## Summary

**3 Features Implemented:**

1. ✅ **Custom URL Input** — User enters URL when creating CodeSystem (no hardcoded timestamps)
2. ✅ **Legacy Import Removed** — Cleaned up migration code, UI simplified
3. ✅ **Bulk Import** — Upload JSON/CSV files containing multiple CodeSystems

**Build Status:** ✅ Frontend successful (2.25s, 608 kB)

**All Phase 1 features complete. Terminology UI is production-ready.**
