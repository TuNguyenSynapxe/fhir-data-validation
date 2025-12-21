# Validation Results Grouping Refactor

## Problem Statement

**Bug**: For grouped validation results like "Project Rule — MANDATORY_MISSING (N locations)", the UI was showing only the first error message for all locations. Each location can have a different message (e.g., "Patient.gender is required." vs "Patient.language is required."), but they were being displayed with the same generic message or collapsed incorrectly.

**Impact**: Users couldn't see the specific validation message for each location, making it impossible to understand what exactly was wrong at each path.

## Solution Overview

This refactor introduces a proper data model that:
1. **Preserves individual messages** for each validation issue within a group
2. **Groups issues correctly** by source + code + ruleId (for PROJECT rules)
3. **Renders each location's message** when the group is expanded

## Architecture

### Type System

**New Types** (`src/types/validationIssues.ts`):

```typescript
type ValidationIssue = {
  id: string;
  source: string;
  code: string;
  message: string;              // EACH ISSUE HAS ITS OWN MESSAGE
  severity: 'error' | 'warning' | 'info';
  blocking?: boolean;
  location?: string;
  breadcrumb?: string[];
  resourceType?: string;
  ruleId?: string;
  rulePath?: string;
  jsonPointer?: string;
  details?: Record<string, any>;
  navigation?: {...};
}

type IssueGroup = {
  groupId: string;
  source: string;
  code: string;
  title: string;
  severity: 'error' | 'warning' | 'info';
  blocking?: boolean;
  count: number;
  items: ValidationIssue[];      // Array of issues, each with its own message
  resourceTypes?: string[];
}
```

### Grouping Logic

**File**: `src/utils/validationGrouping.ts`

**Key Function**: `groupValidationIssues(errors: ValidationError[])`

**Grouping Strategy**:
- **PROJECT source**: Group by `source + ruleId + code`
- **Other sources**: Group by `source + code`
- **Threshold**: 2+ errors to form a group, otherwise ungrouped

**Critical Behavior**:
```typescript
// Each ValidationError is converted to ValidationIssue
// Message is PRESERVED during conversion
const issue = convertToIssue(error, index);
// issue.message = error.message (NOT replaced or shared)

// Grouping collects issues but keeps messages intact
const group: IssueGroup = {
  items: [issue1, issue2, issue3], // Each has different message
  // ...
};
```

### UI Components

#### IssueGroupCard (`src/components/playground/Validation/IssueGroupCard.tsx`)

Renders grouped validation issues.

**Header**:
- Shows group title (e.g., "Project Rule — MANDATORY_MISSING")
- Shows count (e.g., "(3 locations)")
- If all messages identical: shows the message in header
- If messages differ: shows "Multiple validation issues found. Expand to see details for each location."

**Expanded List**:
```tsx
{group.items.map((item) => (
  <div key={item.id}>
    <SmartPathBreadcrumb /> {/* Location */}
    <p>{item.message}</p>     {/* THIS ITEM'S MESSAGE */}
  </div>
))}
```

#### IssueCard (`src/components/playground/Validation/IssueCard.tsx`)

Renders single ungrouped issues.

**Structure**:
- Location breadcrumb
- Individual message
- Source + blocking badges

### Updated Components

**ValidationResultList** (`src/components/playground/Validation/ValidationResultList.tsx`):
- Uses `groupValidationIssues()` instead of old grouping logic
- Renders `IssueGroupCard` for grouped issues
- Renders `IssueCard` for ungrouped issues
- Maintains backward compatibility with `onErrorClick` callback

## Example Scenarios

### Scenario 1: Two MANDATORY_MISSING Errors

**Input**:
```json
[
  {
    "source": "Business",
    "errorCode": "MANDATORY_MISSING",
    "path": "gender",
    "message": "Patient.gender is required.",
    "details": { "ruleId": "rule-001" }
  },
  {
    "source": "Business",
    "errorCode": "MANDATORY_MISSING",
    "path": "language",
    "message": "Patient.language is required.",
    "details": { "ruleId": "rule-001" }
  }
]
```

**Output**:
```
▶ Project Rule — MANDATORY_MISSING (2 locations)
  [PROJECT] [Blocking]
  Patient (2)

  [Expanded view shows:]
  ├─ Patient › gender
  │  Patient.gender is required.
  │
  └─ Patient › language
     Patient.language is required.
```

