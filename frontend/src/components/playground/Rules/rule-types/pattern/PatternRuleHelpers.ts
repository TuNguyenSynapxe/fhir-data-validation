/**
 * PatternRuleHelpers - Helper functions for Pattern / Regex rule creation
 * 
 * Responsibilities:
 * - Default rule construction
 * - Absolute FHIRPath composition
 * - Pattern validation
 * - ErrorCode-first architecture (Phase 3)
 */

import type { InstanceScope } from '../../common/InstanceScope.types';
import { composeInstanceScopedPath } from '../../common/InstanceScope.utils';
import type { Rule } from '../../../../../types/rightPanelProps';

interface PatternRuleData {
  resourceType: string;
  instanceScope: InstanceScope;
  fieldPath: string;
  pattern: string;
  negate: boolean;
  caseSensitive: boolean;
  severity: 'error' | 'warning' | 'information';
  errorCode: string;            // PHASE 3: errorCode is now primary
  userHint?: string;            // PHASE 3: optional short hint
  message?: string;             // DEPRECATED: backward compat only
}

/**
 * Build a complete Pattern rule from form data
 * PHASE 3: Uses errorCode + userHint instead of message
 */
export function buildPatternRule(data: PatternRuleData): Rule {
  const {
    resourceType,
    instanceScope,
    fieldPath,
    pattern,
    negate,
    caseSensitive,
    severity,
    errorCode,
    userHint,
    message,
  } = data;

  // Compose FHIRPath: instanceScope + fieldPath
  const absolutePath = composeFhirPath(resourceType, instanceScope, fieldPath);

  return {
    id: `rule-${Date.now()}`,
    type: 'Regex',
    resourceType,
    path: absolutePath,
    severity,
    errorCode,                    // PHASE 3: errorCode is primary
    userHint: userHint || undefined, // PHASE 3: optional short hint
    message: message || undefined,   // DEPRECATED: backward compat only
    params: {
      pattern,
      negate,
      caseSensitive,
    },
    origin: 'manual',
    enabled: true,
    isMessageCustomized: false,      // No longer applicable with errorCode-first
  };
}

/**
 * Compose FHIRPath from instance scope and field path
 * Uses composeInstanceScopedPath utility for consistent path generation
 */
function composeFhirPath(
  resourceType: string,
  instanceScope: InstanceScope,
  fieldPath: string
): string {
  // Get base scope path (e.g., "Patient[*]", "Observation[0]", "Patient.where(...)")
  const scopePath = composeInstanceScopedPath(resourceType, instanceScope);
  
  // If fieldPath starts with resourceType, extract the relative field path
  // e.g., "Patient[*].id" → "id" or "Patient.id" → "id"
  const resourcePrefix = resourceType + '[';
  const resourceDotPrefix = resourceType + '.';
  
  let relativePath = fieldPath;
  
  if (fieldPath.startsWith(resourcePrefix)) {
    // Handle "Patient[*].id" → extract "id"
    const afterBracket = fieldPath.indexOf('].', resourceType.length);
    if (afterBracket > -1) {
      relativePath = fieldPath.substring(afterBracket + 2); // Skip '].
    }
  } else if (fieldPath.startsWith(resourceDotPrefix)) {
    // Handle "Patient.id" → extract "id"
    relativePath = fieldPath.substring(resourceDotPrefix.length);
  }
  
  // Compose final path: scopePath + relativePath
  return `${scopePath}.${relativePath}`;
}

/**
 * Generate default error message for Pattern rule
 */
export function getDefaultErrorMessage(negate: boolean = false): string {
  if (negate) {
    return 'Value matches forbidden pattern';
  }
  return 'Value does not match required format';
}

/**
 * Get common regex patterns for quick selection
 */
export const COMMON_PATTERNS = [
  {
    name: 'Email',
    pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
    description: 'Standard email format',
  },
  {
    name: 'Phone (US)',
    pattern: '^\\(?([0-9]{3})\\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$',
    description: 'US phone number format',
  },
  {
    name: 'Alphanumeric',
    pattern: '^[A-Za-z0-9]+$',
    description: 'Letters and numbers only',
  },
  {
    name: 'Uppercase Code',
    pattern: '^[A-Z0-9]{4,10}$',
    description: 'Uppercase letters and numbers, 4-10 chars',
  },
  {
    name: 'Date (YYYY-MM-DD)',
    pattern: '^\\d{4}-\\d{2}-\\d{2}$',
    description: 'ISO date format',
  },
  {
    name: 'UUID',
    pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
    description: 'Standard UUID format',
  },
] as const;

/**
 * Validate regex pattern syntax
 */
export function validatePattern(pattern: string): string | null {
  if (!pattern) {
    return 'Pattern is required';
  }

  try {
    new RegExp(pattern);
    return null;
  } catch (error) {
    return `Invalid regex: ${(error as Error).message}`;
  }
}

/**
 * Test a pattern against sample values
 */
export function testPattern(
  pattern: string,
  value: string,
  caseSensitive: boolean = true
): boolean {
  try {
    const flags = caseSensitive ? '' : 'i';
    const regex = new RegExp(pattern, flags);
    return regex.test(value);
  } catch {
    return false;
  }
}

/**
 * Get list of common FHIR resource types
 */
export const RESOURCE_TYPES = [
  'Patient',
  'Observation',
  'Condition',
  'Procedure',
  'Medication',
  'Encounter',
  'AllergyIntolerance',
  'Immunization',
  'DiagnosticReport',
  'Organization',
  'Practitioner',
  'Location',
  'Device',
] as const;

/**
 * Get list of severity levels
 */
export const SEVERITY_LEVELS = [
  { value: 'error', label: 'Error', description: 'Validation must pass' },
  { value: 'warning', label: 'Warning', description: 'Should be fixed' },
  { value: 'information', label: 'Information', description: 'Advisory only' },
] as const;
