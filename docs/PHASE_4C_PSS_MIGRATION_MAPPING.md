# Phase 4C: PSS CodeMaster/CodeSet to FHIR Terminology Migration

## Overview

This document defines the migration path from legacy PSS CodeMaster/CodeSet structure to FHIR-aligned CodeSystem format compatible with the FHIR Processor V2 Terminology Management system.

## PSS CodeMaster/CodeSet Structure (Legacy)

Typical PSS CodeMaster structure includes:

```
CodeGroup/CodeSet (Domain grouping)
├─ Code (Unique identifier)
├─ Description (Human-readable label)
├─ Status (Active/Inactive)
├─ Domain/Category (Business area)
└─ Additional metadata (varies by implementation)
```

**Common PSS Domains:**
- Patient Status
- Appointment Types
- Consultation Types
- Ward Types
- Admission Sources
- Discharge Destinations

## Mapping Rules

### 1. CodeGroup/CodeSet → CodeSystem Identity

| PSS Field | FHIR CodeSystem Field | Mapping Rule | Example |
|-----------|----------------------|--------------|---------|
| CodeGroup | `url` | Construct canonical URL: `http://{domain}/fhir/CodeSystem/{code-group-id}` | `http://example.org/fhir/CodeSystem/patient-status` |
| CodeGroup | `name` | Use CodeGroup name (alphanumeric only) | `PatientStatus` |
| CodeGroup | `title` | Use CodeGroup display name | `Patient Status Codes` |
| Domain | `url` namespace | Include domain in URL path | `http://example.org/{domain}/fhir/...` |
| - | `status` | Default to `draft` during migration | `draft` |
| - | `content` | Always `complete` (authoring mode) | `complete` |
| - | `publisher` | Use organization name | `Example Healthcare Organization` |

### 2. Code → Concept

| PSS Field | FHIR Concept Field | Mapping Rule | Example |
|-----------|-------------------|--------------|---------|
| Code | `concept.code` | Use as-is (validate format) | `ACT` |
| Description | `concept.display` | Use as primary display | `Active` |
| Description (long) | `concept.definition` | Use if detailed description available | `Patient is currently receiving care` |
| Status | `concept.property` | Store as property (type: `code`, code: `status`) | `{"code": "status", "valueCode": "active"}` |
| Status | - | Alternatively: Exclude inactive codes from export | Filter during migration |

### 3. Hierarchical Structures

| PSS Structure | FHIR Structure | Mapping Rule |
|--------------|----------------|--------------|
| Flat CodeSet | Flat concept array | Direct mapping |
| Parent/Child relationship | Nested `concept.concept` | Reconstruct hierarchy |
| Category grouping | Root-level concepts with children | Create parent concepts for categories |

### 4. Status Handling

**Option A: Include as Property**
```json
{
  "code": "ACT",
  "display": "Active",
  "property": [
    {
      "code": "status",
      "valueCode": "active"
    }
  ]
}
```

**Option B: Filter During Migration**
- Export only "Active" codes
- Exclude "Inactive" codes
- Document excluded codes separately

**Recommendation:** Use Option B for initial migration (cleaner), store full history separately if needed.

## Migration Decisions

### 1. URL Namespace Design

**Recommended Pattern:**
```
http://{organization-domain}/{system-name}/fhir/CodeSystem/{code-set-name}
```

**Examples:**
- `http://hospital.gov.sg/pss/fhir/CodeSystem/patient-status`
- `http://hospital.gov.sg/pss/fhir/CodeSystem/appointment-types`
- `http://hospital.gov.sg/pss/fhir/CodeSystem/ward-types`

**Why this pattern:**
- ✅ Organization-specific domain
- ✅ System identifier (pss)
- ✅ FHIR conformance path
- ✅ Descriptive CodeSystem name
- ✅ Versioning possible via query parameters

### 2. Code Validation

**Transform PSS codes:**
- Replace spaces with hyphens: `"Active Patient"` → `"active-patient"`
- Lowercase for consistency: `"ACT"` → `"act"` (optional)
- Remove special characters: `"Type-A/B"` → `"type-a-b"`

**Preserve original:**
- Keep original PSS code in `concept.property`
- Use transformed code as `concept.code`
- Include original as designation

**Recommendation:** Keep original PSS codes as-is if they're valid (alphanumeric + hyphens), store originals as properties only if transformation needed.

### 3. Description vs Definition

| Scenario | Mapping |
|----------|---------|
| Short description (< 50 chars) | Use as `display` only |
| Long description (> 50 chars) | Use truncated as `display`, full as `definition` |
| Multiple descriptions | Use primary as `display`, alternates as `designation` |

### 4. Inactive/Deprecated Codes

**Migration Strategy:**

