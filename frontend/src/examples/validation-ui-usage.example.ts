/**
 * VALIDATION UI REFACTORING - QUICK REFERENCE
 * 
 * This guide shows how the new validation UI works with examples.
 */

// ============================================================================
// VALIDATION LAYERS - AUTHORITATIVE MODEL
// ============================================================================

/**
 * Layer Hierarchy (in display order):
 * 
 * 1. LINT           → Advisory, non-blocking
 * 2. SPEC_HINT      → Advisory, non-blocking  
 * 3. FHIR           → Structural, BLOCKING
 * 4. PROJECT        → Business rules, BLOCKING
 */

// ============================================================================
// USING THE LAYER METADATA
// ============================================================================

import { getLayerMetadata, normalizeSource } from '../utils/validationLayers';

// Example 1: Get metadata for any source
const metadata = getLayerMetadata('FHIR');
console.log(metadata);
// Output:
// {
//   displayName: 'FHIR Validation',
//   fullName: 'FHIR - Structural Validation',
//   isBlocking: true,
//   explanation: 'This error must be fixed for the bundle to be valid FHIR.',
//   badgeColor: 'bg-red-100 text-red-800 border-red-300',
//   borderColor: 'border-l-red-500',
//   bgColor: 'bg-red-50',
//   textColor: 'text-red-800',
// }

// Example 2: Normalize source strings
normalizeSource('firely');    // Returns: 'FHIR'
normalizeSource('SPEC_HINT'); // Returns: 'SPEC_HINT'
normalizeSource('business');  // Returns: 'PROJECT'

// ============================================================================
// ERROR CARD USAGE
// ============================================================================

import { ErrorCard } from '../components/playground/Validation/ErrorCard';

// Example error object
const error = {
  source: 'LINT',
  severity: 'warning',
  resourceType: 'Patient',
  path: 'Patient.communication[0].language',
  jsonPointer: '/entry/0/resource/communication/0/language',
  errorCode: 'UNKNOWN_ELEMENT',
  message: 'Field is not defined in FHIR R4 specification',
  details: {
    fhirPath: 'Patient.communication[0].language',
    propertyName: 'language'
  }
  // Phase 1: navigation object removed - jsonPointer is now top-level only
};

// Render the error
// <ErrorCard 
//   error={error} 
//   onClick={() => console.log('Navigate to:', error.jsonPointer)}
// />

// This displays:
// ┌─────────────────────────────────────────────────────┐
// │ ⚠ Field is not defined in FHIR R4 specification    │
// │                                                     │
// │ [Lint (Best-Effort)] [Blocking: NO ✓]             │
// │ [UNKNOWN_ELEMENT] [Patient]                        │
// │                                                     │
// │ ℹ This is a best-effort check. Some systems may   │
// │   accept this, others may reject it.              │
// │                                                     │
// │ Path: Patient.communication[0].language            │
// │ 📍 Jump to field                                   │
// └─────────────────────────────────────────────────────┘

// ============================================================================
// GROUPED ERROR CARD USAGE
// ============================================================================

import { GroupedErrorCard } from '../components/playground/Validation/GroupedErrorCard';

// Example: Multiple errors with same source+errorCode
const errors = [
  {
    source: 'SPEC_HINT',
    errorCode: 'MISSING_REQUIRED_FIELD',
    resourceType: 'Encounter',
    message: 'Missing required field: status',
    // ... other fields
  },
  {
    source: 'SPEC_HINT',
    errorCode: 'MISSING_REQUIRED_FIELD',
    resourceType: 'Encounter',
    message: 'Missing required field: class',
    // ... other fields
  },
  {
    source: 'SPEC_HINT',
    errorCode: 'MISSING_REQUIRED_FIELD',
    resourceType: 'Patient',
    message: 'Missing required field: identifier',
    // ... other fields
  }
];

// Render grouped card
// <GroupedErrorCard
//   errors={errors}
//   errorCode="MISSING_REQUIRED_FIELD"
//   source="SPEC_HINT"
//   onClick={(error) => console.log('Navigate to:', error)}
// />

// This displays:
// ┌─────────────────────────────────────────────────────┐
// │ ▶ MISSING_REQUIRED_FIELD (3 occurrences)           │
// │                                                     │
// │ [HL7 Advisory] [Blocking: NO ✓]                    │
// │                                                     │
// │ ℹ This guidance comes from the HL7 FHIR           │
// │   specification and is advisory only.              │
// │                                                     │
// │ [Encounter (2)] [Patient (1)]                      │
// └─────────────────────────────────────────────────────┘

