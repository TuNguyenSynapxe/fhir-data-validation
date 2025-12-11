
# 09. AI-Assisted RuleSet Generation — FHIR Processor V2

## 1. Purpose
Automate and accelerate creation of rules.json from:
- Requirement documents
- FHIR profiles
- API specifications
- Sample Bundles
- CodeMaster / CodeSystems

Produces:
- rules.json draft
- Explanation for each rule

---

## 2. Modes

### Mode A — Suggest
AI returns:
- Recommended rules
- Missing mandatory fields
- Potential constraints

### Mode B — Auto-generate Draft
AI generates:
- Full rules.json
- Validation coverage matrix
- Human-readable explanation

### Mode C — Auto-maintain (future)
AI:
- Detects spec changes
- Updates corresponding rules
- Maintains rule integrity

---

## 3. AI Input Model
```
{
  "requirements": "...",
  "apiSpec": "...",
  "codes": { ... },
  "codemaster": { ... },
  "sampleBundles": [ ... ]
}
```

---

## 4. Output Model
```
{
  "rules": [...],
  "explanations": [...],
  "coverage": {...}
}
```

---

## 5. Safety Guarantee
AI must **never**:
- Create CPS1 rules
- Duplicate FHIR structural rules
- Create rules with business logic hidden in code
- Produce rules contradicting Firely

---

## 6. Human Review Loop
Every AI output must be:
- Reviewed by admin
- Editable in the Rule Editor
- Version-controlled

EOF
