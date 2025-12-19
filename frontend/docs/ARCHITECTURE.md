# Frontend Architecture

## Tech Stack

**Core**:
- React 18.3.1 (UI library)
- TypeScript 5.x (strict mode, verbatimModuleSyntax)
- Vite 7.2.7 (build tool)

**State Management**:
- TanStack Query v5 (server state - projects, validation)
- React Context API (validation state sharing)
- React hooks (local state)

**Routing**:
- React Router
- Routes: `/` (ProjectsPage), `/projects/:id` (PlaygroundPage)

**Styling**:
- Tailwind CSS (utility-first)
- PostCSS + Autoprefixer

**Build**:
- Bundle size: ~595KB (gzipped)
- Modules: 1927
- Build time: ~2s

## Directory Structure

```
frontend/
├── docs/                      # Documentation (this folder)
│   ├── README.md             # Navigation index
│   ├── ARCHITECTURE.md       # This file
│   ├── VALIDATION_FLOW.md    # Validation pipeline
│   ├── REFACTORING_HISTORY.md # Major refactors
│   └── features/             # Feature-specific guides
│
├── public/                    # Static assets
├── src/
│   ├── components/           # React components
│   │   ├── common/          # Shared UI components
│   │   │   ├── RightPanel.tsx
│   │   │   ├── RightPanelContainer.tsx
│   │   │   └── ValidationContextBar.tsx
│   │   └── playground/      # Project-specific components
│   │       ├── Overview/    # Overview panel
│   │       ├── Rules/       # Rules panel (tree editor)
│   │       └── Validation/  # Validation panel
│   │
│   ├── contexts/            # React Context providers
│   │   └── project-validation/
│   │       ├── ProjectValidationContext.tsx
│   │       └── useProjectValidation.ts
│   │
│   ├── hooks/               # Custom React hooks
│   │   ├── usePlayground.ts      # TanStack Query wrappers
│   │   └── useValidationState.ts # Validation state machine
│   │
│   ├── pages/               # Route pages
│   │   ├── ProjectsPage.tsx     # Projects list
│   │   └── PlaygroundPage.tsx   # Main project editor
│   │
│   ├── services/            # Business logic (pure functions)
│   │   └── bundleAnalysisService.ts
│   │
│   ├── types/               # TypeScript type definitions
│   │   ├── rightPanelProps.ts   # Semantic prop groups
│   │   └── validationState.ts   # Validation state model
│   │
│   ├── utils/               # Utility functions
│   │   └── validationLayers.ts  # Validation source metadata
│   │
│   └── AppRouter.tsx        # Route configuration
│
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## Key Architectural Patterns

### 1. Custom Hooks for Lifecycle Management

**`useProjectValidation`** (186 lines):
- Centralized validation lifecycle
- API integration: POST `/api/projects/:id/validate`
- State: `result`, `isValidating`, `error`, `trigger`
- Actions: `runValidation()`, `setResult()`, `clearError()`, `triggerValidation()`

**`useValidationState`** (state machine):
- Derives validation state from bundle/rules/results
- States: `NoBundle`, `NotValidated`, `Validated`, `Failed`
- Returns metadata: error counts, breakdown by source

**`usePlayground`**:
- TanStack Query wrappers for project CRUD
- Handles loading, error states

### 2. Context API for Validation

**`ProjectValidationContext`**:
- Eliminates prop drilling for validation state
- Wraps validation subtree (RightPanelContainer + children)
- Pattern: Receives values from parent's `useProjectValidation` hook
- Consumed by: ValidationPanel, OverviewPanel, ValidationContextBar

### 3. Semantic Prop Grouping

**Problem**: 70+ flat props across component layers caused fragility

**Solution**: 10 grouped interfaces in `types/rightPanelProps.ts`
- `ValidationProps` (9 props) - validation lifecycle
- `RulesProps` (6 props) - rules management
- `CodeMasterProps` (5 props) - code system editor
- `ValidationSettingsProps` (5 props) - settings editor
- `MetadataProps` (1 prop) - project metadata
- `BundleProps` (5 props) - FHIR bundle data
- `NavigationProps` (4 props) - navigation callbacks
- `ModeControlProps` (5 props) - mode/tab navigation
- `UIStateProps` (2 props) - UI state
- `FeatureFlagsProps` (3 props) - feature flags

**Result**: 86% reduction in prop count, clearer ownership

### 4. Service Layer for Business Logic

**`bundleAnalysisService.ts`** (120 lines):
- Pure functions for FHIR bundle analysis
- `analyzeFhirBundle()` - extracts resource types, counts, paths
- `isRulePathObserved()` - checks if rule path exists in bundle
- Zero dependencies, fully testable

### 5. Controlled Components

Components receive state and callbacks as props (no internal API calls):
- **ValidationPanel**: Controlled by ProjectValidationContext
- **RulesPanel**: Receives rules + setRules from parent
- **CodeMasterPanel**: Receives codeMaster + setCodeMaster from parent

## Data Flow

### Validation Lifecycle

```
PlaygroundPage
  ├─ useProjectValidation()            # Hook manages validation
  │   ├─ result: ValidationResult?
  │   ├─ isValidating: boolean
  │   ├─ error: Error?
  │   └─ runValidation()               # Triggers POST /api/validate
  │
  └─ ProjectValidationProvider         # Context wraps children
      ├─ value={validationContext}
      └─ children
          ├─ RightPanelContainer
          │   └─ RightPanel
          │       ├─ ValidationPanel   # Consumes context
          │       ├─ OverviewPanel     # Consumes context
          │       └─ ValidationContextBar # Consumes context
          │
          └─ Other components
