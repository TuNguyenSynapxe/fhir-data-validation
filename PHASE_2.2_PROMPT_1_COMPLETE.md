# Phase 2.2 Prompt 1 Complete - Validator Rules

## Summary
Completed Phase 2.2 validator implementation with base SD traversal for slice child constraint validation.

## Changes Made

### 1. Validator Enhancement (SdDesignValidator.cs)
**Line 20-38**: Modified `ValidateAsync` to load base SD once at the beginning:
```csharp
// Phase 2.2: Load base SD once for slice child constraint validation
StructureDefinition? baseSd = null;
if (!string.IsNullOrEmpty(design.BaseCanonicalUrl))
{
    baseSd = await sdRepo.FindByUrlAsync(design.BaseCanonicalUrl, ct) as StructureDefinition;
}
```

**Line 293-385**: Enhanced `ValidateSliceChildConstraints` method:
- Changed signature to accept `StructureDefinition? baseSd` instead of `ResourceDesignState design`
- **NEW ERROR RULE**: `SLICE_CHILD_INVALID_TYPE_FOR_BINDING`
  - Checks element type from base SD snapshot
  - Only allows binding on: code, Coding, CodeableConcept
  - Example: "Cannot apply binding to slice child element systolic.valueQuantity.value: element type is 'decimal', must be code|Coding|CodeableConcept"

- **NEW WARNING RULE**: `SLICE_CHILD_CARDINALITY_TIGHTENED`
  - Compares override cardinality to base SD snapshot
  - Warns if min increased OR max reduced
  - Example: "Slice child element systolic.valueQuantity.value tightens base cardinality from 0..1 to 1..1"

### 2. Validation Tests (SdValidationTests.cs)
**Line 714-770**: Added test `ValidateAsync_SliceChildInvalidTypeForBinding_ReturnsError`
- Scenario: Apply binding to decimal element (valueQuantity.value)
- Expected: ERROR with code `SLICE_CHILD_INVALID_TYPE_FOR_BINDING`
- Mock: Base SD with snapshot showing element type

**Line 772-824**: Added test `ValidateAsync_SliceChildCardinalityTightened_ReturnsWarning`
- Scenario: Tighten cardinality from 0..1 to 1..1
- Expected: WARNING with code `SLICE_CHILD_CARDINALITY_TIGHTENED`
- Mock: Base SD with snapshot showing base cardinality

**Line 826-852**: Added helper method `CreateMockBaseSD_ObservationWithSnapshot`
- Returns Observation SD with snapshot containing component.valueQuantity.value element
- Element type: decimal (0..1)

## Test Results
- **New Tests**: 2 added, 2 passing ✅
- **Total Tests**: 92 passing / 98 total
  - 72 Phase 1 tests ✅
  - 20 Phase 2.x tests ✅ (includes 2 new Phase 2.2 validator tests)
  - 6 Phase 2.1 tests failing (expected - message format issue, will fix in Prompt 4)

## Validation Logic Details

### Base SD Lookup
1. Validator loads base SD once using `design.BaseCanonicalUrl`
2. Base SD passed to `ValidateSliceChildConstraints`
3. For each child constraint, resolve full path: `{parentPath}.{relativePath}`
4. Find matching element in base SD snapshot: `baseSd.Snapshot.Element.FirstOrDefault(e => e.Path == fullPath)`

### Type Check (SLICE_CHILD_INVALID_TYPE_FOR_BINDING)
```csharp
if (constraint.Binding != null)
{
    var allowedTypes = new[] { "code", "Coding", "CodeableConcept" };
    var elementType = baseElement.Type?.FirstOrDefault()?.Code;
    
    if (elementType == null || !allowedTypes.Contains(elementType))
    {
        result.AddError("SLICE_CHILD_INVALID_TYPE_FOR_BINDING", ...);
    }
}
```

### Cardinality Tightening Check (SLICE_CHILD_CARDINALITY_TIGHTENED)
```csharp
if (constraint.CardinalityOverride != null)
{
    var baseMin = baseElement.Min ?? 0;
    var baseMax = baseElement.Max ?? "*";
    var overrideMin = constraint.CardinalityOverride.Min;
    var overrideMax = constraint.CardinalityOverride.Max;
    
    var minTightened = overrideMin > baseMin;
    var maxTightened = (overrideMax != "*" && baseMax != "*" && int.Parse(overrideMax) < int.Parse(baseMax)) ||
                      (overrideMax != "*" && baseMax == "*");
    
    if (minTightened || maxTightened)
    {
        result.AddWarning("SLICE_CHILD_CARDINALITY_TIGHTENED", ...);
    }
}
```

## Architecture Compliance
✅ No snapshot mutation (base SD only read for validation)
✅ No Firely validator usage (design-time validation only)
✅ Base SD loaded via repository abstraction
✅ Deterministic validation logic

## Next Steps
- **Prompt 2**: Complete exporter with BP Observation golden test
- **Prompt 3**: Add Phase 2.2 guardrail tests
- **Prompt 4**: Fix 6 failing Phase 2.1 message assertion tests

## Status: ✅ COMPLETE
Prompt 1 implementation complete and tested. Validator now performs full type checking and cardinality warning for slice child constraints using base SD snapshot traversal.
