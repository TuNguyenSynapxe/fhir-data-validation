# Firely Exception Handling Refactoring

## Overview

This refactoring improves how Firely SDK exceptions are handled during FHIR Bundle parsing and deserialization. Previously, all parsing errors were collapsed into generic `INVALID_BUNDLE` errors, losing valuable context. Now, errors are captured with full detail and mapped to the UnifiedErrorModel correctly.

## Problem Statement

### Before
When Firely threw exceptions during Bundle deserialization (e.g., invalid enum values, unknown elements), the error handling would:

1. Catch all exceptions generically
2. Return `null` from ParseBundle
3. Create a generic error: `"Failed to parse FHIR Bundle - bundle is null or empty"`
4. Lose all context about:
   - What field had the error
   - What the invalid value was
   - What resource type was affected
   - Where in the JSON the error occurred

### After
Now each type of Firely exception is:

1. Caught and analyzed separately
2. Parsed to extract detailed context (resource type, field, value, etc.)
3. Mapped to specific error codes (INVALID_ENUM_VALUE, UNKNOWN_ELEMENT, etc.)
4. Enhanced with navigation breadcrumbs for frontend display
5. Preserved with full diagnostic information

## Architecture Changes

### New Components

#### 1. FirelyExceptionMapper (Static Helper)
**Location**: `Pss.FhirProcessor.Engine/Services/FirelyExceptionMapper.cs`

**Purpose**: Maps Firely SDK exceptions to structured ValidationError objects

**Key Methods**:
- `MapToValidationError(Exception, string?)` - Main entry point
- Pattern-specific mappers for:
  - Invalid enum values
  - Unknown elements
  - Type mismatches
  - Mandatory fields missing
  - Generic deserialization errors

**Error Code Mapping**:
- `INVALID_ENUM_VALUE` - Enum value not in allowed set
- `UNKNOWN_ELEMENT` - Field not in FHIR R4 schema
- `TYPE_MISMATCH` - Value cannot be converted to expected type
- `MANDATORY_MISSING` - Required field is absent
- `FHIR_DESERIALIZATION_ERROR` - Generic Firely parsing error
- `INVALID_JSON` - JSON syntax error (not a Firely error)
- `INVALID_BUNDLE` - Null/empty input

#### 2. Enhanced ValidationPipeline
**Location**: `Pss.FhirProcessor.Engine/Services/ValidationPipeline.cs`

**Changes**:
- Replaced `ParseBundle()` with `ParseBundleWithContext()`
- New `BundleParseResult` class for detailed parsing results
- Three-tier error handling:
  1. Empty/null check
  2. JSON syntax validation
  3. Firely POCO deserialization

**Benefits**:
- Distinguishes between different failure modes
- Preserves exception details
- Returns structured error lists instead of null

#### 3. Enhanced UnifiedErrorModelBuilder
**Location**: `Pss.FhirProcessor.Engine/Services/UnifiedErrorModelBuilder.cs`

**New Method**: `EnhanceFirelyParsingErrorAsync()`
- Adds navigation context to parsing errors
- Resolves JSON pointers and breadcrumbs
- Gracefully handles cases where bundle is unparseable

## Error Code Reference

### INVALID_ENUM_VALUE
**Trigger**: Value not in allowed enumeration
**Example**: `"status": "completed"` for Encounter (should be "planned", "in-progress", etc.)

**Error Details Include**:
- `actualValue` - The invalid value provided
- `enumType` - The FHIR enum type (e.g., "Encounter.StatusCode")
- `allowedValues` - List of valid values (for known enums)
- `resourceType` - Resource containing the error
- `path` - Field name (e.g., "status")
- `jsonPointer` - Location in JSON (e.g., "/entry/0/resource/status")

### UNKNOWN_ELEMENT
**Trigger**: Field not defined in FHIR R4 schema
**Example**: `"customField": "value"` in a resource

**Error Details Include**:
- `unknownElement` - Name of the invalid field
- `path` - Field path
- `message` - "Unknown element 'X' is not valid in FHIR R4 schema"

### TYPE_MISMATCH
**Trigger**: Value cannot be converted to expected type
**Example**: `"period": 123` when object is expected

**Error Details Include**:
- `expectedType` - What type was expected (e.g., "integer", "object")
- `fullMessage` - Original Firely error message

### MANDATORY_MISSING
**Trigger**: Required field is absent
**Example**: Missing `resourceType` in a resource

**Error Details Include**:
- `missingElement` - Name of the required field
- `path` - Field path
- `message` - "Mandatory element 'X' is missing from the resource"

