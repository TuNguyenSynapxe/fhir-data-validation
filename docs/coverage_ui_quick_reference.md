# Rule Coverage Tree UI - Quick Reference

## 🎯 What Was Built

Enhanced FHIR schema tree with **read-only** coverage visualization. Shows which schema nodes are covered by validation rules.

## 📦 New Components

### 1. **CoverageStatusBadge**
Small colored dot + icon indicating coverage status:
- 🟢 Green = Covered by rule
- 🔵 Blue = Suggested rule available  
- ⚫ Grey = Uncovered

**Match type icons**:
- ✓ Checkmark = Exact match
- ★ Star = Wildcard match  
- ↑ Arrow = Parent coverage

### 2. **CoverageTooltip**
Hover tooltip showing:
- Coverage status
- Match type
- Rule/suggestion path
- Field metadata
- Reason

### 3. **FhirSchemaTreeViewWithCoverage**
Enhanced tree component:
- Original tree functionality preserved
- Coverage badges next to each node
- Tooltips on hover
- Coverage legend in header
- Accepts optional `coverageNodes` prop

### 4. **CoverageDemo**
Demo page at `/coverage-demo` showing:
- Coverage summary statistics
- Match type breakdown
- Live tree with mock coverage
- Active rules and suggestions

## 🚀 Usage

```tsx
import FhirSchemaTreeViewWithCoverage from './components/FhirSchemaTreeViewWithCoverage';
import { analyzeCoverage } from './utils/ruleCoverageEngine';

// Analyze coverage
const result = analyzeCoverage({
  resourceType: 'Patient',
  schemaTree: mySchemaTree,
  existingRules: myRules,
  suggestions: mySuggestions,
});

// Render tree with coverage
<FhirSchemaTreeViewWithCoverage
  resourceType="Patient"
  onSelectPath={handlePathSelect}
  coverageNodes={result.nodes}
/>
```

## 🎨 Visual Design

### Color Coding
- **Green badges**: Node has validation rule
- **Blue badges**: Suggested rule exists (not created yet)
- **Grey badges**: No coverage

### Interaction
- **Hover badge** → Show detailed tooltip
- **Click node** → Select FHIRPath (original behavior)
- **Expand/collapse** → Navigate tree (original behavior)

### Layout
```
[▼] [🟢✓] identifier.system      uri        0..1
     ↑    ↑
     │    └─ Coverage badge + match icon
     └────── Expand icon
```

## 📊 Coverage Summary

Available from `analyzeCoverage()`:
- `totalNodes`: Total schema nodes
- `coveredNodes`: Nodes with rules
- `suggestedNodes`: Nodes with suggestions
- `uncoveredNodes`: Nodes without coverage
- `coveragePercentage`: Coverage percentage (0-100)
- `exactMatches`: Count of exact matches
- `wildcardMatches`: Count of wildcard matches
- `parentMatches`: Count of parent matches

## 🔍 Match Types Explained

### Exact Match
Rule path = Schema path
```
Rule:   identifier.system
Schema: identifier.system
✓ Exact match
```

### Wildcard Match
Rule has `[*]`, schema doesn't
```
Rule:   name[*].family
Schema: name.family
★ Wildcard match
```

### Parent Match
Rule covers parent of schema path
```
Rule:   identifier
Schema: identifier.system
↑ Parent coverage
```

## 🧪 Testing

### Unit Tests
Run: `npm test ruleCoverageEngine.test.ts`

Tests cover:
- FHIRPath normalization (9 test suites)
- Coverage analysis (9 test suites)
- Match priority (exact > wildcard > parent)
- Conflict resolution (covered > suggested)

### Visual Demo
Visit: `http://localhost:5173/coverage-demo`

Shows:
- All coverage states
- All match types
- Interactive tree
- Real coverage data

## 🏗️ Architecture

### Data Flow
```
ValidationRules + Suggestions
        ↓
analyzeCoverage() [Engine]
        ↓
CoverageNode[] [Result]
        ↓
FhirSchemaTreeViewWithCoverage [UI]
        ↓
CoverageTooltip + CoverageStatusBadge [Display]
```

### No Business Logic in UI
- UI components are **pure presentational**
- All logic in `ruleCoverageEngine.ts`
- Coverage data passed via props
- No API calls in UI components

## ⚙️ Configuration

### With Coverage (Recommended)
```tsx
<FhirSchemaTreeViewWithCoverage
  resourceType="Patient"
  onSelectPath={handleSelect}
  coverageNodes={coverageResult.nodes}  // ← Pass coverage
/>
```

### Without Coverage (Fallback)
```tsx
<FhirSchemaTreeViewWithCoverage
  resourceType="Patient"
  onSelectPath={handleSelect}
  // coverageNodes omitted → No badges shown
/>
```

## 📝 Files Created

1. `components/CoverageStatusBadge.tsx` - Badge component
2. `components/CoverageTooltip.tsx` - Tooltip component
3. `components/FhirSchemaTreeViewWithCoverage.tsx` - Enhanced tree
4. `pages/CoverageDemo.tsx` - Demo page
5. `utils/ruleCoverageEngine.test.ts` - Unit tests
6. `docs/coverage_ui_implementation.md` - Full documentation

## 🔗 Integration Points

### Where to Use

**Rule Builder/Editor**:
```tsx
// Show coverage alongside rule creation
const coverage = analyzeCoverage(...);
<FhirSchemaTreeViewWithCoverage coverageNodes={coverage.nodes} />
```

**Project Dashboard**:
```tsx
// Display coverage summary
<div>Coverage: {coverage.summary.coveragePercentage}%</div>
```

**Validation Results**:
```tsx
// Highlight uncovered nodes
const uncovered = getUncoveredNodes(coverageResult);
```

## ⚠️ Constraints

✅ Read-only visualization only
✅ No rule creation from tree
✅ No modification of existing rules
✅ No popups or modals
✅ No API calls in UI
✅ Coverage data from props

## 🎯 Next Steps (Optional)

- [ ] Integrate into main playground UI
- [ ] Add coverage goals/targets
- [ ] Export coverage reports
- [ ] Track coverage over time
- [ ] Filter tree by coverage status
- [ ] Coverage diff view

---

**Demo**: http://localhost:5173/coverage-demo  
**Status**: ✅ Complete and tested  
**Phase**: Phase 6 - Rule Coverage Engine
