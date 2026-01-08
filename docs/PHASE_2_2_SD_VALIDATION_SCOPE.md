# Phase 2.2 — SD Validation Scope & Design

## Overview
Phase 2.2 implements **explicit StructureDefinition (SD) constraint validation** in the engine using Firely R5 metadata.

## Architectural Principle

**Firely tells us what the spec says**  
**The engine decides what is valid**

- Firely provides: Parsed POCOs, StructureDefinition snapshots, resource resolver, model inspector
- Engine decides: Which constraints to enforce, when to enforce, how to report errors
- Validation must be: Deterministic, auditable, explainable, scope-controlled

## Enforced Constraints (Phase 2.2)

| Constraint Kind | Description | Enforcement |
|-----------------|-------------|-------------|
| **Cardinality** | Element min/max constraints | ✅ Enforced |
| **Fixed Value** | Element must equal specific value | ✅ Enforced |
| **Required Binding** | Element must use specific ValueSet | ⏳ Extracted, not validated (needs terminology server) |

## Deferred Constraints (Future Phases)

| Constraint Kind | Description | Reason for Deferral |
|-----------------|-------------|---------------------|
| **Pattern** | Element must match structure | Complex deep comparison, deferred to Phase 2.3 |
| **Invariant** | FHIRPath business rules | Handled by FhirPathRuleEngine, not SD layer |

## Implementation Components

### 1. Data Models
- **`SdConstraintKind`**: Enum defining recognized constraint types
- **`SdConstraint`**: Extracted constraint data (path, kind, expected value, source profile)
- **`SdEnforcementPolicy`**: Central policy defining enforced vs deferred constraints

### 2. Extraction
- **`SdConstraintExtractor`**: Reads StructureDefinition.snapshot.element and converts to `SdConstraint` objects
- Pure extractor - NO validation, NO POCO mutation, NO decisions

### 3. Validation
- **`CardinalityValidator`**: Validates min/max occurrence constraints
- **`FixedValueValidator`**: Validates fixed value constraints
- **`RequiredBindingValidator`**: Placeholder (logs constraints, no enforcement until terminology support)
- **`SdConstraintValidationService`**: Orchestrates extraction and validation

### 4. Pipeline Integration
Added as Step 3.5 in ValidationPipeline:

```
JSON Precheck (Step 1.9)
→ Firely Structural Validation (Step 2)
→ SD Constraint Validation (Step 3.5) ← NEW (Phase 2.2)
→ Business Rule Validation (Step 4)
→ Reference Validation
→ Result Aggregation
```

**Trigger conditions:**
- Only runs if `SdConstraintValidationService` is registered (DI)
- Only runs if Bundle POCO parsing succeeded
- Only runs if profile canonical URL is specified

## Error Model

All SD violations use unified error model:

```json
{
  "source": "StructureDefinition",
  "severity": "error",
  "errorCode": "SD_CARDINALITY_MIN_VIOLATION",
  "path": "Bundle.entry",
  "message": "Expected at least 1 occurrence(s), found 0",
  "details": {
    "profile": "http://example.org/StructureDefinition/MyProfile",
    "elementPath": "Bundle.entry",
    "minRequired": 1,
    "actualCount": 0
  }
}
```

### Error Codes
- `SD_CARDINALITY_MIN_VIOLATION`: Element count below minimum
- `SD_CARDINALITY_MAX_VIOLATION`: Element count exceeds maximum
- `SD_FIXED_VALUE_MISSING`: Required fixed value element is missing
- `SD_FIXED_VALUE_MISMATCH`: Element value doesn't match fixed value

## Validation Scope

### Cardinality Validator
**Phase 2.2 scope:**
- `Bundle.entry` (min/max)
- `Bundle.type` (required)
- Simple element paths

**Future expansion:**
- Complex nested paths via ModelInspector
- Array element counting
- Choice type handling (`[x]` elements)

### Fixed Value Validator
**Phase 2.2 scope:**
- Primitive types: Code, String, Integer, Boolean
- Simple element paths

**Future expansion:**
- Complex types (CodeableConcept, Coding, etc.)
- Nested fixed values
- Generic path navigation

### Required Binding Validator
**Phase 2.2 status:** **NOT ENFORCED**

**Rationale:** ValueSet validation requires:
- Terminology server OR pre-expanded ValueSets
- Code system lookup
- Expansion result caching
- Complex binding strength logic (required vs extensible vs preferred)

