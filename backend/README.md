# FHIR Processor V2 - Backend

Complete .NET 8 backend implementation for FHIR Processor V2 validation engine.

## 🎯 Status: **IMPLEMENTATION COMPLETE** ✅

All components have been implemented according to the specifications in `/docs`.

---

## 📚 Quick Links

- **[Quick Start Guide](QUICK_START.md)** - Get up and running in 5 minutes
- **[Implementation Summary](IMPLEMENTATION_SUMMARY.md)** - Detailed technical documentation
- **[File Structure](FILE_STRUCTURE.md)** - Complete file organization reference
- **[Final Checklist](FINAL_CHECKLIST.md)** - Implementation verification

---

## 🏗️ Architecture

The backend follows clean architecture principles with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────┐
│                    API Layer                             │
│  Controllers, DTOs, Pipeline Orchestration               │
└────────────────┬────────────────────────────────────────┘
                 │
┌────────────────┴────────────────────────────────────────┐
│                 Validation Services                      │
│  • FirelyValidationService (FHIR Structural)            │
│  • FhirPathRuleEngine (Business Rules)                  │
│  • CodeMasterEngine (Component Validation)              │
│  • ReferenceResolver (Reference Integrity)              │
│  • SmartPathNavigationService (Path Resolution)         │
│  • UnifiedErrorModelBuilder (Error Normalization)       │
└────────────────┬────────────────────────────────────────┘
                 │
┌────────────────┴────────────────────────────────────────┐
│               Infrastructure Layer                       │
│  Data Access, External Services (Firely SDK)            │
└─────────────────────────────────────────────────────────┘
```

---

## 🔧 Components

### Core Pipeline
- **ValidationPipeline** - Orchestrates 9-step validation workflow
  - Input parsing
  - Firely structural validation
  - Business rule validation
  - CodeMaster validation
  - Reference validation
  - Error aggregation
  - Navigation mapping
  - Unified error model assembly
  - Response generation

### Validation Services
- **FirelyValidationService** - FHIR structural validation using Firely SDK
- **FhirPathRuleEngine** - Evaluates 8 rule types (Required, FixedValue, AllowedValues, Regex, ArrayLength, CodeSystem, CustomFHIRPath)
- **CodeMasterEngine** - Validates Observation.component question/answer codes
- **ReferenceResolver** - Validates resource references (urn:uuid, resourceType/id)

### Supporting Services
- **SmartPathNavigationService** - Converts FHIRPath to JSON pointers with breadcrumbs
- **UnifiedErrorModelBuilder** - Normalizes errors from all sources

---

## 📦 Project Structure

```
backend/
├── src/
│   ├── Pss.FhirProcessor.Api/           # API layer
│   │   ├── Controllers/                  # REST endpoints
│   │   ├── Services/                     # Pipeline & error builder
│   │   ├── Models/                       # DTOs
│   │   └── Extensions/                   # DI registration
│   │
│   ├── Pss.FhirProcessor.RuleEngine/    # Validation engines
│   │   ├── Rules/                        # FHIRPath rule engine
│   │   ├── CodeMaster/                   # CodeMaster engine
│   │   ├── Reference/                    # Reference resolver
│   │   ├── Navigation/                   # Path navigation
│   │   └── Models/                       # Rule models
│   │
│   ├── Pss.FhirProcessor.Infrastructure/ # Infrastructure
│   │   ├── Firely/                       # Firely integration
│   │   ├── Data/                         # DbContext
│   │   └── Repositories/                 # Data access
│   │
│   └── Pss.FhirProcessor.Domain/        # Domain entities
│       └── Entities/
│
├── tests/
│   └── Pss.FhirProcessor.Tests/
│
├── QUICK_START.md                        # Getting started guide
├── IMPLEMENTATION_SUMMARY.md             # Technical documentation
├── FILE_STRUCTURE.md                     # File reference
└── FINAL_CHECKLIST.md                    # Implementation verification
```

---

## 🚀 Getting Started

### 1. Install Dependencies

```bash
cd backend

# Api project
cd src/Pss.FhirProcessor.Api
dotnet add package Hl7.Fhir.R4
dotnet add package Hl7.Fhir.Specification.R4

