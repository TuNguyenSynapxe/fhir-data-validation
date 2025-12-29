import React from 'react';
import { AlertCircle, CheckCircle2, HelpCircle } from 'lucide-react';

/**
 * SHARED RULE PREVIEW PANEL
 * 
 * Shows example runtime error preview for the current rule configuration.
 * Driven by rule definition - same component for ALL rule types.
 * 
 * RULE: This component is the SINGLE source of truth for runtime preview UI.
 * DO NOT create rule-specific preview variants.
 */

interface RulePreviewPanelProps {
  resourceType: string;
  errorCode: string;
  severity: 'error' | 'warning' | 'information';
  fieldPath?: string;
  userHint?: string;
  className?: string;
  collapsed?: boolean;
  onToggle?: () => void;
}

export const RulePreviewPanel: React.FC<RulePreviewPanelProps> = ({
  resourceType,
  errorCode,
  severity,
  fieldPath,
  userHint,
  className = '',
  collapsed = false,
  onToggle,
}) => {
  const severityIcon = {
    error: AlertCircle,
    warning: AlertCircle,
    information: HelpCircle,
  }[severity];

  const SeverityIcon = severityIcon;

  const severityColor = {
    error: 'text-red-600',
    warning: 'text-yellow-600',
    information: 'text-blue-600',
  }[severity];

  if (collapsed && onToggle) {
    return (
      <div className={className}>
        <button
          type="button"
          onClick={onToggle}
          className="w-full px-4 py-2 text-left border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-gray-400" />
              <span className="text-sm text-gray-600">Show error preview</span>
            </div>
            <span className="text-xs text-blue-600">Expand</span>
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className={className}>
      {onToggle && (
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">
            Error Preview
          </label>
          <button
            type="button"
            onClick={onToggle}
            className="text-xs text-blue-600 hover:text-blue-700"
          >
            Collapse
          </button>
        </div>
      )}
      
      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
        <div className="flex items-start gap-3">
          <SeverityIcon size={20} className={severityColor} />
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-sm font-semibold text-gray-900">{errorCode}</span>
              {userHint && (
                <span className="text-xs text-gray-600">— {userHint}</span>
              )}
            </div>
            <div className="text-xs text-gray-700 mb-2">
              <strong>Resource:</strong> {resourceType}
              {fieldPath && (
                <>
                  <br />
                  <strong>Path:</strong> <code className="bg-white px-1 rounded">{fieldPath}</code>
                </>
              )}
            </div>
            <div className="text-xs text-gray-500 italic">
              This is how the error will appear to users at runtime
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
