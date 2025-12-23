/**
 * RequiredRuleHelpers - Helper functions for Required rule creation
 * 
 * Responsibilities:
 * - Default rule construction
 * - FHIRPath composition
 * - Human-readable defaults
 * 
 * Phase 3: Instance scope now uses FHIRPath node selection
 */

interface RequiredRuleData {
  resourceType: string;
  scopePath: string; // FHIRPath node selection (e.g., "Patient[*]", "Observation[0]")
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
 * Phase 3: Uses scopePath for instance scope (FHIRPath node selection)
 */
export function buildRequiredRule(data: RequiredRuleData): Rule {
  const { resourceType, scopePath, fieldPath, severity, message } = data;
  
  // Compose FHIRPath: scopePath + fieldPath
  const fullPath = composeFhirPath(scopePath, fieldPath);
  
  return {
    id: `rule-${Date.now()}`,
    type: 'Required',
    resourceType,
    path: fullPath,
    severity,
    message: message || getDefaultErrorMessage(resourceType, fieldPath),
    origin: 'manual',
    enabled: true,
    isMessageCustomized: !!message,
  };
}

/**
 * Compose FHIRPath from scope and field path
 * Phase 3: scopePath is already a full node path (e.g., "Patient[*]", "Observation.component[*]")
 */
function composeFhirPath(
  scopePath: string,
  fieldPath: string
): string {
  // scopePath is already a complete node path
  // Append fieldPath to it
  
  // If fieldPath already contains the resource type, extract relative part
  const resourceTypeMatch = scopePath.match(/^([A-Z][a-zA-Z]+)/);
  if (resourceTypeMatch) {
    const resourceType = resourceTypeMatch[1];
    if (fieldPath.startsWith(resourceType + '.')) {
      // Extract relative part
      const relativePart = fieldPath.substring(resourceType.length + 1);
      return `${scopePath}.${relativePart}`;
    }
  }
  
  // fieldPath is relative, append directly
  return `${scopePath}.${fieldPath}`;
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
