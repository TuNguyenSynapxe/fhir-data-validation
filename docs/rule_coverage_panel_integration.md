# RuleCoveragePanel Integration Guide

## Component Location
`frontend/src/components/rules/RuleCoveragePanel.tsx`

## Purpose
Reusable, read-only, collapsible panel showing validation rule coverage across FHIR R4 schema.

## Props Interface
```typescript
interface RuleCoveragePanelProps {
  resourceType: string;          // FHIR resource type (e.g., "Patient")
  schemaTree: SchemaNode[];      // FHIR schema structure
  rules: ValidationRule[];       // Active validation rules
  suggestions?: RuleSuggestion[]; // Optional rule suggestions
}
```

## Integration in Playground

### In RuleBuilder Component
```tsx
import RuleCoveragePanel from '../rules/RuleCoveragePanel';

// Inside RuleBuilder component
<div className="space-y-4">
  {/* Existing rule list */}
  <RuleList rules={rules} onEdit={...} onDelete={...} />
  
  {/* Add coverage panel */}
  <RuleCoveragePanel
    resourceType={resourceType}
    schemaTree={schemaTree}
    rules={rules}
    suggestions={suggestions}
  />
</div>
```

### In PlaygroundPage
```tsx
// Fetch schema tree (if not already available)
const [schemaTree, setSchemaTree] = useState<SchemaNode[]>([]);

useEffect(() => {
  // Fetch schema from backend
  fetch(`/api/fhir/schema/${resourceType}`)
    .then(res => res.json())
    .then(data => setSchemaTree(convertToSchemaNodes(data)));
}, [resourceType]);

// Pass to RuleBuilder
<RuleBuilder
  rules={rules}
  schemaTree={schemaTree}
  suggestions={suggestions}
  {...otherProps}
/>
```

## Features

### Collapsed State (Default)
- Single line showing coverage percentage
- Inline stats: covered, suggested, uncovered counts
- Click to expand

### Expanded State
- **Summary cards**: Total, Covered, Suggested, Uncovered
- **Match types**: Exact, Wildcard, Parent breakdown
- **Two-column layout**:
  - Left: Schema tree with coverage indicators
  - Right: Active rules + suggestions lists

### Coverage Indicators
- 🟢 Green = Covered by rule
- 🔵 Blue = Suggested rule available
- ⚫ Grey = Uncovered

### Interaction
- Hover over badges → Show tooltip with details
- Click header → Toggle expand/collapse
- Read-only: No rule creation or editing

## Data Flow
```
Props (rules, schemaTree, suggestions)
  ↓
useMemo → analyzeCoverage()
  ↓
CoverageAnalysisResult
  ↓
Render: Summary + Tree + Lists
```

## Type Conversions Needed

### From Playground Rule to ValidationRule
```typescript
// Playground Rule type
interface Rule {
  id: string;
  type: string;
  resourceType: string;
  path: string;  // This is the FHIRPath
  severity: string;
  message: string;
  params?: Record<string, any>;
}

// Convert to ValidationRule
const toValidationRule = (rule: Rule): ValidationRule => ({
  id: rule.id,
  fhirPath: rule.path,
  operator: rule.type,  // or extract from params
  value: rule.params?.value,
  message: rule.message,
});
```

### Schema Conversion
If backend schema format differs, convert to `SchemaNode[]` format:
```typescript
interface SchemaNode {
  path: string;        // Full path (e.g., "Patient.identifier")
  name: string;        // Element name
  type?: string;       // FHIR type
  cardinality?: string; // e.g., "0..1"
  children?: SchemaNode[];
}
```

## Constraints Enforced

✅ Read-only visualization (no mutations)
✅ Collapsible (collapsed by default)
✅ All data via props (no API calls)
✅ No rule creation/editing
✅ No auto-apply suggestions
✅ No bundle modification
✅ No navigation
✅ No new routes

## Styling
- Uses existing Tailwind classes
- Compact padding for embedded layout
- Responsive grid (stacks on mobile)
- Max height with scroll for rule lists

## Performance
- Coverage analysis memoized with `useMemo`
- Re-analyzes only when props change
- O(1) coverage lookups via internal map

## Example Usage in RuleBuilder.tsx
```tsx
import RuleCoveragePanel from '../rules/RuleCoveragePanel';
import type { SchemaNode, ValidationRule, RuleSuggestion } from '../../types/ruleCoverage';

// Convert playground rules to ValidationRule format
const validationRules: ValidationRule[] = rules.map(rule => ({
  id: rule.id,
  fhirPath: rule.path,
  operator: rule.type,
  message: rule.message,
}));

// Add panel at bottom of rules section
return (
  <div className="space-y-6">
    {/* Existing rule builder UI */}
    
    {/* Coverage panel */}
    <RuleCoveragePanel
      resourceType={resourceType}
      schemaTree={schemaTree}
      rules={validationRules}
      suggestions={suggestions}
    />
  </div>
);
```

## Notes
- Panel renders nothing when collapsed (performance optimization)
- Schema tree component reused from existing implementation
- Coverage engine is pure deterministic logic (no AI)
- All existing demo logic preserved and reused

---

**Status**: ✅ Ready for integration
**Location**: `frontend/src/components/rules/RuleCoveragePanel.tsx`
**Dependencies**: FhirSchemaTreeViewWithCoverage, ruleCoverageEngine, types
