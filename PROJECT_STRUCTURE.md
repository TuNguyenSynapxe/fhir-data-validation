# FHIR Processor V2 - Project Structure

> **Last Updated**: December 28, 2025  
> **Status**: Active Development

---

## 📋 Overview

FHIR Processor V2 is a modern validation and rule management system for FHIR R4 resources featuring:
- Firely SDK integration for structural validation
- Custom business rule engine with FHIRPath
- IDE-style UI with smart navigation
- Terminology and CodeSystem management
- Real-time validation feedback

---

## 🗂️ Repository Structure

```
fhir_processor_v2/
├── 📄 README.md                         # Main documentation (START HERE)
├── 📄 CHANGELOG.md                      # Version history and changes
├── 📄 PROJECT_STRUCTURE.md              # This file
├── 📄 .github/copilot-instructions.md   # AI assistant guidelines
│
├── 📁 backend/                          # .NET 8 Backend Services
│   ├── 📄 README.md                    # Backend documentation
│   ├── 📄 QUICK_START.md               # Quick setup guide
│   ├── 📄 FhirProcessorV2.sln          # Solution file
│   ├── 📁 src/
│   │   ├── Pss.FhirProcessor.Playground.Api/     # REST API for playground
│   │   │   ├── Controllers/            # API endpoints
│   │   │   ├── Services/               # Business logic
│   │   │   └── data/                   # File-based storage
│   │   │
│   │   └── Pss.FhirProcessor.Engine/   # Core validation engine
│   │       ├── Validation/             # Validation pipeline
│   │       ├── Rules/                  # Rule processors
│   │       ├── Navigation/             # Smart path resolution
│   │       └── Models/                 # Domain models
│   │
│   └── 📁 tests/                       # Unit and integration tests
│       ├── Pss.FhirProcessor.Engine.Tests/
│       └── Pss.FhirProcessor.Playground.Api.Tests/
│
├── 📁 frontend/                         # React + TypeScript UI
│   ├── 📄 README.md                    # Frontend documentation
│   ├── 📄 package.json                 # Dependencies
│   ├── 📁 src/
│   │   ├── 📁 components/              # Reusable UI components
│   │   │   ├── playground/            # Playground-specific components
│   │   │   │   ├── Rules/             # Rule authoring UI
│   │   │   │   ├── Terminology/       # Terminology management
│   │   │   │   └── Validation/        # Validation results
│   │   │   ├── rules/                 # Rule tree & pickers
│   │   │   ├── validation/            # Error rendering
│   │   │   ├── terminology/           # CodeSystem UI
│   │   │   └── common/                # Shared components
│   │   │
│   │   ├── 📁 pages/                   # Page components
│   │   │   ├── PlaygroundPage.tsx     # Main IDE interface
│   │   │   ├── ProjectsPage.tsx       # Project management
│   │   │   └── TerminologyPage.tsx    # Terminology management
│   │   │
│   │   ├── 📁 api/                     # API client functions
│   │   │   ├── httpClient.ts          # Axios configuration
│   │   │   ├── projectsApi.ts         # Project endpoints
│   │   │   ├── rulesApi.ts            # Rule endpoints
│   │   │   ├── terminologyApi.ts      # Terminology endpoints
│   │   │   └── validationApi.ts       # Validation endpoints
│   │   │
│   │   ├── 📁 types/                   # TypeScript definitions
│   │   │   ├── rightPanelProps.ts     # Rule types
│   │   │   ├── terminology.ts         # CodeSystem types
│   │   │   ├── validation.ts          # Error types
│   │   │   └── ruleIntent.ts          # Rule authoring types
│   │   │
│   │   ├── 📁 hooks/                   # Custom React hooks
│   │   ├── 📁 utils/                   # Utility functions
│   │   ├── 📁 constants/               # Constants and enums
│   │   └── 📁 layouts/                 # Layout components
│   │
│   └── 📁 public/                      # Static assets
│
├── 📁 docs/                             # Core Documentation
│   ├── 📄 README.md                    # Documentation index
│   ├── 📄 01_architecture_spec.md      # System architecture
│   ├── 📄 02_migration_map.md          # CPS1 → V2 migration
│   ├── 📄 03_rule_dsl_spec.md          # Rule DSL specification
│   ├── 📄 04_data_inputs_spec.md       # Input data formats
│   ├── 📄 05_validation_pipeline.md    # Validation flow
│   ├── 📄 06_frontend_requirements.md  # UI requirements
│   ├── 📄 07_smart_path_navigation.md  # Path resolution
│   ├── 📄 08_unified_error_model.md    # Error structure
│   ├── 📄 09_ai_assisted_ruleset_generation.md  # AI features
│   ├── 📄 10_do_not_do.md              # Anti-patterns
│   ├── 📄 11_firely_exception_handling.md  # Error handling
│   │
│   └── 📁 archive/                     # Historical documents
│       └── phase-reports/              # Phase completion reports
│           ├── PHASE_0_COMPLETE.md
│           ├── PHASE_1_*.md
│           ├── ERROR_HANDLING_*.md
│           └── ... (42 archived files)
│
├── 📁 examples/                         # Sample Data Files
│   ├── 📄 sample-bundle.json           # FHIR Bundle example
│   ├── 📄 corrected-sample-bundle.json # Corrected version
│   ├── 📄 sample-rules.json            # Rule definitions
│   ├── 📄 sample-rules-correct.json    # Corrected rules
│   └── 📄 IMPORT_EXAMPLES_README.md    # Example documentation
│
├── 📁 specs/                            # Additional Specifications
│   └── (Future: detailed specs)
│
└── 📁 archive/                          # Project Archives
    ├── 📄 README.md                    # Archive index
    └── (Deprecated implementations)
```

