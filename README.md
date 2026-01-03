# FHIR Processor V2 🏥

> A modern, rule-driven FHIR R4 validation and management system with an intuitive IDE-style interface.

[![.NET 8](https://img.shields.io/badge/.NET-8.0-512BD4?logo=dotnet)](https://dotnet.microsoft.com/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![FHIR R4](https://img.shields.io/badge/FHIR-R4-orange)](https://hl7.org/fhir/R4/)

---

## 🎯 Overview

FHIR Processor V2 is an enterprise-grade validation engine that combines:
- **Firely SDK** for FHIR R4 structure validation
- **Custom business rules** with FHIRPath expressions
- **Terminology management** (CodeSystems, ValueSets)
- **Smart navigation** with breadcrumb-based error resolution
- **IDE-style playground** for rule authoring and testing

## 📚 Documentation

- **[PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)** - Complete project structure overview
- **[CHANGELOG.md](./CHANGELOG.md)** - Version history and changes
- **[Backend Documentation](./backend/README.md)** - Backend architecture and implementation
- **[Frontend Documentation](./frontend/README.md)** - Frontend architecture and guides
- **[Specification Docs](./docs/)** - Core architecture and specifications
- **[Implementation Archive](./archive/implementation-docs/)** - Completed cross-cutting implementations

---

## 🚀 Quick Start

### Prerequisites
- .NET 8 SDK
- Node.js 18+ & npm
- Git

### 1. Clone Repository
```bash
git clone <repository-url>
cd fhir_processor_v2
```

### 2. Start Backend
```bash
cd backend/src/Pss.FhirProcessor.Playground.Api
dotnet restore
dotnet run
# Backend runs at http://localhost:5143
```

### 3. Start Frontend
```bash
cd frontend
npm install
npm run dev
# Frontend runs at http://localhost:5173
```

### 4. Open Browser
Navigate to `http://localhost:5173` to access the playground.

---

## 📁 Project Structure

```
fhir_processor_v2/
├── backend/                    # .NET 8 Web API
│   ├── src/
│   │   ├── Pss.FhirProcessor.Playground.Api/    # Playground API
│   │   └── Pss.FhirProcessor.Engine/            # Validation Engine
│   └── tests/
│
├── frontend/                   # React + TypeScript UI
│   ├── src/
│   │   ├── components/        # UI Components
│   │   ├── pages/            # Page Components
│   │   ├── api/              # API Client
│   │   └── types/            # TypeScript Definitions
│   └── package.json
│
├── docs/                       # Core Specifications
│   ├── 01_architecture_spec.md
│   ├── 03_rule_dsl_spec.md
│   ├── 05_validation_pipeline.md
│   ├── 08_unified_error_model.md
│   └── archive/               # Historical Documents
│
├── examples/                   # Sample Data
│   ├── sample-bundle.json
│   └── sample-rules.json
│
└── README.md                   # This File
```

---

## 🔧 Key Features

### ✅ Validation Engine
- **Firely SDK Integration**: FHIR R4 structure validation
- **Business Rule Engine**: FHIRPath-based custom validation
- **Terminology Validation**: CodeSystem and ValueSet support
- **Error Classification**: Firely, Business, and System errors

### 📝 Rule Management
- **Rule DSL**: JSON-based rule definitions
- **Rule Types**: Required, ValueSet, Pattern, Conditional, Q&A, and more
- **Governance Mode**: Approval workflow for rule changes
- **Version Control**: Stage-based rule progression

### 🎨 User Interface
- **IDE-Style Layout**: Tree navigation, JSON editor, validation panel
- **Smart Navigation**: Click-to-navigate error resolution
- **Live Preview**: Real-time validation feedback
- **Terminology Browser**: CodeSystem and ValueSet management

### 📊 Terminology Management
- **CodeSystem Authoring**: Create and manage custom terminologies
- **Question Sets**: Map terminology to questionnaires
- **Import/Export**: CSV and JSON support

---

## 📚 Documentation

### Core Specifications
- [Architecture Overview](docs/01_architecture_spec.md)
- [Rule DSL Specification](docs/03_rule_dsl_spec.md)
- [Validation Pipeline](docs/05_validation_pipeline.md)
- [Unified Error Model](docs/08_unified_error_model.md)
- [Smart Path Navigation](docs/07_smart_path_navigation.md)

### Phase 1 STRUCTURE Validation (COMPLETE ✅)
- **[Phase 1 Complete](PHASE_1_COMPLETE.md)** — Formal phase closure
- **[STRUCTURE Coverage](docs/STRUCTURE_VALIDATION_COVERAGE_PHASE_1.md)** — Backend specification
- **[STRUCTURE Guardrails](docs/STRUCTURE_VALIDATION_GUARDRAILS.md)** — Architectural protection
- **[Frontend UI Semantics](FRONTEND_STRUCTURE_UI_SEMANTICS.md)** — Frontend implementation

**Status:** 🔒 Locked — 163 tests passing (134 backend + 29 frontend)

### Quick References
- [Backend Setup](backend/README.md)
- [Frontend Development](frontend/README.md)
- [API Documentation](backend/API_REFERENCE.md) _(if exists)_
- [Phase Reports Archive](docs/archive/phase-reports/)

---

## 🛠️ Development

### Backend Development
```bash
cd backend
dotnet build
dotnet test
dotnet run --project src/Pss.FhirProcessor.Playground.Api
```

### Frontend Development
```bash
cd frontend
npm run dev          # Development server
npm run build        # Production build
npm run lint         # Linting
npm run type-check   # TypeScript validation
```

### Running Tests
```bash
# Backend tests
cd backend
dotnet test

# Frontend tests (if configured)
cd frontend
npm test
```

---

## 🔄 Recent Updates (December 2025)

### ✨ Phase X: RequiredRuleForm UX Refactor
- Icon-based resource type selector
- Auto-set `FIELD_REQUIRED` error code
- Horizontal severity controls
- Collapsed error preview
- **Result**: 70% reduction in UI complexity

### 🐛 Build Fixes
- Fixed TypeScript CodeSystem type definitions
- Added FHIR R4 compatibility fields
- Unified CodeSetDto type aliases
- Converted API error handling to async/await pattern
- **Result**: Clean build with 0 errors

### 🗂️ Documentation Cleanup
- Moved 42 phase reports to `docs/archive/phase-reports/`
- Consolidated root-level markdown files
- Updated main README with modern structure
- Maintained essential documentation in `docs/`

---

## 🤝 Contributing

### General Guidelines
1. Create a feature branch: `git checkout -b feature/your-feature`
2. Follow existing code patterns and conventions
3. Ensure all tests pass: `dotnet test` and `npm test`
4. Update documentation if needed
5. Submit a pull request

### STRUCTURE Validation Changes
**Phase 1 is LOCKED** 🔒 — See [PHASE_1_COMPLETE.md](PHASE_1_COMPLETE.md)

**Bug fixes:** ✅ Allowed with tests + documentation update  
**New rules:** ⚠️ Require Phase 2 proposal + architectural review

Before modifying `JsonNodeStructuralValidator.cs`:
- Read the Phase Lock comment at top of file
- All 128 Phase 1 tests must continue passing
- Run `StructureValidationGuardrailTests` to verify compliance
- Update [STRUCTURE_VALIDATION_COVERAGE_PHASE_1.md](docs/STRUCTURE_VALIDATION_COVERAGE_PHASE_1.md) if behavior changes

---

## 📄 License

_Add your license information here_

---

## 📞 Support

- **Issues**: Submit via GitHub Issues
- **Documentation**: See `docs/` folder
- **Architecture**: See `.github/copilot-instructions.md`

---

**Built with ❤️ for healthcare interoperability**
