# Non-Blocking Warnings for Unobserved Paths

## Overview
Implemented comprehensive non-blocking warning system to inform users when rules target paths that don't exist in the validated bundle. These warnings are informational only and do not prevent editing or applying rules.

## Key Features

### 1. Visual Warning Indicators

#### Collapsed Rule Row Badge
**Display**: Amber badge with AlertTriangle icon
**Text**: "Not in bundle"
**Placement**: Next to rule path in collapsed row
**Tooltip**: "Path not found in bundle - rule won't trigger on current data"

**Purpose**:
- Immediate visual feedback at a glance
- Non-intrusive warning badge
- Clearly distinguishes from error states

#### Expanded Card Warning Panel
**Full Warning Card** displaying:
```
⚠ Path Not Found in Bundle

The path Patient.customField does not exist in your current bundle.
This rule will not trigger on your sample data.

Note: This is not an error. The rule may apply to:
• Optional fields not present in this submission
• Future data scenarios you want to validate
• Fields from templates or reference implementations
```

**Styling**:
- Amber background (`bg-amber-50`)
- Amber border (`border-amber-200`)
- AlertTriangle icon
- Code-formatted path display

### 2. Summary Warning in Banner

**Collapsible Warning Section** in Validated state banner:

#### Collapsed State:
```
⚠️ Non-Blocking Warning: 3 of 8 rule(s) target paths not in bundle.
These rules won't trigger on current data but remain valid for 
future submissions. You can continue editing without restrictions.

[Show affected rules (3)]
```

#### Expanded State:
```
⚠️ Non-Blocking Warning: 3 of 8 rule(s) target paths not in bundle.
These rules won't trigger on current data but remain valid for 
future submissions. You can continue editing without restrictions.

[Hide affected rules (3)]

Patient.customExtension → Custom extension validation
Observation.device → Device reference must exist
Condition.recorder.extension → Recorder extension required
```

**Features**:
- Click to expand/collapse affected rules list
- Shows full path and rule message for each
- Scrollable list (max-height: 10rem)
- Amber styling throughout

### 3. Observation Status Filter

**New Filter Option** (only visible when validated):

Dropdown: "All Rules | ● Observed in bundle | ○ Not in bundle"

**Functionality**:
- Filter to show only rules with observed paths
- Filter to show only rules with unobserved paths
- Dynamically updates as bundle changes
- Appears in 5-column layout when enabled

**Use Cases**:
- Quickly review unobserved rules
- Focus on rules that will trigger on current data
- Audit rule coverage across bundle

### 4. Dynamic Updates

**Auto-Refresh Triggers**:
1. Bundle content changes
2. Rules added/edited/deleted
3. Validation re-run
4. Project bundle updated

**Memoization**:
- Bundle analysis cached with `useMemo`
- Only recalculates when bundle changes
- Efficient Set-based path lookups

## Implementation Details

### Component Updates

#### RulesPanel.tsx
**New Features**:
- Bundle analysis with path extraction
- `isRulePathObserved()` function
- `ruleAlignmentStats` with observed/not-observed counts
- Collapsible affected rules list
- Observation status filter integration

**State**:
```typescript
const ruleAlignmentStats = useMemo(() => {
  const observed = rules.filter(r => isRulePathObserved(r)).length;
  const notObserved = rules.length - observed;
  return { observed, notObserved, total: rules.length };
}, [rules, bundleAnalysis]);
```

#### RuleRow.tsx
**New Features**:
- Warning badge in collapsed row
- Pass `isObserved` to RuleCardExpanded
- Updated memo comparison to include `isObserved`

**Visual**:
```tsx
{isObserved === false && (
  <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-50 
    border border-amber-200 rounded text-amber-700">
    <AlertTriangle className="w-3 h-3" />
    <span className="text-xs font-medium">Not in bundle</span>
  </div>
)}
```

#### RuleCardExpanded.tsx
**New Features**:
- Full warning panel with detailed explanation
- Code-formatted path display
- List of common scenarios
- Amber-themed styling

#### RuleFilters.tsx
**New Features**:
- `observationStatus` filter state
- `showObservationFilter` prop
- Dynamic grid layout (4 or 5 columns)
- Observation status dropdown

### Warning Message Strategy

**Non-Blocking Language**:
- ✅ "Non-Blocking Warning"
- ✅ "You can continue editing without restrictions"
- ✅ "This is not an error"
- ✅ "may be useful for future submissions"

**Avoiding Blocking Language**:
- ❌ "Must fix"
- ❌ "Error"
- ❌ "Cannot proceed"
- ❌ "Invalid"

### User Education

**Explanations Include**:
1. **What it means**: Path not in current bundle
2. **Why it's okay**: Rules can apply to future data
3. **Common scenarios**: Optional fields, templates, future cases
4. **Action not required**: Informational only

## User Experience Flow

### Discovery Path:
1. **User validates bundle** → ValidationState becomes Validated
2. **Some rules don't match bundle** → Warnings appear
3. **Banner shows summary** → "3 of 8 rules target paths not in bundle"
4. **User clicks Show** → See full list of affected rules
5. **User sees warning badges** → Next to each unobserved rule
6. **User expands rule** → Full explanation in card
7. **User filters rules** → Can isolate unobserved rules

### Information Hierarchy:

#### Level 1: Banner Summary (Most Visible)
- Total count of unobserved rules
- "Non-blocking" emphasized
- Collapsible detail list

