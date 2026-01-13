---
⚠️ HISTORICAL DOCUMENT  
This phase is complete. Do not use this document as a source of truth for new development.
---

# Phase 5: Frontend Validation Transparency

**Document Type:** Implementation Specification  
**Phase Type:** UI Layer (Rendering & Explanation Only)  
**Status:** Ready for Implementation  
**Date:** January 8, 2026  
**Audience:** Frontend engineers, UX designers, technical leadership

---

## ⚠️ CRITICAL SCOPE DEFINITION

**Phase 5 is UI-only. No backend changes. No product features.**

This phase implements the **presentation layer** for validation results. It does NOT implement:
- Project management
- Bundle upload workflows
- Resource editing
- Rule authoring
- Terminology browsing
- Any feature resembling Simplifier.net

**If you implement anything above, you are violating the scope.**

---

## 0. Role & Context

The backend validation engine is complete and deterministic. It produces structured validation results with:
- Error codes
- Paths
- Severity levels
- Ambiguity flags
- Policy modes

Frontend's job: **Make validation results understandable, explainable, and trustworthy.**

---

## 1. Phase 5 Objective

### Primary Goal
Make validation results transparent, explainable, and auditable to users.

### Specific Outcomes
1. Users understand **what** failed
2. Users understand **why** it failed
3. Users recognize **limitations** explicitly
4. Users see **policy decisions** (strict vs permissive)
5. Users cannot make **false assumptions** about validation completeness

### Non-Goal
- Adding validation logic
- Changing backend behavior
- Hiding complexity
- Making validation seem "smarter" than it is

---

## 2. Hard Scope Boundaries

### ✅ IN SCOPE

| **Category**                    | **What's Included**                                    |
|---------------------------------|--------------------------------------------------------|
| **Validation Result Rendering** | Display errors, warnings, ambiguities                  |
| **Error Explanation**           | Human-readable why/what failed                         |
| **Ambiguity Visualization**     | Explicit banners for ambiguous validation              |
| **Policy Explanation**          | Show strict vs permissive mode effects                 |
| **Path-Based Highlighting**     | Link validation issues to resource paths               |
| **Capabilities Page**           | Public "What We Validate / What We Don't"              |

### ❌ OUT OF SCOPE (PROHIBITED)

| **Category**           | **What's Forbidden**                                        |
|------------------------|-------------------------------------------------------------|
| **Project Management** | ❌ Project listing, creation, deletion                      |
| **Upload Flows**       | ❌ Bundle ingestion, file upload UI                         |
| **Bundle Browsing**    | ❌ Tree navigation, resource viewers                        |
| **Rule Authoring**     | ❌ Rule editors, DSL builders                               |
| **Terminology**        | ❌ CodeSystem browsers, ValueSet management                 |
| **Resource Editing**   | ❌ JSON editors, form-based editing                         |
| **Simplifier Clone**   | ❌ Any feature resembling external FHIR tooling             |

**If a component touches any out-of-scope area, it's architecturally wrong.**

---

## 3. Backend Contract (Assumed Interface)

The backend provides validation results shaped as:

```typescript
interface ValidationIssue {
  // Core fields
  source: 'StructureDefinition' | 'FHIRPath' | 'Reference' | 'Syntax';
  severity: 'error' | 'warning' | 'info';
  errorCode: string;
  path: string; // FHIRPath notation: Bundle.entry[0].resource.type
  message: string;

  // Optional details
  details?: {
    profile?: string;
    expected?: unknown;
    actual?: unknown;
    valueSet?: string;
    violationReason?: string; // Ambiguity explanation
    policyMode?: 'strict' | 'permissive';
    explanationHint?: string;
  };
}

interface ValidationResult {
  issues: ValidationIssue[];
  summary: {
    totalErrors: number;
    totalWarnings: number;
    totalInfo: number;
    hasAmbiguity: boolean;
    policyMode: 'strict' | 'permissive';
  };
}
```

### Frontend Responsibilities

**MUST:**
- Render severity exactly as received
- Show ambiguity explicitly
- Display policy mode
- Preserve error codes
- Link paths to source

**MUST NOT:**
- Reinterpret severity
- Hide ambiguity
- Guess missing meaning
- Soften error language
- Imply validation is "smarter" than it is

