/**
 * CodeSystem Validation Utilities
 * Phase 4B: Terminology Import
 * 
 * Validates imported CodeSystems:
 * - URL uniqueness
 * - Concept code uniqueness
 * - FHIR JSON structure
 * - Non-blocking warnings
 */

import type { CodeSystem, CodeSystemConcept } from '../types/terminology';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate imported CodeSystem data
 */
export function validateCodeSystem(
  codeSystem: Partial<CodeSystem>,
  existingUrls: string[] = []
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate required fields
  if (!codeSystem.url) {
    errors.push('Missing required field: url (canonical URL)');
  } else {
    // Validate URL format
    if (!isValidUrl(codeSystem.url)) {
      errors.push(`Invalid URL format: '${codeSystem.url}'. Must be a valid URI.`);
    }

    // Check uniqueness (only if not overwriting)
    if (existingUrls.includes(codeSystem.url)) {
      warnings.push(
        `CodeSystem with URL '${codeSystem.url}' already exists. ` +
        `Import will overwrite the existing CodeSystem.`
      );
    }
  }

  if (!codeSystem.name) {
    warnings.push('Missing recommended field: name (computer-friendly identifier)');
  } else if (!isValidName(codeSystem.name)) {
    warnings.push(
      `Name '${codeSystem.name}' should use alphanumeric characters, hyphens, and underscores only. ` +
      `Spaces and special characters may cause issues.`
    );
  }

  if (!codeSystem.status) {
    errors.push('Missing required field: status (draft | active | retired | unknown)');
  } else if (!['draft', 'active', 'retired', 'unknown'].includes(codeSystem.status)) {
    errors.push(
      `Invalid status: '${codeSystem.status}'. ` +
      `Must be one of: draft, active, retired, unknown`
    );
  }

  if (!codeSystem.content) {
    warnings.push("Missing field: content. Defaulting to 'complete'.");
  } else if (!['complete', 'example', 'fragment', 'supplement'].includes(codeSystem.content)) {
    errors.push(
      `Invalid content mode: '${codeSystem.content}'. ` +
      `Must be one of: complete, example, fragment, supplement`
    );
  }

  if (!codeSystem.title) {
    warnings.push('Missing recommended field: title (human-friendly display name)');
  }

  // Validate concepts
  if (!codeSystem.concept || codeSystem.concept.length === 0) {
    warnings.push('CodeSystem has no concepts. It will be created empty.');
  } else {
    const conceptValidation = validateConcepts(codeSystem.concept);
    errors.push(...conceptValidation.errors);
    warnings.push(...conceptValidation.warnings);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate concept array for code uniqueness and structure
 */
export function validateConcepts(
  concepts: CodeSystemConcept[],
  parentPath: string[] = []
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const seenCodes = new Set<string>();

  function validateConceptRecursive(
    concept: CodeSystemConcept,
    path: string[]
  ) {
    const fullPath = [...path, concept.code].join(' > ');

    // Validate code field
    if (!concept.code) {
      errors.push(`Concept at path '${path.join(' > ')}' is missing required 'code' field`);
      return;
    }

    // Check code uniqueness
    if (seenCodes.has(concept.code)) {
      errors.push(
        `Duplicate concept code '${concept.code}' found. ` +
        `Each code must be unique within the CodeSystem. Path: ${fullPath}`
      );
    } else {
      seenCodes.add(concept.code);
    }

    // Validate code format
    if (!isValidCode(concept.code)) {
      warnings.push(
        `Concept code '${concept.code}' contains spaces or special characters. ` +
        `Consider using alphanumeric, hyphens, or underscores only. Path: ${fullPath}`
      );
    }

    // Check display
    if (!concept.display) {
      warnings.push(`Concept '${concept.code}' is missing display field. Path: ${fullPath}`);
    }

    // Check definition
    if (!concept.definition) {
      // Just informational, not a warning
      // definitions are optional
    }

    // Validate children recursively
    if (concept.concept && concept.concept.length > 0) {
      concept.concept.forEach(child => {
        validateConceptRecursive(child, [...path, concept.code]);
      });
    }
  }

  concepts.forEach(concept => validateConceptRecursive(concept, parentPath));

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate FHIR JSON structure
 * Checks if JSON is a valid FHIR CodeSystem resource
 */
export function validateFhirJson(json: any): ValidationResult {
  const errors: string[] = [];

  // Check if it's an object
  if (typeof json !== 'object' || json === null) {
    return {
      valid: false,
      errors: ['Invalid JSON: Expected an object'],
      warnings: [],
    };
  }

  // Check resourceType
  if (json.resourceType !== 'CodeSystem') {
    errors.push(
      `Invalid resourceType: '${json.resourceType}'. ` +
      `Expected 'CodeSystem' for CodeSystem imports.`
    );
  }

  // FHIR JSON may have resourceType, we need to extract the data
  // Our internal model doesn't use resourceType
  const codeSystem: Partial<CodeSystem> = {
    url: json.url,
    version: json.version,
    name: json.name,
    title: json.title,
    status: json.status,
    description: json.description,
    publisher: json.publisher,
    content: json.content,
    count: json.count,
    concept: json.concept,
  };

  return validateCodeSystem(codeSystem);
}

/**
 * Parse imported file content
 */
export function parseImportFile(
  file: File,
  content: string
): { format: 'json' | 'csv'; data: any } | { format: 'unknown'; error: string } {
  const fileName = file.name.toLowerCase();

  // Detect format by extension
  if (fileName.endsWith('.json')) {
    try {
      const data = JSON.parse(content);
      return { format: 'json', data };
    } catch (error) {
      return {
        format: 'unknown',
        error: `Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  } else if (fileName.endsWith('.csv')) {
    return { format: 'csv', data: content };
  } else {
    return {
      format: 'unknown',
      error: `Unsupported file format. Please upload a .json or .csv file.`,
    };
  }
}

/**
 * Validate URL format
 */
function isValidUrl(url: string): boolean {
  try {
    // Check if it's a valid URI (not necessarily http/https)
    // FHIR URLs can be URNs like "urn:oid:2.16.840.1.113883.6.88"
    if (url.startsWith('http://') || url.startsWith('https://')) {
      new URL(url);
      return true;
    } else if (url.startsWith('urn:')) {
      // Basic URN validation
      return /^urn:[a-z0-9][a-z0-9-]{0,31}:[a-z0-9()+,\-.:=@;$_!*'%/?#]+$/i.test(url);
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Validate name format (alphanumeric, hyphens, underscores)
 */
function isValidName(name: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(name);
}

/**
 * Validate code format (alphanumeric, hyphens, underscores, dots)
 */
function isValidCode(code: string): boolean {
  // Allow alphanumeric, hyphens, underscores, dots
  // This is lenient - codes can have other characters but we warn
  return /^[a-zA-Z0-9._-]+$/.test(code);
}

/**
 * Count total concepts (including nested)
 */
export function countConcepts(concepts: CodeSystemConcept[]): number {
  let count = 0;

  function countRecursive(concept: CodeSystemConcept) {
    count++;
    if (concept.concept) {
      concept.concept.forEach(countRecursive);
    }
  }

  concepts.forEach(countRecursive);
  return count;
}
