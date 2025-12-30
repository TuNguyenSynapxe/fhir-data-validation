# Phase 4 Instance Scope Refactor - Quick Reference

## For Frontend Developers

### What Changed?
Rules now store **structured fields** instead of encoding instance scope in path strings.

### Old Way (Deprecated)
```typescript
const rule = {
  type: 'Required',
  resourceType: 'Patient',
  path: 'Patient[*].gender',  // ❌ Encoded instance scope
  severity: 'error'
};
```

### New Way (Preferred)
```typescript
const rule = {
  type: 'Required',
  resourceType: 'Patient',
  instanceScope: { kind: 'all' },  // ✅ Explicit instance scope
  fieldPath: 'gender',              // ✅ Resource-relative path
  path: 'Patient[*].gender',        // ⚠️ Generated for backward compat
  severity: 'error'
};
```

## Field Path Validation

Import and use the validator:
```typescript
import { validateFieldPath } from '@/utils/fieldPathValidator';

const result = validateFieldPath(fieldPath);
if (!result.isValid) {
  console.error(result.errorMessage);
}
```

### Valid Field Paths ✅
```typescript
validateFieldPath('gender')           // ✅ Simple field
validateFieldPath('name.given')       // ✅ Nested field
validateFieldPath('identifier.value') // ✅ Nested field
validateFieldPath('component[0].code')// ✅ Array with index
```

### Invalid Field Paths ❌
```typescript
validateFieldPath('Patient.gender')      // ❌ Resource prefix
validateFieldPath('gender[*]')           // ❌ Instance scope notation
validateFieldPath('gender[0]')           // ❌ Instance scope notation
validateFieldPath('gender.where(...)')   // ❌ Filter clause
validateFieldPath('Bundle.entry')        // ❌ Bundle reference
validateFieldPath('')                    // ❌ Empty
```

## Building Rules

### Required Rule Example
```typescript
import { buildRequiredRule } from './RequiredRuleHelpers';

const rule = buildRequiredRule({
  resourceType: 'Patient',
  instanceScope: { kind: 'all' },
  fieldPath: 'gender',
  severity: 'error',
  errorCode: 'PATIENT_GENDER_REQUIRED',
  userHint: 'Gender is mandatory'
});
```

### Pattern Rule Example
```typescript
import { buildPatternRule } from './PatternRuleHelpers';

const rule = buildPatternRule({
  resourceType: 'Patient',
  instanceScope: { kind: 'first' },
  fieldPath: 'name.family',
  pattern: '^[A-Z][a-z]+$',
  negate: false,
  caseSensitive: true,
  severity: 'warning',
  errorCode: 'INVALID_NAME_FORMAT'
});
```

### Filtered Instance Example
```typescript
const rule = buildRequiredRule({
  resourceType: 'Observation',
  instanceScope: {
    kind: 'filter',
    filter: {
      type: 'systemCode',
      system: 'http://loinc.org',
      code: '8867-4'
    }
  },
  fieldPath: 'value[x]',
  severity: 'error',
  errorCode: 'HEART_RATE_REQUIRED'
});
```

## Instance Scope Options

### All Instances
```typescript
{ kind: 'all' }
// Evaluates rule against every instance of the resource type
// Backend: Patient[*].gender
```

### First Instance Only
```typescript
{ kind: 'first' }
// Evaluates rule against only the first instance
// Backend: Patient[0].gender
```

### Filtered Instances

#### Filter by Code
```typescript
{
  kind: 'filter',
  filter: {
    type: 'code',
    code: 'HEARING'
  }
}
// Backend: Observation.where(code.coding.code='HEARING')
```

#### Filter by System + Code
```typescript
{
  kind: 'filter',
  filter: {
    type: 'systemCode',
    system: 'http://loinc.org',
    code: '8867-4'
  }
}
// Backend: Observation.where(code.coding.system='http://loinc.org' and code.coding.code='8867-4')
```