// ============================================================================
// VALIDATION LAYER INFO TOOLTIP
// ============================================================================

import { ValidationLayerInfo } from '../components/playground/Validation/ValidationLayerInfo';

// Add to panel header
// <div className="flex items-center gap-2">
//   <span>Problems</span>
//   <ValidationLayerInfo />
// </div>

// On hover, shows comprehensive tooltip explaining all layers

// ============================================================================
// GROUPING LOGIC
// ============================================================================

/**
 * How errors are grouped:
 * 
 * 1. PRIMARY KEY: source + errorCode
 *    Example: "LINT|UNKNOWN_ELEMENT", "FHIR|INVALID_VALUE"
 * 
 * 2. THRESHOLD: ≥ 2 errors
 *    - If count >= 2: Show GroupedErrorCard
 *    - If count < 2: Show individual ErrorCard
 * 
 * 3. SUB-GROUPING: By resourceType (within grouped card)
 *    Example:
 *    UNKNOWN_ELEMENT (7 occurrences)
 *      - Patient (5 errors)
 *      - Encounter (2 errors)
 */

// Example implementation:
function groupErrors(errors) {
  const groups = new Map();
  
  errors.forEach(error => {
    const key = `${error.source}|${error.errorCode}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(error);
  });
  
  const grouped = new Map();
  const ungrouped = [];
  
  groups.forEach((groupErrors, key) => {
    if (groupErrors.length >= 2) {
      grouped.set(key, groupErrors);
    } else {
      ungrouped.push(...groupErrors);
    }
  });
  
  return { grouped, ungrouped };
}

// ============================================================================
// STANDARD EXPLANATION TEXTS
// ============================================================================

/**
 * Each layer has a standardized explanation that appears on every error:
 */

const EXPLANATIONS = {
  LINT: 'This is a best-effort check. Some systems may accept this, others may reject it.',
  
  SPEC_HINT: 'This guidance comes from the HL7 FHIR specification and is advisory only.',
  
  FHIR: 'This error must be fixed for the bundle to be valid FHIR.',
  
  PROJECT: 'This rule is enforced by your project configuration.',
};

// ============================================================================
// BLOCKING INDICATORS
// ============================================================================

/**
 * Every error shows explicit blocking status:
 */

// Non-blocking (LINT, SPEC_HINT)
// [Blocking: NO ✓]  ← Green badge with checkmark

// Blocking (FHIR, PROJECT)
// [Blocking: YES ✗]  ← Red badge with X

// ============================================================================
// SMART PATH NAVIGATION
// ============================================================================

/**
 * Navigation behavior:
 */

// If jsonPointer exists:
// <button onClick={() => navigateTo(jsonPointer)}>
//   📍 Jump to field
// </button>

// If jsonPointer is null/undefined:
// <span className="text-gray-400 italic">
//   Location not available
// </span>

// ============================================================================
// COLOR SYSTEM
// ============================================================================

const COLOR_SYSTEM = {
  LINT: {
    badge: 'bg-amber-100 text-amber-800 border-amber-300',
    border: 'border-l-amber-400',
    semantic: 'Advisory warning'
  },
  
  SPEC_HINT: {
    badge: 'bg-cyan-100 text-cyan-800 border-cyan-300',
    border: 'border-l-cyan-400',
    semantic: 'Informational guidance'
  },
  
  FHIR: {
    badge: 'bg-red-100 text-red-800 border-red-300',
    border: 'border-l-red-500',
    semantic: 'Critical error'
  },
  
  PROJECT: {
    badge: 'bg-purple-100 text-purple-800 border-purple-300',
    border: 'border-l-purple-500',
    semantic: 'Required rule'
  }
};

// ============================================================================
// COMPLETE EXAMPLE - VALIDATION RESULT LIST
// ============================================================================

import { ValidationResultList } from '../components/playground/Validation/ValidationResultList';

const validationErrors = [
  // LINT errors
  { source: 'LINT', errorCode: 'UNKNOWN_ELEMENT', resourceType: 'Patient', message: '...' },
  { source: 'LINT', errorCode: 'UNKNOWN_ELEMENT', resourceType: 'Patient', message: '...' },
  { source: 'LINT', errorCode: 'UNKNOWN_ELEMENT', resourceType: 'Encounter', message: '...' },
  
  // SPEC_HINT errors
  { source: 'SPEC_HINT', errorCode: 'MISSING_REQUIRED_FIELD', resourceType: 'Encounter', message: '...' },
  { source: 'SPEC_HINT', errorCode: 'MISSING_REQUIRED_FIELD', resourceType: 'Encounter', message: '...' },
  
  // FHIR error (single)
  { source: 'FHIR', errorCode: 'INVALID_VALUE', resourceType: 'Observation', message: '...' },
  
  // PROJECT errors
  { source: 'Business', errorCode: 'RULE_VIOLATION', resourceType: 'Patient', message: '...' },
  { source: 'Business', errorCode: 'RULE_VIOLATION', resourceType: 'Patient', message: '...' },
];

// Render
// <ValidationResultList
//   errors={validationErrors}
//   onErrorClick={(error) => {
//     // Handle navigation
//     console.log('Navigate to:', error.jsonPointer);
//   }}
// />

// Result:
// ┌────────────────────────────────────────────────────────┐
// │ ▶ UNKNOWN_ELEMENT (3 occurrences)                     │ ← Grouped LINT
// │   [Lint (Best-Effort)] [Blocking: NO ✓]              │
// │   [Patient (2)] [Encounter (1)]                       │
// ├────────────────────────────────────────────────────────┤
// │ ▶ MISSING_REQUIRED_FIELD (2 occurrences)             │ ← Grouped SPEC_HINT
// │   [HL7 Advisory] [Blocking: NO ✓]                    │
// │   [Encounter (2)]                                     │
// ├────────────────────────────────────────────────────────┤
// │ ⚠ Invalid value for field                            │ ← Single FHIR
// │   [FHIR Validation] [Blocking: YES ✗]                │
// │   ℹ This error must be fixed for the bundle to be... │
// ├────────────────────────────────────────────────────────┤
// │ ▶ RULE_VIOLATION (2 occurrences)                     │ ← Grouped PROJECT
// │   [Project Rule] [Blocking: YES ✗]                   │
// │   [Patient (2)]                                       │
// └────────────────────────────────────────────────────────┘

// ============================================================================
// MIGRATION FROM OLD COMPONENTS
// ============================================================================

// BEFORE:
// import { ValidationErrorItem } from './ValidationErrorItem';
// import { LintIssueCard } from './LintIssueCard';
// <ValidationErrorItem error={error} onClick={handleClick} />
// <LintIssueCard error={lintError} onClick={handleClick} />

// AFTER:
// import { ErrorCard } from './ErrorCard';
// <ErrorCard error={error} onClick={handleClick} />
// <ErrorCard error={lintError} onClick={handleClick} />

// Note: ErrorCard handles ALL error types uniformly

// ============================================================================
// TESTING SCENARIOS
// ============================================================================

// Test Case 1: Single error (not grouped)
const singleError = [
  { source: 'FHIR', errorCode: 'INVALID_VALUE', message: 'Invalid status code' }
];
// Expected: Shows individual ErrorCard

// Test Case 2: Two errors (grouped)
const twoErrors = [
  { source: 'LINT', errorCode: 'UNKNOWN_ELEMENT', message: 'Unknown field X' },
  { source: 'LINT', errorCode: 'UNKNOWN_ELEMENT', message: 'Unknown field Y' }
];
// Expected: Shows GroupedErrorCard with count (2 occurrences)

// Test Case 3: Mixed sources (not grouped)
const mixedSources = [
  { source: 'LINT', errorCode: 'UNKNOWN_ELEMENT', message: '...' },
  { source: 'FHIR', errorCode: 'UNKNOWN_ELEMENT', message: '...' }
];
// Expected: Shows 2 individual ErrorCards (different sources)

// Test Case 4: Mixed error codes (not grouped)
const mixedCodes = [
  { source: 'LINT', errorCode: 'UNKNOWN_ELEMENT', message: '...' },
  { source: 'LINT', errorCode: 'INVALID_TYPE', message: '...' }
];
// Expected: Shows 2 individual ErrorCards (different codes)

// Test Case 5: No navigation
const noNavigation = {
  source: 'FHIR',
  errorCode: 'GENERAL_ERROR',
  message: 'General validation error',
  jsonPointer: null  // No navigation available
};
// Expected: Shows "Location not available" instead of "Jump to field"

export {};
