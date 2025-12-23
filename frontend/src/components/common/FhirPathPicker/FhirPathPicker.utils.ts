/**
 * FhirPathPicker Utilities
 * 
 * Validation and composition logic for mode-based FHIRPath selection.
 */

import type {
  ValidationState,
  FilterExpression,
  NodeSelectionResult,
  FilterSelectionResult,
  FieldSelectionResult,
} from './FhirPathPicker.types';

/**
 * Validate node selection
 * 
 * Rules:
 * - Can select resource root (e.g., "Observation")
 * - Can select array nodes with [*] or [0]
 * - Cannot select leaf primitive fields
 * - Cannot include where() clauses
 */
export function validateNodeSelection(path: string): ValidationState {
  if (!path || path.trim() === '') {
    return { isValid: false, errorMessage: 'Path cannot be empty' };
  }

  // Block leaf primitives (paths ending with primitive field names)
  const primitiveFields = ['value', 'id', 'text', 'status', 'code', 'display', 'system'];
  const pathEnd = path.split('.').pop() || '';
  if (primitiveFields.some(field => pathEnd.toLowerCase() === field.toLowerCase()) && !path.includes('[')) {
    return { isValid: false, errorMessage: 'Cannot select leaf fields in node mode. Use field mode instead.' };
  }

  // Block where() clauses
  if (path.includes('where(')) {
    return { isValid: false, errorMessage: 'where() clauses not allowed in node mode. Use filter mode instead.' };
  }

  // Block value[x] in node mode
  if (path.includes('value[x]')) {
    return { isValid: false, errorMessage: 'value[x] not allowed in node mode. Use field mode instead.' };
  }

  return { isValid: true };
}

/**
 * Validate filter expression
 * 
 * Rules:
 * - left must be a selectable field path (relative to basePath)
 * - operator must be =, !=, or in
 * - right must be a literal value (no complex expressions)
 * - No nested where() clauses
 * - No absolute paths inside filter
 */
export function validateFilterExpression(filter: FilterExpression, basePath: string): ValidationState {
  if (!filter.left || filter.left.trim() === '') {
    return { isValid: false, errorMessage: 'Filter field cannot be empty' };
  }

  if (!filter.operator) {
    return { isValid: false, errorMessage: 'Operator is required' };
  }

  if (filter.right === undefined || filter.right === null || filter.right === '') {
    return { isValid: false, errorMessage: 'Filter value cannot be empty' };
  }

  // Block nested where()
  if (filter.left.includes('where(')) {
    return { isValid: false, errorMessage: 'Nested where() not allowed' };
  }

  // Block absolute paths in left side
  if (filter.left.startsWith(basePath)) {
    return { isValid: false, errorMessage: 'Use relative paths inside filters' };
  }

  // Validate operator
  if (!['=', '!=', 'in'].includes(filter.operator)) {
    return { isValid: false, errorMessage: 'Invalid operator. Use =, !=, or in' };
  }

  return { isValid: true };
}

/**
 * Validate field selection
 * 
 * Rules:
 * - Must be a leaf field or value[x]
 * - Cannot select resource root
 * - Cannot include where() clauses
 * - Absolute paths blocked unless allowAbsolute=true
 * - Path must resolve to primitive or value[x]
 */
export function validateFieldSelection(
  path: string,
  basePath: string | undefined,
  allowAbsolute: boolean
): ValidationState {
  if (!path || path.trim() === '') {
    return { isValid: false, errorMessage: 'Path cannot be empty' };
  }

  // Block where() clauses
  if (path.includes('where(')) {
    return { isValid: false, errorMessage: 'where() not allowed in field mode' };
  }

  // Block resource root selection
  const resourceTypes = ['Patient', 'Observation', 'Condition', 'Procedure', 'Encounter', 'DiagnosticReport'];
  if (resourceTypes.includes(path) && !path.includes('.')) {
    return { isValid: false, errorMessage: 'Cannot select resource root in field mode. Use node mode instead.' };
  }

  // Check absolute vs relative paths
  const isAbsolutePath = resourceTypes.some(rt => path.startsWith(rt + '.'));
  
  if (isAbsolutePath && !allowAbsolute) {
    return { isValid: false, errorMessage: 'Absolute paths not allowed. Provide a basePath for relative selection.' };
  }

  if (!isAbsolutePath && !basePath) {
    return { isValid: false, errorMessage: 'Relative path requires a basePath' };
  }

  return { isValid: true };
}

