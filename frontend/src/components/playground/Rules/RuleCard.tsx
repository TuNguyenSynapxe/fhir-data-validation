import React from 'react';
import { Edit, Trash2, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import type { Rule } from '../../../types/rightPanelProps';

interface RuleCardProps {
  rule: Rule;
  onEdit: (rule: Rule) => void;
  onDelete: (ruleId: string) => void;
}

export const RuleCard: React.FC<RuleCardProps> = ({ rule, onEdit, onDelete }) => {
  const getSeverityIcon = () => {
    switch (rule.severity) {
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default:
        return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const getSeverityColor = () => {
    switch (rule.severity) {
      case 'error':
        return 'border-l-red-500';
      case 'warning':
        return 'border-l-yellow-500';
      default:
        return 'border-l-blue-500';
    }
  };

  return (
    <div className={`border-l-4 ${getSeverityColor()} bg-white p-4 rounded shadow-sm hover:shadow-md transition-shadow`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            {getSeverityIcon()}
            <span className="font-mono text-sm text-gray-600">{rule.id}</span>
            <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-xs rounded">
              {rule.type}
            </span>
          </div>
          
          <div className="space-y-1 text-sm">
            <div>
              <span className="font-semibold">Resource:</span> {rule.resourceType}
            </div>
            <div>
              <span className="font-semibold">Field:</span> <code className="bg-gray-100 px-1 rounded">{rule.fieldPath}</code>
            </div>
            {rule.instanceScope && rule.instanceScope.kind !== 'all' && (
              <div>
                <span className="font-semibold">Scope:</span>{' '}
                {rule.instanceScope.kind === 'first' 
                  ? 'First instance' 
                  : `Filter: ${rule.instanceScope.filter.type}`}
              </div>
            )}
            <div>
              <span className="font-semibold">Message:</span> {rule.message}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => onEdit(rule)}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded"
            title="Edit rule"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(rule.id)}
            className="p-2 text-red-600 hover:bg-red-50 rounded"
            title="Delete rule"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
