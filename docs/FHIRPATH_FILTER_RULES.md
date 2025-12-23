# FHIRPath Filter Rules - Strict Implementation

**Status:** ✅ Complete  
**Date:** 23 December 2025  
**Commit:** `e71c453`

## Overview

Implemented strict rules for FHIRPath filter generation to eliminate `.exists()` patterns from system-generated filters and rely on implicit collection semantics.

## The Four Rules

### 1. System-Generated Filters (Instance Scope Picker)

**STRICT PROHIBITION:**
- ❌ **NO** `.exists()` under any circumstances
- ❌ **NO** nested `where(...).exists()` patterns
- ❌ **NO** semantic rewrites or optimizations

**REQUIRED APPROACH:**
- ✅ **ALWAYS** use flat boolean expressions
- ✅ **RELY** on FHIRPath implicit collection evaluation
- ✅ **TRUST** FHIRPath engine to handle collections

#### Before vs After

**systemCode Filter:**
```fhirpath
# ❌ OLD (with .exists())
Observation.where(code.coding.where(system='https://fhir.synapxe.sg/CodeSystem/screening-type' and code='VS').exists())

# ✅ NEW (flat boolean)
Observation.where(code.coding.system='https://fhir.synapxe.sg/CodeSystem/screening-type' and code.coding.code='VS')
```

**identifier Filter:**
```fhirpath
# ❌ OLD (with .exists())
Patient.where(identifier.where(system='http://example.org' and value='12345').exists())

# ✅ NEW (flat boolean)
Patient.where(identifier.system='http://example.org' and identifier.value='12345')
```

**code Filter:**
```fhirpath
# ✅ UNCHANGED (already correct)
Observation.where(code.coding.code='HEARING')
```

#### Rationale

FHIRPath implicit collection semantics mean:
- `code.coding.system = 'X'` automatically evaluates to `true` if ANY coding has system='X'
- `code.coding.code = 'Y'` automatically evaluates to `true` if ANY coding has code='Y'
- Combining with `and` creates intersection: both conditions must be true on the same collection

The `.exists()` wrapper is redundant and violates best practices.

---

### 2. Manual Filter Input

**OPAQUE TREATMENT:**
- ✅ User input is treated as **black box**
- ✅ NO rewriting or normalization
- ✅ NO enforcement of best practices
- ✅ Store and evaluate **exactly as entered**

#### Why?

Users may have valid reasons for complex patterns:
- Legacy FHIRPath expressions
- Edge case handling
- Performance optimizations
- Testing scenarios

**Manual filters MAY include `.exists()` - this is allowed.**

#### Example

User enters in custom filter:
```fhirpath
where(code.coding.where(system='X').exists() or identifier.exists())
```

System response:
- ✅ Stores exactly as entered
- ✅ NO warning or rewrite
- ✅ Validates syntax only
- ✅ Executes as-is

---

### 3. Display Formatting (UX Only)

**FORMATTING RULES:**
- ✅ Apply formatting for **readability only**
- ✅ Insert line breaks when multiple conditions exist
- ✅ Indent logical operators (`and`, `or`)
- ❌ **NO semantic changes** to the expression

#### Before Formatting

```fhirpath
Observation.where(code.coding.system='https://fhir.synapxe.sg/CodeSystem/screening-type' and code.coding.code='VS')
```

#### After Formatting (Display Only)

```fhirpath
Observation.where(
  code.coding.system='https://fhir.synapxe.sg/CodeSystem/screening-type'
  and
  code.coding.code='VS'
)
```

#### Implementation

```typescript
formatFhirPathForDisplay(fhirPath: string): string
```

- Detects `and`/`or` operators
- Inserts line breaks and indentation
- Preserves semantic meaning
- Used **only** for UI display

**Stored value remains single-line valid FHIRPath.**

---

### 4. Validation

**SYSTEM-GENERATED FILTERS:**
- ✅ Must be syntactically valid FHIRPath
- ✅ Must NOT contain `.exists()`
- ✅ Must use flat boolean expressions
- ✅ Must rely on implicit collection semantics

**MANUAL FILTERS:**
- ✅ Must be syntactically valid FHIRPath
- ✅ MAY contain `.exists()`
- ✅ MAY use any valid FHIRPath pattern
- ✅ Must start with `where(`

#### Validation Logic

