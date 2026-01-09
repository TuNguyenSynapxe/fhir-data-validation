import type { ValidationResultDto, ValidationIssueDto } from './ValidationApiTypes';
import type { ValidationResult } from '../model/ValidationResult';
import type { ValidationIssue } from '../model/ValidationIssue';
import type { ValidationSeverity } from '../model/ValidationSeverity';
import type { ValidationSource } from '../model/ValidationSource';

/**
 * mapValidationResult
 * 
 * Defensive mapping from backend DTO to frontend model.
 * 
 * Rules:
 * - NO defaults
 * - NO silent fixes
 * - Throw if malformed
 * - Preserve ALL data exactly
 */

export function mapValidationResult(dto: unknown): ValidationResult {
  // Validate top-level structure
  if (!dto || typeof dto !== 'object') {
    throw new Error('Invalid validation result: must be an object');
  }

  const result = dto as Record<string, unknown>;

  // Validate issues array
  if (!Array.isArray(result.issues)) {
    throw new Error('Invalid validation result: issues must be an array');
  }

  // Validate summary
  if (!result.summary || typeof result.summary !== 'object') {
    throw new Error('Invalid validation result: summary is required');
  }

  const summary = result.summary as Record<string, unknown>;

  // Validate summary fields
  if (typeof summary.totalErrors !== 'number') {
    throw new Error('Invalid validation result: summary.totalErrors must be a number');
  }
  if (typeof summary.totalWarnings !== 'number') {
    throw new Error('Invalid validation result: summary.totalWarnings must be a number');
  }
  if (typeof summary.totalInfo !== 'number') {
    throw new Error('Invalid validation result: summary.totalInfo must be a number');
  }
  if (typeof summary.hasAmbiguity !== 'boolean') {
    throw new Error('Invalid validation result: summary.hasAmbiguity must be a boolean');
  }
  if (summary.policyMode !== 'strict' && summary.policyMode !== 'permissive') {
    throw new Error('Invalid validation result: summary.policyMode must be "strict" or "permissive"');
  }

  // Map issues
  const mappedIssues: ValidationIssue[] = result.issues.map((issueDto, index) => {
    return mapValidationIssue(issueDto, index);
  });

  // Return mapped result
  return {
    issues: mappedIssues,
    summary: {
      totalErrors: summary.totalErrors,
      totalWarnings: summary.totalWarnings,
      totalInfo: summary.totalInfo,
      hasAmbiguity: summary.hasAmbiguity,
      policyMode: summary.policyMode,
    },
  };
}

function mapValidationIssue(issueDto: unknown, index: number): ValidationIssue {
  if (!issueDto || typeof issueDto !== 'object') {
    throw new Error(`Invalid issue at index ${index}: must be an object`);
  }

  const issue = issueDto as Record<string, unknown>;

  // Validate source
  if (!isValidationSource(issue.source)) {
    throw new Error(`Invalid issue at index ${index}: source must be one of StructureDefinition, FHIRPath, Reference, Syntax`);
  }

  // Validate severity
  if (!isValidationSeverity(issue.severity)) {
    throw new Error(`Invalid issue at index ${index}: severity must be one of error, warning, info`);
  }

  // Validate required string fields
  if (typeof issue.errorCode !== 'string' || !issue.errorCode) {
    throw new Error(`Invalid issue at index ${index}: errorCode is required and must be a non-empty string`);
  }
  if (typeof issue.path !== 'string' || !issue.path) {
    throw new Error(`Invalid issue at index ${index}: path is required and must be a non-empty string`);
  }
  if (typeof issue.message !== 'string' || !issue.message) {
    throw new Error(`Invalid issue at index ${index}: message is required and must be a non-empty string`);
  }

  // Map to ValidationIssue (preserving all data)
  return {
    source: issue.source,
    severity: issue.severity,
    errorCode: issue.errorCode,
    path: issue.path,
    message: issue.message,
    details: issue.details as Record<string, unknown> | undefined,
  };
}

function isValidationSource(value: unknown): value is ValidationSource {
  return (
    value === 'StructureDefinition' ||
    value === 'FHIRPath' ||
    value === 'Reference' ||
    value === 'Syntax'
  );
}

function isValidationSeverity(value: unknown): value is ValidationSeverity {
  return value === 'error' || value === 'warning' || value === 'info';
}
