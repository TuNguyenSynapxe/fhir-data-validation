# PSS CodeMaster to FHIR Terminology - Quick Migration Guide

## Pre-Requisites

✅ Phase 4B Import functionality available  
✅ PSS CodeMaster data exported (CSV or database extract)  
✅ Organization domain URL decided  
✅ Migration team identified (technical + clinical)

## Step-by-Step Migration Process

### Step 1: Export PSS CodeMaster Data

**From PSS System:**
```sql
-- Example SQL query to extract CodeMaster data
SELECT 
    CodeGroupID,
    CodeGroupName,
    Code,
    Description,
    Status,
    Domain,
    LastModified
FROM PSS_CodeMaster
WHERE Status = 'Active'  -- Optional: Filter active only
ORDER BY CodeGroupID, Code;
```

**Export to CSV:**
- One CSV per CodeGroup, OR
- Single CSV with CodeGroup column

### Step 2: Transform to FHIR Format

**Option A: Use FHIR JSON**
- Best for: Complex structures, hierarchies, properties
- File: `{CodeGroupName}.json`
- Format: See `pss-migration-fhir-example.json`

**Option B: Use CSV Import Format**
- Best for: Simple flat lists, quick migration
- File: `{CodeGroupName}.csv`
- Format: See `pss-migration-csv-flat.csv` or `pss-migration-csv-hierarchical.csv`

**Transformation Checklist:**
- [ ] Remove inactive codes (or document exclusions)
- [ ] Validate code format (alphanumeric + hyphens)
- [ ] Ensure display values populated
- [ ] Add definitions where available
- [ ] Check for duplicates within CodeGroup
- [ ] Construct canonical URLs

### Step 3: Import via Phase 4B

1. Navigate to Terminology tab in project
2. Click "Import" button
3. Upload FHIR JSON or CSV file
4. **Preview Step:**
   - Review concept count
   - Check validation warnings (non-blocking)
   - Fill in metadata (if CSV):
     - URL: `http://hospital.gov.sg/pss/fhir/CodeSystem/{code-group-id}`
     - Name: `{CodeGroupName}` (alphanumeric only)
     - Title: `{CodeGroup Display Name}`
     - Status: `draft` (change to `active` after review)
5. Click "Import CodeSystem"

### Step 4: Post-Import Validation

**Check Import Success:**
- [ ] Concept count matches source (minus exclusions)
- [ ] All CodeSets imported
- [ ] No validation errors

**Spot Check Data:**
- [ ] Sample 10 concepts per CodeSet
- [ ] Verify codes match PSS originals
- [ ] Verify displays correct
- [ ] Check definitions populated

**Review Advisory Panel:**
- [ ] Check for broken references
- [ ] Fix any display mismatches
- [ ] Document any warnings

### Step 5: Manual Enhancement

**Add Missing Data:**
- [ ] Add definitions to concepts without them
- [ ] Construct hierarchies (if flat in PSS)
- [ ] Add designations (translations, synonyms)

**Quality Improvements:**
- [ ] Standardize display capitalization
- [ ] Expand abbreviations in definitions
- [ ] Add usage guidance in descriptions

### Step 6: Activation

**Pre-Activation Checks:**
- [ ] Clinical review completed
- [ ] Terminology governance approved
- [ ] Integration testing passed

**Activate CodeSystem:**
1. Edit CodeSystem metadata
2. Change status from `draft` to `active`
3. Set version: `1.0.0`
4. Add version notes: "Initial migration from PSS"
5. Save changes

## Migration Example: Patient Status CodeSet

### PSS Source Data
```
CodeGroup: PATIENT_STATUS
Codes: ACT, INA, PEN, DIS, DEC, TRF, ABS, OBS, CANC (inactive)
```

### Transformation Decision
- Exclude CANC (inactive)
- Keep original PSS codes (already valid format)
- Add parent concept for "Pending" subcategories

### Import Result
- 8 active concepts imported
- 1 concept with children (PEN → PEN-ADM, PEN-REG)
- 1 exclusion documented

### Files Generated
- `pss-migration-fhir-example.json` - FHIR format
- `pss-migration-csv-hierarchical.csv` - CSV format (with hierarchy)
- `pss-migration-exclusions.txt` - Excluded codes report

## Common Migration Patterns

### Pattern 1: Flat CodeSet (No Hierarchy)
**PSS Structure:** Simple list of codes  
**Migration:** Direct 1:1 mapping  
**Format:** CSV flat or FHIR JSON  
**Example:** `pss-migration-csv-flat.csv`

