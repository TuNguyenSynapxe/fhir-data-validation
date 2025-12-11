
# 10. DO-NOT-DO List — FHIR Processor V2

Critical restrictions to prevent regressions and architectural corruption.

---

## 1. Do NOT resurrect CPS1
No:
- CPS1 syntax
- CPS1 rules
- CPS1 normalizer
- CPS1 evaluator

---

## 2. Do NOT duplicate Firely functionality
No manual checking for:
- cardinality
- data types
- slice rules
- invariants
- terminology constraints (unless custom)

---

## 3. Do NOT mutate Bundle input
The bundle must remain immutable throughout validation.

---

## 4. Do NOT hardcode business rules
All rules must live in:
- rules.json
- codemaster.json
- codes.json

Never in C#.

---

## 5. Do NOT assume Bundle order
Never assume:
- Patient is entry[0]
- Encounter is entry[1]

Navigator determines indexes dynamically.

---

## 6. Do NOT rewrite Firely error messages
Use them as-is; add navigation & metadata only.

---

## 7. Do NOT mix R4 and R5
Each project must define:
- fhirVersion
- IG package (future)

---

## 8. Do NOT skip reference validation
All:
- Patient
- Encounter
- Provider
- Location

must reference real existing entries.

---

## 9. Do NOT bypass the unified error model
All validation sources must feed into a consistent format.

EOF
