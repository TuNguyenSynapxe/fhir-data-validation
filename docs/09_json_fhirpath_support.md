# JSON-FHIRPath Support Contract

**Version:** Phase 3  
**Status:** Active  
**Related:** Phase 2 Architecture ([PHASE_2_SMARTPATH_JSON_NAVIGATION_COMPLETE.md](../backend/PHASE_2_SMARTPATH_JSON_NAVIGATION_COMPLETE.md))

---

## Overview

This document defines the **contract** for JSON-based FHIRPath-like navigation in the FHIR Processor V2 Engine.

**Core Principle:** Runtime navigation must work WITHOUT Firely SDK or POCO dependencies.

---

## Architecture Layers

### DLL-Safe Runtime Layer
- **Component:** `JsonPointerResolver`
- **Input:** `JsonElement` (System.Text.Json)
- **Output:** JSON pointer string or null
- **Dependencies:** System.Text.Json ONLY

### Authoring Layer
- **Component:** `SmartPathNavigationService`
- **Input:** `JsonElement` + optional `Bundle` POCO
- **Output:** JSON pointer string or null
- **Dependencies:** May use Firely SDK for advanced features

---

## Supported Features (DLL-Safe Runtime)

### ✅ Basic Navigation
- Property access: `status`, `code.coding`
- Array indexing: `performer[0]`, `coding[1]`
- Nested paths: `code.coding[0].system`
- Resource type prefix: `Observation.status` → finds first Observation

### ✅ Predicate Expressions (where clauses)
- **Equality:** `performer.where(display='Doctor B')`
- **Existence:** `code.where(system.exists())`
- **Empty check:** `code.where(coding.empty())`
- **Logical AND:** `code.where(system='http://loinc.org' and code='12345')`
- **Logical OR:** `identifier.where(system.exists() or value.exists())`

### ✅ Entry Resolution
- Explicit entry index: `entryIndex=2` → deterministic
- Resource type fallback: `Observation` → first matching entry
- Reference resolution: `Patient/123` → finds entry by fullUrl or resource id

### ✅ Structural Awareness
- Array detection via embedded FHIR structure hints
- Cardinality inference (0..1, 0..*, 1..1)
- No hard-coded field heuristics

---

## Explicitly Unsupported Features

### ❌ Complex FHIRPath Functions
- `count()`, `distinct()`, `first()`, `last()`
- `substring()`, `startsWith()`, `contains()`
- `ofType()`, `as()`, `is()`
- Mathematical operations: `+`, `-`, `*`, `/`

### ❌ Full FHIRPath Semantics
- Multi-level nesting: `where(code.where(...))`
- Variable bindings: `$this`, `$index`
- Function chaining: `.where(...).count()`
- Type conversions

### ❌ Advanced Logical Operators
- `implies`, `xor`
- Operator precedence beyond single-level AND/OR
- Complex parenthetical grouping

### ❌ FHIR-Specific Navigation
- `resolve()` for cross-bundle references
- Extension traversal shortcuts
- `conformsTo()`, `memberOf()`

---

## Runtime vs Authoring Differences

| Feature | Runtime (DLL-Safe) | Authoring (POCO-Enhanced) |
|---------|-------------------|---------------------------|
| **Explicit entryIndex** | ✅ Required | ✅ Optional |
| **Resource-level where()** | ❌ Not supported | ✅ Filters Bundle.Entry |
| **Simple predicates** | ✅ Supported | ✅ Supported |
| **Logical AND/OR** | ✅ Supported | ✅ Supported |
| **Complex FHIRPath** | ❌ Not supported | ⚠️ Future (via Firely) |
| **Ambiguous resolution** | FirstMatch policy | ErrorIfMultiple policy |

---

## Failure Semantics

### DLL-Safe Failures (return null)
- Missing property: `nonExistentField` → `null`
- Out-of-bounds array: `coding[99]` → `null`
- Predicate no match: `where(display='NoMatch')` → `null`
- Invalid expression syntax: `where(invalid syntax)` → `null`
- Entry not found: `Patient/999` → `null`

### NEVER throw exceptions
Runtime navigation is **fail-safe**. Invalid paths return `null`, not exceptions.

---

## Entry Resolution Policies

### FirstMatch (Runtime Default)
- When multiple entries match resource type: Select first
- Behavior: Deterministic but potentially ambiguous
- Use case: Runtime navigation with explicit schemas

### ErrorIfMultiple (Authoring Default)
- When multiple entries match: Return null + log warning
- Behavior: Forces explicit disambiguation
- Use case: Rule authoring, validation setup

---

## Performance Guarantees

### Single-Pass Navigation
- Path parsing: Once per unique path (cacheable)
- JSON traversal: Single depth-first pass
- No repeated bundle scanning when `entryIndex` provided

### Optimization Strategy
- ValidationPipeline computes `entryIndex` once per resource
- Subsequent navigation calls reuse cached index
- Fallback to resource type inference only when index unavailable

---

## FHIR Version Parity

### R4 Support
- Primary development target
- Structure hints: `Navigation/StructureHints/fhir-r4.min.json`

### R5 Support
- Equivalent navigation behavior
- Structure hints: `Navigation/StructureHints/fhir-r5.min.json`
- Same path → same JSON pointer (modulo R5 structural differences)

---

## Implementation Status

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 2 | ✅ Complete | Basic JSON navigation, simple where() |
| Phase 3.0 | ✅ Complete | Contract documentation |
| Phase 3.1 | 🔄 In Progress | Predicate engine with AST |
| Phase 3.2 | ⏳ Planned | Logical AND/OR composition |
| Phase 3.3 | ⏳ Planned | Structure hints (remove heuristics) |
| Phase 3.4 | ⏳ Planned | Deterministic entry resolution |
| Phase 3.5 | ⏳ Planned | ValidationPipeline optimization |
| Phase 3.6 | ⏳ Planned | R5 parity verification |

---

## Testing Requirements

### Unit Tests (Required)
- ✅ Explicit entryIndex navigation
- ✅ Missing property returns null
- ✅ Empty string value returns pointer
- ✅ Array defaults to [0]
- ✅ Simple where() clause
- ✅ Resource type fallback
- ⏳ Logical AND predicates
- ⏳ Logical OR predicates
- ⏳ exists() function
- ⏳ empty() function

### Integration Tests (Validation)
- ValidationPipeline passes explicit entryIndex
- SmartPathNavigationService delegates correctly
- No POCO requirement for DLL-safe paths

---

## Migration Path (from Phase 2)

### No Breaking Changes
- All Phase 2 paths continue to work
- Existing tests pass without modification
- Public APIs unchanged

### Additive Changes
- New predicate expressions supported
- Structure hints improve accuracy
- Entry resolution more deterministic

---

## Future Extensions (Out of Scope)

### Phase 4+ Candidates
- Full FHIRPath parser (using Firely SDK in authoring mode)
- Cross-bundle reference resolution
- Custom function extensions
- Performance profiling and optimization

---

## Related Documentation

- [/docs/07_smart_path_navigation.md](07_smart_path_navigation.md) - SmartPath specification
- [/backend/PHASE_2_SMARTPATH_JSON_NAVIGATION_COMPLETE.md](../backend/PHASE_2_SMARTPATH_JSON_NAVIGATION_COMPLETE.md) - Phase 2 completion
- [/docs/01_architecture_spec.md](01_architecture_spec.md) - Overall architecture
- [/docs/10_do_not_do.md](10_do_not_do.md) - Anti-patterns

---

**Document Status:** Phase 3.0 Complete  
**Last Updated:** 26 December 2025  
**Effective From:** Phase 3.1 onwards
