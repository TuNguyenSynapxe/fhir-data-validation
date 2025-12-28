/**
 * Phase 8: Governance types for frontend
 * Structured, no prose
 */

export type RuleReviewStatus = 'OK' | 'WARNING' | 'BLOCKED';

export interface RuleReviewFinding {
  code: string;
  severity: RuleReviewStatus;
  ruleId: string;
  details?: Record<string, any>;
}

export interface RuleReviewResponse {
  status: RuleReviewStatus;
  findings: RuleReviewFinding[];
  project?: any; // ProjectDetail - only present if save succeeded
}
