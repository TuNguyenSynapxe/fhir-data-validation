
# 02. Legacy → V2 Migration Map

## 1. Overview
Legacy PSS used CPS1 syntax for rules. V2 replaces the entire validation engine but retains UI concepts.

## 2. What Must Be Removed
- CPS1 syntax paths
- CPS1 parser
- CPS1 evaluator
- Legacy array normalization rules
- Hardcoded PSS business rules
- Manual FHIR structural checks

## 3. What Can Be Reused
- JSON Viewer React UI
- Error Helper Panel layout
- Breadcrumb display approach
- Smart navigation UI

## 4. What Must Be Rebuilt
### Backend:
- Entire rule engine
- Path mapping logic
- ID/fullUrl matching logic
- CodeMaster evaluator
- Reference resolver
- Unified error model
- Firely structural validation integration

### Frontend:
- Rule Editor
- Playground
- Path mapping to JSON viewer

## 5. CPS1 → FHIRPath Mapping Examples
| CPS1 | FHIRPath |
|------|----------|
| Patient.identifier[system:X].value | Patient.identifier.where(system='X').value |
| component[*] | component |
| Location.address.postalCode | Location.address.postalCode |
| Observation.component[*].value | Observation.component.value |

## 6. Rule Type Migration
- Required → exists()
- FixedValue → equality
- AllowedValues → in set
- Regex → matches()
- Reference → reference().resolve()
- CodeSystem → coding.where(system=S).code ∈ set
- CodeMaster → custom engine
- FullUrlIdMatch → custom check

## 7. Eliminated Designs
- No normalization of paths
- No rewriting Firely issues
- No assumption of Bundle entry order
- No resource-type indexing hacks

## 8. Migration Summary
Legacy PSS backend = full rewrite  
Legacy PSS frontend = partial reuse  
