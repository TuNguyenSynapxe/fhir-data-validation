# Phase 7: Error Explanation Enhancement - Quick Reference

## 🎯 What Changed

Phase 7 expands error explanations from **simple 3-field messages** to **comprehensive 6-field FHIR-aligned educational content**.

---

## 📋 Interface Evolution

### Before (Phase 6):
```typescript
interface ErrorExplanation {
  title: string;
  description: string;
  expected?: string;
}
```

### After (Phase 7):
```typescript
interface ErrorExplanation {
  title: string;                    // Short heading
  reason: string;                   // Why it happened
  whatWasFound?: string;            // Actual value
  expected?: string | string[];     // Expected value(s) - NOW ARRAY SUPPORT
  howToFix?: string;                // Actionable guidance
  note?: string;                    // FHIR educational context
}
```

---

## 🔍 Code Migration

### Registry Entry Example:

**Before:**
```typescript
INVALID_ENUM_VALUE: (details) => ({
  title: "Invalid value",
  description: `The value "${actual}" is not allowed.`,
  expected: `Expected one of: ${allowed}`
})
```

**After:**
```typescript
INVALID_ENUM_VALUE: (details) => ({
  title: "Invalid value",
  reason: `The value "${actual}" is not allowed for this field.`,
  whatWasFound: actual,
  expected: allowed.split(',').map(v => v.trim()),  // ARRAY!
  howToFix: `Choose one of: ${allowed}`,
  note: "Enum values ensure data consistency across systems."
})
```

---

## 🎨 UI Rendering

### Component: ValidationErrorExplanation

**Before (Phase 6):**
```tsx
<div>
  <div className="font-semibold">{title}</div>
  <div className="text-sm">{description}</div>
  {expected && <div className="text-sm">Expected: {expected}</div>}
</div>
```

**After (Phase 7):**
```tsx
<div className="space-y-2">
  {/* Title */}
  <div className="font-semibold text-gray-900">{title}</div>
  
  {/* Reason (main explanation) */}
  <div className="text-sm text-gray-700">{reason}</div>
  
  {/* What was found */}
  {whatWasFound && (
    <div className="text-sm">
      <span className="font-medium">What was found: </span>
      <span>{whatWasFound}</span>
    </div>
  )}
  
  {/* Expected - ARRAY SUPPORT */}
  {expected && (
    <div className="text-sm">
      <span className="font-medium">Expected: </span>
      {Array.isArray(expected) ? (
        <ul className="list-disc list-inside mt-1">
          {expected.map(val => <li>{val}</li>)}
        </ul>
      ) : (
        <span>{expected}</span>
      )}
    </div>
  )}
  
  {/* How to fix - BLUE INFO BOX */}
  {howToFix && (
    <div className="bg-blue-50 border border-blue-200 rounded p-2">
      <span className="font-medium text-blue-900">How to fix: </span>
      <span className="text-blue-800">{howToFix}</span>
    </div>
  )}
  
  {/* Note - EDUCATIONAL CONTEXT */}
  {note && (
    <div className="text-xs text-gray-600 italic border-l-2 border-gray-300 pl-2">
      {note}
    </div>
  )}
</div>
```

---

## 📊 Example: INVALID_ENUM_VALUE

### Phase 6 Output:
```
Invalid value
The value "invalid-status" is not allowed.
Expected one of: active, inactive, pending
```

### Phase 7 Output:
```
Invalid value

The value "invalid-status" is not allowed for this field.

What was found: invalid-status

Expected:
• active
• inactive
• pending

┌─────────────────────────────────────────────────┐
│ How to fix: Choose one of: active, inactive,   │
│ pending                                          │
└─────────────────────────────────────────────────┘

│ Enum values ensure data consistency across systems.
```

---

## 🏷️ All 9 Error Codes Enhanced

| Error Code | Note Content |
|------------|--------------|
| `INVALID_ENUM_VALUE` | "Enum values ensure data consistency across systems." |
| `FIXED_VALUE_MISMATCH` | "Fixed values enforce structural integrity in FHIR resources." |
| `FHIR_INVALID_PRIMITIVE` | "FHIR primitives (dates, URIs, etc.) have strict format requirements." |
| `FHIR_ARRAY_EXPECTED` | "FHIR uses arrays for fields with cardinality 0..* or 1..*." |
| `REQUIRED_FIELD_MISSING` | "Required fields have cardinality 1..1 or 1..* in FHIR." |
| `ARRAY_LENGTH_OUT_OF_RANGE` | Smart calculation: "Add X items" or "Remove Y items" |
| `RESOURCE_REQUIREMENT_VIOLATION` | "This is a project-specific requirement, not a FHIR base specification rule." |
| `VALUE_NOT_ALLOWED` | "Project rules may restrict values beyond FHIR base requirements." |
| `CODE_NOT_IN_VALUESET` | "ValueSets ensure terminology interoperability across healthcare systems." |

---

## ✅ Files Changed

### Core Registry:
- ✅ `frontend/src/validation/errorExplanationRegistry.ts`

### UI Components (6 files):
- ✅ `ValidationErrorExplanation.tsx` - Full 6-field rendering
- ✅ `GroupedErrorCard.tsx` - `description` → `reason`
- ✅ `ExplanationPanel.tsx` - `description` → `reason`
- ✅ `LintIssueCard.tsx` - `description` → `reason`
- ✅ `IssueCard.tsx` - Full structured display
- ✅ `usage.example.ts` - Updated documentation

---

## 🎯 Key Improvements

1. **Array Support**: `expected` field now handles `string[]` for enum/valueset errors
2. **Actionable Guidance**: `howToFix` provides specific steps
3. **FHIR Education**: `note` explains why the rule exists
4. **Richer Context**: `whatWasFound` shows actual invalid value
5. **Better UX**: Multi-line layout with labels, colors, borders

---

## 🚀 Quick Start

**Using the enhanced explanations:**

```typescript
import { explainError } from '@/validation';

// 1. Get explanation
const explanation = explainError(validationError);

// 2. Access all fields
const {
  title,        // "Invalid value"
  reason,       // "The value 'xyz' is not allowed..."
  whatWasFound, // "xyz"
  expected,     // ["active", "inactive"] - CAN BE ARRAY
  howToFix,     // "Choose one of: active, inactive"
  note          // "Enum values ensure data consistency..."
} = explanation;

// 3. Render in UI
<ValidationErrorExplanation error={validationError} />
```

---

## 🔒 Architecture Contract

✅ **explainError() is ONLY source** - No `error.message` access  
✅ **Never throws** - Always returns valid `ErrorExplanation`  
✅ **Type safe** - Interface enforced everywhere  
✅ **Fallback ready** - Unknown codes get meaningful defaults  

---

## 📚 Documentation

- Full details: [`PHASE_7_ERROR_EXPLANATION_COMPLETE.md`](./PHASE_7_ERROR_EXPLANATION_COMPLETE.md)
- Original spec: [`.github/copilot-instructions.md`](../.github/copilot-instructions.md)
- Architecture: [`docs/05_validation_pipeline.md`](./05_validation_pipeline.md)

---

**Phase 7 Complete** ✅  
FHIR-aligned error explanations with educational context now live!
