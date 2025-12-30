/**
 * RequiredRuleHelpers - Helper functions for Required rule creation
 * 
 * Responsibilities:
 * - Default rule construction
 * - Structured instanceScope + fieldPath storage (PHASE 4)
 * - ErrorCode-first architecture (Phase 3)
 * 
 * Phase 4: Instance scope stored as structured object, not composed into path
 */

import type { InstanceScope } from '../../common/InstanceScope.types';
import type { Rule } from '../../../../../types/rightPanelProps';
import { validateFieldPath } from '../../../../../utils/fieldPathValidator';

interface RequiredRuleData {
  resourceType: string;
  instanceScope: InstanceScope; // Structured instance scope (first/all/filter)
  fieldPath: string;
  severity: 'error' | 'warning' | 'information';
  userHint?: string;            // Optional short hint
  message?: string;             // DEPRECATED: backward compat only
}

/**
 * Build a complete Required rule from form data
 * PHASE 4: Stores instanceScope and fieldPath as separate properties
 * Legacy path field removed - backend uses structured fields only
 */
export function buildRequiredRule(data: RequiredRuleData): Rule {
  const { resourceType, instanceScope, fieldPath, severity, userHint } = data;
  
  // Validate field path (should be resource-relative)
  const validation = validateFieldPath(fieldPath);
  if (!validation.isValid) {
    throw new Error(`Invalid field path: ${validation.errorMessage}`);
  }
  
  return {
    id: `rule-${Date.now()}`,
    type: 'Required',
    resourceType,
    
    // ✅ PHASE 4: Structured fields
    instanceScope,
    fieldPath,
    
    severity,
    // errorCode removed - backend-owned
    userHint: userHint || undefined,
    origin: 'manual',
    enabled: true,
    isMessageCustomized: false,
  };
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
