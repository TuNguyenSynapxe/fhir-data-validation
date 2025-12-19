# Validation Flow

Complete guide to the frontend validation pipeline, state management, and user experience.

## Overview

The FHIR Processor V2 frontend orchestrates three validation layers:
1. **Lint validation** - Best-effort portability checks (non-blocking)
2. **Firely validation** - FHIR structural validation (blocking)
3. **Project validation** - User-defined rules + CodeMaster + References (blocking)

## Validation Sources

### Source Types & Metadata

Defined in `utils/validationLayers.ts`:

```typescript
export const VALIDATION_SOURCE_METADATA = {
  LINT: {
    displayName: 'Lint (Best-effort)',
    badgeColor: 'yellow',
    blocking: false,
    description: 'Best-effort portability check',
    tooltip: 'Lint checks detect potential issues...'
  },
  SPEC_HINT: {
    displayName: 'HL7 Advisory',
    badgeColor: 'blue',
    blocking: false,
    description: 'Guidance from HL7 FHIR spec',
    tooltip: 'HL7 advisories provide guidance...'
  },
  FHIR: {
    displayName: 'FHIR Structural Validation',
    badgeColor: 'red',
    blocking: true,
    description: 'Firely engine validation',
    tooltip: 'FHIR structural validation...'
  },
  Reference: {
    displayName: 'Reference Validation',
    badgeColor: 'rose',
    blocking: true,
    description: 'Bundle integrity check',
    tooltip: 'Reference validation ensures all references resolve. This is not a rule.'
  },
  PROJECT: {
    displayName: 'Project Rule',
    badgeColor: 'purple',
    blocking: true,
    description: 'User-defined rule',
    tooltip: 'Project rules are custom validation rules...'
  },
  CodeMaster: {
    displayName: 'Code System Validation',
    badgeColor: 'orange',
    blocking: true,
    description: 'System code validation',
    tooltip: 'Code system validation checks terminology...'
  }
};
```

### Key Distinctions

**Non-Blocking (Warnings)**:
- **LINT**: Best-effort checks, may have false positives
- **SPEC_HINT**: HL7 advisories, guidance only

**Blocking (Errors)**:
- **FHIR**: Must pass for bundle to be valid
- **Reference**: Ensures bundle integrity (NOT a user-created rule)
- **PROJECT**: User-defined business rules
- **CodeMaster**: Terminology validation

## Validation State Model

### State Values

Defined in `types/validationState.ts`:

```typescript
const ValidationState = {
  NoBundle: 'NoBundle',           // No bundle loaded
  NotValidated: 'NotValidated',   // Bundle exists but not validated
  Validated: 'Validated',         // Validation passed
  Failed: 'Failed'                // Validation failed (blocking errors)
};
```

### State Transitions

```
Initial State: NoBundle

NoBundle
  ↓ (user loads bundle)
NotValidated
  ↓ (user clicks "Validate")
  ├─ Validated (no blocking errors)
  └─ Failed (has blocking errors)
  
Validated/Failed
  ↓ (bundle or rules change)
NotValidated
```

### State Derivation Logic

Implemented in `hooks/useValidationState.ts`:

```typescript
function deriveValidationState(
  bundleJson: string | null,
  validationResult: ValidationResult | null,
  bundleChanged: boolean,
  rulesChanged: boolean
): { state: ValidationState; metadata: ValidationStateMetadata } {
  // 1. No bundle → NoBundle
  if (!bundleJson) {
    return { state: ValidationState.NoBundle, metadata: emptyMetadata };
  }

  // 2. No validation result → NotValidated
  if (!validationResult) {
    return { state: ValidationState.NotValidated, metadata: emptyMetadata };
  }

  // 3. Bundle/rules changed since validation → NotValidated
  if (bundleChanged || rulesChanged) {
    return { state: ValidationState.NotValidated, metadata: staleMetadata };
  }

  // 4. Has blocking errors → Failed
  const hasBlockingErrors = validationResult.errors?.some(e => e.blocking);
  if (hasBlockingErrors) {
    return { state: ValidationState.Failed, metadata: buildMetadata() };
  }

  // 5. Otherwise → Validated
  return { state: ValidationState.Validated, metadata: buildMetadata() };
}
```