| PSS Status | Migration Action | Rationale |
|-----------|------------------|-----------|
| Active | Include in CodeSystem | Current use |
| Inactive | Exclude from initial migration | Cleaner starting point |
| Deprecated | Include with property flag | May still be referenced |
| Retired | Exclude | No longer valid |

**Document exclusions:**
- Create exclusion report: `migration-excluded-codes.csv`
- List: code, description, status, reason for exclusion
- Archive for audit purposes

## Example: PSS CodeMaster Structure

**PSS CodeMaster Export (Hypothetical):**
```
CodeGroup: PATIENT_STATUS
Domain: Clinical
Active: Yes

Code | Description | Status | Last_Modified
-----|-------------|--------|---------------
ACT  | Active      | Active | 2023-01-15
INA  | Inactive    | Active | 2023-01-15
PEN  | Pending     | Active | 2023-02-20
DIS  | Discharged  | Active | 2023-03-10
DEC  | Deceased    | Active | 2023-01-15
CANC | Cancelled   | Inactive | 2022-12-01
```

## Mapping Table Summary

| # | PSS Element | FHIR Destination | Required? | Notes |
|---|-------------|------------------|-----------|-------|
| 1 | CodeGroup ID | CodeSystem.url | ✅ Yes | Transform to canonical URL |
| 2 | CodeGroup Name | CodeSystem.name | ✅ Yes | Alphanumeric identifier |
| 3 | CodeGroup Description | CodeSystem.title | ⚠️ Recommended | Human-readable name |
| 4 | Domain | CodeSystem.url namespace | ⚠️ Recommended | Organize by domain |
| 5 | Code | concept.code | ✅ Yes | Primary identifier |
| 6 | Description | concept.display | ⚠️ Recommended | Human-readable label |
| 7 | Status | concept.property OR filter | ❌ Optional | Store or exclude |
| 8 | Last_Modified | concept.property | ❌ Optional | Audit trail |
| 9 | - | CodeSystem.status | ✅ Yes | Default: `draft` |
| 10 | - | CodeSystem.content | ✅ Yes | Always: `complete` |
| 11 | - | CodeSystem.version | ⚠️ Recommended | Use migration date |

## Migration Process

### Pre-Migration Steps

1. **Inventory PSS CodeSets**
   - List all CodeGroups/CodeSets
   - Count codes per CodeSet
   - Identify hierarchical structures
   - Document custom fields

2. **Design URL Namespace**
   - Choose organization domain
   - Define URL pattern
   - Allocate URL per CodeSet

3. **Validate Code Formats**
   - Check for invalid characters
   - Identify duplicates
   - Verify uniqueness within CodeSet

4. **Review Status Values**
   - Decide on Active/Inactive handling
   - Plan for deprecated codes
   - Document exclusion criteria

### Migration Execution

1. **Extract PSS Data**
   - Export CodeMaster to CSV/JSON
   - One file per CodeGroup
   - Include all metadata

2. **Transform to FHIR**
   - Apply mapping rules
   - Generate FHIR JSON files
   - Generate CSV files (for our import)

3. **Validate Outputs**
   - Check FHIR JSON structure
   - Verify CSV format
   - Count concepts (match source)

4. **Import to System**
   - Use Phase 4B Import functionality
   - Import FHIR JSON OR CSV (choose one)
   - Review validation warnings

5. **Post-Import Verification**
   - Compare imported vs source counts
   - Spot-check sample codes
   - Test searching/filtering

### Post-Migration Steps

1. **Manual Review**
   - Review concept displays
   - Add definitions where missing
   - Correct any mapping errors

2. **Enhancement**
   - Add hierarchies if needed
   - Include designations (translations)
   - Add properties (metadata)

3. **Activation**
   - Change status from `draft` to `active`
   - Document version (e.g., `1.0.0`)
   - Publish to stakeholders

## Migration Tools

### Recommended Conversion Script (Conceptual)

```python
def convert_pss_to_fhir(pss_codeset):
    """Convert PSS CodeSet to FHIR CodeSystem"""
    
    fhir_codesystem = {
        "resourceType": "CodeSystem",
        "url": f"http://hospital.gov.sg/pss/fhir/CodeSystem/{sanitize(pss_codeset.id)}",
        "version": datetime.now().strftime("%Y%m%d"),
        "name": to_pascal_case(pss_codeset.name),
        "title": pss_codeset.description,
        "status": "draft",
        "content": "complete",
        "publisher": "Example Healthcare Organization",
        "concept": []
    }
    
    for pss_code in pss_codeset.codes:
        # Skip inactive codes
        if pss_code.status != "Active":
            continue
            
        concept = {
            "code": pss_code.code,
            "display": pss_code.description
        }
        
        # Add definition if available
        if pss_code.long_description:
            concept["definition"] = pss_code.long_description
            
        fhir_codesystem["concept"].append(concept)
    
    return fhir_codesystem
```

### Conversion to CSV