---

## 4. Required Frontend Module Structure

### Folder Architecture (MANDATORY)

```
src/
├─ validation/                         ← PHASE 5 ROOT MODULE
│  ├─ model/                            ← TypeScript interfaces
│  │  ├─ ValidationIssue.ts
│  │  ├─ ValidationResult.ts
│  │  ├─ ValidationSeverity.ts
│  │  ├─ ValidationSource.ts
│  │  └─ index.ts
│  │
│  ├─ explainers/                       ← Explanation logic
│  │  ├─ explainError.ts
│  │  ├─ explainAmbiguity.ts
│  │  ├─ explainPolicy.ts
│  │  ├─ explanationRegistry.ts
│  │  └─ index.ts
│  │
│  ├─ components/                       ← UI components
│  │  ├─ ValidationResultPanel/
│  │  │  ├─ ValidationResultPanel.tsx
│  │  │  ├─ ValidationIssueRow.tsx
│  │  │  ├─ ValidationResultPanel.module.css
│  │  │  └─ index.ts
│  │  │
│  │  ├─ ValidationSummary/
│  │  │  ├─ ValidationSummary.tsx
│  │  │  ├─ ValidationSummary.module.css
│  │  │  └─ index.ts
│  │  │
│  │  ├─ ValidationIssueDetails/
│  │  │  ├─ ValidationIssueDetails.tsx
│  │  │  ├─ ValidationIssueDetails.module.css
│  │  │  └─ index.ts
│  │  │
│  │  ├─ AmbiguityBanner/
│  │  │  ├─ AmbiguityBanner.tsx
│  │  │  ├─ AmbiguityBanner.module.css
│  │  │  └─ index.ts
│  │  │
│  │  └─ index.ts
│  │
│  ├─ views/                            ← Page-level views
│  │  ├─ ValidationResultsView.tsx
│  │  ├─ ValidationCapabilitiesView.tsx
│  │  └─ index.ts
│  │
│  └─ index.ts                          ← Public exports
│
├─ pages/                               ← Route pages
│  ├─ validation/
│  │  ├─ results.tsx                    ← /validation/results
│  │  ├─ capabilities.tsx               ← /validation/capabilities
│  │  └─ index.ts
│  │
└─ shared/                              ← Existing shared components
```

### Architectural Rules

**FORBIDDEN:**
- ❌ Dumping files into `src/components` (generic location)
- ❌ Mixing validation UI with project/bundle browsing
- ❌ Creating generic "ErrorCard" components outside `validation/`
- ❌ Putting validation logic in page components
- ❌ Direct API calls in UI components

**REQUIRED:**
- ✅ All validation UI lives under `validation/`
- ✅ Models are type-safe and exported from `model/`
- ✅ Explanation logic is centralized in `explainers/`
- ✅ Components are self-contained with co-located styles
- ✅ Views compose components, pages route to views

---

## 5. Required UI Concepts

### 5.1 Validation Summary

**Purpose:** High-level validation outcome at a glance.

**Required Elements:**
- Total error count
- Total warning count
- Total info count
- Ambiguity indicator (if present)
- Policy mode badge (Strict | Permissive)

**Example Rendering:**

```
┌────────────────────────────────────────────────┐
│ ⚠️ Validation completed with ambiguity         │
│                                                │
│ Policy: Strict                                 │
│ 3 Errors · 1 Warning · 2 Ambiguous            │
└────────────────────────────────────────────────┘
```

