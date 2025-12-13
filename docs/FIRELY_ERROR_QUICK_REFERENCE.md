# Firely Error Handling - Quick Reference

## Error Code Quick Lookup

| Error Code | Trigger | Key Details Provided |
|------------|---------|---------------------|
| **INVALID_ENUM_VALUE** | Value not in allowed enum set | actualValue, enumType, allowedValues[], resourceType, path |
| **UNKNOWN_ELEMENT** | Field not in FHIR R4 schema | unknownElement, path |
| **TYPE_MISMATCH** | Value can't convert to expected type | expectedType, fullMessage |
| **MANDATORY_MISSING** | Required field absent | missingElement, path |
| **FHIR_DESERIALIZATION_ERROR** | Generic Firely parse error | exceptionType, fullMessage |
| **INVALID_JSON** | JSON syntax error | lineNumber, bytePosition |
| **INVALID_BUNDLE** | Null or empty input | reason (NullOrEmpty/ParserReturnedNull) |

## Common Use Cases

### 1. Invalid Encounter Status
**Input**: `"status": "completed"` (typo - should be "in-progress")

**Error Returned**:
```json
{
  "errorCode": "INVALID_ENUM_VALUE",
  "resourceType": "Encounter",
  "path": "status",
  "message": "Invalid value 'completed' for field 'status'. Allowed values: planned, arrived, triaged, in-progress, ...",
  "details": {
    "actualValue": "completed",
    "allowedValues": ["planned", "in-progress", "finished", ...]
  }
}
```

### 2. Custom Field Added
**Input**: `"customField": "value"` in resource

**Error Returned**:
```json
{
  "errorCode": "UNKNOWN_ELEMENT",
  "path": "customField",
  "message": "Unknown element 'customField' is not valid in FHIR R4 schema"
}
```

### 3. Wrong Type
**Input**: `"multipleBirth": 2` (should be boolean or integer, but used wrong context)

**Error Returned**:
```json
{
  "errorCode": "TYPE_MISMATCH",
  "message": "Value cannot be converted to expected type 'boolean'",
  "details": {
    "expectedType": "boolean"
  }
}
```

## Testing Examples

### Trigger Invalid Enum Error
```json
POST /api/projects/{id}/validate
{
  "bundleJson": "{\"resourceType\":\"Bundle\",\"entry\":[{\"resource\":{\"resourceType\":\"Encounter\",\"status\":\"invalid_status\"}}]}"
}
```

### Trigger Unknown Element Error
```json
{
  "bundleJson": "{\"resourceType\":\"Bundle\",\"unknownTopLevelField\":\"test\"}"
}
```

### Trigger Invalid JSON Error
```json
{
  "bundleJson": "{\"resourceType\":\"Bundle\","
}
```

## Implementation Flow

```
User submits Bundle
        ↓
ValidationPipeline.ValidateAsync()
        ↓
ParseBundleWithContext()
        ↓
    ┌────────────────────────────┐
    │ 1. Empty/Null Check        │ → INVALID_BUNDLE
    │ 2. JSON Syntax Check       │ → INVALID_JSON
    │ 3. Firely Deserialization  │ → Catch exception
    └────────────────────────────┘
                ↓ (exception caught)
    FirelyExceptionMapper.MapToValidationError()
                ↓
    ┌────────────────────────────┐
    │ Pattern match exception:   │
    │ - Enum error?              │ → INVALID_ENUM_VALUE
    │ - Unknown element?         │ → UNKNOWN_ELEMENT
    │ - Type mismatch?           │ → TYPE_MISMATCH
    │ - Mandatory missing?       │ → MANDATORY_MISSING
    │ - Generic?                 │ → FHIR_DESERIALIZATION_ERROR
    └────────────────────────────┘
                ↓
    UnifiedErrorModelBuilder.EnhanceFirelyParsingErrorAsync()
                ↓
    Add navigation breadcrumbs
                ↓
        Return to frontend
```

## Key Files

| File | Purpose |
|------|---------|
| `FirelyExceptionMapper.cs` | Maps exceptions to ValidationError |
| `ValidationPipeline.cs` | Orchestrates parsing with error handling |
| `UnifiedErrorModelBuilder.cs` | Adds navigation context |
| `FirelyExceptionMapperTests.cs` | Unit tests |
| `FirelyErrorHandlingExample.cs` | Demo code |

## Regex Patterns Used

```csharp
// Invalid enum: "Literal 'X' is not a valid value for enumeration 'Y'"
@"Literal '([^']+)' is not a valid value for enumeration '([^']+)'"

// Unknown element: "Encountered unknown element 'X'"
@"Encountered unknown element '([^']+)'"

// Type mismatch: "Cannot convert ... to type 'X'"
@"Cannot convert.*to type '([^']+)'"

// Mandatory missing: "Mandatory element 'X' is missing"
@"Mandatory element '([^']+)' is missing"
```

## FHIR R4 Enum Coverage (Current)

Pre-populated in mapper:
- ✅ Encounter.StatusCode
- ✅ ObservationStatus
- ✅ AdministrativeGender
- ✅ BundleType

**To add more**: Edit `ExtractAllowedEnumValues()` in `FirelyExceptionMapper.cs`

## Configuration

No configuration required! The mapper:
- ✅ Automatically detects error patterns
- ✅ Falls back gracefully if pattern not recognized
- ✅ Preserves original exception message in details
- ✅ Works with any FHIR R4 resource

## Debugging

Enable console logging in `ValidationPipeline.cs`:
```csharp
Console.WriteLine($"Firely deserialization error: {firelyEx.GetType().Name}: {firelyEx.Message}");
```

Check `error.Details["fullMessage"]` for original exception text.

## Performance Impact

- ✅ Minimal: Only runs on parsing errors (exceptional path)
- ✅ Regex matching is fast for small exception messages
- ✅ No performance impact on successful parses
- ✅ No additional round trips or I/O

## Limitations

1. **JSON Pointer Estimation**: Uses heuristics (may not always be accurate)
2. **Enum Coverage**: Only common enums pre-populated
3. **Pattern Matching**: Dependent on Firely exception message format
4. **Navigation Enhancement**: Requires bundle to be parseable (may fail for severe errors)

All limitations have graceful fallbacks - errors are still captured even if enhancement fails.
