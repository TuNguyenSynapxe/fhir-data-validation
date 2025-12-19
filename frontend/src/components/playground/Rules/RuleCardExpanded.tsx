import React, { useState } from 'react';
import { ExternalLink, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
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
  isObserved?: boolean;
}

export const RuleCardExpanded: React.FC<RuleCardExpandedProps> = ({
  rule,
  onNavigateToPath,
  isObserved,
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

        {/* Path Not Found Warning */}
        {isObserved === false && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-900 mb-1">
                  Path Not Found in Bundle
                </p>
                <p className="text-xs text-amber-800 mb-2">
                  The path <code className="font-mono bg-amber-100 px-1 rounded">{rule.resourceType}.{rule.path}</code> does not exist in your current bundle.
                  This rule will not trigger on your sample data.
                </p>
                <p className="text-xs text-amber-700">
                  <span className="font-medium">Note:</span> This is not an error. The rule may apply to:
                </p>
                <ul className="text-xs text-amber-700 list-disc list-inside mt-1 space-y-0.5">
                  <li>Optional fields not present in this submission</li>
                  <li>Future data scenarios you want to validate</li>
                  <li>Fields from templates or reference implementations</li>
                </ul>
              </div>
            </div>
          </div>
        )}

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
