
# 01. Architecture Specification — FHIR Processor V2

## 1. Introduction
FHIR Processor V2 is a full-featured, enterprise-grade validation engine designed for healthcare projects requiring:
- FHIR compliance
- Project-specific business rules
- Custom terminology validation
- Reference checking
- Developer/vendor-friendly debugging

The system replaces the legacy CPS1 engine with:
- Firely FHIR Validator
- A new FHIRPath-based rule engine
- CodeSystem and CodeMaster validation module
- Smart Path Navigation
- A unified error model

## 2. Core Architectural Principles
### 2.1 Separation of responsibilities
- Firely handles structural FHIR correctness.
- Rule engine handles business-specific rules (FHIRPath).
- CodeMaster ensures question/answer validity.
- ReferenceResolver ensures resource references are correct.
- SmartPathNavigator translates FHIRPath → JSON Pointer.
- UnifiedErrorModel normalizes all output.

### 2.2 Zero mutation
The input Bundle must never be altered during processing.

### 2.3 Project-agnostic design
Rules, CodeSystems, CodeMaster, and project config are fully externalized.

## 3. Major Backend Components
### 3.1 FirelyValidationService
- Loads R5 definitions
- Validates bundle structure
- Returns Issue components
- Does not enforce business rules

### 3.2 FhirPathRuleEngine
- Evaluates project-defined rules.json
- Supports eight rule types:
  - Required
  - FixedValue
  - AllowedValues
  - Regex
  - Reference
  - ArrayLength
  - CodeSystem
  - CustomFHIRPath

### 3.3 CodeMasterEngine
Validates Observation.component[*] for:
- Allowed question codes
- Allowed answer values
- Screening-type alignment
- Multi-value and single-value validation

### 3.4 ReferenceResolver
Ensures:
- Referenced resource exists
- Reference conforms to allowed target types
- Reference follows canonical or UUID format

### 3.5 SmartPathNavigationService
Converts:
- Firely issue locations → JSON pointers
- Rule paths → JSON pointers
Handles:
- where() clauses
- multi-index component arrays
- resourceType/id → entry index mapping

### 3.6 UnifiedErrorModelBuilder
Normalizes:
- FHIR structural errors
- Rule engine errors
- CodeMaster errors
- Reference errors

### 3.7 ValidationPipeline
The orchestrator that executes:
1. Parse input
2. Firely
3. Business rules
4. CodeMaster
5. Reference checks
6. Merge
7. Navigation mapping
8. Final output

## 4. Frontend Architecture
### 4.1 JSON Viewer
- Supports scroll-to-path
- Expandable tree
- Highlighting selected nodes

### 4.2 Error Helper Panel
- Error grouping by:
  - resource
  - severity
  - source
- Click-to-navigate

### 4.3 Rule Editor
- Monaco editor
- Live syntax validation
- JSON schema validation

### 4.4 Playground
- Admin mode (edit rules)
- Vendor mode (rules locked)
- Test bundle against published rules

## 5. Deployment Architecture
### 5.1 Azure POC Setup
- Backend: Azure App Service
- Frontend: Azure Static Web App
- Identity: Email OTP (Azure AD B2C optional)
- Storage: Blob (optional)

## 6. Summary
FHIR Processor V2 is:
- Modular
- Extensible
- Project-agnostic
- AI-ready