**Future Phase 2.3:** Full terminology validation with CodeMaster integration

## Explicit Non-Goals

Phase 2.2 **does NOT**:
- ❌ Use `Validator.Validate()` from Firely legacy packages
- ❌ Import `Hl7.Fhir.Validation.*` namespaces
- ❌ Rely on Firely's internal validation logic
- ❌ Execute FHIRPath invariants (handled by FhirPathRuleEngine)
- ❌ Validate terminology bindings (deferred to Phase 2.3)
- ❌ Validate pattern constraints (deferred to Phase 2.3)
- ❌ Modify Firely SDK or FHIR POCOs

## Design Rationale

### Why explicit scope control?
- **Performance**: Only validate constraints with high value/cost ratio
- **Determinism**: Explicit policy = predictable behavior
- **Debuggability**: Clear separation between enforced and deferred
- **Incremental delivery**: Start with simple, high-value constraints

### Why defer invariants?
- FHIRPath invariants are complex business rules
- Already handled by FhirPathRuleEngine (unified rule system)
- Avoiding duplicate validation logic
- Better error messages from rule engine

### Why defer patterns?
- Pattern matching requires deep structure comparison
- Complex logic with edge cases (optional fields, arrays, etc.)
- Phase 2.3 will implement with proper pattern matcher

### Why defer required bindings?
- Requires terminology infrastructure (server or pre-expanded ValueSets)
- Code system lookup complexity
- Better handled with CodeMaster integration in Phase 2.3

## Testing Strategy

### Minimal viable tests (Phase 2.2)
1. **Cardinality test**: Bundle requires min=1 entry, validates empty bundle fails
2. **Fixed value test**: Bundle.type = "collection", validates document type fails
3. **Deferred invariant test**: Invariant exists in SD, engine does NOT enforce

### Future test expansion (Phase 2.3+)
- Complex nested paths
- Multiple profiles
- Pattern matching
- Terminology validation

## Upgrade Path

### Phase 2.3 additions:
- Pattern constraint validation
- Full terminology binding validation (with CodeMaster)
- Complex type fixed value matching
- Generic path navigation via ModelInspector

### Phase 2.4+ future work:
- FHIRPath invariant extraction (currently handled by rule engine)
- Profile-specific error messages
- Constraint explanation generation

## DI Registration

```csharp
// Phase 2.2: SD Constraint Validation
services.AddScoped<SdValidation.SdConstraintExtractor>();
services.AddScoped<SdValidation.Validators.CardinalityValidator>();
services.AddScoped<SdValidation.Validators.FixedValueValidator>();
services.AddScoped<SdValidation.Validators.RequiredBindingValidator>();
services.AddScoped<SdValidation.SdConstraintValidationService>();
```

All services are scoped - stateless within request, new instance per validation.

## Key Files

| File | Purpose |
|------|---------|
| `SdConstraintKind.cs` | Constraint type enum |
| `SdConstraint.cs` | Extracted constraint model |
| `SdEnforcementPolicy.cs` | Enforced vs deferred policy |
| `SdConstraintExtractor.cs` | SD snapshot → constraint extractor |
| `Validators/CardinalityValidator.cs` | Min/max validation |
| `Validators/FixedValueValidator.cs` | Fixed value validation |
| `Validators/RequiredBindingValidator.cs` | Binding placeholder |
| `SdConstraintValidationService.cs` | Orchestrator |
| `ValidationPipeline.cs` | Pipeline integration (Step 3.5) |

## Mental Model Reminder

**Firely = Spec data provider**
- Parses JSON to POCOs
- Loads StructureDefinitions
- Generates snapshots
- Provides ModelInspector

**Engine = Validation judge**
- Extracts constraints
- Applies enforcement policy
- Executes validators
- Reports errors

**Policy = Explicit scope control**
- Enforced: Cardinality, Fixed Value (Phase 2.2)
- Deferred: Pattern, Invariant, Binding (Phase 2.3+)

**Errors = Explainable**
- Clear error codes
- Expected vs actual values
- Profile traceability
- Detailed context

---

**Status:** ✅ **Phase 2.2 Complete**  
**Architecture:** Engine-owned, Firely-powered, explicitly scoped  
**No legacy validation:** Zero `Validator.Validate()` calls  
**Future-ready:** Clear upgrade path to Phase 2.3
