# FHIR R4 StructureDefinitions - Curated Subset

## Overview
This directory contains a **curated, minimal subset** of HL7 FHIR R4 StructureDefinitions required for bundle validation, rule guidance, and UI navigation.

**Size**: 3.2MB (39 files)  
**Full HL7 R4 Corpus**: 20MB (657 files)  
**Reduction**: 84%

## Scope

### ✅ What This Supports
- Core resource structure validation
- Cardinality checks (array vs object)
- Required fields detection
- Data type validation (Identifier, HumanName, Address, etc.)
- Reference resolution
- Path navigation for UI highlighting
- Validation explanations ("What this means / How to fix")

### ❌ What This Does NOT Support
- Full HL7 extension ecosystem
- CQF / CDS Hooks / openEHR extensions
- IG authoring or profile derivation
- Primitive type loading from JSON (handled in code)
- Genetic/laboratory-specific extensions
- Questionnaire/survey extensions

## Structure

```
/r4
  /resources        - 20 core FHIR resources
  /datatypes        - 15 essential datatypes
  /base             - 4 structural base types
  StructureDefinitions.backup  - Original 657 files (NOT committed to git)
```

### Core Resources (20 files)
Essential resources for healthcare data exchange:
- Bundle, Patient, Observation, Encounter
- Organization, Location, Practitioner, PractitionerRole
- HealthcareService, OperationOutcome
- Condition, Procedure, MedicationRequest
- AllergyIntolerance, DiagnosticReport
- Specimen, ServiceRequest, Device
- Medication, ImagingStudy

### Core Datatypes (15 files)
Reusable data structures:
- Address, HumanName, Identifier, ContactPoint
- CodeableConcept, Coding, Reference
- Period, Quantity, Ratio, Range
- Timing, Annotation, Attachment, Narrative

### Base Types (4 files)
Structural foundations:
- Resource, DomainResource
- BackboneElement, Element

## Usage

### Loading StructureDefinitions

```csharp
// Hl7SpecHintGenerator automatically scans all subdirectories
var hints = generator.GenerateHints(
    structureDefinitionDirectory: "backend/specs/fhir/r4",
    fhirVersion: "R4"
);
```

### Handling Missing Definitions

The system gracefully handles missing StructureDefinitions:

1. **Extensions**: Unknown extensions are **allowed but ignored**
2. **Primitives**: Resolved via in-code mappings (not JSON files)
3. **Missing Resources**: Logged as warnings (non-fatal)

```csharp
// Example: Extension handling
if (!Directory.Exists(structureDefDirectory))
{
    _logger.LogWarning("StructureDefinition directory not found. Returning empty hints.");
    return hints; // Fallback to manual catalog
}
```

## Maintenance

### When to Add Files
Add a StructureDefinition file when:
- ✅ It's referenced by your validation rules
- ✅ It's required for path navigation
- ✅ It contains required field constraints you need

### When NOT to Add Files
Do not add files for:
- ❌ Unused resources (e.g., Claim, Contract, TestScript)
- ❌ Extensions (handled separately)
- ❌ Primitive types (string, boolean, integer, etc.)
- ❌ Metadata resources (SearchParameter, CapabilityStatement, etc.)

### Regenerating from Official Specs

If you need the full HL7 corpus:

```bash
# Download official FHIR R4 definitions
curl -L "https://hl7.org/fhir/R4/definitions.json.zip" -o /tmp/fhir-r4.zip
unzip -j /tmp/fhir-r4.zip "StructureDefinition-*.json" -d backend/specs/fhir/r4/StructureDefinitions
rm /tmp/fhir-r4.zip

# Then re-run the refactoring script
cd backend/specs/fhir/r4
./refactor_specs.sh
```

## Design Principles

1. **Minimal**: Only include what's actively used
2. **Deterministic**: Same input = same validation result
3. **Graceful Degradation**: Missing files cause warnings, not failures
4. **Educational**: Focus on developer guidance, not enforcement
5. **Maintainable**: Clear structure, easy to update

## CI/CD Impact

✅ **No CI/CD changes required**:
- Manual catalog (`Catalogs/fhir-spec-hints-r4.json`) is embedded in DLL
- Missing StructureDefinitions trigger warnings only
- Validation logic remains functional

✅ **Faster builds**:
- 84% smaller spec folder
- Faster git clones
- Faster file system operations

## Migration Notes

**From**: 657 files, 20MB (full HL7 R4 corpus)  
**To**: 39 files, 3.2MB (curated subset)

**Removed**:
- 618 StructureDefinitions
- All primitive types (handled in code)
- All extensions (iso21090-*, openEHR-*, cqf-*, etc.)
- Metadata resources (SearchParameter, ImplementationGuide, etc.)
- Unused clinical resources (Claim, Contract, TestScript, etc.)

**Preserved**:
- All validation functionality
- Path navigation
- Reference resolution
- Required field detection
- UI error highlighting

## Troubleshooting

### Warning: "StructureDefinition not found"
**Cause**: A resource type is referenced but not in the curated subset  
**Fix**: Either add the file or update rules to use a supported resource

### Error: "Cannot resolve path"
**Cause**: Missing datatype definition  
**Fix**: Add the datatype to `/datatypes` if it's essential

### Validation seems incomplete
**Cause**: May need more resource definitions  
**Fix**: Check logs for missing StructureDefinition warnings

---

**Last Updated**: December 16, 2025  
**Refactoring Tool**: `refactor_specs.sh`  
**Original Backup**: `StructureDefinitions.backup/` (local only, not in git)
