# FHIR Processor V2 - Project Structure

## Overview
FHIR Processor V2 is a validation and rule management system for FHIR R4 resources with an IDE-style UI.

## Repository Structure

```
fhir_processor_v2/
├── README.md                    # Main project documentation
├── backend/                     # .NET backend services
│   ├── README.md               # Backend setup and usage
│   ├── QUICK_START.md          # Quick start guide
│   ├── FhirProcessorV2.sln     # Solution file
│   ├── src/                    # Source code
│   │   ├── Pss.FhirProcessor.Api/
│   │   ├── Pss.FhirProcessor.Engine/
│   │   └── Pss.FhirProcessor.Playground.Api/
│   └── tests/                  # Test projects
│
├── frontend/                    # React + TypeScript UI
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   ├── pages/             # Page components
│   │   ├── hooks/             # Custom React hooks
│   │   ├── types/             # TypeScript type definitions
│   │   ├── api/               # API client functions
│   │   └── utils/             # Utility functions
│   └── package.json
│
├── docs/                        # Core specification documents
│   ├── README.md               # Documentation index
│   ├── 01_architecture_spec.md
│   ├── 02_migration_map.md
│   ├── 03_rule_dsl_spec.md
│   ├── 04_data_inputs_spec.md
│   ├── 05_validation_pipeline.md
│   ├── 06_frontend_requirements.md
│   ├── 07_smart_path_navigation.md
│   ├── 08_unified_error_model.md
│   ├── 09_ai_assisted_ruleset_generation.md
│   ├── 10_do_not_do.md
│   └── 11_firely_exception_handling.md
│
├── examples/                    # Sample data files
│   ├── sample-bundle.json
│   ├── corrected-sample-bundle.json
│   ├── sample-rules.json
│   └── sample-rules-correct.json
│
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
