---
⚠️ HISTORICAL DOCUMENT  
This phase is complete. Do not use this document as a source of truth for new development.
---

# Phase 4A: Terminology Decision Gate

**Document Type:** Architectural Governance Decision  
**Phase Type:** Decision Gate (Not Implementation)  
**Status:** Under Review  
**Date:** January 8, 2026  
**Audience:** Technical leadership, product owners, compliance officers

---

## ⚠️ CRITICAL CONTEXT

**This is a DECISION GATE, not a feature roadmap.**

This document exists to determine WHETHER the validation engine should ever expand its terminology capabilities beyond current offline ValueSet expansion. No implementation follows from Phase 4A. Implementation, if any, would only occur in a hypothetical Phase 4B, and only after explicit approval based on objective criteria defined in this document.

**This phase produces a binding architectural decision: proceed, proceed with strict limits, or permanently close.**

---

## 1. Purpose of Phase 4A

### 1.1 Why Terminology Is High-Risk

Terminology validation is architecturally dangerous because:

- **Determinism is fragile**: CodeSystem expansion can be non-deterministic depending on version, filters, or external state
- **Explainability becomes complex**: Users cannot audit what they cannot see (external servers, dynamic expansion)
- **Performance is unpredictable**: External calls, large CodeSystems, and recursive imports introduce latency variance
- **Compliance exposure increases**: Validation results that depend on external state cannot be reliably reproduced for audit
- **Silent failures are likely**: Missing CodeSystems, unreachable servers, or ambiguous filters can cause validators to guess or silently pass

These risks compound. Once introduced, they cannot be easily removed without breaking user expectations.

### 1.2 Why This Is a Decision Gate

Phase 4A does NOT propose features. It does NOT design validators. It does NOT write code.

Phase 4A asks one question:

> **Should the engine ever expand terminology support beyond explicit offline ValueSet expansion?**

The answer determines:
- Whether Phase 4B is authorized
- What boundaries Phase 4B must respect
- Whether terminology support is permanently frozen

### 1.3 What Does NOT Follow From This Phase

Approval of Phase 4A does NOT imply:
- That Phase 4B will be implemented
- That any specific terminology feature is approved
- That external services will be integrated
- That current architectural principles can be weakened

**No code is written in Phase 4A. No validators are added in Phase 4A.**

---

## 2. Current Terminology Capability (As-Is)

### 2.1 What the Engine Does Today

The validation engine performs **offline ValueSet expansion** with these capabilities:

#### Supported Operations
1. **Explicit concept validation**: ValueSets with `compose.include.concept[]` are expanded to a list of (system, code) tuples
2. **Nested ValueSet imports**: ValueSets that reference other ValueSets via `compose.include.valueSet[]` are resolved recursively (offline only)
3. **Required binding enforcement**: Codes are validated against expanded ValueSet membership deterministically
4. **Cycle detection**: Circular ValueSet references are detected and reported as errors
5. **Ambiguity reporting**: ValueSet constructs that cannot be expanded offline are explicitly flagged

#### Validation Flow
```
ValueSet URL → Resolve ValueSet resource (offline)
             → Expand to explicit code list
             → Validate supplied code against list
             → Return: pass, fail, or ambiguous
```

All expansion happens at validation time. No background processes. No caching. No external calls.

### 2.2 What the Engine Does NOT Do

The following are **explicitly not supported** by architectural design:

| **Capability**                     | **Status**          | **Why Not Supported**                          |
|------------------------------------|---------------------|------------------------------------------------|
| Entire CodeSystem includes         | Not supported       | Requires CodeSystem resolution and expansion   |
| Filter-based expansion             | Not supported       | Non-deterministic without full CodeSystem      |
| External terminology servers       | Prohibited          | Violates offline-first principle               |
| Dynamic CodeSystem resolution      | Prohibited          | Requires external knowledge or HTTP calls      |
| Implicit ValueSet expansion        | Prohibited          | Not auditable, not explainable                 |
| Best-effort / partial validation   | Prohibited          | Ambiguous failures are explicit errors         |
| Live code lookup                   | Prohibited          | Not deterministic, not reproducible            |

