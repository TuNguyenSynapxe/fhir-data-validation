
# 03. Rule DSL Specification (rules.json)

## 1. Structure
{
  "version": "1.0",
  "fhirVersion": "R5",
  "project": "PSS",
  "rules": [...]
}

## 2. Rule Object
{
  "id": "OBS-001",
  "type": "Required",
  "resourceType": "Observation",
  "path": "Observation.code.coding.where(system='X').code",
  "severity": "error",
  "errorCode": "MANDATORY_MISSING",
  "message": "Screening type is required.",
  "params": {}
}

## 3. Rule Types Detailed
### 3.1 Required
FHIRPath must return non-empty:
exists(path)

### 3.2 FixedValue
Compares actual value with expected

### 3.3 AllowedValues
set membership:
value in params.values

### 3.4 Regex
Pattern:
matches(params.pattern)

### 3.5 Reference
Ensures:
- reference exists
- type is in params.allowedTypes

### 3.6 ArrayLength
min/max length validation

### 3.7 CodeSystem
Validates coding presence and value from CodeSystems

### 3.8 CodeMaster
Validates Observation.component[*] structure

### 3.9 FullUrlIdMatch
Compares:
resource.id == GUID portion of fullUrl

### 3.10 CustomFHIRPath
Direct boolean FHIRPath expression

## 4. DSL Validation Rules
- All rules must specify resourceType
- All rules must specify a FHIRPath-valid path
- No duplication of FHIR structural rules (Firely already covers)

## 5. Severity Model
- error
- warning
- info
