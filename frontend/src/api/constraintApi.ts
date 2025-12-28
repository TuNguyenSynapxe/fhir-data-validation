/**
 * API client for TerminologyConstraint operations (Phase 3A)
 * Communicates with IConstraintService backend
 * 
 * Design principles:
 * - Non-blocking: errors are returned, not thrown
 * - Last-write-wins: no concurrency control
 * - No referential integrity enforcement (Rule Advisory detects issues)
 */

import httpClient from './httpClient';
import type { TerminologyConstraint, AllowedAnswer } from '../types/terminology';
import {
  wrapTerminologyOperation,
  type TerminologyResult,
} from '../utils/terminologyErrors';

/**
 * Retrieves a TerminologyConstraint by its ID
 */
export async function getConstraintById(
  constraintId: string
): Promise<TerminologyResult<TerminologyConstraint>> {
  return wrapTerminologyOperation(async () => {
    const response = await httpClient.get<TerminologyConstraint>(
      `/api/terminology/constraints/${constraintId}`
    );
    return response.data;
  }, `Get constraint: ${constraintId}`);
}

/**
 * Lists all TerminologyConstraints for a project
 */
export async function listConstraints(
  projectId: string
): Promise<TerminologyResult<TerminologyConstraint[]>> {
  return wrapTerminologyOperation(async () => {
    const response = await httpClient.get<TerminologyConstraint[]>(
      `/api/projects/${projectId}/terminology/constraints`
    );
    return response.data;
  }, `List constraints for project: ${projectId}`);
}

/**
 * Lists TerminologyConstraints filtered by FHIR resource type
 */
export async function listConstraintsByResourceType(
  projectId: string,
  resourceType: string
): Promise<TerminologyResult<TerminologyConstraint[]>> {
  return wrapTerminologyOperation(async () => {
    const response = await httpClient.get<TerminologyConstraint[]>(
      `/api/projects/${projectId}/terminology/constraints`,
      { params: { resourceType } }
    );
    return response.data;
  }, `List constraints for resource type: ${resourceType}`);
}

/**
 * Lists TerminologyConstraints that reference a specific CodeSystem
 * Useful for detecting which constraints might be affected by CodeSystem changes
 */
export async function listConstraintsByCodeSystem(
  projectId: string,
  codeSystemUrl: string
): Promise<TerminologyResult<TerminologyConstraint[]>> {
  return wrapTerminologyOperation(async () => {
    const response = await httpClient.get<TerminologyConstraint[]>(
      `/api/projects/${projectId}/terminology/constraints`,
      { params: { codeSystemUrl } }
    );
    return response.data;
  }, `List constraints for CodeSystem: ${codeSystemUrl}`);
}

/**
 * Saves a TerminologyConstraint (create or overwrite)
 * Last-write-wins: no concurrency checking
 * Does NOT validate references (Rule Advisory detects broken references)
 */
export async function saveConstraint(
  projectId: string,
  constraint: TerminologyConstraint
): Promise<TerminologyResult<void>> {
  return wrapTerminologyOperation(async () => {
    await httpClient.post(
      `/api/projects/${projectId}/terminology/constraints`,
      constraint
    );
  }, `Save constraint: ${constraint.id}`);
}

/**
 * Deletes a TerminologyConstraint by its ID
 */
export async function deleteConstraint(
  projectId: string,
  constraintId: string
): Promise<TerminologyResult<boolean>> {
  return wrapTerminologyOperation(async () => {
    const response = await httpClient.delete(
      `/api/projects/${projectId}/terminology/constraints/${constraintId}`
    );
    return response.status === 200 || response.status === 204;
  }, `Delete constraint: ${constraintId}`);
}

/**
 * Helper: Validates TerminologyConstraint before save
 * Returns validation errors (if any)
 */
export function validateConstraint(
  constraint: TerminologyConstraint
): string[] {
  const errors: string[] = [];

  if (!constraint.id || constraint.id.trim() === '') {
    errors.push('Constraint ID is required');
  }

  if (!constraint.resourceType || constraint.resourceType.trim() === '') {
    errors.push('Resource type is required');
  }

  if (!constraint.path || constraint.path.trim() === '') {
    errors.push('FHIRPath expression is required');
  }

  if (!constraint.constraintType) {
    errors.push('Constraint type is required');
  }

  if (
    constraint.constraintType === 'binding' &&
    !constraint.bindingStrength
  ) {
    errors.push('Binding strength is required for binding constraints');
  }

  if (!constraint.allowedAnswers || constraint.allowedAnswers.length === 0) {
    errors.push('At least one allowed answer is required');
  }

  // Validate allowed answers
  constraint.allowedAnswers.forEach((answer, index) => {
    if (!answer.system || answer.system.trim() === '') {
      errors.push(`Allowed answer ${index + 1}: System is required`);
    }
    if (!answer.code || answer.code.trim() === '') {
      errors.push(`Allowed answer ${index + 1}: Code is required`);
    }
  });

  return errors;
}

/**
 * Helper: Checks if an AllowedAnswer already exists in the constraint
 */
export function hasAllowedAnswer(
  constraint: TerminologyConstraint,
  system: string,
  code: string
): boolean {
  return constraint.allowedAnswers.some(
    (answer) => answer.system === system && answer.code === code
  );
}

/**
 * Helper: Adds an AllowedAnswer to a constraint (immutable)
 * Returns a new constraint with the added answer
 */
export function addAllowedAnswer(
  constraint: TerminologyConstraint,
  answer: AllowedAnswer
): TerminologyConstraint {
  // Check for duplicate
  if (hasAllowedAnswer(constraint, answer.system, answer.code)) {
    return constraint;
  }

  return {
    ...constraint,
    allowedAnswers: [...constraint.allowedAnswers, answer],
  };
}

/**
 * Helper: Removes an AllowedAnswer from a constraint (immutable)
 * Returns a new constraint with the answer removed
 */
export function removeAllowedAnswer(
  constraint: TerminologyConstraint,
  system: string,
  code: string
): TerminologyConstraint {
  return {
    ...constraint,
    allowedAnswers: constraint.allowedAnswers.filter(
      (answer) => !(answer.system === system && answer.code === code)
    ),
  };
}

/**
 * Helper: Updates an AllowedAnswer in a constraint (immutable)
 * Returns a new constraint with the answer updated
 */
export function updateAllowedAnswer(
  constraint: TerminologyConstraint,
  oldSystem: string,
  oldCode: string,
  newAnswer: AllowedAnswer
): TerminologyConstraint {
  return {
    ...constraint,
    allowedAnswers: constraint.allowedAnswers.map((answer) =>
      answer.system === oldSystem && answer.code === oldCode
        ? newAnswer
        : answer
    ),
  };
}