---

## 🏗️ Architecture Overview

### Backend Architecture (.NET 8)

```
┌─────────────────────────────────────────────┐
│         Playground API (ASP.NET)           │
│  ┌─────────────────────────────────────┐   │
│  │  ProjectsController                 │   │
│  │  RulesController                    │   │
│  │  TerminologyController              │   │
│  │  ValidationController               │   │
│  └─────────────────────────────────────┘   │
│                    │                        │
│  ┌─────────────────────────────────────┐   │
│  │  ProjectService                     │   │
│  │  RuleService                        │   │
│  │  TerminologyService                 │   │
│  │  ValidationService                  │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
                    │
┌─────────────────────────────────────────────┐
│      Validation Engine (Core Logic)        │
│  ┌─────────────────────────────────────┐   │
│  │  ValidationPipeline                 │   │
│  │   ├─ FirelyValidationService        │   │
│  │   ├─ FhirPathRuleEngine             │   │
│  │   ├─ CodeMasterEngine               │   │
│  │   └─ ReferenceResolver              │   │
│  └─────────────────────────────────────┘   │
│  ┌─────────────────────────────────────┐   │
│  │  SmartPathNavigationService         │   │
│  │  UnifiedErrorModelBuilder           │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

### Frontend Architecture (React + TypeScript)

```
┌──────────────────────────────────────────────┐
│              PlaygroundLayout                │
│  ┌────────────┬────────────┬──────────────┐  │
│  │            │            │              │  │
│  │   Tree     │   JSON     │  Validation  │  │
│  │  Explorer  │  Editor    │    Panel     │  │
│  │            │            │              │  │
│  │  ├─Rules   │  Monaco    │  ├─Errors    │  │
│  │  ├─Bundle  │  Editor    │  ├─Warnings  │  │
│  │  └─Terms   │            │  └─Info      │  │
│  │            │            │              │  │
│  └────────────┴────────────┴──────────────┘  │
│  ┌──────────────────────────────────────┐    │
│  │       Context Badge Bar              │    │
│  │  [Project] [Bundle] [Stage] [Count] │    │
│  └──────────────────────────────────────┘    │
└──────────────────────────────────────────────┘
```

---

## 🔑 Key Components

### Backend Components

| Component | Responsibility | Location |
|-----------|---------------|----------|
| **ValidationPipeline** | Orchestrates validation flow | Engine/Validation/ |
| **FirelyValidationService** | FHIR structural validation | Engine/Validation/ |
| **FhirPathRuleEngine** | Business rule evaluation | Engine/Rules/ |
| **CodeMasterEngine** | Terminology validation | Engine/Terminology/ |
| **SmartPathNavigationService** | Error path resolution | Engine/Navigation/ |
| **UnifiedErrorModelBuilder** | Error response builder | Engine/Models/ |

### Frontend Components

| Component | Purpose | Location |
|-----------|---------|----------|
| **PlaygroundLayout** | Main IDE interface | layouts/ |
| **RuleTree** | Rule navigation | components/rules/ |
| **MonacoEditor** | JSON editing | components/playground/ |
| **ValidationPanel** | Error display | components/playground/Validation/ |
| **RuleErrorRenderer** | Error formatting | components/validation/ |
| **TerminologyBrowser** | CodeSystem management | components/playground/Terminology/ |
| **RequiredRuleForm** | Required rule authoring | components/playground/Rules/rule-types/required/ |

---

## 📊 Data Flow

### Validation Request Flow

```
1. User uploads Bundle → Frontend
2. Frontend → POST /api/validation/validate-project
3. API → ValidationPipeline.ValidateAsync()
4. Pipeline:
   ├─ FirelyValidationService (structure)
   ├─ FhirPathRuleEngine (business rules)
   ├─ CodeMasterEngine (terminology)
   └─ UnifiedErrorModelBuilder (results)
