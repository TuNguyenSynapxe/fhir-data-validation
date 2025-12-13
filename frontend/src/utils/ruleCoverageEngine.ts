/**
 * Rule Coverage Analysis Engine
 * 
 * Deterministic coverage analysis for FHIR R4 validation rules
 * 
 * CONSTRAINTS:
 * - FHIR R4 only
 * - No AI
 * - Pure deterministic logic
 * - No Firely validation
 * - No mutation
 * - No persistence
 */

import type {
  CoverageNode,
  CoverageSummary,
  CoverageContext,
  CoverageAnalysisResult,
  SchemaNode,
  ValidationRule,
  RuleSuggestion,
  MatchType,
  CoverageStatus,
} from '../types/ruleCoverage';

import {
  normalizeFhirPath,
  isExactMatch,
  isWildcardMatch,
  isParentMatch,
} from './fhirPathNormalizer';

/**
 * Analyze coverage of validation rules across schema tree
 * 
 * PURE FUNCTION:
 * - No side effects
 * - No mutation
 * - Deterministic output
 * 
 * @param context - Coverage analysis context
 * @returns Coverage analysis result
 */
export function analyzeCoverage(context: CoverageContext): CoverageAnalysisResult {
  const { resourceType, schemaTree, existingRules, suggestions = [] } = context;

  // Flatten schema tree to list of paths
  const schemaPaths = flattenSchemaTree(schemaTree, resourceType);

  // Build coverage nodes
  const nodes: CoverageNode[] = schemaPaths.map(schemaPath => 
    buildCoverageNode(schemaPath, resourceType, existingRules, suggestions)
  );

  // Calculate summary
  const summary = calculateSummary(nodes);

  return {
    summary,
    nodes,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Flatten schema tree to list of paths
 */
function flattenSchemaTree(nodes: SchemaNode[], resourceType: string, parentPath: string = ''): string[] {
  const paths: string[] = [];

  for (const node of nodes) {
    // Build current path
    const currentPath = parentPath ? `${parentPath}.${node.name}` : node.name;
    
    // Add current node
    paths.push(currentPath);

    // Recursively add children
    if (node.children && node.children.length > 0) {
      paths.push(...flattenSchemaTree(node.children, resourceType, currentPath));
    }
  }

  return paths;
}

/**
 * Build coverage node for a schema path
 */
function buildCoverageNode(
  schemaPath: string,
  resourceType: string,
  existingRules: ValidationRule[],
  suggestions: RuleSuggestion[]
): CoverageNode {
  // Check for rule coverage
  const ruleMatch = findBestRuleMatch(schemaPath, resourceType, existingRules);
  
  // Check for suggestions (only if not already covered)
  const suggestionMatch = !ruleMatch ? findSuggestionMatch(schemaPath, resourceType, suggestions) : null;

  // Determine status based on matches
  let status: CoverageStatus;
  let reason: string;

  if (ruleMatch) {
    status = 'covered';
    reason = `Covered by rule: ${ruleMatch.rulePath} (${ruleMatch.matchType} match)`;
  } else if (suggestionMatch) {
    status = 'suggested';
    reason = `Suggestion available: ${suggestionMatch.suggestionPath}`;
  } else {
    status = 'uncovered';
    reason = 'No validation rule or suggestion';
  }

  const node: CoverageNode = {
    path: normalizeFhirPath(schemaPath, resourceType),
    status,
    matchType: ruleMatch?.matchType,
    reason,
  };

  if (ruleMatch) {
    node.coveredBy = {
      ruleId: ruleMatch.ruleId,
      rulePath: ruleMatch.rulePath,
      matchType: ruleMatch.matchType,
    };
  }

  if (suggestionMatch) {
    node.suggestedBy = {
      suggestionId: suggestionMatch.suggestionId,
      suggestionPath: suggestionMatch.suggestionPath,
    };
  }

  return node;
}

/**
 * Find best matching rule for a schema path
 * Priority: exact > wildcard > parent
 */
function findBestRuleMatch(
  schemaPath: string,
  resourceType: string,
  rules: ValidationRule[]
): { ruleId?: string; rulePath: string; matchType: MatchType } | null {
  // Try exact match first (highest priority)
  for (const rule of rules) {
    if (isExactMatch(rule.fhirPath, schemaPath, resourceType)) {
      return {
        ruleId: rule.id,
        rulePath: rule.fhirPath,
        matchType: 'exact',
      };
    }
  }

  // Try wildcard match second
  for (const rule of rules) {
    if (isWildcardMatch(rule.fhirPath, schemaPath, resourceType)) {
      return {
        ruleId: rule.id,
        rulePath: rule.fhirPath,
        matchType: 'wildcard',
      };
    }
  }

  // Try parent match last (lowest priority)
  for (const rule of rules) {
    if (isParentMatch(rule.fhirPath, schemaPath, resourceType)) {
      return {
        ruleId: rule.id,
        rulePath: rule.fhirPath,
        matchType: 'parent',
      };
    }
  }

  return null;
}

/**
 * Find matching suggestion for a schema path
 */
function findSuggestionMatch(
  schemaPath: string,
  resourceType: string,
  suggestions: RuleSuggestion[]
): { suggestionId: string; suggestionPath: string } | null {
  for (const suggestion of suggestions) {
    const suggestionPath = suggestion.preview.fhirPath;
    
    if (
      isExactMatch(suggestionPath, schemaPath, resourceType) ||
      isWildcardMatch(suggestionPath, schemaPath, resourceType) ||
      isParentMatch(suggestionPath, schemaPath, resourceType)
    ) {
      return {
        suggestionId: suggestion.id,
        suggestionPath,
      };
    }
  }

  return null;
}

/**
 * Calculate coverage summary statistics
 */
function calculateSummary(nodes: CoverageNode[]): CoverageSummary {
  const totalNodes = nodes.length;
  const coveredNodes = nodes.filter(n => n.status === 'covered').length;
  const suggestedNodes = nodes.filter(n => n.status === 'suggested').length;
  const uncoveredNodes = nodes.filter(n => n.status === 'uncovered').length;

  const exactMatches = nodes.filter(n => n.matchType === 'exact').length;
  const wildcardMatches = nodes.filter(n => n.matchType === 'wildcard').length;
  const parentMatches = nodes.filter(n => n.matchType === 'parent').length;

  const coveragePercentage = totalNodes > 0 
    ? Math.round((coveredNodes / totalNodes) * 100) 
    : 0;

  return {
    totalNodes,
    coveredNodes,
    suggestedNodes,
    uncoveredNodes,
    coveragePercentage,
    exactMatches,
    wildcardMatches,
    parentMatches,
  };
}

/**
 * Get coverage node for a specific path
 */
export function getCoverageNode(
  result: CoverageAnalysisResult,
  path: string
): CoverageNode | undefined {
  return result.nodes.find(node => node.path === path);
}

/**
 * Get all uncovered nodes
 */
export function getUncoveredNodes(result: CoverageAnalysisResult): CoverageNode[] {
  return result.nodes.filter(node => node.status === 'uncovered');
}

/**
 * Get all suggested nodes
 */
export function getSuggestedNodes(result: CoverageAnalysisResult): CoverageNode[] {
  return result.nodes.filter(node => node.status === 'suggested');
}

/**
 * Get all covered nodes
 */
export function getCoveredNodes(result: CoverageAnalysisResult): CoverageNode[] {
  return result.nodes.filter(node => node.status === 'covered');
}

/**
 * Get nodes by match type
 */
export function getNodesByMatchType(
  result: CoverageAnalysisResult,
  matchType: MatchType
): CoverageNode[] {
  return result.nodes.filter(node => node.matchType === matchType);
}
