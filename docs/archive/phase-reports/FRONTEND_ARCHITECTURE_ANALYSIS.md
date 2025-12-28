# Frontend Architecture Analysis
**Date**: 19 December 2025  
**Status**: Current State Documentation (No Refactoring)

---

## Executive Summary

The FHIR Processor V2 frontend is a **React-based validation playground** for authoring FHIR validation rules. It operates in a **project-centric model** where users work on individual projects containing:
- FHIR bundles (samples to validate)
- Validation rules (FHIRPath-based constraints)
- CodeMaster (terminology mappings)
- Validation settings

The architecture exhibits **strong colocated state management** at the page level with **deep prop drilling** through a complex component hierarchy.

---

## 1. High-Level Folder Responsibility Map

```
frontend/src/
├── pages/                    # Top-level route components
│   ├── PlaygroundPage.tsx    ⚠️ MEGA-COMPONENT (483 lines)
│   │                         State owner for entire playground
│   │                         Manages: bundle, rules, validation, navigation
│   ├── ProjectsPage.tsx      Project list & creation
│   ├── LintDemoPage.tsx      Demo/prototype page
│   └── CoverageDemo.tsx      Demo/prototype page
│
├── components/
│   ├── playground/          # Playground-specific UI
│   │   ├── Bundle/          Bundle editor + tree view
│   │   ├── Rules/           ⚠️ Rule authoring (9 components)
│   │   │                    Contains business logic + UI
│   │   ├── Validation/      Validation results display (9 components)
│   │   ├── Overview/        Project status dashboard
│   │   ├── CodeMaster/      Terminology editor
│   │   ├── Settings/        Validation settings
│   │   └── Metadata/        Project metadata display
│   │
│   ├── common/              # Shared UI infrastructure
│   │   ├── RightPanelContainer.tsx  ⚠️ Mode/tab orchestrator
│   │   ├── RightPanel.tsx           Content switcher
│   │   └── ValidationContextBar.tsx Status strip
│   │
│   ├── rules/              # ⚠️ DUPLICATE: Tree-based rule authoring
│   │                       Separate context, overlapping concerns
│   │
│   └── [Various shared]    FHIR tree viewers, editors, selectors
│
├── hooks/                  # Custom React hooks
│   ├── usePlayground.ts    ✓ TanStack Query wrappers (server state)
│   ├── useValidationState.ts ✓ Validation lifecycle state machine
│   ├── useProjects.ts      Project list management
│   └── useRuleIntentState.ts Tree rule authoring state
│
├── api/                    # Backend API clients
│   ├── projectsApi.ts      Project CRUD + validation
│   ├── rulesApi.ts         Rule operations
│   └── fhirSchemaApi.ts    FHIR schema queries
│
├── utils/                  # ⚠️ Business logic (should be in engine)
│   ├── ruleSuggestionEngine.ts  Rule generation logic
│   ├── ruleCoverageEngine.ts    Coverage analysis
│   ├── validationLayers.ts      Validation source mapping
│   ├── smartPathNavigation.ts   Path resolution
│   ├── fhirPathNormalizer.ts    Path manipulation
│   └── [Various helpers]
│
├── types/                  # TypeScript definitions
│   ├── validationState.ts  ✓ Validation state enum
│   ├── rightPanel.ts       Panel mode constants
│   ├── project.ts          Project models
│   ├── validation.ts       Validation result types
│   ├── ruleIntent.ts       Tree rule authoring
│   └── [Various domain types]
│
└── layouts/               # Page layouts
    └── PlaygroundLayout.tsx Split-pane container
```

