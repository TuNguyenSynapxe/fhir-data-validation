import React, { useState } from 'react';
import { ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import RuleExplainabilityPanel from '../../RuleExplainabilityPanel';

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
}

interface RuleCardExpandedProps {
  rule: Rule;
  onEdit?: (rule: Rule) => void;
  onDelete?: (ruleId: string) => void;
  onNavigateToPath?: (path: string) => void;
}

export const RuleCardExpanded: React.FC<RuleCardExpandedProps> = ({
  rule,
  onNavigateToPath,
}) => {
  const [showExplainability, setShowExplainability] = useState(false);

  const handleNavigateToField = () => {
    if (onNavigateToPath && rule.path) {
      onNavigateToPath(rule.path);
    }
  };

  return (
    <div className="px-4 pb-4 bg-gray-50 border-t border-gray-200">
      <div className="bg-white rounded-md p-4 space-y-3">
        {/* Rule ID */}
        <div>
          <span className="text-xs font-semibold text-gray-500 uppercase">Rule ID</span>
          <p className="text-sm font-mono text-gray-900 mt-1">{rule.id}</p>
        </div>

        {/* Resource Type */}
        <div>
          <span className="text-xs font-semibold text-gray-500 uppercase">Resource Type</span>
          <p className="text-sm text-gray-900 mt-1">{rule.resourceType}</p>
        </div>

        {/* FHIRPath - Clickable */}
        <div>
          <span className="text-xs font-semibold text-gray-500 uppercase">FHIRPath</span>
          <div className="mt-1">
            {onNavigateToPath && rule.path ? (
              <button
                onClick={handleNavigateToField}
                className="inline-flex items-center gap-2 text-sm font-mono text-blue-600 hover:text-blue-800 hover:underline"
              >
                <code className="bg-blue-50 px-2 py-1 rounded">{rule.path}</code>
                <ExternalLink className="w-3 h-3" />
              </button>
            ) : (
              <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded text-gray-900">
                {rule.path || 'No path'}
              </code>
            )}
          </div>
        </div>

        {/* Severity */}
        <div>
          <span className="text-xs font-semibold text-gray-500 uppercase">Severity</span>
          <p className="text-sm text-gray-900 mt-1 capitalize">{rule.severity}</p>
        </div>

        {/* Message */}
        <div>
          <span className="text-xs font-semibold text-gray-500 uppercase">Message</span>
          <p className="text-sm text-gray-900 mt-1">{rule.message}</p>
        </div>

        {/* Parameters (if any) */}
        {rule.params && Object.keys(rule.params).length > 0 && (
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase">Parameters</span>
            <div className="mt-1 bg-gray-50 rounded p-2">
              <pre className="text-xs text-gray-800 overflow-x-auto">
                {JSON.stringify(rule.params, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* Explainability Section */}
        {rule.explainability && (
          <div className="pt-3 border-t border-gray-200">
            <button
              onClick={() => setShowExplainability(!showExplainability)}
              className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              {showExplainability ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
              Why this rule exists
            </button>

            {showExplainability && (
              <div className="mt-3">
                <RuleExplainabilityPanel
                  explainability={rule.explainability}
                  defaultExpanded={true}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