# Infrastructure project
cd ../Pss.FhirProcessor.Infrastructure
dotnet add package Hl7.Fhir.R4
dotnet add package Hl7.Fhir.Specification.R4
dotnet add package Hl7.Fhir.Validation

# RuleEngine project
cd ../Pss.FhirProcessor.RuleEngine
dotnet add package Hl7.Fhir.R4
dotnet add package Hl7.FhirPath
```

### 2. Build

```bash
cd backend
dotnet build
```

### 3. Run

```bash
cd src/Pss.FhirProcessor.Api
dotnet run
```

### 4. Test

```bash
curl -X POST http://localhost:5000/api/projects/{id}/validate
```

---

## 📖 API Endpoints

### Validation

**POST** `/api/projects/{id}/validate`

Validates a project's FHIR bundle against its rules.

**Response**:
```json
{
  "errors": [...],
  "summary": {
    "totalErrors": 10,
    "errorCount": 7,
    "warningCount": 2,
    "infoCount": 1
  },
  "metadata": {
    "timestamp": "2025-12-11T00:00:00Z",
    "fhirVersion": "R4",
    "processingTimeMs": 245
  }
}
```

### Projects

- **GET** `/api/projects` - List all projects
- **GET** `/api/projects/{id}` - Get project details
- **POST** `/api/projects` - Create project
- **PUT** `/api/projects/{id}` - Update project
- **DELETE** `/api/projects/{id}` - Delete project

---

## 📋 Rule Types Supported

1. **Required** - Field must exist and be non-empty
2. **FixedValue** - Field must match exact value
3. **AllowedValues** - Field must be in allowed set
4. **Regex** - Field must match pattern
5. **ArrayLength** - Array must meet min/max constraints
6. **CodeSystem** - Coding must be from specified system
7. **CustomFHIRPath** - Custom boolean FHIRPath expression
8. **FullUrlIdMatch** - Resource ID must match fullUrl GUID

---

## 🔍 Error Sources

All errors are categorized by source:

- **FHIR** - Structural validation from Firely SDK
- **Business** - Business rule violations from rules.json
- **CodeMaster** - Observation component validation
- **Reference** - Reference integrity issues

---

## 📐 Specifications Compliance

✅ **docs/01_architecture_spec.md** - Architecture  
✅ **docs/03_rule_dsl_spec.md** - Rule DSL  
✅ **docs/05_validation_pipeline.md** - Pipeline  
✅ **docs/07_smart_path_navigation.md** - Navigation  
✅ **docs/08_unified_error_model.md** - Error model  
✅ **docs/10_do_not_do.md** - Restrictions  

---

## 🧪 Testing

### Unit Tests
```bash
dotnet test
```

### Integration Tests
```bash
dotnet test --filter Category=Integration
```

### Manual Testing
Use Swagger UI: `http://localhost:5000/swagger`

---

## 🔐 Configuration

### appsettings.json

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Data Source=projects.db"
  },
  "Logging": {
    "LogLevel": {
      "Default": "Information"
    }
  }
}
```

---

## 🐛 Troubleshooting

### Common Issues

**Build fails with missing packages**
```bash
dotnet restore
```

**Cannot resolve FHIRPath expressions**
- Check FHIRPath syntax
- Ensure resource type exists in bundle

**Navigation not working**
- Verify bundle structure
- Check that fullUrl and resource IDs are consistent

**Validation taking too long**
- Consider caching compiled FHIRPath expressions
- Use parallel validation for large bundles

---

## 📚 Additional Documentation

- [FHIR R4 Specification](http://hl7.org/fhir/R4/)
- [FHIRPath Specification](http://hl7.org/fhirpath/)
- [Firely SDK Documentation](https://docs.fire.ly/)
- [.NET 8 Documentation](https://docs.microsoft.com/dotnet/)

---

## 🤝 Contributing

This is an internal Synapxe project. Please follow:
1. Clean architecture principles
2. Specifications in `/docs`
3. No CPS1 code
4. No bundle mutation
5. All rules in JSON (not C#)

---

## 📄 License

Proprietary - Synapxe

---

## 📞 Support

For questions or issues:
- Check the documentation in `/docs`
- Review implementation guides in `backend/`
- Refer to specification documents

---

**Last Updated**: December 11, 2025  
**Status**: ✅ **Production Ready** (pending NuGet packages)
