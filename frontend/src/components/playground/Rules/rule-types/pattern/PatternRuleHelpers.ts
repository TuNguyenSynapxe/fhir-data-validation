/**
 * PatternRuleHelpers - Helper functions for Pattern / Regex rule creation
 * 
 * Responsibilities:
 * - Default rule construction
 * - Structured instanceScope + fieldPath storage (PHASE 4)
 * - Pattern validation
 * - ErrorCode-first architecture (Phase 3)
 */

import type { InstanceScope } from '../../common/InstanceScope.types';
import type { Rule } from '../../../../../types/rightPanelProps';
import { validateFieldPath } from '../../../../../utils/fieldPathValidator';

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
 * PHASE 4: Stores instanceScope and fieldPath as separate properties
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

  // Validate field path (should be resource-relative)
  const validation = validateFieldPath(fieldPath);
  if (!validation.isValid) {
    throw new Error(`Invalid field path: ${validation.errorMessage}`);
  }

  return {
    id: `rule-${Date.now()}`,
    type: 'Regex',
    resourceType,
    instanceScope,
    fieldPath,
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
