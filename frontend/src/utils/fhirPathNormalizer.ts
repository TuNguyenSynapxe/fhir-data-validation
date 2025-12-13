/**
 * FHIRPath Normalization Utility
 * 
 * Pure functions to normalize FHIRPath expressions for coverage matching
 * 
 * CONSTRAINTS:
 * - FHIR R4 only
 * - Deterministic logic
 * - No mutation
 * - No validation
 */

/**
 * Normalize FHIRPath to relative path for matching
 * 
 * Examples:
 * - "Patient.identifier" → "identifier"
 * - "identifier.system" → "identifier.system"
 * - "identifier[0].system" → "identifier.system"
 * - "identifier[*].system" → "identifier[*].system"
 * - "identifier.where(use='official').system" → "identifier.system"
 * - "name.count()" → "name"
 * 
 * @param fhirPath - FHIRPath expression
 * @param resourceType - Optional resource type to remove prefix
 * @returns Normalized relative path
 */
export function normalizeFhirPath(fhirPath: string, resourceType?: string): string {
  if (!fhirPath) return '';

  let normalized = fhirPath.trim();

  // Remove resource type prefix (e.g., "Patient.identifier" → "identifier")
  if (resourceType && normalized.startsWith(`${resourceType}.`)) {
    normalized = normalized.substring(resourceType.length + 1);
  }

  // Remove function calls but preserve the base path
  // "name.count()" → "name"
  // "identifier.where(...).system" → "identifier.system"
  normalized = normalized
    .replace(/\.count\(\)/g, '')
    .replace(/\.exists\(\)/g, '')
    .replace(/\.where\([^)]*\)\./g, '.')
    .replace(/\.where\([^)]*\)$/g, '');

  // Normalize numeric indices to preserve wildcard or remove
  // "identifier[0].system" → "identifier.system"
  // "identifier[*].system" → "identifier[*].system"
  normalized = normalized.replace(/\[\d+\]/g, '');

  return normalized;
}

/**
 * Check if two FHIRPath expressions match exactly
 * 
 * @param path1 - First FHIRPath
 * @param path2 - Second FHIRPath
 * @param resourceType - Optional resource type for normalization
 * @returns True if paths match exactly after normalization
 */
export function isExactMatch(path1: string, path2: string, resourceType?: string): boolean {
  const norm1 = normalizeFhirPath(path1, resourceType);
  const norm2 = normalizeFhirPath(path2, resourceType);
  return norm1 === norm2;
}

/**
 * Check if a rule path covers a schema path via wildcard
 * 
 * Examples:
 * - "identifier[*].system" covers "identifier.system" ✓
 * - "identifier.system" covers "identifier[*].system" ✗
 * - "name[*].family" covers "name.family" ✓
 * 
 * @param rulePath - Rule FHIRPath (may contain [*])
 * @param schemaPath - Schema path to check
 * @param resourceType - Optional resource type
 * @returns True if rule covers schema via wildcard
 */
export function isWildcardMatch(rulePath: string, schemaPath: string, resourceType?: string): boolean {
  const normRule = normalizeFhirPath(rulePath, resourceType);
  const normSchema = normalizeFhirPath(schemaPath, resourceType);

  // Rule must contain [*] to be wildcard match
  if (!normRule.includes('[*]')) {
    return false;
  }

  // Replace [*] with empty string and compare
  const ruleWithoutWildcard = normRule.replace(/\[\*\]/g, '');
  return ruleWithoutWildcard === normSchema;
}

/**
 * Check if a rule path covers a schema path via parent coverage
 * 
 * Examples:
 * - "identifier" covers "identifier.system" ✓
 * - "name" covers "name.family" ✓
 * - "identifier.system" covers "identifier" ✗
 * - "identifier" covers "meta.versionId" ✗
 * 
 * @param rulePath - Rule FHIRPath (parent)
 * @param schemaPath - Schema path (child)
 * @param resourceType - Optional resource type
 * @returns True if rule is parent of schema path
 */
export function isParentMatch(rulePath: string, schemaPath: string, resourceType?: string): boolean {
  const normRule = normalizeFhirPath(rulePath, resourceType);
  const normSchema = normalizeFhirPath(schemaPath, resourceType);

  // Schema path must start with rule path + dot
  return normSchema.startsWith(normRule + '.');
}

/**
 * Get parent path from a FHIRPath
 * 
 * Examples:
 * - "identifier.system" → "identifier"
 * - "name.given" → "name"
 * - "identifier" → ""
 * 
 * @param fhirPath - FHIRPath expression
 * @returns Parent path or empty string if no parent
 */
export function getParentPath(fhirPath: string): string {
  const normalized = normalizeFhirPath(fhirPath);
  const lastDotIndex = normalized.lastIndexOf('.');
  
  if (lastDotIndex === -1) {
    return '';
  }
  
  return normalized.substring(0, lastDotIndex);
}

/**
 * Split FHIRPath into segments
 * 
 * Examples:
 * - "identifier.system" → ["identifier", "system"]
 * - "name[*].family" → ["name[*]", "family"]
 * 
 * @param fhirPath - FHIRPath expression
 * @returns Array of path segments
 */
export function splitFhirPath(fhirPath: string): string[] {
  const normalized = normalizeFhirPath(fhirPath);
  return normalized.split('.').filter(s => s.length > 0);
}

/**
 * Check if path contains wildcard operator
 * 
 * @param fhirPath - FHIRPath expression
 * @returns True if path contains [*]
 */
export function hasWildcard(fhirPath: string): boolean {
  return fhirPath.includes('[*]');
}

/**
 * Remove wildcards from path
 * 
 * @param fhirPath - FHIRPath expression
 * @returns Path without [*]
 */
export function removeWildcards(fhirPath: string): string {
  return fhirPath.replace(/\[\*\]/g, '');
}
