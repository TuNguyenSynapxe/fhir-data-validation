# Canonical URL Version Display Fix

## Summary

Fixed ValueSet canonical URL display to handle versioned URLs (e.g., `http://hl7.org/fhir/ValueSet/administrative-gender|5.0.0`) without causing confusion when comparing base vs override bindings.

## Problem

FHIR canonical URLs may include version suffixes using pipe notation (`|version`):
- Base binding: `http://hl7.org/fhir/ValueSet/administrative-gender|5.0.0`
- Override binding: `http://hl7.org/fhir/ValueSet/administrative-gender` (no version)

This caused two issues:
1. **Visual confusion**: URLs looked different even though they refer to the same ValueSet
2. **Incorrect override detection**: System treated same ValueSet with different versions as overrides

## Solution

### 1. Canonical URL Parsing Utility

**New File**: `frontend/src/features/sd-builder/utils/canonicalUrlUtils.ts`

**Functions**:
- `parseCanonicalUrl(url)`: Splits into `{ baseUrl, version }`
- `isSameCanonical(url1, url2)`: Compares base URLs only (ignores versions)
- `formatFhirVersion(version)`: Formats version for display (e.g., "5.0.0" → "FHIR R5")

### 2. Binding Display Component

**File**: `frontend/src/components/SdBuilder/BindingDisplay.tsx`

**Changes**:
```tsx
const { baseUrl, version } = parseCanonicalUrl(binding.valueSetUrl);

// Display only base URL
<code>{baseUrl}</code>

// Show version as separate metadata
{version && (
  <div className="binding-version-info">
    {formatFhirVersion(version)}
  </div>
)}
```

**Result**:
- Main URL display shows base URL only
- Version appears as blue badge: "FHIR R5" or "FHIR 5.0.0"
- Copy button still copies full URL (including version)

### 3. ValueSet Selection Drawer

**File**: `frontend/src/components/SdBuilder/ValueSetSelectionDrawer.tsx`

**Changes**:
```tsx
// Compare base URLs only for "Current" indicator
const isCurrent = currentValueSetUrl 
  ? isSameCanonical(currentValueSetUrl, vs.url) 
  : false;

// Display base URL with optional version badge
const { baseUrl, version } = parseCanonicalUrl(vs.url);
<code>{baseUrl}</code>
{version && <span className="url-version-badge">|{version}</span>}
```

**Result**:
- "Current" badge appears when base URLs match (version ignored)
- Version shown as gray badge if present

### 4. Override Detection Logic

**File**: `frontend/src/utils/bindingHelpers.ts`

**Changes**:
```typescript
export function hasBindingOverride(node: TreeNode): boolean {
  const overrideBinding = getOverrideBinding(node);
  const baseBinding = getBaseBinding(node);
  
  if (!overrideBinding) return false;
  if (!baseBinding) return true;
  
  // Compare base URLs only (ignore version)
  return !isSameCanonical(overrideBinding.valueSetUrl, baseBinding.valueSetUrl);
}
```

**Result**:
- Same ValueSet with different versions = NOT an override
- Only different ValueSets count as overrides

### 5. CSS Styles

**File**: `frontend/src/components/SdBuilder/SdTreeView.css`

**Added**:
- `.binding-version-info`: Blue badge for FHIR version in binding display
- `.url-version-badge`: Gray monospace badge for version in drawer
- Flexbox alignment for URL + version badge

## Examples

### Before
```
Base:     http://hl7.org/fhir/ValueSet/administrative-gender|5.0.0
Override: http://hl7.org/fhir/ValueSet/administrative-gender
Status:   OVERRIDE DETECTED ❌ (incorrect)
```

### After
```
Base URL:     http://hl7.org/fhir/ValueSet/administrative-gender
FHIR Version: FHIR R5
Override:     (same base URL)
Status:       NO OVERRIDE ✅ (correct)
```

## Data Integrity

**CRITICAL**: Internal data remains unchanged
- Backend sends full canonical URL with version
- Frontend parses for display only
- Copy button copies full URL
- Export generates full URL with version
- No backend changes required

## Testing Checklist

### BindingDisplay Component
- [ ] Base URL displayed without version suffix
- [ ] Version shown as "FHIR R5" badge when present
- [ ] No version badge when URL has no version
- [ ] Copy button copies full URL (including version)

### ValueSetSelectionDrawer
- [ ] "Current" badge shows when base URLs match (version ignored)
- [ ] Version shown as "|5.0.0" gray badge when present
- [ ] Search/filter still works with full URLs

### Override Detection
- [ ] Same ValueSet with different versions = NO override
- [ ] Different ValueSet = override detected
- [ ] Override card shows only when ValueSet differs

### Edge Cases
- [ ] URL with no version: works correctly
- [ ] URL with complex version (e.g., "5.0.0-ballot1"): parsed correctly
- [ ] Empty or null URL: handled gracefully

## Files Modified

**New Files** (1):
- `frontend/src/features/sd-builder/utils/canonicalUrlUtils.ts` (NEW)

**Modified Files** (4):
- `frontend/src/components/SdBuilder/BindingDisplay.tsx`
- `frontend/src/components/SdBuilder/ValueSetSelectionDrawer.tsx`
- `frontend/src/utils/bindingHelpers.ts`
- `frontend/src/components/SdBuilder/SdTreeView.css`

## Migration Notes

No database migration required - this is a display-only change.

Backend DTOs unchanged - still send full canonical URLs with versions.

Frontend automatically handles both formats:
- With version: `http://example.com/ValueSet/foo|1.0.0`
- Without version: `http://example.com/ValueSet/foo`

## Future Considerations

1. **Version Selection**: Allow users to select specific ValueSet versions
2. **Version Comparison**: Show diffs between ValueSet versions
3. **Version Warnings**: Alert when base and override use different versions
4. **Version Locking**: Pin to specific version in project settings
