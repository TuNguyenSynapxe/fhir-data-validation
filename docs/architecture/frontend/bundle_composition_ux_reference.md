# Bundle Composition Error - Developer Quick Reference

**Error Code:** `RESOURCE_REQUIREMENT_VIOLATION`  
**Component:** `BundleDiffDisplay`  
**Registry Handler:** `errorExplanationRegistry.ts`

---

## 🎯 Quick Summary

Bundle composition errors now display with:
- **Clear title:** "Bundle composition does not meet project requirements"
- **Structured tables:** Expected vs Actual resources
- **Visual indicators:** ✅ OK, ❌ Error
- **Collapsible UX:** Auto-collapse if >5 resource types
- **Plain English:** No FHIR jargon

---

## 📊 UI Components

### 1. Expected Resources (Always Expanded)

Shows what the project requires:
- Resource type or filter label
- Quantity: "Exactly 1", "At least 2", etc.

### 2. Actual Bundle Contents (Collapsible)

Shows what's in the submitted bundle:
- Resource type or filter label
- Count
- Status: ✅ OK or ❌ Missing/Not allowed

**Collapse behavior:**
- Auto-collapse if >5 resource types
- Toggle text: "Show all bundle contents" / "Hide bundle contents"

### 3. Problems Detected (Always Visible)

Bullet list with ❌ indicators:
- Missing resources: "Patient is required (expected 1, found 0)"
- Unexpected resources: "Medication is not allowed in this bundle"

---

## 🔧 How to Use

### In ValidationErrorExplanation

The component automatically detects bundle composition errors:

```tsx
// Detection logic (automatic)
const isBundleComposition = 
  error.errorCode === 'RESOURCE_REQUIREMENT_VIOLATION' && 
  error.details?.expected && 
  error.details?.actual &&
  error.details?.diff;

// Rendering (automatic)
{isBundleComposition && error.details && (
  <BundleDiffDisplay
    expected={error.details.expected}
    actual={error.details.actual}
    diff={error.details.diff}
  />
)}
```

### Standalone Usage

```tsx
import { BundleDiffDisplay } from './BundleDiffDisplay';

<BundleDiffDisplay
  expected={[
    { id: 'Patient', resourceType: 'Patient', min: 1, max: 1 },
    { id: 'Encounter', resourceType: 'Encounter', min: 1, max: '*' }
  ]}
  actual={[
    { id: 'Patient', resourceType: 'Patient', count: 1 },
    { id: 'Medication', resourceType: 'Medication', count: 1 }
  ]}
  diff={{
    missing: [],
    unexpected: [
      { resourceType: 'Medication', count: 1 }
    ]
  }}
/>
```

---

## 📋 Data Contract

### Expected Resource

```typescript
interface ResourceRequirement {
  id: string;              // Unique identifier
  resourceType: string;    // FHIR resource type
  min: number;             // Minimum count
  max: number | string;    // Maximum count or '*' for unlimited
  filter?: {
    kind: string;          // 'FhirPath'
    expression: string;    // Filter expression
    label: string;         // Human-readable label
  };
}
```

### Actual Resource

```typescript
interface ActualResource {
  id: string;
  resourceType: string;
  count: number;           // How many found in bundle
  filter?: {
    kind: string;
    expression: string;
    label: string;
  };
  examples?: Array<{
    jsonPointer?: string;  // Path to resource in bundle
    fullUrl?: string | null;
    resourceId?: string | null;
  }>;
}
```

### Diff

```typescript
interface Diff {
  missing: Array<{
    expectedId?: string;
    resourceType: string;
    expectedMin?: number;
    actualCount?: number;
    filterLabel?: string;
  }>;
  unexpected: Array<{
    resourceType: string;
    count?: number;
    examples?: any[];
  }>;
}
```

---

## 🎨 Visual Indicators

| Icon | Meaning | Use Case |
|------|---------|----------|
| ✅ | OK | Resource count matches requirement |
| ❌ | Error | Missing required or unexpected resource |

**Color Coding:**
- ✅ OK: Green text (`text-green-700`)
- ❌ Error: Red text (`text-red-700`)

---

## 🔍 Filter Label Display

When a resource has a filter (e.g., `Observation where code = 'OS'`):

**Displays:** Filter label (if available) or resource type as fallback

```typescript
const getResourceLabel = (req: ResourceRequirement): string => {
  if (req.filter?.label) {
    return req.filter.label;  // e.g., "Outpatient Observation"
  }
  return req.resourceType;    // e.g., "Observation"
};
```

**Example:**
- Rule: `Observation where code = 'OS'` with label "Outpatient Observation"
- Display: "Outpatient Observation: Exactly 1"
- NOT: "Observation: Exactly 1"

---

## 📏 Required Text Format

### Cardinality Display

```typescript
const getRequiredText = (req: ResourceRequirement): string => {
  if (req.min === req.max) {
    return `Exactly ${req.min}`;
  }
  if (req.max === '*') {
    return `At least ${req.min}`;
  }
  return `${req.min} to ${req.max}`;
};
```

**Examples:**
- `min: 1, max: 1` → "Exactly 1"
- `min: 1, max: '*'` → "At least 1"
- `min: 1, max: 5` → "1 to 5"

---

## 🧪 Testing Checklist

### Visual Tests

- [ ] ✅ icon displays for matching resources
- [ ] ❌ icon displays for missing resources
- [ ] ❌ icon displays for unexpected resources
- [ ] Filter labels display instead of resource types (when available)
- [ ] Cardinality text is correct ("Exactly", "At least", "X to Y")

### Interaction Tests

- [ ] Actual Bundle Contents collapses when >5 rows
- [ ] Toggle button text changes ("Show all" ↔ "Hide")
- [ ] Clicking toggle expands/collapses section
- [ ] Problems section always visible (never collapses)

### Data Tests

- [ ] Handles missing resources correctly
- [ ] Handles unexpected resources correctly
- [ ] Handles mix of missing + unexpected
- [ ] Handles empty diff (all OK)
- [ ] Handles undefined filter labels

---

## 🚨 Common Issues

### Issue: Table doesn't collapse

**Check:**
- Actual resource count ≤ 5 (auto-expands for small bundles)
- State management in component

### Issue: Filter label not showing

**Check:**
- Backend provides `filter.label` in expected/actual
- Label is non-empty string
- Fallback to `resourceType` works

### Issue: Icons not visible

**Check:**
- Unicode support in font
- CSS not overriding text color
- Accessibility settings

---

## 📚 Related Files

- `frontend/src/components/playground/Validation/BundleDiffDisplay.tsx` - Main component
- `frontend/src/components/playground/Validation/ValidationErrorExplanation.tsx` - Integration
- `frontend/src/validation/errorExplanationRegistry.ts` - Error handler
- `docs/BUNDLE_COMPOSITION_UX_CUTOVER.md` - Full specification

---

## 💡 Key Principles

1. **No FHIR jargon** - Use "bundle structure", "project requirements", not "cardinality", "conformance"
2. **Tables over prose** - Structured data is easier to scan
3. **Visual indicators** - Icons work without color dependency
4. **Collapsible for scale** - Large bundles don't overwhelm UI
5. **Pure presentation** - No backend calls, no state mutation

---

**Last Updated:** 2 January 2026
