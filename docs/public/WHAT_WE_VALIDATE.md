# What We Validate

**Version:** 1.0  
**Last Updated:** January 8, 2026  
**Audience:** Integration partners, vendors, clinical system teams, product managers, auditors

---

## 1. What This Validator Is

This system validates FHIR R5 data against published rules and profiles. Validation is deterministic and explainable. It does not make assumptions about what you meant. It does not "fix" or transform your data.

**This validator reports what is valid, what is invalid, and why — nothing more and nothing less.**

Every validation result can be traced to a specific rule, constraint, or specification requirement. If the data violates a rule, you receive an error with a precise path and explanation. If it passes, you can trust that it met all configured validation criteria.

---

## 2. What We Validate ✅

### 2.1 Data Structure & Syntax

We validate that your FHIR resources are structurally sound:

- **JSON validity**: Proper syntax, no malformed brackets or quotes
- **Required fields**: Elements marked as mandatory must be present
- **Data type correctness**: Strings must be strings, numbers must be numbers, dates must be valid dates

**Examples of what we catch:**
- Missing required `resourceType` field
- Invalid date format in `Patient.birthDate`
- Number stored as a string where integer is required
- Incorrectly nested JSON objects

---

### 2.2 FHIR Structural Rules

We enforce FHIR's base structural requirements:

- **Cardinality rules**: Minimum and maximum occurrence constraints (e.g., `0..1`, `1..*`)
- **Required elements**: Fields that must be present per FHIR specification
- **Element presence rules**: Conditional requirements (e.g., "if X is present, Y must also be present")

**Examples:**
- `Bundle.type` is required (cardinality `1..1`)
- `HumanName.family` or `HumanName.given` must be present (constraint)
- Array elements must not exceed maximum cardinality

---

### 2.3 Profile (StructureDefinition) Constraints

We enforce constraints defined in FHIR profiles exactly as written:

#### Fixed Values
- Elements with `fixedValue` constraints must match exactly
- Applies to both primitive types (strings, codes) and complex types (CodeableConcept, Identifier)

#### Pattern Constraints
- Elements with `patternValue` constraints must contain the specified pattern
- Additional elements may be present, but required patterns must match
- Supports complex nested structures

#### Profile-Specific Rules
- Custom constraints defined in StructureDefinitions
- No implicit behavior—only explicitly stated rules are enforced

**What this means:**
If a profile says `Patient.gender` must be fixed to `"male"`, any other value is rejected. If a profile requires a specific identifier system pattern, resources without that pattern fail validation.

---

### 2.4 Terminology Validation (Offline)

We validate terminology bindings using **offline, deterministic expansion**:

#### Required Bindings
- Codes must be present in the specified ValueSet
- ValueSet must contain explicit concept codes
- System and code matching enforces exact membership

#### Explicit ValueSet Membership
- We expand ValueSets to a finite list of codes
- If a code is not in the expanded list, validation fails
- No external terminology server lookups

#### Nested ValueSet Imports (Limited)
- We support ValueSets that import other ValueSets (nested composition)
- All referenced ValueSets must be resolvable offline
- Transitive imports are followed and expanded

**Enum-backed FHIR elements:**
- FHIR enum values (like `Bundle.type`) are correctly extracted and validated
- Enum literals are converted to their FHIR representation (e.g., `BundleType.Collection` → `"collection"`)

**Important:** Validation succeeds only when we can deterministically confirm code membership. Ambiguous situations are reported as errors (see Section 3).

---

### 2.5 Business Rules

We evaluate custom business logic defined in rule configurations:

- **FHIRPath expressions**: Rules written in FHIRPath are evaluated against resources
- **Cross-field validation**: Rules can reference multiple fields within a resource
- **Project-specific rules**: Custom constraints tailored to specific implementation requirements

**Examples:**
- "If `Observation.status` is `final`, then `Observation.value` must be present"
- "Patient must have at least one contact mechanism (phone or email)"

