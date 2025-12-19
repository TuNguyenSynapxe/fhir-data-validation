# ValidationState Implementation

## Overview

A central `ValidationState` model has been introduced to represent the lifecycle of validation readiness. This provides a single authoritative source for determining the current validation status throughout the application.

## State Model

### ValidationState Values

```typescript
const ValidationState = {
  NoBundle: 'NoBundle',
  NotValidated: 'NotValidated',
  Validated: 'Validated',
  Failed: 'Failed',
} as const;
```

### State Definitions

1. **NoBundle**: No bundle data is present. User has not loaded or created a bundle yet.
2. **NotValidated**: Bundle exists but validation has not been run, or bundle/rules have changed since last validation.
3. **Validated**: Validation has completed successfully. Lint and Firely validation passed (or only advisory issues found).
4. **Failed**: Validation has run and found blocking errors. Either lint or Firely validation failed.

### State Transitions

```
NoBundle → NotValidated (when bundle is loaded)
NotValidated → Validated (when validation passes)
NotValidated → Failed (when validation fails)
Validated → NotValidated (when bundle/rules change)
Failed → NotValidated (when bundle/rules change)
```

## Implementation

### Files Created

1. **`frontend/src/types/validationState.ts`**
   - Defines `ValidationState` constants
   - Defines `ValidationStateMetadata` interface with detailed validation metrics

2. **`frontend/src/hooks/useValidationState.ts`**
   - `deriveValidationState()`: Derives state from current conditions
   - `useValidationState()`: React hook to access validation state
   - Includes helper functions for counting errors, warnings, and building breakdowns

### State Derivation Logic

The validation state is derived from:
- **Bundle existence**: Is there valid bundle JSON?
- **Validation results**: Has validation been run? What were the results?
- **Change detection**: Has the bundle or rules changed since validation?

```typescript
const { state, metadata } = useValidationState(
  bundleJson,
  validationResult,
  bundleChanged,
  rulesChanged
);
```

### Integration Points

#### ValidationPanel
- Now receives `bundleJson`, `bundleChanged`, and `rulesChanged` props
- Computes ValidationState using `useValidationState()` hook
- Logs state to console for debugging (will be removed when UI is updated)

#### PlaygroundPage
- Tracks original bundle and rules JSON for change detection
- Computes `bundleChanged` and `rulesChanged` flags
- Passes these values through the component tree to ValidationPanel

## Usage Example

```typescript
// In a component that needs validation state
const { state, metadata } = useValidationState(
  bundleJson,
  validationResult,
  bundleChanged,
  rulesChanged
);

// Check the state
if (state === ValidationState.NoBundle) {
  return <EmptyBundleState />;
}

if (state === ValidationState.NotValidated) {
  return <PleaseValidatePrompt />;
}

// Access metadata
console.log('Error count:', metadata.errorCount);
console.log('Breakdown:', metadata.breakdown);
```

## Current Status

✅ **Complete**: ValidationState model is implemented and accessible
⏳ **Pending**: UI components do not yet use the state (intentionally)

### What's Working

- ValidationState is computed in ValidationPanel
- State is logged to console for debugging
- All change detection is working correctly
- State properly derives from bundle, validation results, and changes

### What's Next

In future work, the UI can be updated to use this state:
- Show different UI based on ValidationState
- Disable/enable validation buttons based on state
- Display state-specific messages to users
- Use state to drive visual indicators (badges, colors, etc.)

## Debugging

The ValidationPanel currently logs the state to the browser console:

```
[ValidationPanel] Current ValidationState: {
  state: 'NotValidated',
  metadata: { ... }
}
```

This can be used to verify the state is being computed correctly without changing UI behavior.

## Architecture Benefits

1. **Single Source of Truth**: All validation-related UI can rely on one consistent state
2. **Predictable State Machine**: Clear state transitions make behavior predictable
3. **Easy Testing**: State derivation logic is pure and easily testable
4. **Decoupled**: State computation is separate from UI rendering
5. **Metadata Rich**: State includes detailed metrics for advanced UI needs

## Notes

- The state uses a const object pattern instead of enum due to TypeScript config (`erasableSyntaxOnly`)
- Blocking errors exclude `SPEC_HINT` source (advisory only)
- Bundle validity checks for actual content (not just empty objects)
- Change detection is based on JSON string comparison for simplicity
