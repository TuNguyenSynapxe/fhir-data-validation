# STRUCTURE Validation Coverage — Phase 1 (Pre-POCO HL7 Grammar)

**Version:** 1.0  
**Status:** Locked  
**Last Updated:** January 3, 2026

---

## 1. What STRUCTURE Means

**STRUCTURE validation detects invalid FHIR JSON that violates HL7 grammar specifications.**

### Definition

A **STRUCTURE error** indicates that the FHIR payload:
- Fails fundamental HL7 FHIR grammar rules
- Cannot be reliably parsed as valid FHIR
- Must be rejected before any semantic validation

STRUCTURE errors are **blocking by definition**. They represent malformed FHIR that must be fixed before integration.

### Contrast with Other Validation Sources

| Source | Meaning | Blocking | Scope |
|--------|---------|----------|-------|
| **STRUCTURE** | Invalid HL7 grammar | ✅ Yes | Lexical correctness |
| **SPEC_HINT** | Interoperability concern | ❌ Advisory | Quality/compatibility |
| **PROJECT** | Business rule violation | ✅ Yes | Policy enforcement |

**Critical distinction:**
- STRUCTURE = "This is not valid FHIR JSON"
- SPEC_HINT = "This is valid FHIR but may cause issues"
- PROJECT = "This violates your organization's requirements"

---

## 2. What Phase 1 Guarantees

### Core Contract

> **"If a payload passes Phase 1 STRUCTURE validation, it is syntactically valid HL7 FHIR JSON."**

Phase 1 provides deterministic, pre-POCO grammar validation. All checks run on raw JSON nodes before POCO deserialization.

### Covered Rules

Phase 1 implements seven fundamental grammar rules:

| Rule # | Validation | Error Code | Description |
|--------|------------|------------|-------------|
| **1** | FHIR `id` grammar | `FHIR_INVALID_ID_FORMAT` | id must be 1-64 chars, `[A-Za-z0-9.-]` only |
| **2** | `string` vs `markdown` | `FHIR_INVALID_STRING_NEWLINE` | string must not contain newlines |
| **3** | `code` lexical grammar | `FHIR_INVALID_CODE_LITERAL` | code must not contain whitespace or control chars |
| **4** | `value[x]` exclusivity | `FHIR_MULTIPLE_VALUE_X` | Only one value[x] field per element |
| **5** | `Reference` grammar | `FHIR_INVALID_REFERENCE_FORMAT`<br/>`FHIR_REFERENCE_INVALID_COMBINATION` | Reference.reference format validation<br/>reference + identifier is invalid |
| **6** | `Extension` grammar | `FHIR_EXTENSION_MISSING_URL`<br/>`FHIR_EXTENSION_INVALID_SHAPE` | Extension must have non-empty url<br/>Must have value[x] OR extension[], not both |
| **7** | `uri` / `url` / `canonical` | `FHIR_INVALID_URI`<br/>`FHIR_INVALID_URL`<br/>`FHIR_INVALID_CANONICAL` | uri: valid RFC 3986 URI (relative or absolute)<br/>url: absolute URI only<br/>canonical: absolute URI with optional \|version |

### Validation Behavior

**All Phase 1 rules:**
- Run pre-POCO (raw JSON validation)
- Emit blocking `STRUCTURE` errors
- Validate lexical correctness only
- Do not perform semantic lookups
- Do not duplicate Firely's POCO validation

**Severity:** All STRUCTURE errors have severity `"error"` (blocking).

---

## 3. What Phase 1 Does NOT Do

### Explicit Exclusions

Phase 1 intentionally **does not** validate:

| Excluded Validation | Reason | Handled By |
|---------------------|--------|------------|
| **Terminology membership** | Requires ValueSet expansion | Firely + PROJECT rules |
| **Profile constraints** | Requires StructureDefinition evaluation | Firely validation |
| **Cardinality slicing** | Requires profile-specific logic | Firely validation |
| **Reference resolution** | Requires resource lookup | Reference resolution service |
| **Business logic** | Organization-specific policy | PROJECT rules (FHIRPath) |
| **Firely POCO semantics** | Handled by Firely SDK | Firely validation |
| **Resource existence** | Requires external data | Reference resolution |
| **Cross-resource constraints** | Requires bundle context | Business rules |

### Important Clarification

> **"Passing STRUCTURE does not imply interoperability or profile compliance."**

A payload that passes Phase 1 STRUCTURE validation:
- ✅ Is syntactically valid FHIR JSON
- ✅ Can be safely deserialized to POCO
- ❌ May still fail profile constraints
- ❌ May still fail terminology binding
- ❌ May still fail business rules
- ❌ May still fail reference resolution

**STRUCTURE is necessary but not sufficient for valid FHIR.**