## Validation Lifecycle

### useProjectValidation Hook

Central hook for validation lifecycle (`contexts/project-validation/useProjectValidation.ts`, 186 lines):

**State**:
```typescript
{
  result: ValidationResult | null,      // Latest validation result
  isValidating: boolean,                // Validation in progress
  error: Error | null,                  // Validation API error
  trigger: number                       // Increment to trigger validation
}
```

**Actions**:
```typescript
runValidation(mode: 'fast' | 'debug'): Promise<void>
setResult(result: ValidationResult | null): void
clearError(): void
triggerValidation(): void  // For external trigger via context bar
```

**API Integration**:
```typescript
POST /api/projects/:projectId/validate
Body: {
  bundleJson: string,
  rulesJson: string | null,
  codeMasterJson: string | null
}
Response: ValidationResult
```

### ProjectValidationContext

Context Provider eliminates prop drilling (`contexts/project-validation/ProjectValidationContext.tsx`):

**Pattern**:
```typescript
// In PlaygroundPage.tsx
const validationHook = useProjectValidation(projectId, {
  bundleJson,
  rulesJson,
  codeMasterJson
});

return (
  <ProjectValidationProvider value={validationHook}>
    <RightPanelContainer {...otherProps} />
  </ProjectValidationProvider>
);

// In ValidationPanel.tsx (child component)
const { result, isValidating, runValidation } = useProjectValidationContext();
```

**Scope**: Wraps validation subtree only (not app-wide)

## UI Components

### ValidationPanel

**Location**: `components/playground/Validation/ValidationPanel.tsx`

**Responsibilities**:
- Display validation results grouped by source and error code
- Show blocking indicators (YES/NO badges)
- Provide navigation to error locations
- Trigger validation via context

**Data Flow**:
```typescript
const { result, isValidating, runValidation } = useProjectValidationContext();
const { state, metadata } = useValidationState(
  bundleJson,
  result,
  bundleChanged,
  rulesChanged
);

// Display logic based on state
if (state === ValidationState.NoBundle) return <EmptyState />;
if (state === ValidationState.NotValidated) return <PleaseValidatePrompt />;
if (state === ValidationState.Failed) return <ErrorList />;
if (state === ValidationState.Validated) return <SuccessState />;
```

### ValidationContextBar

**Location**: `components/common/ValidationContextBar.tsx`

**Responsibilities**:
- Display validation status (badge with state)
- Show "Validate" button with mode selector (Fast/Debug)
- Trigger validation via context

**Integration**:
```typescript
const { isValidating, triggerValidation } = useProjectValidationContext();

<button onClick={() => triggerValidation()}>
  {isValidating ? 'Validating...' : 'Validate'}
</button>
```

### OverviewPanel

**Location**: `components/playground/Overview/OverviewPanel.tsx`

**Responsibilities**:
- Display overview of validation results
- Show summary counts (errors, warnings by source)

**Integration**:
```typescript
const { result } = useProjectValidationContext();

// Display counts from result
```

### Error Display Components

**GroupedErrorCard** (`components/playground/Validation/GroupedErrorCard.tsx`):
- Groups errors by source and error code
- Header format: `[Label] — [Error Code] ([Count] occurrences)`
- Example: "HL7 Advisory — MISSING_REQUIRED_FIELD (3 occurrences)"

**ErrorCard** (`components/playground/Validation/ErrorCard.tsx`):
- Individual error display
- Shows blocking indicator (YES/NO badge)
- Source badge with color coding
- Navigation button to error location

