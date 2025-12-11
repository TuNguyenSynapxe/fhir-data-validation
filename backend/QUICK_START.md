# FHIR Processor V2 - Quick Start Guide

## 🚀 Getting Started

### Prerequisites
- .NET 8 SDK
- Visual Studio Code or Visual Studio 2022
- Basic understanding of FHIR R4

---

## 📦 Step 1: Install Dependencies

```bash
cd backend

# Install Firely SDK packages for Api project
cd src/Pss.FhirProcessor.Api
dotnet add package Hl7.Fhir.R4
dotnet add package Hl7.Fhir.Specification.R4

# Install Firely packages for Infrastructure project
cd ../Pss.FhirProcessor.Infrastructure
dotnet add package Hl7.Fhir.R4
dotnet add package Hl7.Fhir.Specification.R4
dotnet add package Hl7.Fhir.Validation

# Install Firely packages for RuleEngine project
cd ../Pss.FhirProcessor.RuleEngine
dotnet add package Hl7.Fhir.R4
dotnet add package Hl7.FhirPath

cd ../..
```

---

## 🔨 Step 2: Build the Solution

```bash
cd backend
dotnet build
```

Expected output:
```
Build succeeded.
    0 Warning(s)
    0 Error(s)
```

---

## ▶️ Step 3: Run the Application

```bash
cd src/Pss.FhirProcessor.Api
dotnet run
```

The API will start at: `http://localhost:5000` (or `https://localhost:5001`)

---

## 🧪 Step 4: Test the Validation Endpoint

### 4.1 Create a Test Project

```bash
curl -X POST http://localhost:5000/api/projects \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Project",
    "description": "Test validation",
    "fhirVersion": "4.0.1",
    "bundleJson": "{\"resourceType\":\"Bundle\",\"type\":\"collection\",\"entry\":[]}",
    "rulesJson": "{\"version\":\"1.0\",\"fhirVersion\":\"4.0.1\",\"rules\":[]}"
  }'
```

Save the returned project ID (e.g., `a1b2c3d4-...`)

### 4.2 Validate the Project

```bash
curl -X POST http://localhost:5000/api/projects/{PROJECT_ID}/validate
```

### 4.3 Expected Response

```json
{
  "errors": [],
  "summary": {
    "totalErrors": 0,
    "errorCount": 0,
    "warningCount": 0,
    "infoCount": 0,
    "fhirErrorCount": 0,
    "businessErrorCount": 0,
    "codeMasterErrorCount": 0,
    "referenceErrorCount": 0
  },
  "metadata": {
    "timestamp": "2025-12-11T00:00:00Z",
    "fhirVersion": "4.0.1",
    "rulesVersion": "1.0",
    "processingTimeMs": 123
  }
}
```

---

## 📝 Step 5: Test with Real Data

### Sample Bundle with Observation

```json
{
  "resourceType": "Bundle",
  "type": "collection",
  "entry": [
    {
      "fullUrl": "urn:uuid:patient-001",
      "resource": {
        "resourceType": "Patient",
        "id": "patient-001",
        "name": [{ "family": "Doe", "given": ["John"] }]
      }
    },
    {
      "fullUrl": "urn:uuid:obs-001",
      "resource": {
        "resourceType": "Observation",
        "id": "obs-001",
        "status": "final",
        "code": {
          "coding": [{
            "system": "http://loinc.org",
            "code": "85354-9",
            "display": "Blood pressure"
          }]
        },
        "subject": { "reference": "urn:uuid:patient-001" }
      }
    }
  ]
}
```

### Sample Rules

```json
{
  "version": "1.0",
  "fhirVersion": "4.0.1",
  "project": "TestProject",
  "rules": [
    {
      "id": "OBS-001",
      "type": "Required",
      "resourceType": "Observation",
      "path": "Observation.subject",
      "severity": "error",
      "errorCode": "MISSING_SUBJECT",
      "message": "Observation must have a subject reference"
    },
    {
      "id": "OBS-002",
      "type": "AllowedValues",
      "resourceType": "Observation",
      "path": "Observation.status",
      "severity": "error",
      "errorCode": "INVALID_STATUS",
      "message": "Invalid observation status",
      "params": {
        "values": ["final", "amended", "corrected"]
      }
    }
  ]
}
```

