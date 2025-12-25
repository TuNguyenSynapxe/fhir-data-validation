import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { RuleRow } from './RuleRow';
import type { RuleReviewIssue } from '../../../playground/rule-review';

interface Rule {
  id: string;
  type: string;
  resourceType: string;
  path: string;
  severity: string;
  message: string;
  params?: Record<string, any>;
  origin?: string; // Compatible with AddRuleModal and RulesPanel
  explainability?: any;
  isMessageCustomized?: boolean;
}

interface RuleGroupProps {
  groupTitle: string;
  rules: Rule[];
  onEditRule: (rule: Rule) => void;
  onDeleteRule: (ruleId: string) => void;
  onToggleRule?: (ruleId: string) => void;
  onNavigateToPath?: (path: string) => void;
  defaultExpanded?: boolean;
  getObservationStatus?: (rule: Rule) => boolean;
  showObservationIndicators?: boolean;
  getAdvisoryIssues?: (ruleId: string) => RuleReviewIssue[];
  projectBundle?: object;
  forceExpanded?: boolean | null;
}

export const RuleGroup: React.FC<RuleGroupProps> = ({
  groupTitle,
  rules,
  onEditRule,
  onDeleteRule,
  onToggleRule,
  onNavigateToPath,
  defaultExpanded = false,
  getObservationStatus,
  showObservationIndicators = false,
  getAdvisoryIssues,
  projectBundle,
  forceExpanded,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  
  // Apply forced expansion/collapse when forceExpanded changes
  React.useEffect(() => {
    if (forceExpanded !== null && forceExpanded !== undefined) {
      setIsExpanded(forceExpanded);
    }
  }, [forceExpanded]);

  return (
    <div className="mb-3">
      {/* Group Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-1 bg-gray-50 hover:bg-gray-100 transition-colors rounded-t-md border-b border-gray-200 cursor-pointer"
      >
        <div className="flex items-center gap-1.5">
          {isExpanded ? (
            <ChevronDown className="w-3 h-3 text-gray-400" />
          ) : (
            <ChevronRight className="w-3 h-3 text-gray-400" />
          )}
          <span className="font-medium text-xs text-gray-700">{groupTitle}</span>
          <span className="text-xs text-gray-400">({rules.length})</span>
        </div>
      </button>

      {/* Group Content */}
      {isExpanded && (
        <div className="border border-t-0 border-gray-200 rounded-b-md bg-white">
          {rules.map((rule, index) => (
            <div
              key={rule.id}
              className={index < rules.length - 1 ? 'border-b border-gray-100' : ''}
            >
              <RuleRow
                rule={rule}
                onEdit={onEditRule}
                onDelete={onDeleteRule}
                onToggle={onToggleRule}
                onNavigateToPath={onNavigateToPath}
                isObserved={showObservationIndicators && getObservationStatus ? getObservationStatus(rule) : undefined}
                advisoryIssues={getAdvisoryIssues ? getAdvisoryIssues(rule.id) : []}
                projectBundle={projectBundle}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