Rules are explicitly configured. We do not infer or assume business logic.

---

### 2.6 Reference Integrity

We validate that references between resources are valid:

- **Internal references**: References within a Bundle must point to existing entries
- **Contained resources**: Resources contained within another resource must be properly referenced
- **Missing references**: Broken or dangling references are reported as errors
- **Reference format**: Reference syntax must conform to FHIR requirements

**Examples:**
- `Observation.subject` references `Patient/123`, and `Patient/123` exists in the Bundle
- Contained resource has valid internal reference structure

---

## 3. What We Detect but Do Not Enforce ⚠️

Some FHIR constructs are recognized and reported but cannot be fully evaluated offline. These situations are never silently ignored—they always result in explicit warnings or errors, depending on your enforcement policy.

### Ambiguous ValueSet Scenarios

We detect but cannot fully validate:

#### Entire CodeSystem Inclusion
- ValueSets that include all codes from a CodeSystem without listing them explicitly
- Example: `<include><system value="http://loinc.org"/></include>` (no concept list)

#### Filter-Based Expansion
- ValueSets using filters or property-based selection
- Example: Selecting codes where `property = "parent"` equals some value

#### Unresolvable Imported ValueSets
- ValueSets that reference other ValueSets we cannot locate offline
- Missing or external ValueSet dependencies

#### Cyclic ValueSet References
- ValueSets that create circular import chains

### What Happens
- **Strict mode:** These scenarios produce errors, blocking validation
- **Permissive mode:** These scenarios produce warnings, allowing validation to continue

### Why This Matters
These constructs require either:
- A live terminology server
- Dynamic CodeSystem expansion
- External knowledge we don't have offline

Rather than guessing or making unsafe assumptions, we explicitly report the limitation.

---

## 4. What We Do NOT Validate ❌

To set clear expectations, here is what this validator explicitly **does not** check:

### Terminology & Code Systems
- ❌ **External terminology servers**: We do not query SNOMED, LOINC, or other external code systems
- ❌ **Live CodeSystem expansion**: We do not dynamically expand CodeSystems at runtime
- ❌ **Terminology reasoning**: We do not infer hierarchies, relationships, or semantic equivalence
- ❌ **Code system versioning**: We do not validate codes against specific CodeSystem versions

### Implementation Guides & Compliance
- ❌ **National implementation guides**: We do not enforce country-specific FHIR profiles (e.g., US Core, AU Base) unless explicitly configured
- ❌ **Certification requirements**: We do not claim compliance with certification programs
- ❌ **Jurisdiction-specific rules**: Region-specific requirements must be added as custom profiles

### Clinical & Semantic Validation
- ❌ **Clinical correctness**: We do not verify that clinical data makes medical sense
- ❌ **Workflow appropriateness**: We do not validate business process sequences
- ❌ **Semantic interpretation**: We do not analyze the meaning of values, only their structural validity

### Implicit Behavior
- ❌ **Undocumented rules**: If a rule is not explicitly stated in a profile or rule definition, it is not enforced
- ❌ **Assumed best practices**: We do not apply implicit "common sense" validation
- ❌ **Inferred constraints**: We do not guess what you intended

**Example:**
If a profile does not specify that `Patient.gender` must be one of `male`, `female`, `other`, `unknown`, we will not enforce that constraint—even though it may seem like "common sense."

---

## 5. Enforcement Modes (Strict vs Permissive)

You can configure how the validator handles ambiguous situations:

| **Mode**       | **What It Means**                                                                 | **When to Use**                                  |
|----------------|-----------------------------------------------------------------------------------|--------------------------------------------------|
| **Strict**     | Any ambiguity (unresolvable ValueSet, filter-based expansion) is an **error**    | Production systems requiring deterministic validation |
| **Permissive** | Ambiguities are reported as **warnings**, validation continues                   | Development, testing, gradual migration          |

### Who Should Use Which?