#### Filter by Identifier
```typescript
{
  kind: 'filter',
  filter: {
    type: 'identifier',
    system: 'http://hospital.org/patient-ids',
    value: '12345'
  }
}
// Backend: Patient.where(identifier.system='...' and identifier.value='...')
```

#### Custom FHIRPath Filter
```typescript
{
  kind: 'filter',
  filter: {
    type: 'custom',
    fhirPath: 'where(status=\'final\' and value > 100)'
  }
}
// Backend: Observation.where(status='final' and value > 100)
```

## Backend Conversion

When sending to API, convert frontend InstanceScope to backend format:

```typescript
import { convertToBackendInstanceScope } from './InstanceScope.utils';

const frontendScope = {
  kind: 'filter',
  filter: { type: 'code', code: 'HEARING' }
};

const backendScope = convertToBackendInstanceScope(frontendScope);
// Result: { kind: 'filter', condition: "code.coding.code='HEARING'" }
```

## Backward Compatibility

### Loading Legacy Rules
Legacy rules with only `path` will work:
```typescript
const legacyRule = {
  type: 'Required',
  resourceType: 'Patient',
  path: 'Patient[*].gender'  // No instanceScope or fieldPath
};
// Backend will parse the path string (backward compat mode)
```

### Extracting from Legacy Path
```typescript
import { extractFieldPathFromLegacy } from '@/utils/fieldPathValidator';

const fieldPath = extractFieldPathFromLegacy('Patient[*].gender', 'Patient');
// Result: 'gender'

const nestedPath = extractFieldPathFromLegacy('Patient[0].name.given', 'Patient');
// Result: 'name.given'
```

## Testing Your Rule Builders

```typescript
describe('buildMyRule', () => {
  it('should store structured fields', () => {
    const rule = buildMyRule({
      resourceType: 'Patient',
      instanceScope: { kind: 'all' },
      fieldPath: 'gender',
      severity: 'error',
      errorCode: 'TEST_CODE'
    });

    // ✅ Check new structured fields
    expect(rule.instanceScope).toEqual({ kind: 'all' });
    expect(rule.fieldPath).toBe('gender');
    
    // ✅ Check legacy path is still generated
    expect(rule.path).toBe('Patient[*].gender');
  });

  it('should validate field path', () => {
    expect(() => {
      buildMyRule({
        resourceType: 'Patient',
        instanceScope: { kind: 'all' },
        fieldPath: 'Patient.gender',  // ❌ Invalid: has resource prefix
        severity: 'error',
        errorCode: 'TEST_CODE'
      });
    }).toThrow('Invalid field path');
  });
});
```

## Common Mistakes to Avoid

### ❌ Don't Include Resource Type in Field Path
```typescript
// ❌ Wrong
fieldPath: 'Patient.gender'

// ✅ Correct
fieldPath: 'gender'
```

### ❌ Don't Include Instance Scope in Field Path
```typescript
// ❌ Wrong
fieldPath: 'gender[*]'
instanceScope: { kind: 'all' }

// ✅ Correct
fieldPath: 'gender'
instanceScope: { kind: 'all' }
```

### ❌ Don't Use .where() in Field Path
```typescript
// ❌ Wrong
fieldPath: 'code.where(system=\'loinc\')'
instanceScope: { kind: 'all' }

// ✅ Correct
fieldPath: 'code'
instanceScope: {
  kind: 'filter',
  filter: { type: 'custom', fhirPath: 'where(code.system=\'loinc\')' }
}
```

## Migration Checklist

When updating a rule builder:

- [ ] Import `validateFieldPath` from `@/utils/fieldPathValidator`
- [ ] Add validation before creating rule
- [ ] Store `instanceScope` property on rule object
- [ ] Store `fieldPath` property on rule object
- [ ] Keep `path` property for backward compatibility
- [ ] Use simplified `composeFhirPath()` function (no extraction logic)
- [ ] Add unit tests for validation
- [ ] Test with all instance scope variants

## Questions?

See full documentation: `PHASE_4_INSTANCE_SCOPE_REFACTOR_COMPLETE.md`