5. API → Returns ValidationResult (JSON)
6. Frontend → RuleErrorRenderer displays errors
7. User clicks error → SmartPathNavigation resolves
```

### Rule Authoring Flow

```
1. User creates rule → RequiredRuleForm
2. Form validates inputs (client-side)
3. Frontend → POST /api/rules
4. API → RuleService.SaveRule()
5. Rule stored in rules.json
6. Frontend updates RuleTree
7. Auto-validation triggered
8. Results displayed in ValidationPanel
```

---

## 🧪 Testing Strategy

### Backend Tests
- **Unit Tests**: Individual service/engine tests
- **Integration Tests**: Full pipeline validation
- **Test Data**: Located in `tests/TestData/`

### Frontend Tests
- **Component Tests**: React Testing Library
- **Type Safety**: TypeScript strict mode
- **Linting**: ESLint + Prettier

---

## 📝 File Naming Conventions

### Backend (.NET)
- **Services**: `*Service.cs` (e.g., `ValidationService.cs`)
- **Controllers**: `*Controller.cs` (e.g., `ProjectsController.cs`)
- **Models**: `*Model.cs` or `*Dto.cs`
- **Tests**: `*Tests.cs` (e.g., `ValidationPipelineTests.cs`)

### Frontend (TypeScript)
- **Components**: `PascalCase.tsx` (e.g., `RequiredRuleForm.tsx`)
- **Hooks**: `use*.ts` (e.g., `useValidation.ts`)
- **Types**: `*.types.ts` (e.g., `validation.types.ts`)
- **Utils**: `camelCase.ts` (e.g., `errorMessages.ts`)
- **API**: `*Api.ts` (e.g., `projectsApi.ts`)

---

## 🔧 Configuration Files

| File | Purpose |
|------|---------|
| `backend/appsettings.json` | Backend configuration |
| `frontend/vite.config.ts` | Vite build configuration |
| `frontend/tsconfig.json` | TypeScript configuration |
| `frontend/package.json` | Node dependencies |
| `.github/copilot-instructions.md` | AI coding guidelines |

---

## 🚀 Getting Started

1. **Read**: [README.md](README.md) for quick start
2. **Setup**: Follow backend and frontend README files
3. **Explore**: Check `examples/` for sample data
4. **Learn**: Read core specs in `docs/`
5. **Develop**: See component structure above

---

## 📚 Related Documentation

- [Main README](README.md) - Project overview and quick start
- [CHANGELOG](CHANGELOG.md) - Version history
- [Architecture Spec](docs/01_architecture_spec.md) - System design
- [Rule DSL Spec](docs/03_rule_dsl_spec.md) - Rule syntax
- [Phase Reports Archive](docs/archive/phase-reports/) - Historical changes

---

**Last Review**: December 28, 2025  
**Maintained By**: Development Team
└── specs/                       # Additional specifications
```

