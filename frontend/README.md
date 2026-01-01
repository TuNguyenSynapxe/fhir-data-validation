# FHIR Processor V2 — Frontend

React + TypeScript + Vite frontend for the FHIR Processor V2 Engine.

## 📚 Documentation

### Active Documentation
- **[docs/README.md](./docs/README.md)** - Documentation navigation index
- **[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)** - Frontend architecture and structure
- **[docs/VALIDATION_FLOW.md](./docs/VALIDATION_FLOW.md)** - Complete validation pipeline guide
- **[docs/REFACTORING_HISTORY.md](./docs/REFACTORING_HISTORY.md)** - Chronological refactoring history
- **[docs/features/](./docs/features/)** - Feature-specific implementation guides

### Reference Guides
- **[PHASE_4_QUICK_REFERENCE.md](./PHASE_4_QUICK_REFERENCE.md)** - Quick reference for instance scope patterns
- **[RULE_MESSAGE_TEMPLATE_ARCHITECTURE.md](./RULE_MESSAGE_TEMPLATE_ARCHITECTURE.md)** - Message template system
- **[SMART_PATH_NAVIGATION_NEAREST_PARENT.md](./SMART_PATH_NAVIGATION_NEAREST_PARENT.md)** - Smart path navigation
- **[NESTED_ARRAY_REFINEMENT_GUIDE.md](./NESTED_ARRAY_REFINEMENT_GUIDE.md)** - Array navigation patterns
- **[MINIMAL_DIFF_IMPLICIT_ARRAY_TRAVERSAL.md](./MINIMAL_DIFF_IMPLICIT_ARRAY_TRAVERSAL.md)** - Array traversal guide
- **[EXPLANATION_UI_TESTING_GUIDE.md](./EXPLANATION_UI_TESTING_GUIDE.md)** - Testing explanations

### Implementation History
- **[archive/implementation-docs/](./archive/implementation-docs/)** - Completed feature implementations

## 🚀 Quick Start

### Install Dependencies
```bash
npm install
```

### Development Server
```bash
npm run dev
```

### Build for Production
```bash
npm run build
```

### Type Check
```bash
npx tsc --noEmit
```

## 🏗️ Tech Stack

- **React 18.3.1** - UI library
- **TypeScript 5.x** - Type safety (strict mode)
- **Vite 7.2.7** - Build tool (~595KB bundle)
- **TanStack Query v5** - Server state management
- **React Router** - SPA routing
- **Tailwind CSS** - Utility-first styling

## 📁 Project Structure

```
frontend/
├── docs/              # Documentation
├── public/            # Static assets
├── src/
│   ├── components/    # React components
│   ├── contexts/      # React Context providers
│   ├── hooks/         # Custom React hooks
│   ├── pages/         # Route pages
│   ├── services/      # Business logic (pure functions)
│   ├── types/         # TypeScript type definitions
│   └── utils/         # Utility functions
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## �� Key Features

- **Validation State Machine** - NoBundle → NotValidated → Validated/Failed
- **Tree-Based Rule Creation** - Visual rule editor with path navigation
- **Terminology Constraints** - Code system and allowed codes validation
- **Validation Source Labeling** - Clear distinction between error sources
- **Prop Grouping** - Semantic prop interfaces (86% reduction)
- **Validation Context** - Eliminates prop drilling via Context API

## 🔗 Related Documentation

- **Backend**: `/backend/docs/`
- **Overall Specs**: `/docs/` (architecture, rule DSL, validation pipeline)
- **Project Root**: Main README.md