### Pattern 2: Implicit Hierarchy
**PSS Structure:** Codes with naming convention (e.g., PEN-ADM, PEN-REG)  
**Migration:** Extract parent concepts, build hierarchy  
**Format:** CSV hierarchical or FHIR JSON  
**Example:** `pss-migration-csv-hierarchical.csv`

### Pattern 3: Domain Grouping
**PSS Structure:** Multiple CodeGroups in same domain  
**Migration:** Separate CodeSystems with domain in URL  
**Format:** FHIR JSON (better metadata support)  
**Example:** See URL namespace in `pss-migration-fhir-example.json`

## Troubleshooting

### Issue: Import Validation Errors

**Error: "Missing required column: code"**
- CSV must have header row
- Column must be named exactly `code`

**Error: "Duplicate code 'ACT' found"**
- Each code must be unique within CSV
- Check for data duplication in source

**Error: "Invalid URL format"**
- URL must start with `http://` or `https://`
- Use pattern: `http://{domain}/fhir/CodeSystem/{name}`

### Issue: Import Warnings (Non-Blocking)

**Warning: "Missing 'display' field for code 'ACT'"**
- Add display value in CSV or JSON
- Can import and fix later via editor

**Warning: "URL already exists, will overwrite"**
- CodeSystem with this URL exists
- Import will replace existing data
- Verify this is intended behavior

### Issue: Incorrect Concept Count

**Imported concepts < Source concepts**
- Check exclusion criteria (Status filter)
- Review import validation messages
- Verify CSV format (no empty required fields)

**Imported concepts > Source concepts**
- Hierarchy expanded (children counted separately)
- This is expected for hierarchical structures

## Migration Readiness Assessment

### ✅ Ready to Migrate When:
- PSS data extracted and validated
- URL namespace designed and approved
- Test migration completed successfully
- Clinical review team available
- Phase 4B import tested

### ⚠️ Not Ready When:
- PSS data quality issues unresolved
- URL naming convention not decided
- Import functionality not tested
- No clinical reviewer assigned
- Multiple CodeGroups interdependent

## Post-Migration Maintenance

### Ongoing Updates
1. **New PSS codes added:**
   - Add manually via editor, OR
   - Re-import full CodeSet (overwrites)

2. **PSS codes retired:**
   - Change concept status to `retired` in editor
   - Don't delete (may break existing constraints)

3. **Description changes:**
   - Edit concept display/definition in editor
   - Update version number

### Synchronization Strategy

**Option A: Manual Sync**
- Edit in FHIR Processor V2 directly
- PSS becomes read-only reference

**Option B: Periodic Re-Import**
- Export PSS → Transform → Re-import
- Overwrites any manual edits
- Good for initial migration phase

**Recommendation:** Option A after initial migration stabilizes.

## Success Metrics

### Migration Success:
- ✅ 100% of active PSS codes migrated
- ✅ < 5% validation warnings
- ✅ Clinical review passed
- ✅ Integration tests passed

### Data Quality:
- ✅ All concepts have displays
- ✅ > 80% concepts have definitions
- ✅ No duplicate codes
- ✅ Hierarchies validated

### System Integration:
- ✅ Constraints reference migrated codes
- ✅ Search finds all concepts
- ✅ Export regenerates clean files

## Contact & Support

**Migration Questions:**
- Review `PHASE_4C_PSS_MIGRATION_MAPPING.md` for detailed mapping rules
- Check `pss-migration-fhir-example.json` for complete example
- Use `pss-migration-csv-hierarchical.csv` as CSV template

**Import Issues:**
- See Phase 4B documentation
- Check validation error messages
- Review `IMPORT_EXAMPLES_README.md`

## Quick Reference

| Task | File | Notes |
|------|------|-------|
| See mapping rules | `PHASE_4C_PSS_MIGRATION_MAPPING.md` | Complete mapping documentation |
| FHIR JSON example | `pss-migration-fhir-example.json` | Realistic PSS CodeSet |
| CSV flat example | `pss-migration-csv-flat.csv` | Simple list format |
| CSV hierarchy example | `pss-migration-csv-hierarchical.csv` | With parentCode column |
| Exclusion template | `pss-migration-exclusions.txt` | Document skipped codes |
| Import guide | `IMPORT_EXAMPLES_README.md` | Phase 4B import docs |

---

**Migration Status:** System ready for PSS CodeMaster migration.  
**Recommended Approach:** Start with pilot CodeSet (10-20 concepts), validate end-to-end, then proceed with full migration.
