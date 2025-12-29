/**
 * FHIRPath Semantic Type Detection Utilities
 * 
 * Lightweight helpers to detect semantic types from FHIRPath strings.
 * Used by restricted/suggested selection modes.
 * 
 * SCOPE: Path-based heuristics only (no schema validation)
 * FUTURE: Expand with FHIR type system integration if needed
 */

/**
 * Detect if a FHIRPath points to a Coding or CodeableConcept element
 * 
 * Examples:
 * - "communication.language.coding" → true
 * - "maritalStatus.coding" → true
 * - "identifier.type.coding.code" → true
 * - "name.text" → false
 */
export function isCodingLike(path: string): boolean {
  if (!path) return false;
  
  const lowerPath = path.toLowerCase();
  
  return (
    lowerPath.endsWith('.coding') ||
    lowerPath.endsWith('.coding.code') ||
    lowerPath.endsWith('.coding.system') ||
    lowerPath.includes('.coding.') ||
    // CodeableConcept paths
    lowerPath.endsWith('.code') && !lowerPath.includes('identifier') // Avoid false positives
  );
}

/**
 * Detect if a FHIRPath points to an Identifier element
 */
export function isIdentifierLike(path: string): boolean {
  if (!path) return false;
  
  const lowerPath = path.toLowerCase();
  
  return (
    lowerPath.includes('identifier') ||
    lowerPath.endsWith('.identifier')
  );
}

/**
 * Detect if a FHIRPath points to a string element
 */
export function isStringLike(path: string): boolean {
  if (!path) return false;
  
  const lowerPath = path.toLowerCase();
  
  return (
    lowerPath.endsWith('.text') ||
    lowerPath.endsWith('.family') ||
    lowerPath.endsWith('.given') ||
    lowerPath.endsWith('.display') ||
    lowerPath.endsWith('.value') && !lowerPath.includes('quantity')
  );
}

/**
 * Get semantic type from FHIRPath (best effort)
 */
export function getSemanticType(path: string): 'Coding' | 'CodeableConcept' | 'Identifier' | 'string' | 'other' {
  if (isCodingLike(path)) {
    if (path.includes('.coding.')) return 'Coding';
    return 'CodeableConcept';
  }
  if (isIdentifierLike(path)) return 'Identifier';
  if (isStringLike(path)) return 'string';
  return 'other';
}

/**
 * Validate if a path is allowed for Terminology rules (Coding/CodeableConcept only)
 */
export function isValidForTerminologyRule(path: string): boolean {
  return isCodingLike(path);
}

/**
 * Normalize CodeableConcept paths to always end with .coding
 * 
 * Examples:
 * - "maritalStatus" → "maritalStatus.coding"
 * - "maritalStatus.coding" → "maritalStatus.coding" (unchanged)
 * - "extension.where(url='...').valueCodeableConcept" → "extension.where(url='...').valueCodeableConcept.coding"
 */
export function normalizeCodeableConceptPath(path: string): string {
  if (!path) return path;
  
  // Already ends with .coding - no change needed
  if (path.endsWith('.coding')) return path;
  
  // If it's a CodeableConcept field, append .coding
  if (isCodingLike(path)) return path;
  
  // Check if path references a CodeableConcept without .coding suffix
  // Common FHIR CodeableConcept fields
  const codeableConceptFields = [
    'maritalStatus',
    'language',
    'type',
    'category',
    'code',
    'valueCodeableConcept',
  ];
  
  const pathParts = path.split('.');
  const lastPart = pathParts[pathParts.length - 1];
  
  if (codeableConceptFields.some(field => lastPart.includes(field))) {
    return `${path}.coding`;
  }
  
  return path;
}

/**
 * Check if a path is an extension path
 */
export function isExtensionPath(path: string): boolean {
  return path.includes('extension');
}

/**
 * Check if a path represents a "coded element" (user-facing concept)
 * This abstracts away the distinction between Coding and CodeableConcept
 */
