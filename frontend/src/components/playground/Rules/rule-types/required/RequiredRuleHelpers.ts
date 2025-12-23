/**
 * RequiredRuleHelpers - Helper functions for Required rule creation
 * 
 * Responsibilities:
 * - Default rule construction
 * - FHIRPath composition
 * - Human-readable defaults
 */

interface RequiredRuleData {
  resourceType: string;
  instanceScope: 'all' | 'first';
  fieldPath: string;
  severity: 'error' | 'warning' | 'information';
  message?: string;
}

interface Rule {
  id: string;
  type: string;
  resourceType: string;
  path: string;
  severity: string;
  message: string;
  params?: Record<string, any>;
  origin?: string;
  enabled?: boolean;
  isMessageCustomized?: boolean;
}

/**
 * Build a complete Required rule from form data
 */
export function buildRequiredRule(data: RequiredRuleData): Rule {
  const { resourceType, instanceScope, fieldPath, severity, message } = data;
  
  // Compose FHIRPath with scope
  const scopedPath = composeFhirPath(resourceType, instanceScope, fieldPath);
  
  return {
    id: `rule-${Date.now()}`,
    type: 'Required',
    resourceType,
    path: scopedPath,
    severity,
    message: message || getDefaultErrorMessage(resourceType, fieldPath),
    origin: 'manual',
    enabled: true,
    isMessageCustomized: !!message,
  };
}

/**
 * Compose FHIRPath with resource scope
 */
function composeFhirPath(
  resourceType: string,
  instanceScope: 'all' | 'first',
  fieldPath: string
): string {
  // If fieldPath is already absolute (starts with resource type), return as-is
  if (fieldPath.startsWith(resourceType + '.')) {
    return fieldPath;
  }
  
  // Compose: ResourceType + scope + fieldPath
  const scope = instanceScope === 'all' ? '[*]' : '[0]';
  
  // Handle both absolute and relative paths
  if (fieldPath.startsWith(resourceType)) {
    // Path already includes resource type (e.g., "Patient.name.family")
    const relativePart = fieldPath.substring(resourceType.length + 1);
    return `${resourceType}${scope}.${relativePart}`;
  }
  
  // Path is relative (e.g., "name.family")
  return `${resourceType}${scope}.${fieldPath}`;
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
