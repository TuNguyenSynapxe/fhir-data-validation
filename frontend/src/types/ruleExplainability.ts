/**
 * Rule Explainability Types
 * 
 * Phase 1: Deterministic explainability (NO AI)
 * 
 * CONSTRAINTS:
 * - Read-only
 * - No recalculation
 * - No API calls
 * - No persistence
 * - Human-friendly explanations
 */

import type { ConfidenceLevel } from './ruleTemplate';

/**
 * Rule origin tracking
 */
export type RuleOrigin = 
  | 'manual'          // User-created manually
  | 'system-suggested' // System deterministic suggestion
  | 'ai-suggested';    // Future: AI/ML suggestion

/**
 * Evidence supporting a rule's existence
 */
export interface RuleEvidence {
  type: 'pattern' | 'sample' | 'bundle' | 'template';
  description: string;
  details?: {
    sampleCount?: number;
    resourceCount?: number;
    fieldPath?: string;
    observedValues?: any[];
    occurrenceRate?: number; // 0.0 - 1.0
  };
}

/**
 * Impact summary for a rule
 */
export interface RuleImpact {
  severity: 'blocking' | 'warning' | 'info';
  affectedResourceTypes: string[];
  description: string;
  exampleFailure?: string;
}

/**
 * Complete explainability metadata for a rule
 */
export interface RuleExplainability {
  ruleId?: string;
  origin: RuleOrigin;
  confidence?: ConfidenceLevel;
  numericConfidence?: number; // 0.0 - 1.0 (future use)
  createdAt?: string;
  createdBy?: string; // User ID or "system"
  
  // Evidence chain
  evidence: RuleEvidence[];
  
  // Impact summary
  impact: RuleImpact;
  
  // Plain English summary
  summary: string;
}

/**
 * Helper to determine origin label
 */
export function getOriginLabel(origin: RuleOrigin): string {
  switch (origin) {
    case 'manual':
      return 'Manually Created';
    case 'system-suggested':
      return 'System Suggested';
    case 'ai-suggested':
      return 'AI Suggested';
    default:
      return 'Unknown';
  }
}

/**
 * Helper to determine origin color scheme
 */
export function getOriginColors(origin: RuleOrigin): {
  bg: string;
  text: string;
  border: string;
} {
  switch (origin) {
    case 'manual':
      return {
        bg: 'bg-purple-50',
        text: 'text-purple-700',
        border: 'border-purple-200',
      };
    case 'system-suggested':
      return {
        bg: 'bg-blue-50',
        text: 'text-blue-700',
        border: 'border-blue-200',
      };
    case 'ai-suggested':
      return {
        bg: 'bg-indigo-50',
        text: 'text-indigo-700',
        border: 'border-indigo-200',
      };
    default:
      return {
        bg: 'bg-gray-50',
        text: 'text-gray-700',
        border: 'border-gray-200',
      };
  }
}

/**
 * Helper to get confidence colors
 */
export function getConfidenceColors(confidence: ConfidenceLevel): {
  bg: string;
  text: string;
  border: string;
} {
  switch (confidence) {
    case 'high':
      return {
        bg: 'bg-green-50',
        text: 'text-green-700',
        border: 'border-green-200',
      };
    case 'medium':
      return {
        bg: 'bg-blue-50',
        text: 'text-blue-700',
        border: 'border-blue-200',
      };
    case 'low':
      return {
        bg: 'bg-gray-50',
        text: 'text-gray-700',
        border: 'border-gray-200',
      };
  }
}

/**
 * Helper to get severity icon
 */
export function getSeverityIcon(severity: 'blocking' | 'warning' | 'info'): string {
  switch (severity) {
    case 'blocking':
      return '🚫';
    case 'warning':
      return '⚠️';
    case 'info':
      return 'ℹ️';
  }
}
