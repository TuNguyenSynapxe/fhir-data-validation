/**
 * API client for Rule Advisory operations (Phase 3A)
 * Communicates with IRuleAdvisoryService backend
 * 
 * Design principles:
 * - Read-only: advisories are generated on-demand, never persisted
 * - Non-blocking: failures return error, never thrown
 * - Informational: advisories do NOT block save operations
 */

import httpClient from './httpClient';
import type { AdvisoryResponse, RuleAdvisory } from '../types/terminology';
import {
  wrapTerminologyOperation,
  type TerminologyResult,
} from '../utils/terminologyErrors';

/**
 * Fetches all Rule Advisories for a project
 * Scans terminology constraints and detects issues like:
 * - CODE_NOT_FOUND: AllowedAnswer references non-existent code
 * - CODESYSTEM_NOT_FOUND: AllowedAnswer references non-existent CodeSystem
 * - DISPLAY_MISMATCH: AllowedAnswer display doesn't match CodeSystem definition
 * - DUPLICATE_CODE: CodeSystem contains duplicate codes
 * - MISSING_DISPLAY: Concept lacks a display name
 */
export async function getAdvisories(
  projectId: string
): Promise<TerminologyResult<AdvisoryResponse>> {
  return wrapTerminologyOperation(async () => {
    const response = await httpClient.get<AdvisoryResponse>(
      `/api/projects/${projectId}/terminology/advisories`
    );
    return response.data;
  }, `Get advisories for project: ${projectId}`);
}

/**
 * Helper: Filters advisories by severity
 */
export function filterBySeverity(
  advisories: RuleAdvisory[],
  severity: 'Error' | 'Warning' | 'Info'
): RuleAdvisory[] {
  return advisories.filter((advisory) => advisory.severity === severity);
}

/**
 * Helper: Groups advisories by advisory code
 * Returns a map of advisory code → array of advisories
 */
export function groupByCode(
  advisories: RuleAdvisory[]
): Map<string, RuleAdvisory[]> {
  const groups = new Map<string, RuleAdvisory[]>();

  advisories.forEach((advisory) => {
    const existing = groups.get(advisory.advisoryCode) || [];
    groups.set(advisory.advisoryCode, [...existing, advisory]);
  });

  return groups;
}

/**
 * Helper: Counts advisories by severity
 */
export function countBySeverity(advisories: RuleAdvisory[]): {
  errors: number;
  warnings: number;
  info: number;
} {
  return advisories.reduce(
    (acc, advisory) => {
      if (advisory.severity === 'Error') acc.errors++;
      else if (advisory.severity === 'Warning') acc.warnings++;
      else if (advisory.severity === 'Info') acc.info++;
      return acc;
    },
    { errors: 0, warnings: 0, info: 0 }
  );
}

/**
 * Helper: Finds advisories affecting a specific constraint
 * Matches by constraintId in context
 */
export function findAdvisoriesForConstraint(
  advisories: RuleAdvisory[],
  constraintId: string
): RuleAdvisory[] {
  return advisories.filter(
    (advisory) => advisory.context.constraintId === constraintId
  );
}

/**
 * Helper: Finds advisories affecting a specific CodeSystem
 * Matches by system in context
 */
export function findAdvisoriesForCodeSystem(
  advisories: RuleAdvisory[],
  codeSystemUrl: string
): RuleAdvisory[] {
  return advisories.filter(
    (advisory) => advisory.context.system === codeSystemUrl
  );
}

/**
 * Helper: Checks if there are blocking errors
 * By design: NO errors are blocking (advisories are informational only)
 * This helper is provided for UI logic (e.g., showing warnings before save)
 */
export function hasBlockingErrors(_advisories: RuleAdvisory[]): boolean {
  // Current design: advisories never block operations
  // This could be changed in the future if certain advisory codes become blocking
  return false;
}

/**
 * Helper: Formats advisory message with context details
 */
export function formatAdvisoryMessage(advisory: RuleAdvisory): string {
  const parts: string[] = [advisory.message];

  if (advisory.context.code) {
    parts.push(`Code: ${advisory.context.code}`);
  }

  if (advisory.context.system) {
    parts.push(`System: ${advisory.context.system}`);
  }

  if (advisory.context.display) {
    parts.push(`Display: "${advisory.context.display}"`);
  }

  return parts.join(' | ');
}

/**
 * Helper: Checks if advisories should trigger a user warning
 * Returns true if there are any errors or warnings (not just info)
 */
export function shouldWarnUser(advisories: RuleAdvisory[]): boolean {
  return advisories.some(
    (advisory) =>
      advisory.severity === 'Error' || advisory.severity === 'Warning'
  );
}