### 2.3 Supported vs Explicitly Not Supported

| **Construct**                                  | **Supported** | **Reason**                                    |
|------------------------------------------------|---------------|-----------------------------------------------|
| `compose.include.concept[]`                    | ✅ Yes        | Explicit, deterministic, offline              |
| `compose.include.valueSet[]` (offline)         | ✅ Yes        | Resolvable, auditable, deterministic          |
| `compose.include.system` (no concepts)         | ❌ No         | Requires CodeSystem expansion                 |
| `compose.include.filter[]`                     | ❌ No         | Non-deterministic without full CodeSystem     |
| External ValueSet references                   | ❌ No         | Violates offline-first                        |
| SNOMED, LOINC, or live server calls            | ❌ No         | External dependency, not auditable            |

---

## 3. Principles That MUST NOT Be Broken

These principles are **non-negotiable architectural constraints**. Any feature that violates these principles is architecturally rejected regardless of user demand.

### 3.1 Offline-Only Execution

**Principle:** The validation engine MUST operate without network access.

**Why It Exists:**
- Audit reproducibility requires identical results in air-gapped environments
- External calls introduce latency variance and unpredictable failure modes
- Compliance testing cannot depend on external service availability

**What Violates This:**
- HTTP calls to terminology servers (FHIR, SNOMED, LOINC)
- DNS lookups
- External resource resolution
- Cloud-based CodeSystem expansion services

**What Is Allowed:**
- Preloaded CodeSystems stored in the validation package
- Offline expansion of explicitly provided ValueSets
- Static terminology files bundled with the engine

---

### 3.2 Deterministic Outcomes

**Principle:** Identical input MUST produce identical validation results every time.

**Why It Exists:**
- Audit trails require reproducible validation
- Compliance testing cannot tolerate variance
- Users must trust that validation is not random

**What Violates This:**
- Filters that depend on CodeSystem version negotiation
- Dynamic expansion based on current date/time
- Probabilistic matching or "fuzzy" code lookups
- Results that vary based on cache state

**What Is Allowed:**
- Static expansion of bounded CodeSystems
- Explicitly versioned terminology resources
- Deterministic property-based filtering (if CodeSystem is preloaded)

---

### 3.3 Explainable Failures

**Principle:** Every validation error MUST be traceable to a specific rule and auditable data.

**Why It Exists:**
- Users must understand why validation failed
- Auditors must verify that failures are correct
- Silent failures or unexplained passes erode trust

**What Violates This:**
- "Assume valid" logic without explicit policy
- Silent fallback to partial validation
- Errors that reference external state users cannot inspect
- Validation passes when expansion fails

**What Is Allowed:**
- Explicit error: "ValueSet cannot be expanded offline"
- Explicit error: "Code not found in expanded ValueSet"
- Policy-driven decision to treat ambiguity as error vs warning

---

### 3.4 No Silent Assumptions

**Principle:** The engine MUST NOT guess what the user meant.

**Why It Exists:**
- Implicit behavior is not auditable
- Users do not see what was assumed
- Compliance officers cannot verify assumptions

**What Violates This:**
- Assuming a CodeSystem is valid without checking
- Silently passing validation when expansion is incomplete
- Inferring code membership without explicit evidence

**What Is Allowed:**
- Explicit policy: "Treat ambiguous ValueSets as errors"
- Explicit reporting: "Cannot expand filter-based ValueSet"
- User-configured enforcement modes (strict vs permissive)

---

### 3.5 No Implicit Expansion

**Principle:** ValueSet expansion MUST be explicit, bounded, and auditable.

**Why It Exists:**
- Users must see what codes are in the expanded set
- Large or unbounded expansions are not practical
- Implicit expansion hides validation logic

