
# 08. Unified Error Model — FHIR Processor V2

## 1. Purpose
The unified error model provides a single, stable structure for:
- Firely structural errors
- Business rule errors
- CodeMaster errors
- Reference errors

All validation engines must output errors using this format.

---

## 2. Error Object Schema
```
{
  "source": "FHIR | Business | CodeMaster | Reference",
  "severity": "error | warning | info",
  "resourceType": "Observation",
  "path": "Observation.component[0].valueString",
  "jsonPointer": "/entry/2/resource/component/0/valueString",
  "errorCode": "INVALID_VALUE",
  "message": "Value not permitted for this question.",
  "details": {},
  "navigation": {
      "breadcrumbs": [...],
      "exists": true,
      "missingParents": []
  }
}
```

### 2.1 Source Types
| Source      | Meaning |
|-------------|---------|
| **FHIR**    | Firely structural validation |
| **Business** | Rule DSL (Required, Regex, FixedValue, etc.) |
| **CodeMaster** | Observation.component question/answer validation |
| **Reference** | Invalid, missing, or wrong-type references |

### 2.2 Severity
- `error` – stops business flow
- `warning` – acceptable but needs attention
- `info` – informational

---

## 3. Required Fields
- source  
- severity  
- message  

---

## 4. Path vs jsonPointer
- `path` = human-readable (FHIRPath-like)
- `jsonPointer` = machine-navigable

Example:
```
Observation.component[0].valueString
```
→
```
/entry/2/resource/component/0/valueString
```

---

## 5. Details Field
Holds additional context:
```
"details": {
    "actual": "500Hz-X",
    "allowed": ["500Hz-R", "500Hz-NR"]
}
```

---

## 6. Navigation Block
```
"navigation": {
  "breadcrumbs": ["Bundle", "entry[2]", "Observation", "component[0]", "valueString"],
  "exists": true,
  "missingParents": []
}
```

Used by frontend for smart jump-to-node.

---

## 7. Error Model Stability
- Same format across all environments
- Works for vendor tools
- Ensures predictable UI behavior

EOF
