import React from 'react';
import { RuleGroup } from './RuleGroup';

interface Rule {
  id: string;
  type: string;
  resourceType: string;
  path: string;
  severity: string;
  message: string;
  params?: Record<string, any>;
  origin?: 'manual' | 'system-suggested' | 'ai-suggested';
  explainability?: any;
  enabled?: boolean;
}

interface RuleListProps {
  rules: Rule[];
  onEditRule: (rule: Rule) => void;
  onDeleteRule: (ruleId: string) => void;
  onToggleRule?: (ruleId: string) => void;
  onNavigateToPath?: (path: string) => void;
  groupBy?: 'resourceType' | 'ruleType' | 'none';
  disabled?: boolean;
  getObservationStatus?: (rule: Rule) => boolean;
  showObservationIndicators?: boolean;
}

export const RuleList: React.FC<RuleListProps> = ({
  rules,
  onEditRule,
  onDeleteRule,
  onToggleRule,
  onNavigateToPath,
  groupBy = 'resourceType',
  disabled = false,
  getObservationStatus,
  showObservationIndicators = false,
}) => {
  // Group rules based on groupBy prop
  const groupedRules = React.useMemo(() => {
    if (groupBy === 'none') {
      return { 'All Rules': rules };
    }

    const groups: Record<string, Rule[]> = {};
    
    rules.forEach((rule) => {
      const groupKey = groupBy === 'resourceType' 
        ? rule.resourceType 
        : rule.type;
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(rule);
    });

    return groups;
  }, [rules, groupBy]);

  // Sort groups alphabetically
  const sortedGroupKeys = Object.keys(groupedRules).sort();

  if (rules.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-1">
          <p className="text-sm text-gray-500">No rules defined yet</p>
          <p className="text-xs text-gray-400">Add rules to validate this resource</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {sortedGroupKeys.map((groupKey) => {
        const groupRules = groupedRules[groupKey];
        
        // Further group by rule type within each resource type group
        const subGroups: Record<string, Rule[]> = {};
        groupRules.forEach((rule) => {
          const subGroupKey = `${groupKey} → ${rule.type}`;
          if (!subGroups[subGroupKey]) {
            subGroups[subGroupKey] = [];
          }
          subGroups[subGroupKey].push(rule);
        });

        return Object.keys(subGroups)
          .sort()
          .map((subGroupKey) => (
            <RuleGroup
              key={subGroupKey}
              groupTitle={subGroupKey}
              rules={subGroups[subGroupKey]}
              onEditRule={onEditRule}
              onDeleteRule={onDeleteRule}
              onToggleRule={onToggleRule}
              onNavigateToPath={onNavigateToPath}
              defaultExpanded={false}
              disabled={disabled}
              getObservationStatus={getObservationStatus}
              showObservationIndicators={showObservationIndicators}
            />
          ));
      })}
    </div>
  );
};