**What Violates This:**
- Expanding entire CodeSystems without listing codes
- Background expansion processes
- Cached expansion without version tracking

**What Is Allowed:**
- Explicit expansion to a finite list of codes
- Expansion limits enforced by policy (e.g., max 10,000 codes)
- Expansion metadata (source, version, timestamp)

---

### 3.6 No Server Dependency

**Principle:** The engine MUST NOT depend on external terminology servers.

**Why It Exists:**
- External servers are not guaranteed to be available
- External servers may return different results over time
- Compliance testing requires isolated, reproducible environments

**What Violates This:**
- FHIR terminology server calls ($expand, $validate-code)
- SNOMED, LOINC, RxNorm API integrations
- Cloud-based CodeSystem services

**What Is Allowed:**
- Bundled terminology resources (distributed with the engine)
- Offline FHIR CodeSystem and ValueSet files
- Pre-expanded ValueSet definitions

---

### 3.7 Policy Over Heuristics

**Principle:** Enforcement decisions MUST be driven by explicit policy, not implicit heuristics.

**Why It Exists:**
- Heuristics are not auditable
- Policy is configurable and documented
- Users must control validation strictness

**What Violates This:**
- "Smart" guessing about code validity
- Implicit severity assignment based on context
- Undocumented fallback behavior

**What Is Allowed:**
- User-configured enforcement mode (strict vs permissive)
- Explicit policy: "Ambiguity is an error in strict mode"
- Documented escalation rules

---

## 4. Risks of Expanding Terminology Support

Expanding terminology capabilities beyond current offline ValueSet expansion introduces the following risks. These are NOT hypothetical—they are observed failure modes in other FHIR validation systems.

### 4.1 Determinism Loss

**Risk:** Validation results vary depending on CodeSystem versions, server state, or expansion timing.

**Impact:**
- Audit trails become unreliable
- Compliance testing fails due to variance
- Users cannot reproduce validation results

**Example Scenario:**
A filter-based ValueSet expands to 500 codes on Monday and 502 codes on Tuesday due to a CodeSystem update. The same resource validates differently on different days.

---

### 4.2 Explainability Loss

**Risk:** Users cannot understand why validation passed or failed because expansion happens outside their view.

**Impact:**
- Trust erodes
- Debugging becomes impossible
- Auditors cannot verify correctness

**Example Scenario:**
A code passes validation, but the user cannot see which ValueSet expansion included it. The expansion was cached from an external server, and the cache is not auditable.

---

### 4.3 Performance Unpredictability

**Risk:** Validation time becomes highly variable depending on CodeSystem size, network latency, or external server load.

**Impact:**
- SLA compliance fails
- User experience degrades
- Production systems time out

**Example Scenario:**
Validating a LOINC code requires expanding a ValueSet with 50,000 codes. Expansion takes 10 seconds on the first call, 100ms on subsequent calls (cached), and fails entirely if the server is unreachable.

---

### 4.4 Compliance/Audit Risk

**Risk:** Validation results depend on external state that cannot be frozen or audited.

**Impact:**
- Compliance officers cannot verify validation logic
- Audit trails are incomplete
- Regulatory approval is jeopardized

**Example Scenario:**
An auditor asks, "Why did this code validate?" The answer is, "It was in the ValueSet returned by an external server on that date." The auditor cannot reproduce the expansion because the server state has changed.

---

### 4.5 Maintenance Burden

**Risk:** Supporting dynamic terminology requires maintaining integrations with external services that may change or break.

**Impact:**
- Engineering resources consumed by integration maintenance
- Breaking changes in external APIs require emergency fixes
- Terminology bugs become the engine's responsibility

**Example Scenario:**
A terminology server changes its $expand API. The engine breaks. Users file urgent support tickets. Engineering must drop planned work to fix the integration.

---

### 4.6 False Sense of Correctness

**Risk:** Users believe validation is "complete" when it is actually partial or probabilistic.

