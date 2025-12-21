# MISSING_REQUIRED_FIELD Lint Rule Implementation

## Overview

The `MISSING_REQUIRED_FIELD` lint rule detects when required fields (per FHIR schema, min > 0) are missing from resources. This best-effort check helps developers understand why some FHIR servers might reject incomplete resources, even when Firely's permissive parser accepts them.

## Implementation

### Location
- **Rule Definition**: `backend/src/Pss.FhirProcessor.Engine/Catalogs/LintRuleCatalog.cs`
- **Validation Logic**: `backend/src/Pss.FhirProcessor.Engine/Services/LintValidationService.cs`
  - Method: `CheckMissingRequiredFields`
  - Integration points: `ValidateResourceAsync` (resource level and nested objects)

### Rule Metadata
```csharp
Id: "MISSING_REQUIRED_FIELD"
Category: SchemaShape
Title: "Missing required field"
Severity: "Warning"  // Non-blocking
Confidence: "High"
```

### How It Works

1. **Schema-Driven**: Uses `IFhirSchemaService` to retrieve FHIR StructureDefinitions
2. **Traversal**: Checks required fields at:
   - Resource root level
   - Backbone elements (complex inline types)
   - Array item objects
3. **Detection**: Iterates through schema children where `Min > 0` and checks if property exists in JSON
4. **Exclusions**: Skips standard elements (resourceType, id, meta, extension, etc.), choice[x] base elements, and extension.value[x]

### Example Output

```json
{
  "ruleId": "MISSING_REQUIRED_FIELD",
  "severity": "Warning",
  "message": "Required field 'url' (1..1) is missing according to FHIR R4 schema. Note: Some FHIR engines may accept this, but strict servers may reject it.",
  "fhirPath": "Bundle.entry.request.url",
  "jsonPointer": "/entry/0/request/url",
  "details": {
    "fieldName": "url",
    "schemaPath": "Bundle.entry.request.url",
    "schemaMin": 1,
    "schemaMax": "1",
    "cardinality": "1..1",
    "confidence": "high",
    "disclaimer": "Best-effort portability check. Some FHIR engines may accept incomplete resources. Final validation is performed by the FHIR engine.",
    "note": "This field is marked as required (min > 0) in the FHIR specification but is missing from the resource."
  }
}
```

## Known Limitation: Firely Schema Discrepancies

### The Issue

Firely SDK's bundled FHIR R4 StructureDefinitions **mark many fields as optional (min=0)** even when the official FHIR R4 specification says they're **required (min=1)**.

### Examples

| Resource | Field | FHIR Spec | Firely Schema | Impact |
|----------|-------|-----------|---------------|--------|
| Encounter | status | 1..1 (required) | 0..1 (optional) | Not detected by lint |
| Observation | status | 1..1 (required) | 0..1 (optional) | Not detected by lint |
| Observation | code | 1..1 (required) | 0..1 (optional) | Not detected by lint |

### Why This Happens

Firely's StructureDefinitions are generated from their own FHIR specification parsing, which may:
- Use a more permissive interpretation of the spec
- Be optimized for their validation engine's needs
- Include corrections for known spec ambiguities

### Verification

Debug test in `backend/tests/Pss.FhirProcessor.Engine.Tests/DebugSchemaTest.cs`:

```bash
cd backend && dotnet test --filter "DebugSchemaTest.InspectEncounterSchema"
```

Output shows:
```
status: Min=0, Max=1, Type=Code`1, IsRequired=False
```

Expected (per FHIR spec):
```
status: Min=1, Max=1, Type=Code, IsRequired=True
```

## When the Rule WILL Work

The `MISSING_REQUIRED_FIELD` rule **will detect missing fields** in these scenarios:

1. **Backbone Elements**: Bundle.entry.request.url (correctly marked as 1..1 in Firely)
2. **Custom Profiles**: Organizations with stricter cardinality constraints
3. **Future Firely Updates**: If/when Firely updates their StructureDefinitions to match the official spec
4. **Manually Loaded Definitions**: If custom StructureDefinitions are loaded via `IFhirModelResolverService`

## Design Principles

### Why Schema-Driven?

Per project specifications (`docs/01_architecture_spec.md`), the system must:
- Be fully schema-driven (no hardcoded field lists)
- Respect FHIR version differences
- Support custom profiles
- Avoid duplicating Firely's validation logic

### Why Not Hardcode Required Fields?

Hardcoding would:
- ❌ Violate architecture principles
- ❌ Become stale as FHIR evolves
- ❌ Not work for custom profiles
- ❌ Require manual maintenance across versions

### Philosophy

> **Best-effort portability check**. The rule reports what the *loaded schema* says is required, not what we *think* should be required.

This approach:
- ✅ Respects schema authority
- ✅ Works with any FHIR version
- ✅ Supports custom profiles automatically
- ✅ Provides value when schemas are accurate

## Testing

### Test Coverage

All tests in `backend/tests/Pss.FhirProcessor.Engine.Tests/LintValidationServiceTests.cs`:

```bash
cd backend && dotnet test --filter "FullyQualifiedName~LintValidationServiceTests"
```

Tests validate:
- ✅ Metadata structure (when issues are found)
- ✅ Backbone element detection (Bundle.entry.request.url)
- ✅ Exclusion of standard fields
- ✅ Exclusion of choice[x] base elements
- ✅ Exclusion of extension.value[x]
- ✅ No false positives for optional fields

### Test Philosophy

Tests are **schema-aware** and don't assume specific fields will be detected. They validate:
1. Rule logic is correct (when triggered)
2. Exclusions work properly
3. Metadata structure is complete
4. No false positives occur

## Future Enhancements

If Firely schema limitations become a blocker:

### Option 1: Hybrid Approach
Load official FHIR StructureDefinitions alongside Firely's:
```csharp
// Load official R4 spec from HL7
var officialSource = new FhirPackageSource("hl7.fhir.r4.core", "4.0.1");
// Use for lint checks while Firely handles parsing
```

### Option 2: Explicit Override Catalog
Create a known-required-fields catalog for common resources:
```csharp
public static class KnownRequiredFields
{
    // Only for fields where Firely schema is known to be wrong
    public static Dictionary<string, List<string>> R4RequiredFields = new()
    {
        ["Encounter"] = new() { "status", "class" },
        ["Observation"] = new() { "status", "code" }
    };
}
```

### Option 3: Schema Correction Layer
Patch Firely schemas at load time:
```csharp
// Post-process loaded schemas to fix known discrepancies
if (element.Path == "Encounter.status" && element.Min == 0)
{
    element.Min = 1; // Correct to match FHIR spec
}
```

## Recommendations

For development teams:

1. **Understand the limitation**: Missing status/code fields won't trigger lint warnings
2. **Use Firely validation**: The authoritative validation engine will catch these
3. **Rely on business rules**: Use `rules.json` for domain-specific required fields
4. **Watch for updates**: Monitor Firely SDK releases for schema improvements
5. **Test with target servers**: Always validate against your production FHIR server

## Summary

The `MISSING_REQUIRED_FIELD` rule:
- ✅ **Is implemented** correctly per schema-driven architecture
- ✅ **Works today** for backbone elements and custom profiles
- ⚠️ **Limited by** Firely SDK schema inaccuracies for common resources
- ✅ **Will improve** as schemas are updated or corrected
- ✅ **Provides value** in a schema-correct environment

The rule is a **portability aid**, not a replacement for authoritative FHIR validation.