```python
def convert_pss_to_csv(pss_codeset):
    """Convert PSS CodeSet to CSV for import"""
    
    rows = [["code", "display", "definition"]]
    
    for pss_code in pss_codeset.codes:
        if pss_code.status != "Active":
            continue
            
        rows.append([
            pss_code.code,
            pss_code.description,
            pss_code.long_description or ""
        ])
    
    return rows
```

## Migration Readiness Checklist

### Technical Readiness
- [ ] PSS CodeMaster data extracted
- [ ] URL namespace defined
- [ ] Conversion scripts prepared
- [ ] FHIR JSON samples validated
- [ ] CSV samples tested with Phase 4B import
- [ ] Exclusion criteria documented

### Business Readiness
- [ ] Stakeholders informed
- [ ] Migration schedule agreed
- [ ] Rollback plan prepared
- [ ] Testing plan defined
- [ ] User training completed

### Data Quality
- [ ] Duplicate codes identified and resolved
- [ ] Invalid characters cleaned
- [ ] Missing descriptions flagged
- [ ] Hierarchies documented
- [ ] Status values reviewed

## Manual Review Steps (Post-Import)

### 1. Completeness Check
- Compare imported concept count vs PSS source count
- Verify all expected CodeSets imported
- Check for missing concepts

### 2. Data Accuracy Review
- Spot-check 10% of concepts per CodeSet
- Verify code matches PSS original
- Verify display matches PSS description
- Check definitions populated correctly

### 3. Terminology Validation
- Review advisory panel for warnings
- Fix broken references if any
- Correct display name mismatches

### 4. Business Logic Review
- Verify codes match business rules
- Confirm status handling appropriate
- Check hierarchies make sense

### 5. User Acceptance Testing
- Test searching for concepts
- Verify constraint authoring works
- Validate export functionality

## Known Migration Challenges

### 1. Code Format Inconsistencies
**Issue:** PSS codes may have spaces, special characters  
**Solution:** Transform during migration, store original as property  
**Review Step:** Verify transformed codes still understandable

### 2. Description Quality Varies
**Issue:** Some PSS descriptions are cryptic abbreviations  
**Solution:** Flag for manual enhancement post-import  
**Review Step:** Create "needs definition" report

### 3. Hierarchical Relationships Not Explicit
**Issue:** PSS may have implicit categories not in data structure  
**Solution:** Manual hierarchy construction post-import  
**Review Step:** Work with domain experts to define hierarchies

### 4. Status Ambiguity
**Issue:** PSS "Inactive" may mean different things  
**Solution:** Document status meaning, apply consistent rule  
**Review Step:** Verify no active usage of "Inactive" codes

### 5. Missing Metadata
**Issue:** PSS may lack version history, publishers  
**Solution:** Use migration date as version, default publisher  
**Review Step:** Backfill metadata from documentation

## Migration Success Criteria

✅ **Complete Migration:**
- 100% of active PSS codes imported
- All CodeSets have valid URLs
- No validation errors in import

✅ **Data Quality:**
- All concepts have display values
- No duplicate codes within CodeSets
- Status handling documented

✅ **System Functionality:**
- Search works across all CodeSets
- Export regenerates valid files
- Constraint authoring references codes

✅ **Business Acceptance:**
- Sample validation passed by domain experts
- Known exclusions documented and approved
- Migration report accepted by stakeholders

## Rollback Plan

If migration issues discovered:

1. **Preserve Original Data**
   - Keep PSS export files
   - Don't delete from PSS yet
   - Maintain exclusion reports

2. **Rollback Procedure**
   - Delete imported CodeSystems via UI
   - Re-import corrected versions
   - Use CSV import (faster iteration)

3. **Iteration Strategy**
   - Fix one CodeSet at a time
   - Validate before next import
   - Document corrections made

## Next Steps After Migration

1. **Constraint Migration** (Future Phase)
   - Migrate PSS validation rules to FHIR constraints
   - Map to FHIRPath expressions
   - Test validation against real data

2. **Integration**
   - Connect to FHIR validation pipeline
   - Replace PSS CodeMaster lookups
   - Retire legacy system

3. **Ongoing Maintenance**
   - Establish terminology governance
   - Define update process
   - Train content authors

## Summary

**Migration Path:**
```
PSS CodeMaster Export
  ↓ (Transform)
FHIR JSON or CSV
  ↓ (Import via Phase 4B)
FHIR Processor V2 CodeSystems
  ↓ (Enhance)
Production-Ready Terminology
```

**Key Principles:**
- ✅ Preserve original PSS codes
- ✅ Clean data during migration
- ✅ Document exclusions
- ✅ Manual review required
- ✅ Iterative approach OK

**Migration Readiness:** System is ready for PSS CodeMaster migration. Import functionality (Phase 4B) supports both FHIR JSON and CSV formats needed for the migration.
