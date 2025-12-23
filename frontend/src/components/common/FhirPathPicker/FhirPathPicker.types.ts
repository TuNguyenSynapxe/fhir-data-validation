/**
 * FhirPathPicker Types
 * 
 * Defines strict contracts for the mode-based FHIRPath picker component.
 * Supports node selection, filter construction, and field selection.
 */

/**
 * Selection mode for FhirPathPicker
 * 
 * - "node": Select a node/resource (e.g., Observation[0], component[*])
 * - "filter": Build a where(...) filter visually
 * - "field": Select a field path (absolute or relative)
 */
export type FhirPathPickerMode = "node" | "filter" | "field";

/**
 * Props for FhirPathPicker component
 */
export interface FhirPathPickerProps {
  /** Selection mode */
  mode: FhirPathPickerMode;

  /** Whether drawer is open */
  isOpen: boolean;

  /** Project bundle JSON (required for tree navigation) */
  bundle: any;

  /** Base path for relative selection (optional) */
  basePath?: string;
  // e.g., "Observation[*]" or "Observation.component[*]"

  /** Resource type hint (optional, improves UX) */
  resourceType?: string;
  // e.g., "Observation"

  /** Allow absolute paths (default: false for field mode) */
  allowAbsolute?: boolean;

  /** Callback when user confirms selection */
  onSelect: (result: FhirPathPickerResult) => void;

  /** Cancel handler */
  onCancel: () => void;

  /** HL7 samples for reference (optional) */
  hl7Samples?: any[];
}

/**
 * Result from FhirPathPicker (discriminated union by kind)
 */
export type FhirPathPickerResult =
  | NodeSelectionResult
  | FilterSelectionResult
  | FieldSelectionResult;

/**
 * Result from node selection mode
 * 
 * Example: { kind: "node", path: "Observation[0]", resourceType: "Observation" }
 */
export interface NodeSelectionResult {
  kind: "node";
  path: string;          // e.g., "Observation[0]" or "component[*]"
  resourceType?: string; // inferred from tree
}

/**
 * Result from filter selection mode
 * 
 * Example:
 * {
 *   kind: "filter",
 *   basePath: "Observation",
 *   filter: {
 *     left: "code.coding.code",
 *     operator: "=",
 *     right: "HEARING"
 *   },
 *   composedPath: "Observation.where(code.coding.code='HEARING')"
 * }
 */
export interface FilterSelectionResult {
  kind: "filter";
  basePath: string;      // e.g., "Observation"
  filter: FilterExpression;
  composedPath: string;  // Full FHIRPath with where() clause
}

/**
 * Filter expression components
 */
export interface FilterExpression {
  left: string;        // e.g., "code.coding.code"
  operator: "=" | "!=" | "in";
  right: string | number | boolean;
}

/**
 * Result from field selection mode
 * 
 * Example (relative):
 * {
 *   kind: "field",
 *   relativePath: "value[x]",
 *   absolutePath: "Observation.component[*].value[x]"
 * }
 * 
 * Example (absolute):
 * {
 *   kind: "field",
 *   relativePath: undefined,
 *   absolutePath: "Observation.value[x]"
 * }
 */
export interface FieldSelectionResult {
  kind: "field";
  relativePath?: string;  // e.g., "value[x]" (if basePath provided)
  absolutePath: string;   // e.g., "Observation.component[*].value[x]"
}

/**
 * Internal state for mode-specific validation
 */
export interface ValidationState {
  isValid: boolean;
  errorMessage?: string;
}

/**
 * Tree node representation (shared with BundleTreeView)
 */
export interface TreeNode {
  key: string;
  label: string;
  path: string;
  value: any;
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';
  children?: TreeNode[];
  isArray?: boolean;
  isPrimitive?: boolean;
  resourceType?: string;
  entryIndex?: number;
}

/**
 * Filter builder state (internal)
 */
export interface FilterBuilderState {
  leftPath: string;
  operator: "=" | "!=" | "in";
  rightValue: string | number | boolean;
  availableFields: string[]; // Fields that can be filtered on
}
