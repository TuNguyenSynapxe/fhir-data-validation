# Binding Explanation Registry - Quick Reference

## Purpose
Single source of truth for all ValueSet binding explanations across the frontend UI.

---

## Import

```typescript
import { 
  getBindingExplanation, 
  isPreviewable 
} from '../../constants/bindingExplanations';
```

---

## API

### `getBindingExplanation(previewability: ValueSetPreviewability): BindingExplanationData`

Returns explanation data for a given previewability type.

**Example**:
```typescript
const previewability = getPreviewability(valueSet);
const explanation = getBindingExplanation(previewability);

console.log(explanation.label);           // "Enumerated" | "Computed" | "External Standard" | "Complex"
console.log(explanation.tone);            // "info" | "neutral" | "warning"
console.log(explanation.description);     // Full description text
console.log(explanation.authorGuidance);  // Guidance for authors
```

---

### `isPreviewable(previewability: ValueSetPreviewability): boolean`

Returns `true` if the ValueSet can be previewed offline (Explicit or Computed).

**Example**:
```typescript
const previewability = getPreviewability(valueSet);

if (isPreviewable(previewability)) {
  // Show preview button
  return <button onClick={handlePreview}>Preview Codes</button>;
} else {
  // Show explanation label
  const explanation = getBindingExplanation(previewability);
  return <span>{explanation.label}</span>;
}
```

---

## Previewability Types

| Type | Label | Tone | Preview? | Use Case |
|------|-------|------|----------|----------|
| **Explicit** | Enumerated | info | ✅ Yes | Codes explicitly listed in ValueSet |
| **Computed** | Computed | info | ✅ Yes | Derived from HL7 CodeSystems |
| **External** | External Standard | neutral | ❌ No | BCP-47, IANA, ISO standards |
| **Unsupported** | Complex | warning | ❌ No | Advanced FHIR logic (filters/excludes) |

---

## Usage Examples

### Tree Tooltip
```typescript
// BindingTooltip.tsx
const explanation = getBindingExplanation(previewability);
const previewAvailable = isPreviewable(previewability);

return (
  <div className="binding-tooltip">
    <div className="binding-tooltip-row">
      <span>Type:</span>
      <span>{explanation.label}</span>
    </div>
    <div className="binding-tooltip-row">
      <span>Preview:</span>
      <span>{previewAvailable ? 'Available offline' : 'Not available offline'}</span>
    </div>
  </div>
);
```

---

### Details Panel
```typescript
// BindingDisplay.tsx
const explanation = getBindingExplanation(previewability);

if (!isPreviewable(previewability)) {
  return `${explanation.label} - ${explanation.description}`;
}
```

---

### Search Drawer Badge
```typescript
// ValueSetSelectionDrawer.tsx
const explanation = getBindingExplanation(previewability);
const toneClass = `previewability-${explanation.tone}`;

return (
  <span 
    className={`previewability-badge ${toneClass}`} 
    title={explanation.description}
  >
    {explanation.label}
  </span>
);
```

---

### Empty State
```typescript
// ValueSetPreviewEmptyState.tsx
const explanation = getBindingExplanation(previewability);

return (
  <div className="empty-state-explanation">
    <h4>{explanation.label}</h4>
    <p>{explanation.description}</p>
    <p className="hint">💡 {explanation.authorGuidance}</p>
  </div>
);
```

---

## CSS Classes

### Tone-based Styling (Recommended)
```css
.previewability-badge.previewability-info {
  background: #dbeafe;
  color: #1e40af;
}

.previewability-badge.previewability-neutral {
  background: #f3f4f6;
  color: #4b5563;
}

.previewability-badge.previewability-warning {
  background: #fef3c7;
  color: #92400e;
}
```

### Legacy Classes (Backward Compatibility)
- `.previewability-explicit` - Green (Enumerated)
- `.previewability-computed` - Blue (Computed)
- `.previewability-external` - Gray (External Standard)
- `.previewability-unsupported` - Amber (Complex)

---

## Testing Scenarios

### Test with External ValueSet (e.g., `all-languages`)
```typescript
// Should show:
// Label: "External Standard"
// Description: "References external standards (BCP-47, IANA, ISO)..."
// Tone: neutral (gray badge)
// No preview button
```

### Test with Explicit ValueSet (e.g., `administrative-gender`)
```typescript
// Should show:
// Label: "Enumerated"
// Description: "Codes are explicitly listed in this ValueSet."
// Tone: info (blue badge)
// Preview button available
```

### Test with Unsupported ValueSet (SNOMED with filters)
```typescript
// Should show:
// Label: "Complex"
// Description: "Uses advanced FHIR logic..."
// Tone: warning (amber badge)
// No preview button
```

---

## Migration Notes

### Before (Hardcoded)
```typescript
// ❌ OLD: Scattered switch statements
switch (previewability) {
  case 'Explicit': return 'Explicit codes';
  case 'External': return 'External standard';
  // ...
}
```

### After (Registry)
```typescript
// ✅ NEW: Single source of truth
const explanation = getBindingExplanation(previewability);
return explanation.label;
```

---

## Benefits

### 1. **Consistency**
All components use the same labels and descriptions.

### 2. **Maintainability**
Update once in registry, applies everywhere.

### 3. **Type Safety**
TypeScript ensures correct previewability values.

### 4. **DRY Principle**
No duplicate code across components.

### 5. **Educational Tone**
Neutral/info tones for External standards, not alarming red.

---

## Common Patterns

### Conditional Preview Button
```typescript
{isPreviewable(previewability) && (
  <button onClick={onPreview}>Preview Codes</button>
)}
```

### Contextual Empty Message
```typescript
if (!preview || preview.codes.length === 0) {
  if (!isPreviewable(previewability)) {
    const explanation = getBindingExplanation(previewability);
    return `${explanation.label} - ${explanation.description}`;
  }
  return 'No codes returned';
}
```

### Dynamic Badge with Tooltip
```typescript
const explanation = getBindingExplanation(previewability);
return (
  <span 
    className={`badge previewability-${explanation.tone}`}
    title={explanation.description}
  >
    {explanation.label}
  </span>
);
```

---

## Do's and Don'ts

### ✅ Do
- Use `getBindingExplanation()` for all labels
- Use `isPreviewable()` to conditionally show preview buttons
- Use tone-based CSS classes for styling
- Show `authorGuidance` in empty states

### ❌ Don't
- Hardcode labels like "External standard" or "No preview"
- Show preview buttons for External/Unsupported ValueSets
- Use red error styling for External standards
- Create duplicate explanation logic

---

## Troubleshooting

### Issue: Wrong label showing
**Solution**: Verify `getPreviewability()` is called correctly from ValueSetSummary

### Issue: Preview button showing for External
**Solution**: Wrap button in `{isPreviewable(previewability) && ...}`

### Issue: Generic "No codes available" message
**Solution**: Use `getBindingExplanation()` with conditional logic

---

## Related Files

- Registry: `frontend/src/constants/bindingExplanations.ts`
- Components:
  - `BindingTooltip.tsx`
  - `BindingDisplay.tsx`
  - `ValueSetSelectionDrawer.tsx`
  - `ValueSetPreviewEmptyState.tsx`
  - `ValueSetPicker.tsx`
- CSS: `SdTreeView.css`

---

## Questions?

See [EPIC_1_IMPLEMENTATION_SUMMARY.md](./EPIC_1_IMPLEMENTATION_SUMMARY.md) for full implementation details.
