
# 04. Data Inputs Specification — FHIR Processor V2

## 1. Overview of Input Types
### Required:
- FHIR Bundle (JSON)
- rules.json

### Optional:
- codesystems.json
- codemaster.json
- project.json
- schemas (API, JSON Schema)

## 2. Bundle Requirements
- resourceType must be Bundle
- type must be "collection" or "transaction"
- entry must contain FHIR resources

## 3. Rules File
Defines:
- business validation logic
- rule types and parameters
- FHIRPath expressions

## 4. CodeSystems File
Defines:
{
  "system": "https://fhir.synapxe.sg/CodeSystem/language",
  "concepts": [
     { "code": "EN", "display": "English" }
  ]
}

Used by:
- CodeSystem rule

## 5. CodeMaster File
Defines:
- question code
- screening type
- allowed answers
- multi-value flags

Used by:
- CodeMaster rule

## 6. Project Config
Defines:
- fhirVersion (R4/R4B/R5)
- IG packages (future)
- default terminology

## 7. API Input Example
{
  "bundle": {...},
  "rules": {...},
  "codes": {...},
  "codemaster": {...},
  "project": {...}
}
