# FHIR R4 Specifications

This directory contains FHIR R4 specifications used for **local validation** and **schema metadata**.

## Folder Structure

```
specs/fhir/r4/
├── structuredefinitions/    # HL7 FHIR StructureDefinitions (39 files)
│   ├── base/                # Base types (Element, Resource, DomainResource, BackboneElement)
│   ├── datatypes/           # Complex data types (HumanName, Address, Coding, etc.)
│   └── resources/           # Resource definitions (Patient, Observation, Bundle, etc.)
│
├── valuesets/               # FHIR ValueSets (175 files)
│   └── ValueSet-*.json      # Enum validation bindings
│
└── StructureDefinitions.backup/  # Original download archive (do not modify)
```

## Purpose

### StructureDefinitions (`structuredefinitions/`)
- **What**: HL7 FHIR StructureDefinition JSON files
- **Used for**: 
  - Schema shape (element hierarchy)
  - Cardinality constraints (min/max)
  - Binding metadata (ValueSet references)
  - Type information (primitives, complex types)
- **Used by**:
  - `FhirSchemaService` → builds `FhirSchemaNode` trees
  - `SchemaExpansionService` → extracts binding metadata
  - `SpecHintService` → generates field hints
  - `JsonNodeStructuralValidator` (Phase A/B) → validates structure

### ValueSets (`valuesets/`)
- **What**: FHIR ValueSet expansion JSON files
- **Used for**:
  - Enum validation (allowed codes)
  - Dynamic binding strength mapping
- **Used by**:
  - `FhirEnumIndex` (Phase B) → caches enum values
  - Future: ValueSet expansion service

## Important Notes

### NO Internet Resolution
- All validation is **local-only**
- No terminology server calls
- No external ValueSet expansion
- Firely SDK uses embedded packages (not these files)

### Firely Independence
- Firely POCO parsing does **NOT** depend on these paths
- Firely SDK has its own embedded StructureDefinitions
- These files are for **JSON node validation** (Phase A/B)

### Version Awareness
- This folder: **FHIR R4 only**
- Future: `specs/fhir/r5/` will follow same structure
- Code uses `GetStructureDefinitionDirectory(fhirVersion)` for resolution

## File Counts

- **StructureDefinitions**: 39 curated definitions
  - 4 base types
  - 15+ datatypes
  - 20+ resource types
- **ValueSets**: 175 ValueSet expansions

## Maintenance

### Adding New StructureDefinitions
1. Download from https://www.hl7.org/fhir/R4/downloads.html
2. Place in appropriate subfolder:
   - Base types → `structuredefinitions/base/`
   - Datatypes → `structuredefinitions/datatypes/`
   - Resources → `structuredefinitions/resources/`

### Adding New ValueSets
1. Download ValueSet JSON from HL7
2. Place in `valuesets/`
3. Update `FhirEnumIndex.ExtractCodesFromBinding()` if needed

### DO NOT
- ❌ Modify JSON file contents
- ❌ Delete backup folder
- ❌ Mix R4 and R5 files
- ❌ Duplicate files across folders

## Related Code

**Path Resolution**:
- `SpecHintService.GetStructureDefinitionDirectory()`
- Returns: `specs/fhir/r4/structuredefinitions/`

**Schema Loading**:
- `FhirSchemaService.GetResourceSchemaAsync()`
- `SchemaExpansionService.ExpandStructureDefinition()`

**Enum Indexing**:
- `FhirEnumIndex.BuildIndexAsync()`
- Loads from StructureDefinitions + ValueSets

## Refactor History

**2026-01-01**: Restructured for Phase B
- Moved `base/`, `datatypes/`, `resources/` → `structuredefinitions/`
- Created `valuesets/` with 175 ValueSet files
- Updated `SpecHintService` path references
- **No logic changes** - structure-only refactor

---

For questions, see: `/SPECS_REFACTOR_COMPLETE.md`
