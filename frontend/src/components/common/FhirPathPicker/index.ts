/**
 * FhirPathPicker - Mode-based FHIRPath Selection Component
 * 
 * Export all public types and the main component.
 */

export { FhirPathPicker } from './FhirPathPicker';
export type {
  FhirPathPickerMode,
  FhirPathPickerProps,
  FhirPathPickerResult,
  NodeSelectionResult,
  FilterSelectionResult,
  FieldSelectionResult,
  FilterExpression,
  TreeNode,
} from './FhirPathPicker.types';
export {
  validateNodeSelection,
  validateFilterExpression,
  validateFieldSelection,
  composeFilterPath,
  composeFieldPath,
  extractRelativePath,
  isLeafField,
  isNodePath,
  inferResourceType,
  buildNodeResult,
  buildFilterResult,
  buildFieldResult,
} from './FhirPathPicker.utils';