---

## 🔍 Understanding the Response

### Error Object Structure

```json
{
  "source": "FHIR | Business | CodeMaster | Reference",
  "severity": "error | warning | info",
  "resourceType": "Observation",
  "path": "Observation.status",
  "jsonPointer": "/entry/1/resource/status",
  "errorCode": "INVALID_STATUS",
  "message": "Human-readable error message",
  "details": {
    "actual": "preliminary",
    "allowed": ["final", "amended", "corrected"]
  },
  "navigation": {
    "jsonPointer": "/entry/1/resource/status",
    "breadcrumbs": ["Bundle", "entry[1]", "Observation", "status"],
    "exists": true,
    "missingParents": []
  }
}
```

### Error Sources

- **FHIR**: Structural validation from Firely
- **Business**: Business rule violations
- **CodeMaster**: Observation component validation
- **Reference**: Reference integrity issues

---

## 📚 Common Use Cases

### Use Case 1: Validate Patient Reference

**Rule**:
```json
{
  "id": "REF-001",
  "type": "Required",
  "resourceType": "Observation",
  "path": "Observation.subject.reference",
  "severity": "error",
  "errorCode": "MISSING_PATIENT",
  "message": "Observation must reference a patient"
}
```

### Use Case 2: Validate Coding System

**Rule**:
```json
{
  "id": "CODE-001",
  "type": "CodeSystem",
  "resourceType": "Observation",
  "path": "Observation.code.coding[0]",
  "severity": "error",
  "errorCode": "INVALID_CODE_SYSTEM",
  "message": "Invalid code system",
  "params": {
    "system": "http://loinc.org",
    "codes": ["85354-9", "8867-4", "8480-6"]
  }
}
```

### Use Case 3: Validate Array Length

**Rule**:
```json
{
  "id": "ARR-001",
  "type": "ArrayLength",
  "resourceType": "Patient",
  "path": "Patient.name",
  "severity": "error",
  "errorCode": "MISSING_NAME",
  "message": "Patient must have at least one name",
  "params": {
    "min": 1
  }
}
```

---

## 🐛 Troubleshooting

### Build Errors

**Problem**: Cannot find Hl7.Fhir packages  
**Solution**: Run `dotnet restore` in each project folder

**Problem**: Namespace not found  
**Solution**: Ensure all using statements are present

### Runtime Errors

**Problem**: NullReferenceException in validation  
**Solution**: Check that bundle JSON is valid

**Problem**: FHIRPath evaluation fails  
**Solution**: Verify FHIRPath syntax is correct

### Validation Not Working

**Problem**: Rules not being applied  
**Solution**: Ensure rules JSON is valid and resourceType matches

**Problem**: Navigation not resolving  
**Solution**: Check that bundle structure is correct

---

## 📖 Additional Resources

### Documentation
- `/docs/01_architecture_spec.md` - System architecture
- `/docs/03_rule_dsl_spec.md` - Rule types and syntax
- `/docs/05_validation_pipeline.md` - Pipeline details
- `/docs/07_smart_path_navigation.md` - Navigation system
- `/docs/08_unified_error_model.md` - Error format

### Implementation Docs
- `backend/IMPLEMENTATION_SUMMARY.md` - Complete implementation details
- `backend/FILE_STRUCTURE.md` - File organization
- `backend/FINAL_CHECKLIST.md` - Implementation checklist

### FHIR Resources
- [FHIR R4 Specification](http://hl7.org/fhir/R4/)
- [FHIRPath Specification](http://hl7.org/fhirpath/)
- [Firely SDK Documentation](https://docs.fire.ly/)

---

## ✅ Next Steps

1. ✅ Install dependencies
2. ✅ Build solution
3. ✅ Run application
4. ✅ Test validation endpoint
5. [ ] Create custom rules for your project
6. [ ] Integrate with frontend
7. [ ] Deploy to Azure

---

## 💡 Tips

- Use Swagger UI at `http://localhost:5000/swagger` for API exploration
- Start with simple rules and gradually add complexity
- Test each rule type individually before combining
- Use the navigation breadcrumbs for debugging
- Check the summary statistics to identify validation bottlenecks

---

**Happy Validating! 🎉**