**Impact:**
- Critical errors are missed
- Users deploy invalid data to production
- System failures occur downstream

**Example Scenario:**
A filter-based ValueSet cannot be fully expanded offline. The engine reports "ambiguous" as a warning in permissive mode. The user ignores the warning and deploys invalid codes, assuming validation passed.

---

## 5. Decision Options (Explicitly Enumerated)

The following options are the ONLY paths forward. No hybrid or intermediate options are considered.

---

### Option A — Freeze Terminology Support As-Is

**What It Enables:**
- Current offline ValueSet expansion continues
- Explicit concept validation remains deterministic
- Nested ValueSet imports remain supported (offline only)

**What It Forbids:**
- Any expansion of terminology capabilities
- Integration with external terminology servers
- Support for filter-based or entire-system ValueSets

**Risks Introduced:**
- **None.** This option preserves current architecture.

**Risks Mitigated:**
- All risks in Section 4 are avoided
- Architecture remains simple and auditable

**Why It May Be Acceptable:**
- Current capabilities meet most use cases
- Ambiguous ValueSets are already explicitly reported
- Users can preprocess ValueSets offline if needed

**Why It May NOT Be Acceptable:**
- Users with complex terminology requirements must maintain separate tooling
- Entire-system ValueSets cannot be validated
- Filter-based ValueSets require manual expansion

---

### Option B — Controlled Offline Expansion (Strictly Bounded)

**What It Enables:**
- Support for preloaded CodeSystems (bundled with the engine)
- Expansion of entire-system ValueSets IF the CodeSystem is preloaded and bounded
- Filter-based expansion IF the CodeSystem is preloaded and the filter is deterministic

**What It Forbids:**
- External terminology servers (HTTP calls prohibited)
- Unbounded CodeSystem expansion (hard limit: e.g., 50,000 codes per ValueSet)
- Dynamic CodeSystem resolution (all CodeSystems must be bundled at build time)
- Partial or best-effort validation (ambiguity remains an explicit error)

**Risks Introduced:**
- **Determinism risk:** Filters may be non-deterministic if CodeSystem logic is complex
- **Explainability risk:** Expanded ValueSets may be large and difficult to audit
- **Performance risk:** Large CodeSystem expansion may introduce latency
- **Maintenance burden:** CodeSystems must be bundled, versioned, and updated

**Risks Mitigated:**
- Offline-only principle is preserved
- No external dependencies
- Expansion is auditable (CodeSystems are in the package)

**Strict Constraints If Approved:**
1. CodeSystems MUST be bundled at build time (no runtime loading)
2. Expansion MUST have hard limits (e.g., max 50,000 codes per ValueSet)
3. Expansion MUST produce auditable output (log expanded codes)
4. Filters MUST be deterministic (no date-based, no probabilistic)
5. Ambiguous filters MUST produce explicit errors (no silent fallback)

**Why It May Be Acceptable:**
- Enables common use cases (SNOMED subsets, LOINC panels) without external servers
- Maintains offline-first principle
- Expansion is bounded and auditable

**Why It May NOT Be Acceptable:**
- Bundled CodeSystems increase package size significantly
- Maintenance burden for updating CodeSystems
- Determinism of filters is hard to guarantee
- Explainability is reduced for large expansions

---

### Option C — Full Terminology Support (REJECTED BY DEFAULT)

**What It Would Enable:**
- External terminology server integration
- Dynamic CodeSystem expansion
- Live code lookup and validation
- SNOMED, LOINC, RxNorm server calls

**What It Would Forbid:**
- (Nothing—this option removes all constraints)

**Risks Introduced:**
- **ALL risks in Section 4**
- **Determinism loss:** Results vary based on server state
- **Explainability loss:** Expansion is not auditable
- **Performance unpredictability:** Network calls introduce latency
- **Compliance risk:** Audit trails are incomplete
- **Server dependency:** Engine cannot operate offline
- **False correctness:** Partial validation may silently pass

