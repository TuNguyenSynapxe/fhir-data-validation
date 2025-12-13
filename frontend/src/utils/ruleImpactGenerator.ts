/**
 * Rule Impact Summary Generator
 * 
 * Generates plain English explanations of rule impact
 * 
 * Phase 1: Deterministic logic based on rule structure
 */

import type { RuleImpact } from '../types/ruleExplainability';

/**
 * Generate impact summary from rule configuration
 * 
 * PURE FUNCTION:
 * - No side effects
 * - Deterministic
 * - Human-friendly output
 * 
 * @param rule - Rule configuration (fhirPath, operator, value, etc.)
 * @param resourceType - Target resource type
 * @returns Impact summary with severity and description
 */
export function generateRuleImpact(
  rule: {
    fhirPath: string;
    operator: string;
    value?: any;
    message?: string;
  },
  resourceType: string
): RuleImpact {
  const { fhirPath, operator, value, message } = rule;

  // Determine severity based on operator
  const severity = determineSeverity(operator);

  // Generate description
  const description = generateImpactDescription(fhirPath, operator, value, resourceType);

  // Generate example failure
  const exampleFailure = generateExampleFailure(fhirPath, operator, value, message);

  return {
    severity,
    affectedResourceTypes: [resourceType],
    description,
    exampleFailure,
  };
}

/**
 * Determine severity from operator type
 */
function determineSeverity(operator: string): 'blocking' | 'warning' | 'info' {
  const blockingOperators = ['exists', 'equals', 'notEquals', 'required'];
  const warningOperators = ['greaterThan', 'lessThan', 'greaterThanOrEqual', 'lessThanOrEqual'];

  if (blockingOperators.includes(operator)) {
    return 'blocking';
  } else if (warningOperators.includes(operator)) {
    return 'warning';
  }

  return 'info';
}

/**
 * Generate human-friendly impact description
 */
function generateImpactDescription(
  fhirPath: string,
  operator: string,
  value: any,
  resourceType: string
): string {
  const fieldName = getFieldName(fhirPath);

  switch (operator) {
    case 'exists':
      return `${resourceType} resources without a '${fieldName}' field will fail validation.`;

    case 'equals':
      return `${resourceType} resources where '${fieldName}' does not equal '${value}' will fail validation.`;

    case 'notEquals':
      return `${resourceType} resources where '${fieldName}' equals '${value}' will fail validation.`;

    case 'contains':
      return `${resourceType} resources where '${fieldName}' does not contain '${value}' will fail validation.`;

    case 'greaterThan':
      return `${resourceType} resources where '${fieldName}' is not greater than ${value} will trigger a warning.`;

    case 'lessThan':
      return `${resourceType} resources where '${fieldName}' is not less than ${value} will trigger a warning.`;

    case 'greaterThanOrEqual':
      return `${resourceType} resources where '${fieldName}' is less than ${value} will trigger a warning.`;

    case 'lessThanOrEqual':
      return `${resourceType} resources where '${fieldName}' is greater than ${value} will trigger a warning.`;

    case 'matches':
      return `${resourceType} resources where '${fieldName}' does not match the pattern '${value}' will fail validation.`;

    case 'in':
      return `${resourceType} resources where '${fieldName}' is not in the allowed values will fail validation.`;

    default:
      return `${resourceType} resources that do not satisfy the '${operator}' condition for '${fieldName}' will be flagged.`;
  }
}

/**
 * Generate example failure message
 */
function generateExampleFailure(
  fhirPath: string,
  operator: string,
  value: any,
  customMessage?: string
): string {
  if (customMessage) {
    return customMessage;
  }

  const fieldName = getFieldName(fhirPath);

  switch (operator) {
    case 'exists':
      return `Missing required field: ${fieldName}`;

    case 'equals':
      return `${fieldName} must be '${value}'`;

    case 'notEquals':
      return `${fieldName} must not be '${value}'`;

    case 'contains':
      return `${fieldName} must contain '${value}'`;

    case 'greaterThan':
      return `${fieldName} must be greater than ${value}`;

    case 'lessThan':
      return `${fieldName} must be less than ${value}`;

    case 'greaterThanOrEqual':
      return `${fieldName} must be at least ${value}`;

    case 'lessThanOrEqual':
      return `${fieldName} must be at most ${value}`;

    case 'matches':
      return `${fieldName} does not match required pattern`;

    case 'in':
      return `${fieldName} has invalid value`;

    default:
      return `Validation failed for ${fieldName}`;
  }
}

/**
 * Extract human-friendly field name from FHIRPath
 */
function getFieldName(fhirPath: string): string {
  // Remove array indices and function calls
  let name = fhirPath
    .replace(/\[.*?\]/g, '')
    .replace(/\.(count|exists|where)\(\)/g, '');

  // Get last segment if dotted path
  const segments = name.split('.');
  return segments[segments.length - 1] || fhirPath;
}

/**
 * Generate evidence from rule suggestion
 */
export function generateEvidenceFromSuggestion(suggestion: {
  reason: string;
  context: {
    resourceType?: string;
    fieldPath?: string;
    sampleValue?: any;
    occurrences?: number;
  };
}): Array<{
  type: 'pattern' | 'sample' | 'bundle' | 'template';
  description: string;
  details?: any;
}> {
  const evidence: any[] = [];

  // Primary evidence from reason
  evidence.push({
    type: 'pattern',
    description: suggestion.reason,
    details: {
      fieldPath: suggestion.context.fieldPath,
      occurrences: suggestion.context.occurrences,
    },
  });

  // Value evidence if available
  if (suggestion.context.sampleValue !== undefined) {
    evidence.push({
      type: 'sample',
      description: `Observed value: ${JSON.stringify(suggestion.context.sampleValue)}`,
      details: {
        sampleValue: suggestion.context.sampleValue,
      },
    });
  }

  return evidence;
}
