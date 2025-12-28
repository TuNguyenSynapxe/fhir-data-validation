import React from 'react';
import { RuleReviewBadge } from './RuleReviewBadge';
import type { RuleReviewStatus } from './RuleReviewBadge';
import { AlertCircle } from 'lucide-react';

export interface RuleReviewFinding {
  code: string;
  severity: RuleReviewStatus;
  ruleId: string;
  details?: Record<string, any>;
}

interface RuleReviewSummaryProps {
  findings: RuleReviewFinding[];
}

/**
 * Phase 8: Governance findings summary
 * Groups findings by severity, displays structured facts only
 * NO prose generation - uses structured details
 */
export const RuleReviewSummary: React.FC<RuleReviewSummaryProps> = ({
  findings,
}) => {
  if (findings.length === 0) {
    return (
      <div className="flex items-center gap-2 text-green-700 bg-green-50 p-3 rounded border border-green-300">
        <RuleReviewBadge status="OK" size="sm" showLabel={false} />
        <span className="font-medium">No governance issues detected</span>
      </div>
    );
  }

  // Group by severity
  const grouped = findings.reduce((acc, finding) => {
    if (!acc[finding.severity]) {
      acc[finding.severity] = [];
    }
    acc[finding.severity].push(finding);
    return acc;
  }, {} as Record<RuleReviewStatus, RuleReviewFinding[]>);

  const severityOrder: RuleReviewStatus[] = ['BLOCKED', 'WARNING', 'OK'];

  return (
    <div className="space-y-3">
      {severityOrder.map((severity) => {
        const items = grouped[severity];
        if (!items || items.length === 0) return null;

        return (
          <div key={severity} className="space-y-2">
            <div className="flex items-center gap-2">
              <RuleReviewBadge status={severity} size="sm" />
              <span className="text-sm text-gray-600">
                {items.length} {items.length === 1 ? 'issue' : 'issues'}
              </span>
            </div>

            <div className="space-y-1 ml-4 border-l-2 border-gray-200 pl-3">
              {items.map((finding, idx) => (
                <FindingItem key={idx} finding={finding} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const FindingItem: React.FC<{ finding: RuleReviewFinding }> = ({ finding }) => {
  return (
    <div className="text-sm space-y-1">
      <div className="flex items-start gap-2">
        <AlertCircle className="w-4 h-4 mt-0.5 text-gray-500 flex-shrink-0" />
        <div className="flex-1">
          <div className="font-mono text-xs text-gray-600">{finding.code}</div>
          <div className="text-gray-700">
            Rule: <span className="font-mono text-xs">{finding.ruleId}</span>
          </div>
          {finding.details && Object.keys(finding.details).length > 0 && (
            <div className="mt-1 text-xs text-gray-600">
              <div className="font-medium">Details:</div>
              <ul className="list-disc list-inside pl-2 space-y-0.5">
                {Object.entries(finding.details).map(([key, value]) => (
                  <li key={key}>
                    <span className="font-mono">{key}</span>:{' '}
                    <span className="font-mono">{JSON.stringify(value)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