### Scenario 2: Different RuleIds

**Input**:
```json
[
  {
    "source": "Business",
    "errorCode": "MANDATORY_MISSING",
    "path": "gender",
    "message": "Patient.gender is required.",
    "details": { "ruleId": "rule-001" }
  },
  {
    "source": "Business",
    "errorCode": "MANDATORY_MISSING",
    "path": "birthDate",
    "message": "Patient.birthDate is required.",
    "details": { "ruleId": "rule-002" }
  }
]
```

**Output**:
Two separate cards (ungrouped) because different ruleIds:
```
○ Patient › gender
  Patient.gender is required.
  [PROJECT] [Blocking]

○ Patient › birthDate
  Patient.birthDate is required.
  [PROJECT] [Blocking]
```

### Scenario 3: FHIR Structural Errors

**Input**:
```json
[
  {
    "source": "FHIR",
    "errorCode": "STRUCTURE",
    "path": "gender",
    "message": "Type checking the data: Encountered unknown element \"gender\""
  },
  {
    "source": "FHIR",
    "errorCode": "STRUCTURE",
    "path": "identifier",
    "message": "Type checking the data: Encountered unknown element \"identifier\""
  }
]
```

**Output**:
```
▶ FHIR Structural Validation — STRUCTURE (2 locations)
  [FHIR] [Non-blocking]

  [Expanded view shows:]
  ├─ Patient › gender
  │  Type checking the data: Encountered unknown element "gender"
  │
  └─ Patient › identifier
     Type checking the data: Encountered unknown element "identifier"
```

## Testing

**Test File**: `src/utils/__tests__/validationGrouping.test.ts`

**Key Tests**:
1. ✅ Preserve individual error message during conversion
2. ✅ Group errors with same source+code but preserve different messages
3. ✅ Not treat errors with different messages as duplicates
4. ✅ Handle single errors as ungrouped
5. ✅ Group by ruleId for PROJECT source
6. ✅ Handle FHIR structural errors correctly

**All tests passing**: 6/6

## Migration Guide

### For Developers

**Old Code**:
```tsx
// Old: Used GroupedErrorCard with shared message
<GroupedErrorCard
  errors={groupErrors}
  errorCode={errorCode}
  source={source}
/>
```

**New Code**:
```tsx
// New: Uses IssueGroupCard with per-item messages
<IssueGroupCard
  group={group}
  onIssueClick={handleIssueClick}
/>
```

### Backward Compatibility

- `ValidationResultList` props unchanged
- `onErrorClick` callback still receives `ValidationError` format
- Source filtering logic unchanged
- Explanations toggle still works

## Performance Considerations

- Grouping is O(n) where n = number of errors
- No virtualization needed (typical error count < 100)
- React keys use stable `issue.id` to prevent re-renders
- `hasIdenticalMessages()` check is O(n) per group

## Future Enhancements

1. **Batch Actions**: Select multiple issues and suppress/override
2. **Export**: Export grouped results to CSV/JSON
3. **Search/Filter**: Filter within expanded groups
4. **Diff View**: Compare validation results across runs
5. **Rule Preview**: Click rule path to preview rule definition

## Files Changed

**New Files**:
- `src/types/validationIssues.ts`
- `src/utils/validationGrouping.ts`
- `src/components/playground/Validation/IssueGroupCard.tsx`
- `src/components/playground/Validation/IssueCard.tsx`
- `src/utils/__tests__/validationGrouping.test.ts`

**Modified Files**:
- `src/components/playground/Validation/ValidationResultList.tsx`

**Deprecated** (can be removed after migration):
- `GroupedErrorCard.tsx` (replaced by `IssueGroupCard.tsx`)
- `ErrorCard.tsx` (replaced by `IssueCard.tsx`)

## Summary

This refactor solves the critical bug where grouped validation results showed incorrect or incomplete messages. The new architecture:

✅ **Preserves individual messages** for each validation issue  
✅ **Groups correctly** by source + code + ruleId  
✅ **Renders accurately** with per-item messages in expanded view  
✅ **Maintains compatibility** with existing code  
✅ **Fully tested** with comprehensive unit tests  

Users can now see the exact validation message for each location, making debugging and fixing validation errors much more effective.
