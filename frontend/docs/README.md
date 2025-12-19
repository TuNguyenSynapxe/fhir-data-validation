# Frontend Documentation

Welcome to the FHIR Processor V2 frontend documentation.

## 📚 Documentation Structure

### Core Documentation
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Current frontend structure, tech stack, and component organization
- **[VALIDATION_FLOW.md](./VALIDATION_FLOW.md)** - Complete validation pipeline (lint, Firely, project rules)
- **[REFACTORING_HISTORY.md](./REFACTORING_HISTORY.md)** - Chronological record of all major refactoring initiatives

### Implementation Guides
- **[features/](./features/)** - Feature-specific implementation details
  - Tree-based rule creation
  - Terminology constraints
  - Validation state management
  - Rule editor patterns
  - Array length validation
  - Non-blocking warnings
  - Coverage demo
  - Validated state enhancements

## 🎯 Quick Navigation

### For New Developers
Start with:
1. [ARCHITECTURE.md](./ARCHITECTURE.md) - Understand the codebase structure
2. [VALIDATION_FLOW.md](./VALIDATION_FLOW.md) - Learn how validation works
3. [features/INTEGRATION_GUIDE.md](./features/INTEGRATION_GUIDE.md) - Integration patterns

### For Understanding Past Changes
See [REFACTORING_HISTORY.md](./REFACTORING_HISTORY.md) for:
- Phase-1: Validation hook extraction (useProjectValidation)
- Phase-2: Prop grouping refactor (86% reduction)
- Phase-3: Validation context introduction
- UI refactors: Validation labeling, rule editor alignment

### For Implementing Features
Check [features/](./features/) directory for specific implementation guides.

## 🏗️ Architecture Overview

**Tech Stack**:
- React 18.3.1 + TypeScript 5.x
- TanStack Query v5 (server state)
- React Router (SPA routing)
- Vite 7.2.7 (build tool)

**Key Patterns**:
- Custom hooks for validation lifecycle (`useProjectValidation`, `useValidationState`)
- Context API for validation state (`ProjectValidationContext`)
- Semantic prop grouping (10 grouped interfaces)
- Service layer for business logic (`bundleAnalysisService`)

**Build Info**:
- Bundle size: ~595KB
- Modules: 1927
- Build time: ~2s

## 📋 Contributing

When adding new features or refactoring:
1. Document changes in appropriate files
2. Update ARCHITECTURE.md if structure changes
3. Add entry to REFACTORING_HISTORY.md for major refactors
4. Create feature-specific docs in features/ directory
5. Follow existing patterns (hooks, context, prop grouping)

## 🔗 Related Documentation

- Backend API: `/backend/docs/`
- Overall specs: `/docs/` (architecture, rule DSL, validation pipeline)
- Project root: Main README.md