- **Strict mode**: Use when you need guarantees that all validation is deterministic. Suitable for compliance-critical systems.
- **Permissive mode**: Use when integrating legacy data or systems that may contain constructs you cannot fully validate offline.

Both modes report the same information—the difference is whether ambiguity blocks validation or allows it to proceed.

---

## 6. How to Read Validation Results

### Error Codes
Each error has a unique code (e.g., `SD_REQUIRED_BINDING_INVALID_CODE`, `SD_FIXED_VALUE_MISMATCH`) that identifies the rule that failed.

### Paths
Errors include a precise path to the failing element using FHIRPath notation (e.g., `Bundle.entry[2].resource.gender`).

### Messages
Each error includes:
- **What failed**: The rule or constraint that was violated
- **Why it failed**: The specific reason (e.g., "Code 'abc' not in ValueSet")
- **Context**: Relevant values, expected vs actual data

### Severity Levels
- **Error**: Validation failure, data does not meet requirements
- **Warning**: Potential issue detected but not blocking (permissive mode only)
- **Information**: Advisory message, not a failure

### Determinism
All validation results are repeatable. Running the same data through the validator multiple times produces identical results.

---

## 7. Common Misunderstandings

### "Is this a full FHIR validator?"

**No.** This is a **profile and rule-based validator** for FHIR R5 data. It validates against explicitly configured profiles and rules. It does not implement every possible FHIR validation scenario, especially those requiring external terminology servers or dynamic reasoning.

### "Does passing validation mean my data is clinically correct?"

**No.** Validation confirms that your data conforms to structural and terminology rules. It does not verify:
- Clinical appropriateness
- Medical accuracy
- Workflow correctness
- Semantic meaning

Passing validation means your data is **structurally and terminologically valid according to configured rules**—nothing more.

### "Does this replace a terminology server?"

**No.** This validator uses **offline ValueSet expansion**. It validates codes against a static, pre-expanded list of concepts. It does not:
- Query live terminology servers
- Perform dynamic code lookups
- Resolve external CodeSystem references

If your use case requires live terminology services, you need a separate terminology server.

### "Why is something reported as ambiguous?"

We report ambiguity when a ValueSet construct cannot be deterministically evaluated offline. Examples:
- Importing an entire CodeSystem without listing codes
- Using filters to select codes
- Referencing a ValueSet we cannot resolve

This is **not a bug**—it's the validator being honest about its limitations. Rather than guessing or making unsafe assumptions, we explicitly report what we cannot validate.

### "Can I use this for any FHIR version?"

**No.** This validator is built for **FHIR R5**. It does not support FHIR R4, STU3, or DSTU2. Attempting to validate resources from other versions will produce errors.

---

## 8. Scope Lock Statement

**This page describes the complete and current validation scope.**

Any future expansion will be:
- Explicitly documented in a new version of this page
- Versioned and dated
- Announced with clear migration guidance

We do not make promises about future capabilities. What is documented here is what the system does today. If a capability is not listed in Section 2 ("What We Validate"), assume it is not supported.

This ensures you can:
- Make integration decisions based on actual behavior
- Trust that validation results match documented capabilities
- Plan implementations without ambiguity

---

## Related Documentation

- [Architecture Specification](../01_architecture_spec.md) — Technical implementation details
- [Rule DSL Specification](../03_rule_dsl_spec.md) — How to write custom validation rules
- [Terminology Validation](../PHASE_2_TERMINOLOGY_SUMMARY.md) — Details on offline ValueSet expansion
- [Unified Error Model](../08_unified_error_model.md) — Error code reference

---

## Final Verification Checklist

✅ No unsupported capability claimed  
✅ No future promises implied  
✅ Terminology scope matches offline behavior  
✅ Structural vs semantic validation clearly separated  
✅ Language suitable for non-engineers  
✅ Safe for public website  
✅ Enforcement modes explained clearly  
✅ Common misunderstandings addressed  
✅ Scope lock statement included  

---

**For questions or clarifications, refer to the technical documentation in the `/docs` folder or contact the maintainers.**