---

## 4. Authority & Ordering

### Validation Pipeline Order

```
1. STRUCTURE (Phase 1 - Pre-POCO)
   ↓
2. Firely POCO Validation
   ↓
3. SPEC_HINT (Advisory - Post-Firely)
   ↓
4. PROJECT Rules (Business Validation)
   ↓
5. Reference Resolution
```

### Authority Rules

1. **STRUCTURE runs before Firely POCO**
   - Prevents invalid JSON from reaching POCO deserialization
   - Catches grammar violations that Firely may accept

2. **Firely confirms, does not replace**
   - Firely validation runs after STRUCTURE
   - Firely errors supplement, not override, STRUCTURE

3. **SPEC_HINT runs after STRUCTURE**
   - Advisory hints only emit for structurally valid FHIR
   - SPEC_HINT never escalates to STRUCTURE

4. **Single source of STRUCTURE errors**
   - Only `JsonNodeStructuralValidator` emits `STRUCTURE` errors
   - No other component may use the `STRUCTURE` source

### Why This Matters

**Pre-POCO validation prevents:**
- Parsing exceptions from malformed JSON
- Ambiguous deserialization behavior
- Cascading validation failures
- Misleading error messages

**Example:**
- Without Phase 1: Firely might accept `"id": "foo bar"` and fail later
- With Phase 1: Immediate `FHIR_INVALID_ID_FORMAT` error at grammar level

---

## 5. Stability & Versioning

### Phase 1 Status: **LOCKED**

Phase 1 is considered **stable and frozen**. Changes require formal review.

### Change Policy

Any modification to Phase 1 validation requires:

1. **Test Coverage**
   - Comprehensive tests for new behavior
   - Regression tests for all existing rules
   - Minimum 95% test coverage maintained

2. **Version Bump**
   - Document version increment (e.g., 1.0 → 1.1)
   - Update this page with version history
   - Update CHANGELOG.md

3. **Documentation Update**
   - Update this page
   - Update architecture specs
   - Update error code catalog

4. **Backward Compatibility Review**
   - Assess impact on existing integrations
   - Provide migration guidance if breaking
   - Consider deprecation period for removals

### Version History

| Version | Date | Changes |
|---------|------|---------|
| **1.0** | 2026-01-03 | Initial Phase 1 release: Rules 1-7 complete |

### Adding New Rules

To add Rule 8 (Phase 1 expansion):
1. Verify it meets "grammar validation only" criteria
2. Implement with comprehensive tests
3. Bump version to 1.1
4. Update this page and migration docs
5. Get approval from architecture review

---

## 6. Visual Layer Model

### Validation Layer Hierarchy

```
┌─────────────────────────────────────────────────────┐
│  STRUCTURE Validation (Phase 1)                     │
│  • Source: "STRUCTURE"                               │
│  • Severity: "error" (blocking)                      │
│  • Meaning: Invalid HL7 grammar                      │
│  • Action: MUST FIX before integration               │
└─────────────────────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────┐
│  SPEC_HINT Validation                                │
│  • Source: "FHIR" or "STRUCTURE"                     │
│  • Severity: "warning" or "information" (advisory)   │
│  • Meaning: Interoperability or quality concern      │
│  • Action: ASSESS impact, consider fixing            │
└─────────────────────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────┐
│  PROJECT Validation (Business Rules)                 │
│  • Source: "Business"                                │
│  • Severity: "error" (blocking)                      │
│  • Meaning: Violates organization policy             │
│  • Action: MUST FIX per policy requirements          │
└─────────────────────────────────────────────────────┘
```

### Layer Responsibilities

| Layer | Validates | Examples | Developer Action |
|-------|-----------|----------|------------------|
| **STRUCTURE** | HL7 grammar correctness | `id` format, `value[x]` exclusivity, `uri` syntax | Fix immediately - payload is malformed |
| **SPEC_HINT** | Interoperability quality | Firely warnings, best practices | Assess risk, fix if needed for compatibility |
| **PROJECT** | Business requirements | Mandatory fields, code systems, cardinality | Fix per organizational policy |

---

## 7. Summary for Developers

### When You See STRUCTURE Errors

**Fix them immediately.** STRUCTURE errors indicate the payload violates fundamental FHIR grammar.

**What to do:**
1. Read the error message and error code
2. Locate the element using `path` and `jsonPointer`
3. Consult the HL7 FHIR specification for the correct grammar
4. Fix the payload and re-validate
5. Do not attempt workarounds or suppression