```

### Component Communication

```
PlaygroundPage
  ├─ State: bundle, rules, codeMaster, settings, metadata
  │
  ├─ Derived State:
  │   ├─ validationState (from useValidationState hook)
  │   ├─ validationMetadata (error counts, breakdown)
  │   └─ bundleAnalysis (from bundleAnalysisService)
  │
  └─ Props (grouped):
      ├─ validation (from ProjectValidationContext)
      ├─ rules { rulesJson, setRulesJson, ... }
      ├─ codeMaster { codeMasterJson, setCodeMasterJson, ... }
      ├─ validationSettings { ... }
      ├─ metadata { projectId }
      ├─ bundle { bundleJson, setBundleJson, ... }
      ├─ navigation { onNavigateToPath, onNavigateToError }
      ├─ mode { currentMode, currentTab, ... }
      ├─ ui { ... }
      └─ features { featureFlags }
```

## Validation Sources

All validation sources are labeled and color-coded:

| Source | Label | Color | Blocking | Description |
|--------|-------|-------|----------|-------------|
| LINT | Lint (Best-effort) | Yellow | NO | Portability checks |
| SPEC_HINT | HL7 Advisory | Blue | NO | HL7 FHIR spec guidance |
| FHIR | FHIR Structural Validation | Red | YES | Firely engine validation |
| Reference | Reference Validation | Rose | YES | Bundle integrity (not a rule) |
| PROJECT | Project Rule | Purple | YES | User-defined rules |
| CodeMaster | Code System Validation | Orange | YES | System code validation |

## Build Configuration

**TypeScript**: Strict mode
- `noImplicitAny`: true
- `strictNullChecks`: true
- `verbatimModuleSyntax`: true (requires `import type` for types)

**Vite**: Fast build with HMR
- Plugin: `@vitejs/plugin-react`
- Output: `dist/assets/index-*.js` (~595KB)

**ESLint**: Type-aware linting (optional)

## Testing

**Unit Tests**:
- `services/__tests__/bundleAnalysisService.test.ts` (12 test cases)

**Manual Testing**:
- Verify validation flow: load bundle → run validation → check results
- Test state transitions: NoBundle → NotValidated → Validated/Failed
- Verify context updates: validation result propagates to all consumers

## Performance Considerations

- **TanStack Query**: Automatic caching, deduplication, background refetching
- **React.memo**: Used selectively for expensive renders
- **useMemo/useCallback**: Used for expensive computations and stable callbacks
- **Bundle size**: Monitored (~595KB target)

## Related Documentation

- [VALIDATION_FLOW.md](./VALIDATION_FLOW.md) - Detailed validation pipeline
- [REFACTORING_HISTORY.md](./REFACTORING_HISTORY.md) - Architecture evolution
- [features/](./features/) - Feature-specific implementations
