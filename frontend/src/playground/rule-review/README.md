# Rule Review (v1) - Advisory Static Analysis

## ⚠️ CRITICAL: Advisory-Only Module

**Rule Review is NON-BLOCKING and ADVISORY ONLY**

This module provides static analysis feedback on rule authoring quality. It:
- ✅ Helps authors improve rule quality
- ✅ Detects common issues early
- ✅ Provides educational feedback

It does **NOT**:
- ❌ Block validation execution
- ❌ Block rule editing or saving
- ❌ Replace Firely validation
- ❌ Act as a gatekeeper
- ❌ Generate 'error' level issues

All issues are either `info` or `warning` level.

---

## Architecture

```
src/playground/rule-review/
├── index.ts                 # Public API exports
├── ruleReviewTypes.ts       # Type definitions
├── ruleReviewEngine.ts      # Core review logic
├── ruleReviewUtils.ts       # Helper functions
├── examples.ts              # Usage examples
├── hooks/
│   └── useRuleReview.ts     # React hook for UI integration
└── README.md                # This file
```

**Zero dependencies on:**
- Validation pipeline
- Firely validation logic
- FHIRPath execution
- UI components

---

## Usage

### Basic Usage

```typescript
import { reviewRules } from '@/playground/rule-review';

const result = reviewRules(rules, bundleJson);

result.issues.forEach(issue => {
  console.log(`[${issue.severity}] ${issue.message}`);
});
```

### With Utilities

```typescript
import { reviewRules, getIssueCounts, filterIssuesBySeverity } from '@/playground/rule-review';

const result = reviewRules(rules, bundleJson);

// Get counts
const counts = getIssueCounts(result);
console.log(`Warnings: ${counts.warning}, Info: ${counts.info}`);

// Filter by severity
const warnings = filterIssuesBySeverity(result, 'warning');
```

### Without Bundle

```typescript
// Review works without bundle (limited checks)
const result = reviewRules(rules);

// Only duplicate detection and array handling checks will run
console.log(`Issues found: ${result.issues.length}`);
```

---

## Checks Implemented (v1)

### 1. PATH_NOT_OBSERVED (info)
- **Detects:** Rule path not found in current bundle
- **Requires:** Bundle context
- **Severity:** `info`
- **Message:** `"Path 'X' not found in current bundle"`

**Why info?** Path may be conditional or optional. Rule still executes at runtime.

### 2. RESOURCE_NOT_PRESENT (info)
- **Detects:** Rule targets resource type not in bundle
- **Requires:** Bundle context
- **Severity:** `info`
- **Message:** `"Resource type 'X' not present in current bundle"`

**Why info?** Rule may apply to other bundles. Not an authoring error.

### 3. DUPLICATE_RULE (warning)
- **Detects:** Multiple rules with same path, type, message, and severity
- **Requires:** Nothing (always runs)
- **Severity:** `warning`
- **Message:** `"Rule appears to be duplicated"`

**Why warning?** Likely unintentional. Author may want to consolidate.

### 4. ARRAY_HANDLING_MISSING (info)
- **Detects:** Rule targets array path without explicit indexing
- **Requires:** Nothing (always runs)
- **Severity:** `info`
- **Message:** `"Path 'X' targets an array without explicit indexing"`

**Why info?** May be intentional (apply to all elements). Just informational.

---

## API Reference

### `reviewRules(rules, bundleJson?)`

Performs static analysis on a ruleset.

**Parameters:**
- `rules: Rule[]` - Array of rules to review
- `bundleJson?: string` - Optional FHIR Bundle JSON for context

**Returns:** `RuleReviewResult`

**Behavior:**
- Pure function (no side effects)
- Deterministic (same input → same output)
- Never throws
- Tolerates invalid input
- Returns empty issues array if nothing detected

### `getIssueCounts(result)`

Gets issue counts grouped by severity.

**Returns:**
```typescript
{
  info: number;
  warning: number;
  total: number;
}
```

### `filterIssuesBySeverity(result, severity)`

Filters issues by severity level.

**Returns:** `RuleReviewIssue[]`

---

## Future UI Integration (TODO)

### Planned Hook

```typescript
function useRuleReview(
  rules: Rule[],
  bundleJson?: string,
  options?: {
    enabled?: boolean;
    debounceMs?: number;
  }
): RuleReviewResult
```

### Planned UI Components

1. **Advisory Badge** (Rules tab)
   - Shows issue count
   - Non-blocking
   - Dismissible

2. **Inline Issue Display** (Rule editor)
   - Shows issues for current rule
   - Collapsible
   - Educational tone

3. **Review Panel** (Optional)
   - Full list of issues
   - Filterable by severity
   - Exportable

**Critical:** All UI must be:
- Non-blocking
- Dismissible
- Clearly labeled as advisory
- Never disable editing or validation

---

## Testing Strategy

1. **Unit Tests** (TODO)
   - Each check independently
   - Edge cases (invalid input, missing bundle)
   - Deterministic behavior

2. **Integration Tests** (TODO)
   - With real rule data
   - With real bundle data
   - Performance benchmarks

3. **Safety Tests** (MANDATORY)
   - ✅ TypeScript strict mode passes
   - ✅ Build succeeds
   - ✅ No existing tests fail
   - ✅ No validation behavior changes
   - ✅ No new UI restrictions

---

## Constraints & Limitations

### What Rule Review CAN'T Do

1. **Execute FHIRPath**
   - Doesn't validate expression correctness
   - Doesn't evaluate expressions against data
   - Use Firely for runtime validation

2. **Validate Against FHIR Schemas**
   - Doesn't check structure definitions
   - Doesn't validate cardinality
   - Use Firely for schema validation

3. **Auto-Fix Issues**
   - Only reports issues
   - Author must fix manually
   - May add suggestions in future

4. **Block Actions**
   - Never prevents validation
   - Never prevents editing
   - Never prevents saving

### Best-Effort Analysis

- Path extraction is fuzzy matching
- Bundle parsing may fail silently
- Array detection uses heuristics
- Results are advisory suggestions only

---

## Version History

### v1 (Current)
- ✅ Basic scaffolding
- ✅ 4 core checks
- ✅ Advisory-only design
- ❌ No UI integration yet
- ❌ No React hooks yet
- ❌ No auto-suggestions yet

### Future (v2+)
- Add more checks (TBD based on feedback)
- Add React hooks
- Add UI integration
- Add auto-suggestions (non-blocking)
- Add rule quality scoring (advisory)

---

## Examples

See `examples.ts` for detailed usage examples:

1. Basic usage with bundle
2. Using utility functions
3. Review without bundle
4. Array handling detection
5. Future UI integration pattern (commented)

---

## Safety Confirmation

✅ **Rule Review v1 scaffolded as advisory-only with no behavior change.**

- Zero modifications to existing validation logic
- Zero modifications to Firely integration
- Zero modifications to UI components
- Zero new blocking behavior
- Zero new dependencies on validation pipeline

All checks are static analysis only. Runtime validation remains unchanged.
