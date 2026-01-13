
# 07. Smart Path Navigation Specification — FHIR Processor V2

## 1. Purpose
Smart Path Navigation converts:
- Firely Issue paths
- Rule DSL paths (FHIRPath)
into:
- JSON Pointers
- Breadcrumbs
- Existence flags
- Missing parent node listing

This enables the frontend to jump precisely to the correct location in the input Bundle.

---

## 2. Challenges Addressed
- Firely paths may include slicing and expression syntax
- FHIRPath from rules.js may include:
  - where()
  - filtered arrays
  - nested lookups
- Bundle entries must be found dynamically (index lookup)
- Missing parent levels must be detected

---

## 3. Input Formats

### 3.1 Firely Expression
Example:
```
Bundle.entry[2].resource.component[0].valueString
```

### 3.2 Rule DSL Path
Example:
```
Observation.component.where(code.coding.code='SQ-001').valueString
```

---

## 4. Navigation Engine Responsibilities
1. Normalize path
2. Convert FHIRPath-like syntax → pointer-friendly path
3. Resolve resource references:
   - urn:uuid:*
   - resourceType/id
   - absolute URLs (optional)
4. Map resource to bundle entry index
5. Produce:
   - jsonPointer
   - breadcrumbs[]
   - exists flag
   - missingParents[]

---

## 5. Output Model
```
{
  "jsonPointer": "/entry/1/resource/component/0/valueString",
  "breadcrumbs": [
    "Bundle",
    "entry[1]",
    "Observation",
    "component[0]",
    "valueString"
  ],
  "exists": true,
  "missingParents": []
}
```

---

## 6. Error-Tolerant Navigation
If part of the path does not exist:
- Engine computes the last existing pointer
- missingParents lists the missing segments
- exists=false

Example:
Missing `component[0]`:
```
jsonPointer: "/entry/2/resource"
exists: false
missingParents: ["component[0]", "valueString"]
```

---

## 7. Navigation Scenarios

### Scenario 1: Firely structural errors
Direct path → JSON pointer.

### Scenario 2: Rule errors with where()
Resolve:
- Evaluate where() filter
- If matches, map index
- Else pointer goes to parent array

### Scenario 3: Reference resolution errors
For:
```
Encounter.subject.reference = "urn:uuid:abc"
```
Navigator resolves:
- Find entry with matching fullUrl
- Map to entry index

---

## 8. Breadcrumb Construction
Breadcrumbs built from:
- Bundle
- entry[index]
- resourceType
- element names
- array indices

Used for frontend sidebar navigation.

---

## 9. Summary
Smart navigation unifies Firely & business rule paths into consistent pointers.

EOF