export function isCodedElement(path: string): boolean {
  if (!path) return false;
  
  // Must be a coding-like path
  if (!isCodingLike(path)) return false;
  
  // Exclude primitive code paths (not valid for terminology validation)
  // These paths point to strings, not Coding/CodeableConcept structures
  if (path.endsWith('.code') && !path.includes('.coding.code')) {
    return false;
  }
  
  // CRITICAL: Block .coding.code paths - these are primitive strings
  // Terminology validation requires Coding or CodeableConcept context
  if (path.endsWith('.coding.code')) {
    return false;
  }
  
  return true;
}

/**
 * Normalize any coded path to .coding suffix
 * This is the canonical form for terminology validation
 * 
 * Examples:
 * - "maritalStatus" → "maritalStatus.coding"
 * - "maritalStatus.coding" → "maritalStatus.coding" (unchanged)
 * - "communication.language" → "communication.language.coding"
 * - "extension.where(url='...').valueCodeableConcept" → "extension.where(url='...').valueCodeableConcept.coding"
 * 
 * Throws error for invalid primitive paths:
 * - "maritalStatus.code" → Error (primitive, not codeable)
 */
export function normalizeToCodingPath(path: string): string {
  if (!path) return path;
  
  // Already normalized
  if (path.endsWith('.coding')) return path;
  
  // Reject primitive code paths
  if (path.endsWith('.code') && !path.includes('.coding.')) {
    throw new Error('Primitive code paths are not valid for terminology validation. Use the parent CodeableConcept field.');
  }
  
  // Check if this is already a coding path
  if (path.includes('.coding.')) {
    return path; // Don't modify paths like "coding.system"
  }
  
  // Append .coding for CodeableConcept fields
  return `${path}.coding`;
}

/**
 * Extract extension URL from a path if present
 * Returns null if not an extension path or URL not found
 */
export function extractExtensionUrl(path: string): string | null {
  if (!isExtensionPath(path)) return null;
  
  // Match patterns like: extension.where(url='...')
  const whereMatch = path.match(/where\(url\s*=\s*['"]([^'"]+)['"]\)/);
  if (whereMatch) return whereMatch[1];
  
  return null;
}

/**
 * Build proper extension FHIRPath with where() clause
 * 
 * Example:
 * - url: "http://example.com/ext"
 * - valueType: "valueCodeableConcept"
 * - suffix: "coding"
 * Result: "extension.where(url='http://example.com/ext').valueCodeableConcept.coding"
 */
export function buildExtensionPath(url: string, valueType: string, suffix?: string): string {
  let path = `extension.where(url='${url}').${valueType}`;
  if (suffix) path += `.${suffix}`;
  return path;
}

/**
 * Generate user-friendly label for a coded field path
 * Hides technical complexity and uses domain language
 * 
 * Examples:
 * - "communication.language.coding" → "Language (coded)"
 * - "maritalStatus.coding" → "Marital Status (coded)"
 * - "extension.where(...).valueCodeableConcept.coding" → "Extension: <name> (coded)"
 */
export function generateCodedFieldLabel(path: string, extensionUrl?: string): string {
  // Handle extensions
  if (isExtensionPath(path)) {
    if (extensionUrl) {
      const shortName = extensionUrl.split('/').pop()?.replace(/-/g, ' ') || 'Extension';
      return `${shortName.charAt(0).toUpperCase() + shortName.slice(1)} (coded)`;
    }
    return 'Extension (coded)';
  }
  
  // Extract meaningful field name from path
  const parts = path.replace('.coding', '').split('.');
  let fieldName = parts[parts.length - 1];
  
  // Handle common patterns
  if (parts.length > 1) {
    // For nested paths like "communication.language", use the parent context
    const parentField = parts[parts.length - 2];
    if (parentField && !['entry', 'resource', 'bundle'].includes(parentField.toLowerCase())) {
      fieldName = `${parentField} ${fieldName}`;
    }
  }
  
  // Convert camelCase to Title Case
  const titleCase = fieldName
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
  
  return `${titleCase} (coded)`;
}