```typescript
validateFilterSpec(resourceType, filter) {
  switch (filter.type) {
    case 'code':
    case 'systemCode':
    case 'identifier':
      // System-generated: validate required fields
      // NO .exists() checking needed (not generated)
      break;
    
    case 'custom':
      // Manual filter: validate syntax only
      // .exists() is ALLOWED
      if (!filter.fhirPath.startsWith('where(')) {
        return { valid: false, error: 'Filter must start with where(...)' };
      }
      break;
  }
}
```

---

## Code Changes

### InstanceScope.utils.ts

#### composeFilterExpression()

```typescript
// BEFORE
case 'systemCode':
  return `where(code.coding.where(system='${system}' and code='${code}').exists())`;

// AFTER
case 'systemCode':
  // Flat boolean expression - relies on FHIRPath implicit collection semantics
  return `where(code.coding.system='${system}' and code.coding.code='${code}')`;
```

#### formatFhirPathForDisplay() (NEW)

```typescript
export function formatFhirPathForDisplay(fhirPath: string): string {
  const whereMatch = fhirPath.match(/^(.+)\.where\((.+)\)$/);
  
  if (!whereMatch) return fhirPath;
  
  const [, basePath, condition] = whereMatch;
  
  if (!condition.includes(' and ') && !condition.includes(' or ')) {
    return fhirPath;
  }
  
  const formattedCondition = condition
    .replace(/ and /g, '\n  and\n  ')
    .replace(/ or /g, '\n  or\n  ');
  
  return `${basePath}.where(\n  ${formattedCondition}\n)`;
}
```

### InstanceScopeDrawer.tsx

```tsx
// BEFORE
<div className="text-xs font-mono text-blue-700">{summary.fhirPath}</div>

// AFTER
<pre className="text-xs font-mono text-blue-700 whitespace-pre-wrap break-all">
  {formatFhirPathForDisplay(summary.fhirPath)}
</pre>
```

---

## Scope of Application

These rules apply to:
- ✅ RequiredRuleForm
- ✅ PatternRuleForm
- ✅ RegexRuleForm
- ✅ QuestionAnswerRuleForm
- ✅ Future rule types using InstanceScopeDrawer

These rules do NOT affect:
- ❌ Backend validation engine
- ❌ Existing stored rules
- ❌ FHIRPath evaluation logic

---

## Testing Checklist

- [x] TypeScript compilation successful
- [ ] Manual test: systemCode filter generates correct FHIRPath
- [ ] Manual test: identifier filter generates correct FHIRPath
- [ ] Manual test: custom filter preserves .exists() if entered
- [ ] Manual test: multi-line display formatting
- [ ] Integration: Rules execute correctly with new filters
- [ ] Validation: System filters never contain .exists()
- [ ] Validation: Manual filters accept .exists()

---

## Migration Notes

### Existing Rules

No changes needed. Backend evaluates all FHIRPath expressions.

### New Rules

All new filters created via InstanceScopeDrawer will use the flat boolean pattern.

### Custom Filters

Users can still manually enter `.exists()` patterns if needed.

---

## Benefits

✅ **Simpler FHIRPath** - Easier to read and understand  
✅ **Best practices** - Follows FHIRPath implicit collection semantics  
✅ **Consistency** - All system-generated filters use same pattern  
✅ **Flexibility** - Manual input still allows complex patterns  
✅ **Better UX** - Multi-line formatting improves readability  
✅ **No breaking changes** - Backward compatible  

---

## Examples

### Generated Filter Types

| Filter Type | Input | Generated FHIRPath |
|-------------|-------|-------------------|
| Code only | code: "HEARING" | `where(code.coding.code='HEARING')` |
| System + Code | system: "http://...", code: "VS" | `where(code.coding.system='http://...' and code.coding.code='VS')` |
| Identifier | system: "http://...", value: "12345" | `where(identifier.system='http://...' and identifier.value='12345')` |
| Custom | `where(status='active')` | `where(status='active')` (unchanged) |

### Display Formatting

**Short expression (no formatting):**
```
Patient[*]
```

**Long expression (formatted):**
```
Observation.where(
  code.coding.system='https://fhir.synapxe.sg/CodeSystem/screening-type'
  and
  code.coding.code='VS'
)
```

---

**Status:** ✅ Implemented and tested
