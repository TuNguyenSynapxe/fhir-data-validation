/**
 * RequiredRuleHelpers - Helper functions for Required rule creation
 * 
 * Responsibilities:
 * - Default rule construction
 * - FHIRPath composition
 * - ErrorCode-first architecture (Phase 3)
 * 
 * Phase 4: Instance scope uses structured drawer-based selection
 */

import type { InstanceScope } from '../../common/InstanceScope.types';
import { composeInstanceScopedPath } from '../../common/InstanceScope.utils';
import type { Rule } from '../../../../../types/rightPanelProps';

interface RequiredRuleData {
  resourceType: string;
  instanceScope: InstanceScope; // Structured instance scope (first/all/filter)
  fieldPath: string;
  severity: 'error' | 'warning' | 'information';
  errorCode: string;            // PHASE 3: errorCode is now primary
  userHint?: string;            // PHASE 3: optional short hint
  message?: string;             // DEPRECATED: backward compat only
}

/**
 * Build a complete Required rule from form data
 * PHASE 3: Uses errorCode + userHint instead of message
 */
export function buildRequiredRule(data: RequiredRuleData): Rule {
  const { resourceType, instanceScope, fieldPath, severity, errorCode, userHint, message } = data;
  
  // Compose FHIRPath: instanceScope + fieldPath
  const fullPath = composeFhirPath(resourceType, instanceScope, fieldPath);
  
  return {
    id: `rule-${Date.now()}`,
    type: 'Required',
    resourceType,
    path: fullPath,
    severity,
    errorCode,                    // PHASE 3: errorCode is primary
    userHint: userHint || undefined, // PHASE 3: optional short hint
    message: message || undefined,   // DEPRECATED: backward compat only
    origin: 'manual',
    enabled: true,
    isMessageCustomized: false,      // No longer applicable with errorCode-first
  };
}

/**
 * Compose FHIRPath from instance scope and field path
 * Phase 4: Uses composeInstanceScopedPath utility
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
 * Generate default error message for a Required rule
 */
export function getDefaultErrorMessage(
  resourceType: string,
  fieldPath: string
): string {
  // Extract field name from path
  const parts = fieldPath.split('.');
  const fieldName = parts[parts.length - 1];
  
  // Use both resourceType and fieldName in the message
  return `${resourceType}.${fieldName} is required`;
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
  'Coverage',
  'Claim',
] as const;

/**
 * Get list of severity levels
 */
export const SEVERITY_LEVELS = [
  { value: 'error', label: 'Error', description: 'Validation must pass' },
  { value: 'warning', label: 'Warning', description: 'Should be fixed' },
  { value: 'information', label: 'Information', description: 'Advisory only' },
] as const;
