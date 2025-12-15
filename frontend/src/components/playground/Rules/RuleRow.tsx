import React, { useState, memo } from 'react';
import { Edit, Trash2, Eye, EyeOff, ChevronDown, ChevronRight } from 'lucide-react';
import { RuleCardExpanded } from './RuleCardExpanded';

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

interface RuleRowProps {
  rule: Rule;
  onEdit: (rule: Rule) => void;
  onDelete: (ruleId: string) => void;
  onToggle?: (ruleId: string) => void;
  onNavigateToPath?: (path: string) => void;
}

const RuleRowComponent: React.FC<RuleRowProps> = ({
  rule,
  onEdit,
  onDelete,
  onToggle,
  onNavigateToPath,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const enabled = rule.enabled !== false;

  const getOriginText = () => {
    const origin = rule.origin || 'manual';
    switch (origin) {
      case 'manual':
        return 'Project';
      case 'system-suggested':
        return 'HL7 Advisory';
      case 'ai-suggested':
        return 'Suggested';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className={`group ${!enabled ? 'opacity-50' : ''}`}>
      {/* Collapsed Row */}
      <div className="flex items-center justify-between px-4 py-1.5 hover:bg-gray-50 transition-colors">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-3 flex-1 text-left cursor-pointer"
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
          )}
          
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <span className="font-mono text-sm font-medium text-gray-900 truncate max-w-md">
              {rule.path || 'No path'}
            </span>
            
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="px-1.5 py-0.5 text-xs text-gray-500 bg-gray-50 rounded">
                {rule.type}
              </span>
              <span className="px-1.5 py-0.5 text-xs text-gray-500 bg-gray-50 rounded">
                {rule.severity}
              </span>
              <span className="px-1.5 py-0.5 text-xs text-gray-500 bg-gray-50 rounded">
                {getOriginText()}
              </span>
            </div>
          </div>
        </button>

        {/* Actions - Hidden by default, shown on hover */}
        <div className="flex items-center gap-0.5 ml-3 opacity-0 group-hover:opacity-100 transition-opacity">
          {onToggle && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggle(rule.id);
              }}
              className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
              title={enabled ? 'Disable rule' : 'Enable rule'}
            >
              {enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(rule);
            }}
            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="Edit rule"
          >
            <Edit className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirm('Are you sure you want to delete this rule?')) {
                onDelete(rule.id);
              }
            }}
            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
            title="Delete rule"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Expanded Card */}
      {isExpanded && (
        <RuleCardExpanded
          rule={rule}
          onEdit={onEdit}
          onDelete={onDelete}
          onNavigateToPath={onNavigateToPath}
        />
      )}
    </div>
  );
};

// Memoize to prevent re-renders on hover of other rows
export const RuleRow = memo(RuleRowComponent, (prevProps, nextProps) => {
  return (
    prevProps.rule.id === nextProps.rule.id &&
    prevProps.rule.enabled === nextProps.rule.enabled &&
    prevProps.rule.path === nextProps.rule.path &&
    prevProps.rule.type === nextProps.rule.type &&
    prevProps.rule.severity === nextProps.rule.severity &&
    prevProps.rule.origin === nextProps.rule.origin
  );
});