**Risks Mitigated:**
- **None.**

**Why It Is REJECTED:**
- Violates Principle 3.1 (Offline-Only Execution)
- Violates Principle 3.2 (Deterministic Outcomes)
- Violates Principle 3.3 (Explainable Failures)
- Violates Principle 3.6 (No Server Dependency)
- Introduces all risks in Section 4

**Architectural Position:**
**Option C is architecturally unacceptable and is permanently rejected.**

If external terminology services are required, they must be integrated as a separate, explicitly non-deterministic validation layer with clear disclaimers. They must NOT be part of the core validation engine.

---

## 6. Non-Goals (Hard Red Lines)

The following capabilities are **permanently out of scope** for the validation engine. These are hard boundaries that MUST NOT be crossed in any phase.

### 6.1 External Terminology Servers

❌ **Prohibited:** HTTP calls to FHIR terminology servers, SNOMED servers, LOINC servers, or any external code validation API.

**Why:** Violates offline-first principle, introduces determinism loss, creates external dependency.

---

### 6.2 On-the-Fly Expansion

❌ **Prohibited:** Dynamic expansion of CodeSystems at validation time based on user-supplied filters or queries.

**Why:** Not auditable, not deterministic, not explainable.

---

### 6.3 Partial / Best-Effort Validation

❌ **Prohibited:** Silently passing validation when terminology expansion is incomplete or ambiguous.

**Why:** False sense of correctness, not auditable, violates explainability.

---

### 6.4 "Assume Valid" Logic Without Policy

❌ **Prohibited:** Implicit logic that assumes codes are valid when expansion cannot be performed.

**Why:** Not auditable, not explainable, introduces silent failures.

---

### 6.5 Implicit CodeSystem Resolution

❌ **Prohibited:** Automatic resolution of CodeSystems from external sources or guessing CodeSystem URLs.

**Why:** Not deterministic, not auditable, introduces hidden dependencies.

---

### 6.6 Unbounded Expansion

❌ **Prohibited:** Expanding ValueSets with no size limit, potentially loading millions of codes into memory.

**Why:** Performance unpredictability, memory exhaustion, not practical.

---

### 6.7 Cached Expansion Without Versioning

❌ **Prohibited:** Caching expanded ValueSets without tracking CodeSystem version, expansion date, or source.

**Why:** Not auditable, determinism loss, compliance risk.

---

### 6.8 Terminology Reasoning

❌ **Prohibited:** Inferring code relationships, hierarchies, or semantic equivalence without explicit ValueSet membership.

**Why:** Not deterministic, not explainable, introduces implicit logic.

---

## 7. Approval Criteria to Proceed Beyond Phase 4A

Phase 4B (implementation, if any) is authorized ONLY if ALL of the following objective criteria are met.

### 7.1 Product Signals

**Required Evidence:**
- At least 5 distinct users have requested terminology features explicitly excluded today (entire-system ValueSets, filters)
- Requests include specific use cases with concrete ValueSets and CodeSystems
- Users have confirmed that preprocessing ValueSets offline is not acceptable

**Without This:**
Phase 4B is not justified. Current capabilities are sufficient.

---

### 7.2 User Demand Signals

**Required Evidence:**
- Users have attempted to use current offline expansion and reported specific blockers
- Blockers are documented with reproducible test cases
- Alternative solutions (preprocessing, external tools) have been evaluated and rejected

**Without This:**
Phase 4B is premature. Users may not actually need expanded capabilities.

---

### 7.3 Regulatory/Compliance Signals

**Required Evidence:**
- Compliance officers or auditors have confirmed that expanded terminology validation is required for regulatory approval
- Compliance requirements are documented and traceable
- Offline-only principle is still acceptable to regulators

**Without This:**
Phase 4B introduces risk without compliance justification.

---

### 7.4 Engineering Readiness Signals