### INVALID_JSON
**Trigger**: JSON syntax error (before Firely parsing)
**Example**: `{ "invalid": }` - missing value

**Error Details Include**:
- `lineNumber` - Line where error occurred
- `bytePosition` - Column position
- `message` - JSON parser error message

### INVALID_BUNDLE
**Trigger**: Input is null, empty, or whitespace
**Example**: `bundleJson = ""`

**Error Details Include**:
- `reason` - "NullOrEmpty" or "ParserReturnedNull"

## Example Error Flow

### Scenario: Invalid Encounter Status

**Input Bundle**:
```json
{
  "resourceType": "Bundle",
  "entry": [{
    "resource": {
      "resourceType": "Encounter",
      "status": "completed"
    }
  }]
}
```

**Before Refactoring**:
```json
{
  "source": "FHIR",
  "severity": "error",
  "errorCode": "INVALID_BUNDLE",
  "message": "Failed to parse FHIR Bundle - bundle is null or empty"
}
```

**After Refactoring**:
```json
{
  "source": "FHIR",
  "severity": "error",
  "errorCode": "INVALID_ENUM_VALUE",
  "resourceType": "Encounter",
  "path": "status",
  "jsonPointer": "/entry/0/resource/status",
  "message": "Invalid value 'completed' for field 'status'. Allowed values: planned, arrived, triaged, in-progress, onleave, finished, cancelled, entered-in-error, unknown",
  "details": {
    "actualValue": "completed",
    "enumType": "Encounter.StatusCode",
    "allowedValues": ["planned", "arrived", "triaged", "in-progress", "onleave", "finished", "cancelled", "entered-in-error", "unknown"]
  },
  "navigation": {
    "jsonPointer": "/entry/0/resource/status",
    "breadcrumb": "Bundle → entry[0] → Encounter → status"
  }
}
```

## Implementation Details

### Pattern Matching
FirelyExceptionMapper uses regex patterns to extract context:

```csharp
// Enum error: "Literal 'X' is not a valid value for enumeration 'Y'"
var enumMatch = Regex.Match(exceptionMessage, 
    @"Literal '([^']+)' is not a valid value for enumeration '([^']+)'");

// Unknown element: "Encountered unknown element 'X'"
var unknownMatch = Regex.Match(exceptionMessage,
    @"Encountered unknown element '([^']+)'");

// Type mismatch: "Cannot convert ... to type 'X'"
var typeMismatch = Regex.Match(exceptionMessage,
    @"Cannot convert.*to type '([^']+)'");
```

### Enum Value Sets
Common FHIR R4 enums are pre-populated for helpful error messages:
- Encounter.StatusCode
- ObservationStatus
- AdministrativeGender
- BundleType

More can be added as needed.

### JSON Pointer Heuristics
For parsing errors (where Bundle object doesn't exist yet), the mapper attempts to locate the error in raw JSON using heuristics:
- Counts `entry` arrays and `resource` objects
- Estimates array indices
- Falls back to field name only if location can't be determined

## Testing

See `FirelyExceptionMapperTests.cs` and `FirelyErrorHandlingExample.cs` for:
- Unit tests for each error pattern
- Example scenarios demonstrating improvements
- Comparison of before/after error quality

## Benefits

1. **User-Actionable Errors**: Users can see exactly what field has an error and what values are allowed
2. **Frontend Navigation**: JSON pointers enable click-to-navigate to error location
3. **Debugging Support**: Full exception context preserved in details
4. **Error Differentiation**: Clear distinction between empty input, JSON errors, and FHIR structural errors
5. **No CPS1 Dependencies**: Pure error extraction, no business logic

## Backward Compatibility

- All existing error codes still work
- Pipeline flow unchanged (Firely → Rules → CodeMaster → References)
- No changes to business rule validation
- UnifiedErrorModel structure unchanged (only population improved)

## Future Enhancements

1. **Expand Enum Coverage**: Add more FHIR R4 value sets
2. **Cardinality Errors**: Detect "too many" or "too few" occurrences
3. **Profile Validation**: Layer StructureDefinition validation on top
4. **AI-Assisted Fixes**: Suggest corrections based on error patterns

## Related Documentation

- `/docs/05_validation_pipeline.md` - Validation pipeline architecture
- `/docs/08_unified_error_model.md` - Error model specification
- `/docs/07_smart_path_navigation.md` - Navigation service
- `/docs/10_do_not_do.md` - What NOT to do (no CPS1 logic, etc.)
