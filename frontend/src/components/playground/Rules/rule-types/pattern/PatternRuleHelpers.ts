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

interface Rule {
  id: string;
  type: string;
  resourceType: string;
  path: string;
  severity: string;
  errorCode: string;            // PHASE 3: errorCode is now primary
  userHint?: string;            // PHASE 3: optional short hint
  message?: string;             // DEPRECATED: backward compat only
  params?: Record<string, any>;
  origin?: string;
  enabled?: boolean;
  isMessageCustomized?: boolean;
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
  const absolutePath = composeInstanceScopedPath(resourceType, instanceScope) + '.' + fieldPath;

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
 * Compose absolute FHIRPath with resource scope
 * Example: Patient[*].identifier[0].value
 */
export function composeFhirPath(
  resourceType: string,
  instanceScope: 'all' | 'first',
  fieldPath: string
): string {
  // Clean fieldPath - if it already includes resource type, extract relative part
  let relativePath = fieldPath;
  if (fieldPath.startsWith(resourceType + '.')) {
    relativePath = fieldPath.substring(resourceType.length + 1);
  } else if (fieldPath.startsWith(resourceType + '[')) {
    // Handle cases like "Patient[0].name"
    const afterResource = fieldPath.substring(resourceType.length);
    const dotIndex = afterResource.indexOf('.');
    if (dotIndex > 0) {
      relativePath = afterResource.substring(dotIndex + 1);
    }
  }

  // Compose: ResourceType[scope].relativePath
  const scope = instanceScope === 'all' ? '[*]' : '[0]';
  return `${resourceType}${scope}.${relativePath}`;
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