**Required Evidence:**
- Engineering team has capacity to maintain bundled CodeSystems (updates, versioning, distribution)
- Engineering team has validated that bundled CodeSystems do not exceed package size limits (e.g., <500MB)
- Engineering team has confirmed that expansion performance is acceptable (e.g., <5 seconds per ValueSet)

**Without This:**
Phase 4B is not maintainable. Implementation would introduce technical debt.

---

### 7.5 Architectural Approval

**Required:**
- Technical leadership has reviewed this document and approved Option B (Controlled Offline Expansion)
- Strict constraints in Section 5 (Option B) are accepted as non-negotiable
- Hard red lines in Section 6 are confirmed as permanent boundaries

**Without This:**
Phase 4B cannot proceed.

---

## 8. Outcome of Phase 4A

This section provides the binding decision for Phase 4A.

---

### Decision Status: **AWAITING APPROVAL**

The architectural review of Phase 4A has concluded with the following position:

**Recommendation: Option A (Freeze Terminology Support As-Is)**

**Rationale:**

1. **Current capabilities are sufficient for stated use cases.**
   - Offline ValueSet expansion supports explicit concept validation
   - Nested ValueSet imports support composition patterns
   - Ambiguous scenarios are explicitly reported
   - Users can preprocess ValueSets if needed

2. **Risks of expansion outweigh benefits.**
   - Option B introduces determinism, explainability, and maintenance risks
   - Option C is architecturally unacceptable
   - No compelling product signals justify the complexity

3. **Architectural principles are preserved.**
   - Offline-only principle is maintained
   - Deterministic validation is guaranteed
   - Explainability is not compromised
   - No external dependencies introduced

4. **Compliance and audit requirements are met.**
   - Current validation is reproducible and auditable
   - Terminology failures are explicit and traceable
   - No hidden assumptions or silent fallbacks

---

### Conditional Path: Option B Authorization

IF the approval criteria in Section 7 are met, Option B (Controlled Offline Expansion) MAY be authorized under the following conditions:

**Mandatory Constraints:**
1. CodeSystems MUST be bundled at build time (no runtime loading)
2. Expansion MUST have hard limits (max 50,000 codes per ValueSet)
3. Expansion MUST be auditable (log expanded codes, versions, timestamps)
4. Filters MUST be deterministic (no date-based, no probabilistic)
5. Ambiguous filters MUST produce explicit errors (no silent fallback)
6. External terminology servers remain prohibited
7. Partial validation remains prohibited
8. Hard red lines in Section 6 remain permanent boundaries

**Phase 4B Scope Lock:**
- Only entire-system ValueSets with bundled CodeSystems
- Only deterministic filters (property-based, not date-based)
- No dynamic resolution
- No external services

---

### Permanent Closure: Option C Rejected

**Option C (Full Terminology Support) is architecturally rejected and is permanently out of scope.**

External terminology services, if required, must be integrated as a separate, explicitly non-deterministic validation layer with clear disclaimers. They must NOT be part of the core validation engine.

---

### Final Binding Decision

**Phase 4A Outcome: PHASE 4 TERMINOLOGY FROZEN**

**Unless all approval criteria in Section 7 are met within the next review cycle, terminology support is permanently frozen at current capabilities.**

No further expansion phases will be considered without:
- Documented user demand
- Compliance justification
- Engineering capacity confirmation
- Technical leadership approval

This decision is binding until explicitly revisited by architectural governance.

---

## Revision History

| **Version** | **Date**       | **Change**                          | **Author**         |
|-------------|----------------|-------------------------------------|--------------------|
| 1.0         | January 8, 2026 | Initial decision gate document      | Architecture Team  |

---

**Document Control:**
- **Owner:** Technical Architecture Lead
- **Approvers:** Technical Leadership, Compliance Officer
- **Review Cycle:** Quarterly (or on demand if approval criteria met)
- **Next Review:** April 8, 2026

---

**END OF PHASE 4A DECISION GATE DOCUMENT**