**Common fixes:**
- `FHIR_INVALID_ID_FORMAT`: Use only `[A-Za-z0-9.-]`, max 64 chars
- `FHIR_INVALID_STRING_NEWLINE`: Use `markdown` type instead of `string` for multi-line text
- `FHIR_INVALID_CODE_LITERAL`: Remove whitespace and control characters from code values
- `FHIR_MULTIPLE_VALUE_X`: Keep only one value[x] field (e.g., `valueString` OR `valueCodeableConcept`)
- `FHIR_REFERENCE_INVALID_COMBINATION`: Remove either `reference` or `identifier`, not both
- `FHIR_EXTENSION_MISSING_URL`: Add a valid extension URL
- `FHIR_EXTENSION_INVALID_SHAPE`: Extension must have either `value[x]` OR nested `extension[]`
- `FHIR_INVALID_URL`: Use absolute URL (e.g., `https://example.org/path`)

### When You See SPEC_HINT Warnings

**Assess interoperability impact.** SPEC_HINT indicates potential issues with compatibility.

**What to do:**
1. Read the hint message
2. Evaluate if the warning affects your use case
3. Fix if interoperability is critical
4. Document if intentionally keeping non-standard structure

### Integration Checklist

Before deploying FHIR payloads:
- [ ] Zero STRUCTURE errors
- [ ] SPEC_HINT warnings reviewed and addressed or documented
- [ ] PROJECT rules pass
- [ ] Business validation complete
- [ ] References resolved

---

## 8. Technical Implementation Notes

### For FHIR Engine Developers

**STRUCTURE validation is implemented in:**
- File: `JsonNodeStructuralValidator.cs`
- Namespace: `Pss.FhirProcessor.Engine.Validation`
- Interface: `IJsonNodeStructuralValidator`

**Key architectural constraints:**
1. Must use `System.Text.Json` (raw JSON nodes)
2. Must not call Firely POCO APIs
3. Must not perform resource lookups or semantic validation
4. Must emit errors with `Source = "STRUCTURE"`, `Severity = "error"`
5. Must validate grammar only, not business logic

**Testing requirements:**
- Minimum 95% code coverage for Phase 1 rules
- Comprehensive positive and negative test cases
- Regression tests for all rules after any change
- Edge case coverage (empty values, nested structures, arrays)

**Error emission:**
- Use specific error codes (e.g., `FHIR_INVALID_ID_FORMAT`)
- Provide accurate `path` (FHIRPath-like) and `jsonPointer`
- Include `resourceType` context
- Message must be actionable and specific

### For Integrators

**When integrating the FHIR Processor V2 engine:**
1. Always check for `Source == "STRUCTURE"` errors first
2. Block deployment if any STRUCTURE errors exist
3. Log STRUCTURE errors with high severity
4. Display STRUCTURE errors prominently in UI
5. Do not allow users to "skip" or "ignore" STRUCTURE errors

---

## Appendix: Complete Error Code Reference

| Error Code | Rule | Description | Fix |
|------------|------|-------------|-----|
| `FHIR_INVALID_ID_FORMAT` | 1 | FHIR id must be 1-64 characters, `[A-Za-z0-9.-]` only | Use valid id format |
| `FHIR_INVALID_STRING_NEWLINE` | 2 | string primitives must not contain newlines | Use markdown type for multi-line text |
| `FHIR_INVALID_CODE_LITERAL` | 3 | code primitives must not contain whitespace or control characters | Remove whitespace, use valid code literal |
| `FHIR_MULTIPLE_VALUE_X` | 4 | Only one value[x] field allowed per element | Remove duplicate value[x] fields |
| `FHIR_INVALID_REFERENCE_FORMAT` | 5 | Reference.reference must be valid format (ResourceType/id, urn:uuid:, or absolute URL) | Use correct reference format |
| `FHIR_REFERENCE_INVALID_COMBINATION` | 5 | Reference must not contain both reference and identifier | Use reference OR identifier, not both |
| `FHIR_EXTENSION_MISSING_URL` | 6 | Extension must have non-empty url property | Add valid extension URL |
| `FHIR_EXTENSION_INVALID_SHAPE` | 6 | Extension must have value[x] OR extension[], not both or neither | Fix extension structure |
| `FHIR_INVALID_URI` | 7 | uri must be valid RFC 3986 URI | Use valid URI (relative or absolute) |
| `FHIR_INVALID_URL` | 7 | url must be absolute URI | Use absolute URL with scheme |
| `FHIR_INVALID_CANONICAL` | 7 | canonical must be absolute URI with optional \|version | Use absolute URL, optional version suffix |

---

**End of Document**

For questions or clarification, refer to:
- `/docs/01_architecture_spec.md` - Overall architecture
- `/docs/05_validation_pipeline.md` - Validation pipeline design
- `/docs/08_unified_error_model.md` - Error model specification
- `/docs/10_do_not_do.md` - Anti-patterns and constraints