## Key Features

### Backend
- **Validation Pipeline**: Multi-layer validation (Firely, Rules, CodeMaster, References)
- **Rule Engine**: FHIRPath-based business rules with DSL
- **Smart Path Navigation**: Intelligent path resolution for validation errors
- **Unified Error Model**: Consistent error reporting across all validation layers

### Frontend
- **Rules Panel**: IDE-style rule management with filtering and grouping
- **Bundle Editor**: JSON/Tree view with smart path navigation
- **Validation Panel**: Real-time validation results with clickable errors
- **Rule Builder**: Visual rule creation with FHIRPath support

## Technology Stack

### Backend
- .NET 8.0
- Firely SDK (FHIR R4)
- Entity Framework Core
- SQLite

### Frontend
- React 18
- TypeScript
- Vite
- Tailwind CSS
- Monaco Editor

## Getting Started

### Backend
```bash
cd backend
dotnet restore
dotnet run --project src/Pss.FhirProcessor.Playground.Api
```

Server runs on: http://localhost:5000

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Dev server runs on: http://localhost:5173

## Documentation

### Core Specifications (docs/)
1. **Architecture Spec** - System design and component architecture
2. **Migration Map** - Migration from CPS1 to V2
3. **Rule DSL Spec** - Rule definition language specification
4. **Data Inputs Spec** - Input data formats and schemas
5. **Validation Pipeline** - Multi-layer validation flow
6. **Frontend Requirements** - UI/UX specifications
7. **Smart Path Navigation** - Path resolution and navigation
8. **Unified Error Model** - Error reporting standard
9. **AI-Assisted Ruleset Generation** - Future AI features
10. **Do Not Do** - Anti-patterns and constraints
11. **Firely Exception Handling** - Error handling patterns

### Quick References
- `backend/README.md` - Backend setup and API documentation
- `backend/QUICK_START.md` - Quick start guide for developers
- `docs/README.md` - Documentation index

## Key Constraints

### Architecture Principles
✅ **DO**:
- Clean architecture with clear separation of concerns
- Immutable bundle input
- Business rules only from rules.json
- Unified error model for all validation layers
- Smart path navigation for all errors

❌ **DON'T**:
- Mix validation layers (keep LINT, SPEC_HINT, Firely, Rules separate)
- Use CPS1 syntax or logic
- Duplicate Firely validation
- Mutate input bundle
- Auto-expand UI elements by default

## Development Workflow

1. **Backend Development**
   - Follow Clean Architecture principles
   - All validation logic in Engine project
   - API controllers in Playground.Api project
   - Write tests for new features

2. **Frontend Development**
   - Component-based architecture
   - TypeScript for type safety
   - Reusable components in `/components`
   - Page components in `/pages`
   - Keep UI and logic separate

3. **Adding New Rules**
   - Define in rules.json format
   - Follow Rule DSL specification
   - Test with sample bundles
   - Document rule purpose

4. **Validation Layers**
   - **Firely**: FHIR specification compliance
   - **Rules**: Business logic validation
   - **CodeMaster**: Code system validation
   - **References**: Resource reference integrity

## Testing

### Backend Tests
```bash
cd backend
dotnet test
```

### Frontend Tests
```bash
cd frontend
npm test
```

## Contributing

1. Follow existing code style and patterns
2. Write tests for new features
3. Update documentation for significant changes
4. Follow the "Do Not Do" guidelines in docs/10_do_not_do.md
5. Keep validation layers separate

## Support

For questions or issues:
1. Check relevant documentation in `/docs`
2. Review example files in `/examples`
3. Consult backend README for API details
4. Check component source for inline documentation

---

**Last Updated**: December 15, 2025  
**Version**: 2.0  
**FHIR Version**: R4