**ValidationLayerInfo** (`components/playground/Validation/ValidationLayerInfo.tsx`):
- Tooltip legend for all validation sources
- Accessible via (i) icon in ValidationPanel header
- Explains blocking vs non-blocking

## Validation Settings

### Fast vs Debug Mode

**Fast Mode** (default):
- Quick validation for rapid feedback
- Skips expensive checks
- Suitable for iterative development

**Debug Mode**:
- Comprehensive validation
- Includes all checks
- Generates detailed error messages

### Validation Gating

**Implemented**: User can enable/disable specific validation layers

**UI**: Checkboxes in validation settings panel

**Backend**: Respects enabled layers in validation request

## Change Detection

Tracks whether bundle/rules have changed since last validation:

```typescript
// In PlaygroundPage.tsx
const [originalBundle, setOriginalBundle] = useState<string | null>(null);
const [originalRules, setOriginalRules] = useState<string | null>(null);

const bundleChanged = bundleJson !== originalBundle;
const rulesChanged = rulesJson !== originalRules;

// After successful validation
setOriginalBundle(bundleJson);
setOriginalRules(rulesJson);
```

**Purpose**: Derive `NotValidated` state when content changes

## Integration Patterns

### Adding Validation to a New Component

```typescript
// 1. Import context hook
import { useProjectValidationContext } from '@/contexts/project-validation';

// 2. Consume validation state
const { result, isValidating, error, runValidation } = useProjectValidationContext();

// 3. Use validation data
if (!result) return <NoValidationYet />;

const errorCount = result.errors?.filter(e => e.blocking).length || 0;

return (
  <div>
    <p>Errors: {errorCount}</p>
    <button onClick={() => runValidation('fast')}>Re-validate</button>
  </div>
);
```

### Triggering Validation Externally

```typescript
// Via context bar or custom button
const { triggerValidation } = useProjectValidationContext();

<button onClick={triggerValidation}>
  Validate Project
</button>
```

## Error Handling

### API Errors

```typescript
const { error } = useProjectValidationContext();

if (error) {
  return <ErrorBanner message={error.message} />;
}
```

### Validation Errors vs API Errors

- **Validation Errors**: Expected results from validation (errors in FHIR bundle)
- **API Errors**: Unexpected failures (network, server errors)

Display separately to avoid confusion.

## Testing Validation Flow

### Manual Test Scenarios

1. **No Bundle**:
   - Start with empty project
   - Expected: ValidationPanel shows "NoBundle" state

2. **Bundle Loaded, Not Validated**:
   - Load bundle JSON
   - Expected: ValidationPanel shows "NotValidated" state with prompt

3. **Validation Passed**:
   - Load valid bundle
   - Click "Validate"
   - Expected: ValidationPanel shows "Validated" state with success message

4. **Validation Failed**:
   - Load invalid bundle (e.g., missing required field)
   - Click "Validate"
   - Expected: ValidationPanel shows "Failed" state with grouped errors

5. **Change Detection**:
   - Validate successfully
   - Edit bundle JSON
   - Expected: State changes to "NotValidated"

6. **Validation Sources**:
   - Trigger validation with various error types
   - Expected: Each error shows correct source badge (color, label, blocking status)

### Unit Test Coverage

**`bundleAnalysisService.test.ts`** (12 test cases):
- analyzeFhirBundle with various bundle structures
- isRulePathObserved with existing/missing paths
- Edge cases (empty bundle, malformed JSON)

## Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Component structure and data flow
- [REFACTORING_HISTORY.md](./REFACTORING_HISTORY.md) - Evolution of validation patterns
- [features/VALIDATION_STATE_IMPLEMENTATION.md](./features/VALIDATION_STATE_IMPLEMENTATION.md) - Detailed state model
- [features/VALIDATION_LABELING_REFACTOR.md](./features/VALIDATION_LABELING_REFACTOR.md) - Source labeling details
