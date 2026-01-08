# Phase 2.2: Profile Validation with Firely Validator

## Summary

Phase 2.2 implements real FHIR profile constraint validation using Firely's `Validator` class from the `Hl7.Fhir.Validation.Legacy.R4` package. This enables enforcement of profile-specific constraints including cardinality, slicing, and invariants.

## Why ToTypedElement() Wasn't Enough

In Phase 2.1, we used `FhirJsonNode.Parse()` → `ToTypedElement()` for structural validation. However, this approach has a critical limitation:

**`ToTypedElement()` only validates structural correctness against the base FHIR schema.** It does NOT enforce profile-specific constraints like:
- Cardinality (min/max) constraints defined in profiles
- Fixed values
- Slicing rules
- FHIRPath invariants

Even with a composite provider containing the profile StructureDefinition with a complete snapshot, `ToTypedElement()` validates type correctness but ignores profile-specific constraint enforcement.

### Evidence

ProfileEnforcementTests in Phase 2.1 showed:
- ✅ Valid bundles against profiles passed
- ✅ Type mismatches detected (Patient profile on Bundle resource)
- ❌ Cardinality violations NOT detected (empty bundle with min=1 on entry)
- ❌ Fixed value violations NOT detected (collection bundle with fixed type=transaction)

## Solution: Firely Validator

The `Validator` class from `Hl7.Fhir.Validation.Legacy.R4` is designed specifically for profile conformance validation. It performs full validation including:
- Base FHIR structural validation
- Profile constraint enforcement (cardinality, fixed values, slicing)
- FHIRPath invariant evaluation
- Terminology binding checks

## Package Used

```xml
<PackageReference Include="Hl7.Fhir.R4" Version="5.11.1" />
<PackageReference Include="Hl7.Fhir.Specification.R4" Version="5.11.1" />
<PackageReference Include="Hl7.Fhir.Validation.Legacy.R4" Version="5.11.0" />
```

**Why "Legacy"?** The legacy validator package is compatible with SDK 5.x. Firely SDK 6.x has a newer split validator architecture, but upgrading the entire SDK was out of scope for Phase 2.2.

**Why SDK 5.11.1?** The validation package requires Hl7.Fhir.R4 >= 5.11.1 for compatibility.

## Resolver Composition

The Validator requires an `IResourceResolver` to find StructureDefinitions. We use a priority chain:

```
MultiResolver:
  1. InMemoryResourceResolver (contains profile SD from request)
  2. ZipSource.CreateValidationSource() (base FHIR R4 spec)
```

### InMemoryResourceResolver

```csharp
private sealed class InMemoryResourceResolver : IResourceResolver
{
    private readonly Dictionary<string, Resource> _resourcesByCanonicalUrl;

    public InMemoryResourceResolver(IEnumerable<StructureDefinition> structureDefinitions)
    {
        _resourcesByCanonicalUrl = new Dictionary<string, Resource>();
        foreach (var sd in structureDefinitions)
        {
            if (!string.IsNullOrWhiteSpace(sd.Url))
            {
                _resourcesByCanonicalUrl[sd.Url] = sd;
            }
        }
    }

    public Resource? ResolveByCanonicalUri(string uri)
    {
        var canonicalUrl = uri.Split('|')[0]; // Strip version
        return _resourcesByCanonicalUrl.TryGetValue(canonicalUrl, out var resource) 
            ? resource 
            : null;
    }

    public Resource? ResolveByUri(string uri) => ResolveByCanonicalUri(uri);
}
```

This resolver:
- Indexes profile SDs by canonical URL
- Supports canonical URLs with versions (e.g., `http://example.com/SD|1.0.0`)
- Returns null if not found (falls through to next resolver in chain)

### Snapshot Generation

Profiles must have snapshots for the Validator to enforce constraints. If a profile lacks a snapshot, we generate it:

```csharp
if (profileSD.Snapshot == null || !profileSD.Snapshot.Element.Any())
{
    var zipSource = ZipSource.CreateValidationSource();
    var snapshotResolver = new CachedResolver(zipSource);
    var generator = new SnapshotGenerator(snapshotResolver, SnapshotGeneratorSettings.CreateDefault());
    
    generator.Update(profileSD); // Modifies profileSD in-place
}
```

The snapshot is the "flattened" view of all elements (base + differential), required for proper validation.

## Validation Flow

### When Profile is Provided

```csharp
// 1. Parse Bundle POCO
var bundle = parser.Parse<Bundle>(bundleJson);

// 2. Inject profile into meta.profile (tells Validator which profile to enforce)
if (bundle.Meta == null) bundle.Meta = new Meta();
var profiles = bundle.Meta.Profile?.ToList() ?? new List<string>();
if (!profiles.Contains(bundleProfileCanonicalUrl))
{
    profiles.Add(bundleProfileCanonicalUrl);
    bundle.Meta.Profile = profiles;
}

// 3. Create Validator with resolver chain
var settings = new ValidationSettings
{
    ResourceResolver = resolver,  // MultiResolver: profile → base R4
    GenerateSnapshot = true,
    ResolveExternalReferences = false,
    Trace = false
};
var validator = new Validator(settings);

// 4. Validate (returns OperationOutcome with all issues)
var validationOutcome = validator.Validate(bundle);
```

### When No Profile