#### Level 2: Row Badge (Scannable)
- Badge next to each unobserved rule
- Quick visual indicator
- Tooltip on hover

#### Level 3: Expanded Card (Detailed)
- Full warning panel
- Specific path information
- Educational content
- Common scenarios

#### Level 4: Filter (Action)
- Isolate unobserved rules
- Review and audit
- Optional workflow

## Design Principles

### 1. Non-Blocking First
- Never prevent user actions
- Always allow rule creation/editing
- Treat as informational, not error

### 2. Progressive Disclosure
- Summary visible by default
- Details available on demand
- Full explanation in expanded view

### 3. Clear Language
- "Non-blocking" explicitly stated
- "You can continue" reassurance
- "This is not an error" clarification

### 4. Contextual Help
- Explain why path might not exist
- List common valid scenarios
- Educate about optional fields

### 5. Visual Consistency
- Amber for warnings (not red for errors)
- AlertTriangle icon (not XCircle)
- Badges and panels use same styling

## Edge Cases Handled

### No Unobserved Rules
- No warning banner shown
- Success message: "✓ All X rule(s) aligned"
- Filter still available but less relevant

### All Rules Unobserved
- Warning shows all rules listed
- User sees comprehensive list
- Can still proceed with confidence

### Bundle Without Entries
- All rules marked as unobserved
- Warning appears but non-blocking
- User can add data later

### Mixed Observed/Unobserved
- Clear count in banner
- Visual indicators distinguish
- Filter helps separate them

### Dynamic Bundle Changes
- Warnings update automatically
- Bundle analysis re-runs
- Indicators refresh in real-time

## Integration with Existing Features

### Validation State Machine
- Warnings only appear in `Validated` state
- Not shown in `NoBundle`, `NotValidated`, or `Failed`
- Tied to successful validation

### Observation Indicators (●/○)
- Warnings complement the indicators
- ○ (not observed) triggers warning
- ● (observed) no warning needed

### Rule Editing
- Warnings don't block editing
- User can create rules for any path
- Flexibility preserved

### Alignment Statistics
- Warning uses same stats calculation
- Counts feed into banner message
- Consistent with legend

## Benefits

### 1. Informed Decisions
Users understand which rules will trigger without being blocked from creating rules for future scenarios.

### 2. Transparency
Clear visibility into rule-bundle alignment without hiding information or treating it as an error.

### 3. Flexibility
Users can define rules for optional fields, future data, or reference implementations without resistance.

### 4. Education
Explanations help users understand FHIR flexibility and the purpose of validation rules.

### 5. Confidence
Non-blocking language and reassurance prevent user anxiety about "warnings" that are actually expected.

## Technical Implementation

### Path Detection Algorithm
```typescript
const isRulePathObserved = (rule: Rule): boolean => {
  const fullPath = `${rule.resourceType}.${rule.path}`;
  return bundleAnalysis.observedPaths.has(fullPath) || 
         bundleAnalysis.observedPaths.has(rule.path);
};
```

### Statistics Calculation
```typescript
const ruleAlignmentStats = useMemo(() => {
  const observed = rules.filter(r => isRulePathObserved(r)).length;
  const notObserved = rules.length - observed;
  return { observed, notObserved, total: rules.length };
}, [rules, bundleAnalysis]);
```

### Filter Application
```typescript
if (filters.observationStatus && validationState === Validated) {
  const isObserved = isRulePathObserved(rule);
  if (filters.observationStatus === 'observed' && !isObserved) return false;
  if (filters.observationStatus === 'not-observed' && isObserved) return false;
}
```

### Collapsible Detail
```typescript
const [showDetails, setShowDetails] = useState(false);
const unobservedRules = rules.filter(r => !isRulePathObserved(r));
```

## Testing Checklist

### Visual Testing:
- [ ] Warning badge appears next to unobserved rules
- [ ] Banner shows correct count of unobserved rules
- [ ] Collapsible list expands/collapses correctly
- [ ] Expanded card shows full warning panel
- [ ] Amber styling consistent throughout
- [ ] AlertTriangle icons display correctly

### Functional Testing:
- [ ] Warnings appear only when validated
- [ ] Warnings don't block rule editing
- [ ] Observation filter isolates unobserved rules
- [ ] Filter shows "All Rules | ● Observed | ○ Not in bundle"
- [ ] Warnings update when bundle changes
- [ ] Warnings update when rules change

### Edge Cases:
- [ ] All rules observed → No warning, success message
- [ ] All rules unobserved → Warning shows all
- [ ] No rules defined → No warning
- [ ] Empty bundle → All rules unobserved
- [ ] Bundle with no entries → All unobserved

### Language Testing:
- [ ] "Non-blocking" clearly visible
- [ ] "You can continue" reassurance present
- [ ] "This is not an error" in expanded view
- [ ] Educational content explains scenarios

## Summary

This implementation provides **comprehensive non-blocking warnings** for unobserved paths:
- **Visual indicators** at multiple levels (banner, badge, card)
- **Progressive disclosure** from summary to detail
- **Clear language** emphasizing non-blocking nature
- **Filter option** to isolate and review unobserved rules
- **Educational content** explaining why paths might not exist
- **Dynamic updates** when bundle or rules change

Users **understand relevance without losing flexibility** to define rules for future scenarios, optional fields, or reference implementations.
