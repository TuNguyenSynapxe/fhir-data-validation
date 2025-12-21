# Explanation UI Visual Reference

## Quick Visual Guide

### Component Structure

```
┌─────────────────────────────────────────────────────────────┐
│ [▼] ⓘ What is this?          [🛡️ High confidence]         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌─────────────────────────────────────────────────────┐ │
│   │ This rule requires the field `Patient.gender`       │ │
│   │ to be present.                                      │ │
│   └─────────────────────────────────────────────────────┘ │
│                                                             │
│   🔧 How to fix                                            │
│   ┌─────────────────────────────────────────────────────┐ │
│   │ The field `Patient.gender` is missing or empty.     │ │
│   │ Add a value to satisfy the requirement.             │ │
│   └─────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Confidence Badge Matrix

| Confidence | Visual | Badge Color | Icon | Text |
|------------|--------|-------------|------|------|
| **High** | 🛡️ | Green (`bg-green-100`) | ShieldCheckIcon | "High confidence" |
| **Medium** | ⚠️ | Yellow (`bg-yellow-100`) | ExclamationTriangleIcon | "Medium confidence" |
| **Low** | ⚠️ | Gray (`bg-gray-100`) | ExclamationTriangleIcon | "Low confidence — review recommended" |

## Section Colors

| Section | Background | Border | Icon | Purpose |
|---------|------------|--------|------|---------|
| **What** | Blue-tinted (`bg-blue-50/50`) | `border-blue-100` | InformationCircleIcon | Describes the issue |
| **How** | Green-tinted (`bg-green-50/50`) | `border-green-100` | WrenchScrewdriverIcon | Provides fix guidance |

## Example Scenarios

### 1. High Confidence with Metadata

**Required Rule**
```
[▼] ⓘ What is this?                    [🛡️ High confidence]
┌────────────────────────────────────────────────────────┐
│ This rule requires the field `Patient.gender`         │
│ to be present.                                         │
└────────────────────────────────────────────────────────┘

🔧 How to fix
┌────────────────────────────────────────────────────────┐
│ The field `Patient.gender` is missing or empty in     │
│ this resource.                                         │
│ Add a value to satisfy the requirement.               │
└────────────────────────────────────────────────────────┘
```

**FixedValue Rule**
```
[▼] ⓘ What is this?                    [🛡️ High confidence]
┌────────────────────────────────────────────────────────┐
│ This rule enforces a fixed value for                  │
│ `Patient.gender` to ensure consistent data.           │
└────────────────────────────────────────────────────────┘

🔧 How to fix
┌────────────────────────────────────────────────────────┐
│ Expected value: male                                   │
│ Actual value: female                                   │
│ Update the field to match the expected value.         │
└────────────────────────────────────────────────────────┘
```

### 2. Medium Confidence

**CodeSystem Rule**
```
[▼] ⓘ What is this?                    [⚠️ Medium confidence]
┌────────────────────────────────────────────────────────┐
│ This rule ensures `Patient.maritalStatus.coding`      │
│ uses codes from the correct code system.              │
└────────────────────────────────────────────────────────┘

🔧 How to fix
┌────────────────────────────────────────────────────────┐
│ Expected code system:                                  │
│ http://terminology.hl7.org/CodeSystem/v3-MaritalStatus│
│ Verify that `coding.system` and `coding.code` are     │
│ valid.                                                 │
└────────────────────────────────────────────────────────┘
```

### 3. Low Confidence (with "How")

**CustomFHIRPath Rule**
```
[▼] ⓘ What is this?    [⚠️ Low confidence — review recommended]
┌────────────────────────────────────────────────────────┐
│ This rule validates a project-specific condition      │
│ involving `Patient.contact`.                           │
└────────────────────────────────────────────────────────┘

🔧 How to fix
┌────────────────────────────────────────────────────────┐
│ The condition defined for this rule is not satisfied. │
│ Review the related data and ensure the condition is   │
│ met.                                                   │
└────────────────────────────────────────────────────────┘
```

### 4. Low Confidence (without "How")

**LINT Issue**
```
[▼] ⓘ What is this?    [⚠️ Low confidence — review recommended]
┌────────────────────────────────────────────────────────┐
│ This is a best-effort quality check to improve        │
│ portability and correctness.                           │
└────────────────────────────────────────────────────────┘

(No "How to fix" section — backend didn't provide it)
```

### 5. High Confidence (without "How")

**FHIR Structural**
```
[▼] ⓘ What is this?                    [🛡️ High confidence]
┌────────────────────────────────────────────────────────┐
│ This issue was detected during FHIR structural        │
│ validation.                                            │
└────────────────────────────────────────────────────────┘

(No "How to fix" section — backend didn't provide it)
```

## Collapsed State

```
[►] ⓘ What is this?                    [🛡️ High confidence]
```

- Chevron right (►) indicates collapsed
- Badge always visible (even when collapsed)
- Users can quickly scan confidence levels

## Interactive Behavior

### Expand/Collapse
- **Click header**: Toggles expansion state
- **Event propagation**: `e.stopPropagation()` prevents parent click handlers
- **Initial state**:
  - **Expanded**: FHIR, Business, Reference (high-value)
  - **Collapsed**: LINT, SpecHint (advisory)

### Multiline Support
- Backend can format text with line breaks (`\n`)
- Frontend uses `whitespace-pre-line` to preserve formatting
- Example:
  ```
  Expected value: male
  Actual value: female
  Update the field to match.
  ```

## Icon Usage

### Heroicons (@heroicons/react/24/outline)
- **InformationCircleIcon** (ⓘ): "What is this?" section
- **WrenchScrewdriverIcon** (🔧): "How to fix" section
- **ShieldCheckIcon** (🛡️): High confidence badge
- **ExclamationTriangleIcon** (⚠️): Medium/low confidence badge

### Lucide React (lucide-react)
- **ChevronDown/ChevronRight**: Expand/collapse indicators
- **AlertCircle/AlertTriangle/Info**: Severity icons (not in explanation section)

## Accessibility

- **ARIA labels**: Not needed (text is visible)
- **Color contrast**: All badges meet WCAG AA standards
- **Keyboard navigation**: Button is focusable and keyboard-accessible
- **Screen readers**: Badge text clearly conveys confidence level

## Responsive Design

- **Mobile**: Same layout, full-width sections
- **Tablet/Desktop**: Badge aligned right, sections maintain readability
- **Wrapping**: Badge wraps below header on very narrow screens

## Dark Mode (Future)

Tailwind classes are designed for easy dark mode support:
```css
dark:bg-blue-900/20 dark:border-blue-800
dark:bg-green-900/20 dark:border-green-800
```

---

**Last Updated**: 2024-12-21
**Related**: EXPLANATION_UI_REFACTOR.md