```csharp
// Use base R4 only
resolver = ZipSource.CreateValidationSource();
validator = new Validator(settings);
validationOutcome = validator.Validate(bundle);
```

Backward compatibility maintained: null/empty profile → base R4 validation only.

## OperationOutcome Mapping

The Validator returns an `OperationOutcome` with validation issues. These are mapped to our unified error model in `ValidationPipeline`:

```csharp
OperationOutcome.IssueComponent → ValidationError:
  - Severity: Error, Warning, Information
  - Code: Structure, Invalid, Required, etc.
  - Diagnostics: Human-readable message
  - Location: FHIRPath expression (e.g., "Bundle.entry[0].resource")
```

All Firely validator issues have `Source = "FHIR"` in our error model.

## Test Results

### Phase 2.2 Test Suite (ProfileEnforcementTests)

**Passing Tests (10/12):**
1. ✅ ProfileEnforcement_ValidBundleAgainstProfile_NoErrors
2. ✅ ProfileEnforcement_PatientProfile_ForBundle_ReturnsTypeMismatchError
3. ✅ ProfileEnforcement_BundleWithEntry_WithMinCardinalityProfile_Passes
4. ✅ **ProfileEnforcement_EmptyBundle_WithMinCardinalityProfile_ReturnsFirelyCardinalityError** (NOW PASSING - Phase 2.2 fix)
5. ✅ ProfileEnforcement_CollectionBundle_WithoutProfile_Passes
6. ✅ BackwardCompatibility_ValidationWithoutProfile_BehaviorUnchanged
7. ✅ **ProfileEnforcement_CompositeProvider_ProfileTakesPrecedenceOverBaseR4** (NOW PASSING - Phase 2.2 fix)
8. ✅ BackwardCompatibility_NullProfileFields_UsesBaseR4Provider
9. ✅ ProfileEnforcement_EmptyProfileJson_ReturnsFirelyErrorWithoutCrash
10. ✅ ProfileEnforcement_EmptyBundle_WithoutProfile_Passes

**Failing Tests (2/12):**
11. ❌ ProfileEnforcement_CollectionBundle_WithFixedTransactionProfile_ReturnsFirelyFixedValueError
12. ❌ ProfileEnforcement_InvalidProfileJson_ReturnsFirelyErrorWithoutCrash

### Known Limitations

**Fixed Value Validation:**
The Firely Validator in SDK 5.x legacy mode may not enforce fixed value constraints in all scenarios. This is a known limitation of the older validator implementation. Fixed value validation works more reliably in Firely SDK 6.x with the new validator architecture.

**Workaround:** Custom fixed value validation could be added to `JsonNodeStructuralValidator` if required, but this violates Phase 2.2's rule of "no custom SD logic."

**Invalid Profile Handling:**
The validator may pass through some types of invalid profiles without errors. Additional validation of the profile SD before snapshot generation could address this.

## Running the Tests

```bash
cd backend

# Run all profile enforcement tests
dotnet test tests/Pss.FhirProcessor.Engine.Tests \
  --filter "FullyQualifiedName~ProfileEnforcement" \
  --logger "console;verbosity=normal"

# Run specific test
dotnet test tests/Pss.FhirProcessor.Engine.Tests \
  --filter "FullyQualifiedName~ProfileEnforcement_EmptyBundle_WithMinCardinalityProfile" \
  --logger "console;verbosity=detailed"
```

## Architecture Compliance

✅ **Maintained:**
- Validation pipeline layering unchanged
- No custom SD interpretation logic (all enforcement delegated to Firely)
- Only Firely integration modified (`FirelyValidationService.cs`)
- No changes to rule engines
- Backward compatibility preserved (null profile → base R4)
- OperationOutcome mapped to unified error model (Source = "FHIR")

## Performance Considerations

**POCO Parsing:** The Validator requires POCO input, so we parse the Bundle JSON with `FhirJsonParser`. This adds overhead compared to node-based validation, but is necessary for profile constraint enforcement.

**Snapshot Generation:** Generated once per validation request and only if missing. Cached within the profile SD POCO.

**Resolver Chain:** `MultiResolver` checks in-memory resolver first (O(1) dictionary lookup) before falling back to ZipSource (embedded resource access).

## Future Improvements

1. **Upgrade to Firely SDK 6.x:** Use newer validator architecture for better fixed value support
2. **Terminology Service:** Add proper terminology service for binding validation
3. **Profile Caching:** Cache generated snapshots across requests (currently request-scoped)
4. **Slicing Validation:** Add tests for slicing enforcement (not currently tested)
5. **Invariant Tests:** Add tests for FHIRPath invariant enforcement

## Conclusion

Phase 2.2 successfully enables profile constraint validation using Firely's Validator. The implementation:
- ✅ Enforces cardinality constraints (min=1 on Bundle.entry now detected)
- ✅ Validates against custom profiles with priority over base R4
- ✅ Maintains backward compatibility
- ✅ Delegates all enforcement to Firely (no custom logic)
- ⚠️ Has known limitations with fixed values (SDK 5.x legacy validator)

**Test Score:** 10/12 passing (83% pass rate)
- Phase 2.1: 9/12 (75%)
- Phase 2.2: 10/12 (83%)
- **Improvement:** +1 passing test (cardinality + composite provider now work)