### Key Observations:
- **PlaygroundPage.tsx** is a 483-line state orchestrator managing 16+ useState declarations
- **components/playground/** contains domain-specific UI that also performs business logic
- **components/rules/** is a SEPARATE context for tree-based rule authoring (potential duplication)
- **utils/** contains business logic that should ideally live in the backend or dedicated services

---

## 2. State Ownership & Data Flow

### 2.1 State Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PlaygroundPage (Root)                     │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ LOCAL STATE (16 useState declarations)                 │ │
│  │ • bundleJson, codeMasterJson, validationSettings       │ │
│  │ • rules[], activeTab, rightPanelMode                   │ │
│  │ • validationResult, validationTrigger                  │ │
│  │ • original* (change tracking)                          │ │
│  │ • navigation feedback, tree focus, auto-focus ref     │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ DERIVED STATE (useMemo)                                │ │
│  │ • ruleAlignmentStats (placeholder)                     │ │
│  │ • currentRulesJson (stringified)                       │ │
│  │ • bundleChanged, rulesChanged (booleans)              │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ CUSTOM HOOKS                                           │ │
│  │ • useValidationState() → ValidationState enum         │ │
│  │ • useProject() → TanStack Query (server state)        │ │
│  │ • useSave*Mutation() → Optimistic updates            │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                          ↓ Props drilling
┌─────────────────────────────────────────────────────────────┐
│              PlaygroundLayout (Split container)              │
└─────────────────────────────────────────────────────────────┘
       ↓ (bundleContent)              ↓ (rulesContent)
┌──────────────────────┐      ┌──────────────────────────────┐
│   BundleTabs         │      │   RightPanelContainer        │
│   • Bundle editor    │      │   • Mode tabs                │
│   • Tree view        │      │   • Sub-tabs                 │
└──────────────────────┘      │   • ValidationContextBar     │
                               └──────────────────────────────┘
                                          ↓ More props
                               ┌──────────────────────────────┐
                               │      RightPanel              │
                               │      • Mode switcher         │
                               └──────────────────────────────┘
                                          ↓ Even more props
                  ┌────────────┬────────────┬────────────────┐
                  │            │            │                │
            OverviewPanel  RulesPanel  ValidationPanel  CodeMaster
```

### 2.2 State Flow Patterns

**Pattern 1: Server State (TanStack Query)**
```
useProject(projectId)
  ↓
React Query cache
  ↓
PlaygroundPage receives `project`
  ↓
useEffect initializes local state from `project`
  ↓
User edits (local state)
  ↓
Save mutations → invalidate cache → refetch
```

**Pattern 2: Validation State Machine**
```
useValidationState(bundleJson, validationResult, bundleChanged, rulesChanged)
  ↓
Derives ValidationState enum: NoBundle | NotValidated | Validated | Failed
  ↓
Passed down to all panels for UI conditional logic
  ↓
Auto-focus effect: Failed → switch to Validation mode (once)
```

**Pattern 3: Props Drilling**
```
PlaygroundPage (owns 16+ state variables)
  ↓ passes 70+ props
RightPanelContainer
  ↓ passes 60+ props
RightPanel
  ↓ splits by mode
RulesPanel / ValidationPanel / OverviewPanel
  ↓ pass down more props
RuleList → RuleGroup → RuleRow → RuleCardExpanded
```

### 2.3 Change Detection Pattern
```typescript
// PlaygroundPage maintains parallel "original" state
const [bundleJson, setBundleJson] = useState('');
const [originalBundleJson, setOriginalBundleJson] = useState('');

const bundleChanged = bundleJson !== originalBundleJson;

// On save:
setOriginalBundleJson(bundleJson); // Reset change flag
```

---

## 3. Component Responsibility Analysis

### 3.1 PlaygroundPage.tsx (483 lines)

**Responsibilities (Too Many):**
1. Project data fetching (TanStack Query)
2. All local state management (16 useState)
3. Change tracking (4 "original" states)
4. Validation lifecycle (result, trigger, state derivation)
5. Navigation coordination (Smart Path, tree focus, mode switching)
6. Auto-focus logic (validation failure → Validation mode)
7. Event handlers for all child components
8. HL7 samples fetching
9. Feature flag updates

**State Declarations:**
```typescript
const [bundleJson, setBundleJson] = useState('');
const [codeMasterJson, setCodeMasterJson] = useState('');
const [validationSettings, setValidationSettings] = useState<ValidationSettings>(...);
const [rules, setRules] = useState<Rule[]>([]);
const [activeTab, setActiveTab] = useState<'overview' | 'rules' | ...>('overview');
const [hl7Samples, setHl7Samples] = useState<FhirSampleMetadata[]>([]);
const [ruleSuggestions, setRuleSuggestions] = useState<any[]>([]);
const [validationResult, setValidationResult] = useState<any>(null);
const [validationTrigger, setValidationTrigger] = useState<number>(0);
const [rightPanelMode, setRightPanelMode] = useState<RightPanelMode>(...);
const [originalBundleJson, setOriginalBundleJson] = useState('');
const [originalCodeMasterJson, setOriginalCodeMasterJson] = useState('');
const [originalValidationSettings, setOriginalValidationSettings] = useState<ValidationSettings>(...);
const [originalRulesJson, setOriginalRulesJson] = useState('');
const [_navigationFeedback, setNavigationFeedback] = useState<string | null>(null);
const [treeViewFocused, setTreeViewFocused] = useState(false);
```

**Architectural Smell**: God Component / State Bloat

---

### 3.2 RulesPanel.tsx (672 lines)

**Responsibilities:**
1. Bundle analysis (recursive path extraction) ⚠️ Business logic
2. Observation indicators (rule-to-bundle alignment) ⚠️ Business logic
3. Rule filtering (search, type, severity, origin, observation status)
4. Rule CRUD operations
5. Rule export
6. Suggested rules display
7. Tree rule authoring mode selection
8. Advanced rules drawer
9. ValidationState-based gating (disable editing when Failed)

**Bundle Analysis Logic (Lines 70-115):**
```typescript
const bundleAnalysis = useMemo(() => {
  // Recursively extracts paths from bundle
  const collectPaths = (obj: any, prefix: string) => {
    // ... complex path extraction logic
  };
  // Returns: observedResourceTypes, observedPaths
}, [projectBundle]);
```

**Architectural Smell**: UI Component Contains Business Logic (bundle analysis should be utility/service)

---

### 3.3 ValidationPanel.tsx (534 lines)

**Responsibilities:**
1. Validation API calls (POST /validate)
2. Validation result storage (local state)
3. Validation state derivation (calls useValidationState hook)
4. Error grouping and filtering
5. Severity counting
6. Source filtering (Firely, Business, CodeMaster, etc.)
7. Error navigation (Smart Path)
8. Rule suggestions extraction
9. External trigger handling (triggerValidation prop)

**State Management:**
```typescript
const [isValidating, setIsValidating] = useState(false);
const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
const [error, setError] = useState<string | null>(null);
const [selectedSources, setSelectedSources] = useState<Set<string>>(new Set());
const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

// ALSO derives state from hook:
const { state: validationState, metadata: validationMetadata } = useValidationState(
  bundleJson, null, bundleChanged, rulesChanged
);
```

**Issue**: ValidationPanel has its OWN `validationResult` state, but PlaygroundPage ALSO has `validationResult` state. Potential for state desync.

---

### 3.4 RightPanelContainer.tsx (231 lines)

**Responsibilities:**
1. Mode tab rendering (Rules, Validation, Observations)
2. Sub-tab rendering (Overview, Rules, CodeMaster, Metadata, Settings)
3. ValidationContextBar display
4. Props aggregation and forwarding (70+ props)

**Props Interface:**
```typescript
interface RightPanelContainerProps {
  // Mode control
  currentMode: RightPanelMode;
  onModeChange?: (mode: RightPanelMode) => void;
  
  // Rules mode props (10+)
  activeTab?: 'overview' | 'rules' | 'codemaster' | 'metadata' | 'settings';
  rules?: Rule[];
  onRulesChange?: (rules: Rule[]) => void;
  // ... many more
  
  // Validation mode props (10+)
  projectId?: string;
  onSelectError?: (error: any) => void;
  // ... many more
  
  // Validation state props (5+)
  validationState?: string;
  validationMetadata?: { errorCount?: number; warningCount?: number; };
  // ... and so on
}
```

**Architectural Smell**: Props Explosion (70+ props passed through)

---

## 4. Shared Module Analysis

### 4.1 Utils (Business Logic in Frontend)

**ruleSuggestionEngine.ts (477 lines)**
- **Purpose**: Deterministic rule suggestion based on bundle/sample analysis
- **Concern**: Complex business logic in frontend
- **Should be**: Backend service or at minimum, a dedicated engine module

**ruleCoverageEngine.ts**
- **Purpose**: Rule-to-schema coverage analysis
- **Concern**: Heavy computation in browser

**validationLayers.ts**
- **Purpose**: Normalize validation source names (FHIR, Business, CodeMaster, etc.)
- **Status**: Reasonable utility (mapping layer)

**smartPathNavigation.ts**
- **Purpose**: JSON Pointer resolution and path existence checking
- **Concern**: Business logic for navigation

**fhirPathNormalizer.ts**
- **Purpose**: FHIRPath manipulation (wildcards, parent paths, matching)
- **Status**: Reasonable utility but complex

### 4.2 Hooks

**useValidationState.ts**
- **Status**: ✅ Well-designed state machine
- **Responsibilities**: Single source of truth for validation lifecycle
- **Pattern**: Derives state from inputs (bundle, validationResult, changed flags)

**usePlayground.ts**
- **Status**: ✅ Clean TanStack Query wrappers
- **Pattern**: Server state management (fetch, mutations, invalidation)

**useRuleIntentState.ts**
- **Purpose**: Tree-based rule authoring state management
- **Concern**: Separate context from main rules flow

---

## 5. Dependency Flow Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                      EXTERNAL DEPENDENCIES                    │
├──────────────────────────────────────────────────────────────┤
│  React, React Router, TanStack Query, Lucide Icons, DayJS   │
└──────────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────────┐
│                         API LAYER                             │
├──────────────────────────────────────────────────────────────┤
│  projectsApi.ts  │  rulesApi.ts  │  fhirSchemaApi.ts        │
│  ↓ HTTP Client (axios)                                       │
└──────────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────────┐
│                      CUSTOM HOOKS                             │
├──────────────────────────────────────────────────────────────┤
│  usePlayground → TanStack Query → projectsApi                │
│  useValidationState → Derives state from props               │
│  useProjects → TanStack Query → projectsApi                  │
└──────────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────────┐
│                       PAGE LAYER                              │
├──────────────────────────────────────────────────────────────┤
│  PlaygroundPage (State Owner)                                │
│    ↓ uses hooks                                              │
│    ↓ manages 16+ local states                                │
│    ↓ passes 70+ props down                                   │
└──────────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────────┐
│                    LAYOUT LAYER                               │
├──────────────────────────────────────────────────────────────┤
│  PlaygroundLayout (Split pane)                               │
└──────────────────────────────────────────────────────────────┘
           ↓ (left)                          ↓ (right)
┌─────────────────────────┐    ┌────────────────────────────────┐
│     Bundle Section      │    │    Right Panel Section         │
├─────────────────────────┤    ├────────────────────────────────┤
│  BundleTabs             │    │  RightPanelContainer           │
│  ├─ BundleJsonEditor    │    │  ├─ ValidationContextBar      │
│  ├─ BundleTree          │    │  ├─ Mode Tabs                 │
│  └─ SampleSelector      │    │  └─ RightPanel                │
└─────────────────────────┘    │     ├─ OverviewPanel          │
                                │     ├─ RulesPanel             │
                                │     ├─ ValidationPanel        │
                                │     ├─ CodeMaster             │
                                │     └─ Settings               │
                                └────────────────────────────────┘
                                          ↓ (Rules mode)
                                ┌────────────────────────────────┐
                                │      RulesPanel               │
                                ├────────────────────────────────┤
                                │  ├─ RuleFilters               │
                                │  ├─ RuleNavigator             │
                                │  ├─ RuleList                  │
                                │  │  └─ RuleGroup              │
                                │  │     └─ RuleRow             │
                                │  │        └─ RuleCardExpanded │
                                │  ├─ RuleEditorModal           │
                                │  ├─ SuggestedRulesPanel       │
                                │  └─ AdvancedRulesDrawer       │
                                └────────────────────────────────┘
                                          ↓ (uses)
┌──────────────────────────────────────────────────────────────┐
│                    UTILS / BUSINESS LOGIC                     │
├──────────────────────────────────────────────────────────────┤
│  ruleSuggestionEngine  │  ruleCoverageEngine                 │
│  validationLayers      │  smartPathNavigation                │
│  fhirPathNormalizer    │  validationExplanations             │
└──────────────────────────────────────────────────────────────┘
```

### Key Dependency Issues:

1. **Circular Concern**: `RulesPanel` imports `ValidationState` type, but validation logic also depends on rules
2. **Tight Coupling**: All panels depend on massive prop interfaces from parent
3. **Business Logic Leak**: UI components call utils that contain domain logic
4. **Duplicate Contexts**: `components/rules/` tree authoring vs `components/playground/Rules/` list authoring

---

## 6. Cross-Dependencies & Coupling

### 6.1 Component to Component

```
PlaygroundPage
  ├─→ RightPanelContainer (70+ props)
  │    ├─→ ValidationContextBar (validation state)
  │    └─→ RightPanel (60+ props)
  │         ├─→ OverviewPanel
  │         ├─→ RulesPanel
  │         │    ├─→ RuleList → RuleGroup → RuleRow → RuleCardExpanded
  │         │    ├─→ RuleEditorModal
  │         │    ├─→ SuggestedRulesPanel
  │         │    └─→ AdvancedRulesDrawer
  │         │         └─→ TreeBasedRuleCreator (from components/rules/)
  │         ├─→ ValidationPanel
  │         ├─→ CodeMasterEditor
  │         └─→ ValidationSettingsEditor
  │
  └─→ BundleTabs
       ├─→ BundleJsonEditor
       ├─→ BundleTree
       └─→ SampleSelector
```

### 6.2 Component to Utils

```
RulesPanel
  ├─→ utils/ruleSuggestionEngine (bundle analysis)
  └─→ utils/fhirPathNormalizer (path matching)

ValidationPanel
  ├─→ api/projectsApi (validation API)
  └─→ utils/validationLayers (source normalization)

RuleEditorModal
  ├─→ utils/ruleIntentValidation
  └─→ utils/schemaEligibility

TreeBasedRuleCreator
  ├─→ utils/ruleCoverageEngine
  ├─→ utils/fhirPathValueExtractor
  └─→ utils/ruleIntentValidation
```

### 6.3 Unclear Boundaries

**Problem 1: Two Rule Authoring Contexts**
- `components/playground/Rules/` - List-based authoring (used in main playground)
- `components/rules/` - Tree-based authoring (feature-flagged, separate state)
- **Risk**: Duplication, inconsistent UX, unclear migration path

**Problem 2: Validation State Duplication**
- `PlaygroundPage.validationResult` (state)
- `ValidationPanel.validationResult` (local state)
- `useValidationState()` (derived state)
- **Risk**: Desync between sources, unclear source of truth

**Problem 3: Bundle Analysis Location**
- `RulesPanel.bundleAnalysis` (useMemo in component)
- `ruleCoverageEngine.analyzeCoverage()` (utils)
- **Risk**: Duplicate logic, performance concerns

---

## 7. Architectural Smells & Risks

### 7.1 Critical Smells

#### **Smell 1: God Component (PlaygroundPage)**
- **Evidence**: 483 lines, 16 useState, 70+ props passed down
- **Risk**: Unmaintainable, testing difficult, prop drilling hell
- **Impact**: HIGH - Central orchestrator failure affects entire app

#### **Smell 2: Business Logic in UI Components**
- **Evidence**: RulesPanel contains bundle path extraction logic (lines 70-115)
- **Risk**: Logic duplication, testing complexity, performance
- **Impact**: MEDIUM - Logic should be in services/utils

#### **Smell 3: Props Explosion**
- **Evidence**: RightPanelContainer receives 70+ props
- **Risk**: Fragile change propagation, unclear contracts
- **Impact**: HIGH - Impossible to refactor without breaking changes

#### **Smell 4: State Duplication**
- **Evidence**: validationResult in multiple places
- **Risk**: Desync, unclear source of truth
- **Impact**: MEDIUM - Data consistency issues

#### **Smell 5: Heavy Utils (Business Logic in Frontend)**
- **Evidence**: ruleSuggestionEngine.ts (477 lines), ruleCoverageEngine.ts
- **Risk**: Should be backend services, browser performance
- **Impact**: LOW-MEDIUM - Works but not optimal

#### **Smell 6: Unclear Context Boundaries**
- **Evidence**: `components/rules/` vs `components/playground/Rules/`
- **Risk**: Feature confusion, migration complexity
- **Impact**: MEDIUM - Unclear which to use

### 7.2 Risks by Category

**Maintainability Risks:**
1. ⚠️ **HIGH**: PlaygroundPage is too large - single point of failure
2. ⚠️ **HIGH**: Props drilling makes refactoring dangerous
3. ⚠️ **MEDIUM**: Business logic in UI components hard to test
4. ⚠️ **MEDIUM**: Utils contain backend-worthy logic

**Performance Risks:**
1. ⚠️ **MEDIUM**: Bundle analysis runs in UI component (should be memoized elsewhere)
2. ⚠️ **LOW**: Rule suggestion engine runs client-side (should be server)

**Consistency Risks:**
1. ⚠️ **MEDIUM**: Multiple validation result sources
2. ⚠️ **MEDIUM**: Two rule authoring systems (list vs tree)

**Scalability Risks:**
1. ⚠️ **HIGH**: Adding new features requires modifying God component
2. ⚠️ **MEDIUM**: Props explosion makes component composition fragile

---

## 8. Positive Patterns (What Works Well)

### ✅ Good Patterns:

1. **TanStack Query for Server State**
   - Clean separation of server state management
   - Automatic caching, invalidation, and refetching
   - `usePlayground.ts` is a good abstraction

2. **ValidationState State Machine**
   - Single source of truth for validation lifecycle
   - Clear states: NoBundle → NotValidated → Validated/Failed
   - Derived from props, no hidden state

3. **Type Safety**
   - Comprehensive TypeScript definitions in `types/`
   - Well-defined interfaces for validation, rules, projects

4. **Component Organization**
   - Clear folder structure by domain (Bundle, Rules, Validation)
   - Colocated related components

5. **Utility Functions**
   - Pure functions with clear inputs/outputs
   - Testable (some have test files)
   - Well-documented (e.g., ruleSuggestionEngine)

---

## 9. Data Flow Summary

### Server State Flow:
```
Backend API
  ↓
TanStack Query (useProject hook)
  ↓
PlaygroundPage receives `project`
  ↓
useEffect initializes local state
  ↓
User edits (local state)
  ↓
Save mutations
  ↓
Query invalidation
  ↓
Refetch from server
```

### Validation State Flow:
```
User loads bundle → NoBundle → NotValidated
  ↓
User runs validation → API call
  ↓
Validation succeeds → Validated
Validation fails → Failed
  ↓
User edits bundle/rules → NotValidated (reset)
```

### UI State Flow:
```
PlaygroundPage (owns all state)
  ↓ props
RightPanelContainer (aggregator)
  ↓ props
RightPanel (mode switcher)
  ↓ props
OverviewPanel / RulesPanel / ValidationPanel (presentational + logic)
  ↓ callbacks
PlaygroundPage (updates state)
```

---

## 10. Architectural Constraints

### Current Constraints:

1. **Single Project Context**: All state scoped to one project at a time
2. **Browser-Side Validation**: Validation runs via backend API, but results managed client-side
3. **No Global State Management**: No Redux/Zustand, all state in PlaygroundPage
4. **Props-Based Communication**: No Context API or event bus
5. **Feature Flags**: Tree rule authoring behind feature flag
6. **Immutable Bundle**: Bundle is loaded, edited, saved - no real-time collaboration

### Technology Stack:
- **React 18** (hooks, functional components)
- **TypeScript** (strict mode)
- **TanStack Query v5** (server state)
- **React Router v6** (routing)
- **Tailwind CSS** (styling)
- **Lucide React** (icons)
- **Monaco Editor** (JSON editing)

---

## 11. Testing Coverage

### Current Test Files:
```
frontend/src/utils/__tests__/
├── smartPathFormatting.test.ts  ✅
└── (ruleCoverageEngine.test.ts.bak)  ⚠️ Disabled

frontend/tests/ (not shown in scan)
```

**Testing Gap**: No component tests found in this scan. High risk for UI regressions.

---

## 12. Summary & Next Steps

### Current Architecture Strengths:
1. ✅ Clear project-centric model
2. ✅ Good server state management (TanStack Query)
3. ✅ Well-defined validation state machine
4. ✅ Type-safe with comprehensive TypeScript
5. ✅ Organized folder structure by domain

### Critical Issues:
1. ⚠️ **PlaygroundPage is a God Component** (483 lines, 16 useState)
2. ⚠️ **Props Explosion** (70+ props through 3+ layers)
3. ⚠️ **Business Logic in UI** (bundle analysis in RulesPanel)
4. ⚠️ **State Duplication** (validationResult in multiple places)
5. ⚠️ **Unclear Boundaries** (two rule authoring contexts)

### Risk Assessment:
- **Maintainability**: 🔴 HIGH RISK
- **Scalability**: 🔴 HIGH RISK
- **Performance**: 🟡 MEDIUM RISK
- **Consistency**: 🟡 MEDIUM RISK

---

## Appendix: Component Dependency Matrix

| Component | Dependencies (Direct) | Lines | State Count | Props Count |
|-----------|----------------------|-------|-------------|-------------|
| PlaygroundPage | usePlayground, useValidationState, RightPanelContainer, BundleTabs | 483 | 16 | N/A (root) |
| RightPanelContainer | RightPanel, ValidationContextBar | 231 | 0 | 70+ |
| RightPanel | OverviewPanel, RulesPanel, ValidationPanel, etc. | ? | 0 | 60+ |
| RulesPanel | RuleList, RuleEditorModal, ruleSuggestionEngine | 672 | 8 | 10+ |
| ValidationPanel | ValidationResultList, useValidationState, projectsApi | 534 | 5 | 15+ |
| OverviewPanel | ValidationState, rules, validationResult | 348 | 0 | 9 |

---

**End of Analysis**

Next phase: Refactoring recommendations (to be documented separately)
