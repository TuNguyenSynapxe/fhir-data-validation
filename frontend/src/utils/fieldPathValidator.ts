/**
 * Field Path Validator
 * 
 * Mirrors backend FieldPathValidator service validation rules.
 * Validates resource-relative FHIRPath expressions for rule authoring.
 * 
 * PHASE 4: Instance Scope Refactor
 * 
 * Validation Rules:
 * 1. NO resource type prefixes (e.g., "Patient.gender" → "gender")
 * 2. NO instance scope notation ([*], [0])
 * 3. NO .where() clauses (use instance scope filter instead)
 * 4. NO Bundle references
 * 5. Cannot be empty or whitespace
 * 6. Must be valid FHIRPath identifier structure
 */

export interface FieldPathValidationResult {
  isValid: boolean;
  errorMessage?: string;
}

/**
 * FHIR Resource types that should not appear in field paths
 */
const FHIR_RESOURCE_TYPES = [
  'Patient',
  'Observation',
  'Condition',
  'Procedure',
  'Encounter',
  'DiagnosticReport',
  'Medication',
  'MedicationRequest',
  'MedicationStatement',
  'AllergyIntolerance',
  'Immunization',
  'Specimen',
  'Organization',
  'Practitioner',
  'Location',
  'Bundle',
];

/**
 * Validate field path against backend rules
 * 
 * @param fieldPath - Resource-relative field path to validate
 * @returns Validation result with error message if invalid
 * 
 * @example
 * validateFieldPath('gender')           // ✅ Valid
 * validateFieldPath('name.given')       // ✅ Valid
 * validateFieldPath('Patient.gender')   // ❌ Invalid: resource prefix
 * validateFieldPath('gender[*]')        // ❌ Invalid: instance scope notation
 * validateFieldPath('gender.where(...)') // ❌ Invalid: where clause
 */
export function validateFieldPath(fieldPath: string): FieldPathValidationResult {
  // Rule 1: Cannot be empty or whitespace
  if (!fieldPath || fieldPath.trim() === '') {
    return {
      isValid: false,
      errorMessage: 'Field path cannot be empty',
    };
  }

  const trimmedPath = fieldPath.trim();

  // Rule 2: NO resource type prefixes
  for (const resourceType of FHIR_RESOURCE_TYPES) {
    if (trimmedPath.startsWith(resourceType + '.') || trimmedPath === resourceType) {
      return {
        isValid: false,
        errorMessage: `Field path cannot start with resource type "${resourceType}". Use resource-relative path (e.g., "gender" instead of "${resourceType}.gender")`,
      };
    }
  }

  // Rule 3: NO instance scope notation [*] or [0]
  if (trimmedPath.includes('[*]')) {
    return {
      isValid: false,
      errorMessage: 'Field path cannot contain [*]. Use Instance Scope to select all instances instead',
    };
  }

  if (trimmedPath.includes('[0]')) {
    return {
      isValid: false,
      errorMessage: 'Field path cannot contain [0]. Use Instance Scope to select first instance instead',
    };
  }

  // Rule 4: NO .where() clauses
  if (trimmedPath.includes('.where(')) {
    return {
      isValid: false,
      errorMessage: 'Field path cannot contain .where() clause. Use Instance Scope filter instead',
    };
  }

  // Additional check: starts with .where() (leading where)
  if (trimmedPath.startsWith('where(')) {
    return {
      isValid: false,
      errorMessage: 'Field path cannot start with where(). Use Instance Scope filter instead',
    };
  }

  // Rule 5: NO Bundle references
  if (trimmedPath.toLowerCase().includes('bundle')) {
    return {
      isValid: false,
      errorMessage: 'Field path cannot reference Bundle. Select specific resource types instead',
    };
  }

  // Rule 6: Basic FHIRPath identifier structure validation
  // Must be dot-separated identifiers, optionally with array indices like component[0] (but not [*] or [0] alone)
  const pathSegments = trimmedPath.split('.');
  for (const segment of pathSegments) {
    // Each segment should be a valid identifier optionally followed by [number]
    // But we already blocked [*] and [0], so we just check for basic structure
    if (!segment || segment.trim() === '') {
      return {
        isValid: false,
        errorMessage: 'Field path contains empty segments',
      };
    }

    // Check for invalid characters (very basic validation)
    // Valid: alphanumeric, underscore, hyphen, brackets with numbers
    const validSegmentPattern = /^[a-zA-Z][a-zA-Z0-9_-]*(\[[0-9]+\])?$/;
    if (!validSegmentPattern.test(segment)) {
      return {
        isValid: false,
        errorMessage: `Invalid field path segment: "${segment}". Use alphanumeric characters, underscores, and hyphens only`,
      };
    }
  }

  // All validation passed
  return {
    isValid: true,
  };
}

/**
 * Validate field path and throw error if invalid
 * Useful for form validation with immediate feedback
 * 
 * @param fieldPath - Resource-relative field path to validate
 * @throws Error with validation message if invalid
 */
export function assertValidFieldPath(fieldPath: string): void {
  const result = validateFieldPath(fieldPath);
  if (!result.isValid) {
    throw new Error(result.errorMessage);
  }
}

/**
 * Check if field path is valid (boolean convenience method)
 * 
 * @param fieldPath - Resource-relative field path to validate
 * @returns true if valid, false otherwise
 */
export function isValidFieldPath(fieldPath: string): boolean {
  const result = validateFieldPath(fieldPath);
  return result.isValid;
}

/**
 * Extract field path from legacy path string
 * Attempts to extract resource-relative field path from legacy composed path
 * 
 * @param legacyPath - Legacy path like "Patient[*].gender"
 * @param resourceType - Expected resource type
 * @returns Extracted field path or null if cannot extract
 * 
 * @example
 * extractFieldPathFromLegacy('Patient[*].gender', 'Patient') // → 'gender'
 * extractFieldPathFromLegacy('Patient[0].name.given', 'Patient') // → 'name.given'
 * extractFieldPathFromLegacy('Patient.where(...).gender', 'Patient') // → 'gender'
 */
export function extractFieldPathFromLegacy(
  legacyPath: string,
  resourceType: string
): string | null {
  if (!legacyPath || !resourceType) {
    return null;
  }

  const trimmedPath = legacyPath.trim();

  // Pattern 1: ResourceType[*].fieldPath
  const arrayPattern = new RegExp(`^${resourceType}\\[\\*\\]\\.(.+)$`);
  const arrayMatch = trimmedPath.match(arrayPattern);
  if (arrayMatch) {
    return arrayMatch[1];
  }

  // Pattern 2: ResourceType[0].fieldPath
  const firstPattern = new RegExp(`^${resourceType}\\[0\\]\\.(.+)$`);
  const firstMatch = trimmedPath.match(firstPattern);
  if (firstMatch) {
    return firstMatch[1];
  }

  // Pattern 3: ResourceType.where(...).fieldPath
  const wherePattern = new RegExp(`^${resourceType}\\.where\\([^)]+\\)\\.(.+)$`);
  const whereMatch = trimmedPath.match(wherePattern);
  if (whereMatch) {
    return whereMatch[1];
  }

  // Pattern 4: ResourceType.fieldPath (simple case)
  const simplePattern = new RegExp(`^${resourceType}\\.(.+)$`);
  const simpleMatch = trimmedPath.match(simplePattern);
  if (simpleMatch) {
    return simpleMatch[1];
  }

  // Cannot extract
  return null;
}
