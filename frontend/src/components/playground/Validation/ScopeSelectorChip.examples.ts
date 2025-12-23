/**
 * ScopeSelectorChip Component - Usage Examples
 * 
 * Phase 5: Scope Selector Rendering
 * 
 * This component extracts and displays where() clauses from FHIRPath
 * as separate filter chips, distinct from structural breadcrumbs.
 * 
 * @fileoverview Documentation and examples - intentionally uses variables for demonstration
 */

/* eslint-disable @typescript-eslint/no-unused-vars */
// @ts-nocheck

import { ScopeSelectorChip, extractWhereClausesScopeSelectors, removeWhereClauses, hasWhereClause } from './ScopeSelectorChip';

// ============================================================================
// EXAMPLE 1: Basic Usage with Single where() Clause
// ============================================================================

const example1_path = "Observation.component.where(code='SQ-001').valueString";

// Extraction:
const selectors1 = extractWhereClausesScopeSelectors(example1_path);
// Result: ["code='SQ-001'"]

// Structural path (for breadcrumbs):
const structuralPath1 = removeWhereClauses(example1_path);
// Result: "Observation.component.valueString"

// Render:
// <ScopeSelectorChip fhirPath={example1_path} />
// Displays: [Filter icon] code='SQ-001'


// ============================================================================
// EXAMPLE 2: Multiple where() Clauses
// ============================================================================

const example2_path = "Patient.contact.where(relationship.exists()).name.where(use='official').family";

// Extraction:
const selectors2 = extractWhereClausesScopeSelectors(example2_path);
// Result: ["relationship.exists()", "use='official'"]

// Structural path:
const structuralPath2 = removeWhereClauses(example2_path);
// Result: "Patient.contact.name.family"

// Render:
// <ScopeSelectorChip fhirPath={example2_path} />
// Displays: [Filter icon] relationship.exists()  [Filter icon] use='official'


// ============================================================================
// EXAMPLE 3: No where() Clauses
// ============================================================================

const example3_path = "Patient.name[0].family";

// Check:
const hasScope = hasWhereClause(example3_path);
// Result: false

// Render:
// <ScopeSelectorChip fhirPath={example3_path} />
// Displays: nothing (returns null)


// ============================================================================
// EXAMPLE 4: Integration with SmartPathBreadcrumb
// ============================================================================

/*
BEFORE Phase 5:
  SmartPathBreadcrumb would show: Patient → contact[where...] → name → family

AFTER Phase 5:
  SmartPathBreadcrumb shows: Patient → contact → name → family
  ScopeSelectorChip shows: [Filter] relationship.exists() [Filter] use='official'

Usage pattern:
*/

// Usage pattern (conceptual - not executable code):
/*
function ValidationErrorDisplay({ error }) {
  const fhirPath = error.path;
  const structuralPath = removeWhereClauses(fhirPath);
  
  return (
    <div>
      {/* Structural navigation - breadcrumbs ONLY *\/}
      <SmartPathBreadcrumb
        resourceType={error.resourceType}
        segments={parsePathSegments(structuralPath)}
        fullPath={structuralPath}
      />
      
      {/* Scope filters - where() clauses ONLY *\/}
      <ScopeSelectorChip fhirPath={fhirPath} />
    </div>
  );
}
*/


// ============================================================================
// EXAMPLE 5: Complex Real-World Scenario
// ============================================================================

const example5_path = "Bundle.entry.where(resource.resourceType='Observation').resource.component.where(code.coding.where(system='http://loinc.org').code='85354-9').valueQuantity.value";

// Extraction:
const selectors5 = extractWhereClausesScopeSelectors(example5_path);
// Result: [
//   "resource.resourceType='Observation'",
//   "code.coding.where(system='http://loinc.org').code='85354-9'",
//   "system='http://loinc.org'"
// ]

// Note: Nested where() clauses are extracted individually

// Structural path:
const structuralPath5 = removeWhereClauses(example5_path);
// Result: "Bundle.entry.resource.component.valueQuantity.value"


// ============================================================================
// VISUAL DESIGN SPECIFICATIONS
// ============================================================================

/*
Filter Chip Design:
- Background: bg-purple-50 (light purple)
- Text: text-purple-700 (dark purple)
- Border: border-purple-200 (medium purple)
- Icon: Filter icon from lucide-react
- Font: font-mono (monospace for code-like appearance)
- Max width: 200px with truncate
- Padding: px-2 py-0.5 (compact)
- Tooltip: Shows full "where(selector)" on hover

Color Rationale:
- Purple distinguishes filters from structural breadcrumbs (typically gray/blue)
- Consistent with "scope/filter" semantic meaning
- High contrast for readability
*/


// ============================================================================
// TESTING EDGE CASES
// ============================================================================

// Edge case 1: Empty or undefined path
extractWhereClausesScopeSelectors(undefined);  // []
extractWhereClausesScopeSelectors('');         // []

// Edge case 2: Malformed where() (missing closing paren)
// This will not match due to regex requiring closing paren
extractWhereClausesScopeSelectors("Patient.name.where(use='official'");  // []

// Edge case 3: where() with complex nested conditions
const complexWhere = "Patient.telecom.where(system='phone' and use='mobile').value";
extractWhereClausesScopeSelectors(complexWhere);
// Result: ["system='phone' and use='mobile'"]

// Edge case 4: where() with function calls
const functionWhere = "Patient.name.where(given.count() > 1).family";
extractWhereClausesScopeSelectors(functionWhere);
// Result: ["given.count() > 1"]


// ============================================================================
// MIGRATION GUIDE
// ============================================================================

/*
FOR EXISTING COMPONENTS using SmartPathBreadcrumb:

STEP 1: Import utilities
  import { ScopeSelectorChip, removeWhereClauses } from './ScopeSelectorChip';

STEP 2: Clean path before passing to breadcrumb
  const structuralPath = removeWhereClauses(error.path);
  <SmartPathBreadcrumb fullPath={structuralPath} ... />

STEP 3: Add scope selector rendering
  <ScopeSelectorChip fhirPath={error.path} className="mt-1" />

RESULT:
  - Breadcrumbs show ONLY structural navigation
  - Filters show ONLY where() clauses
  - Separation of concerns achieved
*/

export {};