/**
 * Compose filter FHIRPath expression
 * 
 * Example:
 * basePath: "Observation"
 * filter: { left: "code.coding.code", operator: "=", right: "HEARING" }
 * → "Observation.where(code.coding.code='HEARING')"
 */
export function composeFilterPath(basePath: string, filter: FilterExpression): string {
  const rightValue = typeof filter.right === 'string' 
    ? `'${filter.right}'` 
    : String(filter.right);
  
  return `${basePath}.where(${filter.left}${filter.operator}${rightValue})`;
}

/**
 * Compose field path (absolute from basePath + relative)
 * 
 * Example:
 * basePath: "Observation.component[*]"
 * relativePath: "value[x]"
 * → "Observation.component[*].value[x]"
 */
export function composeFieldPath(basePath: string | undefined, relativePath: string): string {
  if (!basePath) {
    return relativePath;
  }
  return `${basePath}.${relativePath}`;
}

/**
 * Extract relative path from absolute path given basePath
 * 
 * Example:
 * absolutePath: "Observation.component[*].value[x]"
 * basePath: "Observation.component[*]"
 * → "value[x]"
 */
export function extractRelativePath(absolutePath: string, basePath: string): string | undefined {
  if (!basePath || !absolutePath.startsWith(basePath + '.')) {
    return undefined;
  }
  return absolutePath.substring(basePath.length + 1);
}

/**
 * Check if path represents a leaf field (primitive or value[x])
 */
export function isLeafField(path: string): boolean {
  // value[x] is always a leaf
  if (path.endsWith('value[x]')) {
    return true;
  }

  // Common primitive fields
  const leafFields = ['id', 'value', 'display', 'code', 'system', 'text', 'status', 'unit'];
  const pathEnd = path.split('.').pop() || '';
  return leafFields.some(field => pathEnd.toLowerCase() === field.toLowerCase());
}

/**
 * Check if path represents a node (array or resource)
 */
export function isNodePath(path: string): boolean {
  // Has array notation
  if (path.includes('[')) {
    return true;
  }

  // Resource root
  const resourceTypes = ['Patient', 'Observation', 'Condition', 'Procedure', 'Encounter', 'DiagnosticReport'];
  return resourceTypes.some(rt => path === rt || path.startsWith(rt + '.'));
}

/**
 * Infer resource type from path
 * 
 * Example:
 * "Observation.component[*]" → "Observation"
 * "Patient.name[0]" → "Patient"
 */
export function inferResourceType(path: string): string | undefined {
  const resourceTypes = ['Patient', 'Observation', 'Condition', 'Procedure', 'Encounter', 'DiagnosticReport'];
  const match = resourceTypes.find(rt => path.startsWith(rt));
  return match;
}

/**
 * Build NodeSelectionResult from path
 */
export function buildNodeResult(path: string): NodeSelectionResult {
  return {
    kind: 'node',
    path,
    resourceType: inferResourceType(path),
  };
}

/**
 * Build FilterSelectionResult from basePath and filter
 */
export function buildFilterResult(basePath: string, filter: FilterExpression): FilterSelectionResult {
  return {
    kind: 'filter',
    basePath,
    filter,
    composedPath: composeFilterPath(basePath, filter),
  };
}

/**
 * Build FieldSelectionResult from paths
 */
export function buildFieldResult(
  absolutePath: string,
  basePath: string | undefined
): FieldSelectionResult {
  return {
    kind: 'field',
    relativePath: basePath ? extractRelativePath(absolutePath, basePath) : undefined,
    absolutePath,
  };
}