**Design Constraints:**
- ❌ No green checkmarks (validation passing doesn't mean data is correct)
- ❌ No "success" language for warnings (warnings are not safe)
- ✅ Ambiguity must be impossible to miss
- ✅ Policy mode must be visible

---

### 5.2 Validation Issue List

**Purpose:** Comprehensive list of all validation issues.

**Required Columns:**
1. **Severity Icon** — Error (🔴), Warning (🟡), Info (🔵)
2. **Error Code** — Machine-readable identifier (e.g., `SD_REQUIRED_BINDING_INVALID_CODE`)
3. **Short Message** — Human-readable summary
4. **Path** — FHIRPath location (e.g., `Bundle.entry[0].resource.type`)
5. **Source** — Validation category (StructureDefinition, FHIRPath, Reference, Syntax)

**Interaction:**
- Click row to expand details
- No collapsing by default (all issues visible)
- Sortable by severity, path, source

**Example Row:**

```
🔴 SD_REQUIRED_BINDING_INVALID_CODE
   Code 'invalid' not in required ValueSet
   Bundle.entry[2].resource.status
   Source: StructureDefinition
```

---

### 5.3 Validation Issue Details (Expandable)

**Purpose:** Explain why validation failed and provide context.

**Required Sections:**

#### A. What Failed
- Error code
- Full message
- Path
- Source

#### B. Why It Failed
- Expected value/behavior
- Actual value/behavior
- Rule or constraint violated

#### C. Context
- Profile URL (if applicable)
- ValueSet URL (if terminology)
- Rule ID (if business rule)

#### D. Policy Impact (if applicable)
- Policy mode (strict vs permissive)
- Why severity differs based on policy
- Explanation of enforcement decision

**Example Expanded View:**

```
┌─────────────────────────────────────────────────────────────┐
│ 🔴 SD_REQUIRED_BINDING_INVALID_CODE                         │
│                                                             │
│ What Failed:                                                │
│   Code 'invalid' is not in required ValueSet                │
│   Path: Bundle.entry[2].resource.status                     │
│   Source: StructureDefinition                               │
│                                                             │
│ Why It Failed:                                              │
│   Expected: Code from ValueSet                              │
│            http://example.org/ValueSet/status-codes         │
│   Actual: "invalid"                                         │
│                                                             │
│ Context:                                                    │
│   Profile: http://example.org/StructureDefinition/MyBundle  │
│   Binding: Required                                         │
│                                                             │
│ Policy: Strict                                              │
│   This is always an error in strict mode.                  │
└─────────────────────────────────────────────────────────────┘
```

---

### 5.4 Ambiguity Is First-Class

**Principle:** Ambiguous validation MUST be impossible to ignore.

**When to Show Ambiguity:**
- Issue has `violationReason` populated
- Summary indicates `hasAmbiguity: true`

**Required UI:**

**Ambiguity Banner:**
```
┌────────────────────────────────────────────────────────────┐
│ ⚠️ AMBIGUITY DETECTED                                      │
│                                                            │
│ This validation could not be completed deterministically.  │
│ Reasons:                                                   │
│ • ValueSet uses filter-based expansion                     │
│ • CodeSystem not available offline                         │
│                                                            │
│ ⚠️ This does NOT mean the data is valid.                   │
│ It means we cannot confirm validity.                       │
│                                                            │
│ Policy: Strict → Treated as ERROR                          │
└────────────────────────────────────────────────────────────┘
```

**Design Rules:**
- ❌ No hiding ambiguity behind "advanced" settings
- ❌ No softening language ("might be valid")
- ✅ Explicit warning that ambiguity ≠ pass
- ✅ Link to "What We Validate" page

---

### 5.5 Explainability Layer (CRITICAL)

**Principle:** All explanations are deterministic, not heuristic.

**Architecture:**

```typescript
// explainers/explanationRegistry.ts

interface Explanation {
  what: string;      // What failed
  why: string;       // Why it failed
  context?: string;  // Additional context
  policy?: string;   // Policy implications
}

function explainError(issue: ValidationIssue): Explanation {
  // Lookup explanation based on error code
  return errorCodeRegistry[issue.errorCode]?.(issue) 
    ?? defaultExplanation(issue);
}

// Example registry entry
const errorCodeRegistry = {
  'SD_REQUIRED_BINDING_INVALID_CODE': (issue) => ({
    what: `Code '${issue.details.actual}' is not in required ValueSet`,
    why: `The code must be present in ${issue.details.valueSet}`,
    context: `Binding strength: Required`,
    policy: issue.details.policyMode === 'strict' 
      ? 'Always an error in strict mode'
      : 'Treated as warning in permissive mode'
  }),
  // ... more entries
};
```

**Rules:**
- ✅ Explanation is a pure function of ValidationIssue
- ✅ No string concatenation in React components
- ✅ No guessing or inferring meaning
- ❌ No heuristics based on message content
- ❌ No external API calls for explanation

---

## 6. Public Page: "What We Validate / What We Don't"

**Route:** `/validation/capabilities`

**Purpose:** Public-facing documentation matching backend reality exactly.

**Required Sections:**

1. **What This Validator Is**
   - Deterministic, explainable validation
   - Offline-only guarantee
   - No external servers

2. **What We Validate**
   - FHIR structure
   - Profile constraints
   - Terminology (offline)
   - Business rules
   - References

3. **What We Do NOT Validate**
   - External terminology servers
   - Clinical correctness
   - Workflow appropriateness
   - National implementation guides (unless configured)

4. **Terminology Limitations**
   - Offline ValueSet expansion only
   - Explicit concept lists required
   - Filters not supported
   - Entire-system includes not supported

5. **Policy Modes**
   - Strict: Ambiguity is error
   - Permissive: Ambiguity is warning

6. **Common Misunderstandings**
   - Passing validation ≠ clinically correct
   - Validation is not a terminology server
   - Ambiguity ≠ pass

**Source of Truth:**
This page MUST be generated from or link to `/docs/public/WHAT_WE_VALIDATE.md`.

**Design:**
- Read-only, informational
- No interactive elements
- Suitable for sharing with partners
- Suitable for compliance officers

---

## 7. Design Principles (Enforced)

### Principle 1: No False Confidence
- ❌ No green checkmarks implying correctness
- ❌ No "success" banners for passing validation
- ✅ Neutral language: "Validation completed"

### Principle 2: Warnings Are Not Safe
- ❌ No yellow/orange colors suggesting "minor issue"
- ❌ No dismissible warning banners
- ✅ Warnings are factual findings, not suggestions

### Principle 3: Ambiguity ≠ Pass
- ❌ No treating ambiguity as "probably okay"
- ❌ No hiding ambiguity in collapsed sections
- ✅ Ambiguity is always visible and explained

### Principle 4: Errors Are Factual
- ❌ No softening language ("might be invalid")
- ❌ No editorial comments in error text
- ✅ Errors state what failed and why

### Principle 5: UI Never "Fixes" Backend
- ❌ No reinterpreting severity levels
- ❌ No hiding issues deemed "not important"
- ✅ UI is a transparent window into validation results

---

## 8. Implementation Order (DO NOT SKIP)

### Phase 1: Foundation (Week 1)
1. Create folder structure under `validation/`
2. Define TypeScript models in `validation/model/`
3. Implement explanation registry in `validation/explainers/`
4. Write unit tests for explainers

### Phase 2: Core Components (Week 1-2)
1. `ValidationSummary` component
2. `ValidationIssueRow` component
3. `ValidationIssueDetails` component
4. `AmbiguityBanner` component

### Phase 3: Views (Week 2)
1. `ValidationResultsView` (compose components)
2. `ValidationCapabilitiesView` (static page)

### Phase 4: Integration (Week 2-3)
1. Create route pages under `pages/validation/`
2. Wire up navigation
3. Add links from main app to `/validation/capabilities`

### Phase 5: Polish (Week 3)
1. Accessibility audit
2. Responsive design testing
3. Documentation updates

---

## 9. Acceptance Criteria

Phase 5 is complete when:

### Functional Criteria
- ✅ Users can view all validation issues
- ✅ Users can expand details for any issue
- ✅ Users understand why each issue occurred
- ✅ Ambiguity is always visible and explained
- ✅ Policy mode is always visible
- ✅ Capabilities page matches backend reality

### Architectural Criteria
- ✅ All validation UI lives under `validation/` module
- ✅ No generic components polluting shared folders
- ✅ Explanation logic is centralized
- ✅ No product features added
- ✅ No out-of-scope features implemented

### Design Criteria
- ✅ No false confidence signals (green checkmarks, "success")
- ✅ Warnings presented as factual, not dismissible
- ✅ Ambiguity impossible to miss
- ✅ Errors are clear and traceable

### Quality Criteria
- ✅ TypeScript types are strict and complete
- ✅ Components are tested
- ✅ Explanations are tested
- ✅ Accessibility standards met (WCAG 2.1 AA)

---

## 10. Anti-Patterns (FORBIDDEN)

### Anti-Pattern 1: Generic Error Components
```typescript
// ❌ WRONG: Generic, reusable error card
<ErrorCard error={issue} />

// ✅ RIGHT: Validation-specific component
<ValidationIssueDetails issue={issue} />
```

### Anti-Pattern 2: String Concatenation in Components
```typescript
// ❌ WRONG: Building explanation in JSX
<div>{issue.message + " at " + issue.path}</div>

// ✅ RIGHT: Using explainer registry
<div>{explainError(issue).what}</div>
```

### Anti-Pattern 3: Hiding Ambiguity
```typescript
// ❌ WRONG: Collapsing ambiguous issues
{!showAdvanced && filterAmbiguous(issues)}

// ✅ RIGHT: Always showing ambiguity
{issues.map(issue => <IssueRow issue={issue} />)}
```

### Anti-Pattern 4: Reinterpreting Severity
```typescript
// ❌ WRONG: Downgrading severity in UI
const displaySeverity = issue.severity === 'error' && !issue.details.profile
  ? 'warning'
  : issue.severity;

// ✅ RIGHT: Displaying severity exactly as received
const displaySeverity = issue.severity;
```

### Anti-Pattern 5: Inventing Product Features
```typescript
// ❌ WRONG: Adding "fix" button
<button onClick={() => autoFix(issue)}>Fix This</button>

// ✅ RIGHT: Only explanation, no actions
<button onClick={() => showDetails(issue)}>Show Details</button>
```

---

## 11. Testing Strategy

### Unit Tests
- **explainers/**: Every error code has a test
- **components/**: Snapshot tests for rendering
- **models/**: Type safety tests

### Integration Tests
- **views/**: Full validation result rendering
- **flows/**: User can navigate issue details
- **accessibility/**: Screen reader compatibility

### Visual Regression Tests
- Severity icons render correctly
- Ambiguity banner is visible
- Policy badge is prominent

---

## 12. Documentation Requirements

### Code Documentation
- TSDoc comments on all public interfaces
- Explanation registry is self-documenting
- Component props are typed and documented

### User Documentation
- "What We Validate" page is complete
- Help text for ambiguity scenarios
- Policy mode explanation in UI

### Developer Documentation
- Phase 5 implementation guide
- Component usage examples
- Explanation registry extension guide

---

## 13. Success Metrics

Phase 5 is successful if:

1. **Clarity**: Users understand validation results without asking for help
2. **Trust**: Users trust that validation is honest about limitations
3. **Auditability**: Compliance officers can trace every validation decision
4. **Maintainability**: New error codes can be added without UI refactoring
5. **Architectural Integrity**: No scope violations, folder structure is clean

---

## 14. Phase 5 Deliverables Checklist

### Code Deliverables
- [ ] `validation/model/` TypeScript interfaces
- [ ] `validation/explainers/` explanation registry
- [ ] `validation/components/` UI components
- [ ] `validation/views/` page views
- [ ] `pages/validation/` route pages

### Documentation Deliverables
- [ ] Component documentation
- [ ] Explanation registry guide
- [ ] User-facing capabilities page
- [ ] Developer implementation guide

### Testing Deliverables
- [ ] Unit tests for explainers
- [ ] Component tests
- [ ] Integration tests for views
- [ ] Accessibility audit report

---

## 15. Phase 5 Closure Criteria

Phase 5 is closed when:

1. All acceptance criteria are met
2. All deliverables are complete
3. No scope violations introduced
4. Code review passed
5. UX review passed
6. Accessibility audit passed
7. Documentation complete
8. Tests passing

**Phase 5 does NOT include:**
- Backend validation changes
- Product feature additions
- Workflow implementations
- Data management features

---

## Revision History

| **Version** | **Date**       | **Change**                          | **Author**         |
|-------------|----------------|-------------------------------------|--------------------|
| 1.0         | January 8, 2026 | Initial Phase 5 specification       | Architecture Team  |

---

**Document Control:**
- **Owner:** Frontend Architecture Lead
- **Approvers:** Technical Leadership, UX Lead
- **Review Cycle:** After implementation completion
- **Status:** Ready for Implementation

---

**END OF PHASE 5 SPECIFICATION**
