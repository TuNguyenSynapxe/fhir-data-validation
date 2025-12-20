/**
 * Validation Issue Grouping Utilities
 * 
 * Handles grouping of validation issues by source + code + ruleId.
 * CRITICAL: Preserves individual issue messages within groups.
 */

import type { ValidationError } from '../contexts/project-validation/useProjectValidation';
import type { ValidationIssue, IssueGroup } from '../types/validationIssues';
import { generateIssueId, isIssueBlocking } from '../types/validationIssues';
import { normalizeSource, getLayerMetadata } from './validationLayers';
import { isBlockingError } from './validationOverrides';

/**
 * Convert ValidationError to ValidationIssue
 */
export const convertToIssue = (
  error: ValidationError,
  index: number
): ValidationIssue => {
  const source = normalizeSource(error.source);
  const code = error.errorCode || 'UNKNOWN';
  const path = error.path || error.navigation?.jsonPointer || error.jsonPointer || 'unknown';

  return {
    id: generateIssueId(source, code, path, error.message, index),
    source,
    code,
    message: error.message, // PRESERVE INDIVIDUAL MESSAGE
    severity: (error.severity.toLowerCase() as 'error' | 'warning' | 'info'),
    blocking: isBlockingError(error), // Use isBlockingError which checks severity + metadata
    location: path,
    breadcrumb: error.navigation?.breadcrumb?.split('.'),
    resourceType: error.resourceType,
    ruleId: error.details?.ruleId,
    rulePath: error.details?.path || error.path,
    jsonPointer: error.jsonPointer || error.navigation?.jsonPointer,
    details: error.details,
    navigation: error.navigation,
  };
};

/**
 * Generate group key for stable grouping
 * 
 * Strategy:
 * - Project Rule issues: group by source + ruleId + code
 * - Other issues: group by source + code
 */
const generateGroupKey = (issue: ValidationIssue): string => {
  if (issue.source === 'PROJECT' && issue.ruleId) {
    return `${issue.source}|${issue.ruleId}|${issue.code}`;
  }
  if (issue.source === 'PROJECT' && issue.rulePath) {
    return `${issue.source}|${issue.code}|${issue.rulePath}`;
  }
  return `${issue.source}|${issue.code}`;
};

/**
 * Generate group title
 */
const generateGroupTitle = (source: string, code: string): string => {
  const metadata = getLayerMetadata(source);
  return `${metadata.displayName} — ${code}`;
};

/**
 * Group validation issues
 * 
 * Groups issues by source + code (+ ruleId for PROJECT issues).
 * Threshold: 2+ issues to form a group, otherwise ungrouped.
 * 
 * CRITICAL: Each issue retains its own message field.
 */
export const groupValidationIssues = (
  errors: ValidationError[]
): { grouped: IssueGroup[]; ungrouped: ValidationIssue[] } => {
  // Convert errors to issues
  const issues = errors.map((error, index) => convertToIssue(error, index));

  // Group by key
  const groupMap = new Map<string, ValidationIssue[]>();
  
  issues.forEach(issue => {
    const key = generateGroupKey(issue);
    if (!groupMap.has(key)) {
      groupMap.set(key, []);
    }
    groupMap.get(key)!.push(issue);
  });

  // Separate grouped (2+) from ungrouped (1)
  const grouped: IssueGroup[] = [];
  const ungrouped: ValidationIssue[] = [];

  groupMap.forEach((groupIssues, key) => {
    if (groupIssues.length >= 2) {
      const firstIssue = groupIssues[0];
      const resourceTypes = [...new Set(groupIssues.map(i => i.resourceType).filter(Boolean))];
      
      grouped.push({
        groupId: key,
        source: firstIssue.source,
        code: firstIssue.code,
        title: generateGroupTitle(firstIssue.source, firstIssue.code),
        severity: firstIssue.severity,
        blocking: groupIssues.some(i => isIssueBlocking(i)),
        count: groupIssues.length,
        items: groupIssues, // PRESERVE ALL ITEMS WITH THEIR MESSAGES
        resourceTypes: resourceTypes as string[],
      });
    } else {
      ungrouped.push(...groupIssues);
    }
  });

  return { grouped, ungrouped };
};

/**
 * Check if all messages in a group are identical
 */
export const hasIdenticalMessages = (group: IssueGroup): boolean => {
  if (group.items.length === 0) return true;
  const firstMessage = group.items[0].message;
  return group.items.every(item => item.message === firstMessage);
};
