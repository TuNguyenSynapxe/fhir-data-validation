import React, { useState } from 'react';
import { ExternalLink, Copy, Check } from 'lucide-react';
import { ChevronDownIcon, ChevronUpIcon, SparklesIcon, InformationCircleIcon, BeakerIcon } from '@heroicons/react/24/outline';
import RuleExplainabilityPanel from '../../rules/RuleExplainabilityPanel';
import type { RuleReviewIssue } from '../../../playground/rule-review';
import { formatRuleReviewMessage, formatRuleReviewTitle, formatRuleReviewSuggestion } from '../../../playground/rule-review';
import { isInternalRule } from './ruleHelpers';

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
}

interface RuleCardExpandedProps {
  rule: Rule;
  onEdit?: (rule: Rule) => void;
  onDelete?: (ruleId: string) => void;
  onNavigateToPath?: (path: string) => void;
  isObserved?: boolean;
  advisoryIssues?: RuleReviewIssue[];
  projectBundle?: object;
}

export const RuleCardExpanded: React.FC<RuleCardExpandedProps> = ({
  rule,
  onNavigateToPath,
  advisoryIssues = [],
}) => {
  const [showExplainability, setShowExplainability] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Auto-collapse advisory by default (non-blocking, lower priority)
  const isInternal = isInternalRule(rule);
  const [showAdvisory, setShowAdvisory] = useState(false); // Collapsed by default

  // Determine advisory icon and color based on rule origin
  const getAdvisoryStyle = () => {
    if (isInternal) {
      return {
        Icon: BeakerIcon,
        colorClass: 'text-blue-500',
        bgClass: 'bg-blue-50',
        borderClass: 'border-blue-200',
        label: 'Best-effort check'
      };
    }
    
    if (rule.origin === 'system-suggested') {
      return {
        Icon: InformationCircleIcon,
        colorClass: 'text-amber-500',
        bgClass: 'bg-amber-50',
        borderClass: 'border-amber-200',
        label: 'FHIR recommendation'
      };
    }
    
    return {
      Icon: SparklesIcon,
      colorClass: 'text-indigo-500',
      bgClass: 'bg-indigo-50',
      borderClass: 'border-indigo-200',
      label: 'Rule quality suggestion'
    };
  };

  const advisoryStyle = getAdvisoryStyle();

  const handleCopyPath = async () => {
    try {
      await navigator.clipboard.writeText(rule.path);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleNavigateToField = () => {
    if (onNavigateToPath && rule.path) {
      onNavigateToPath(rule.path);
    }
  };

  return (
    <div className="px-4 pb-4 bg-gray-50 border-t border-gray-200">
      <div className="bg-white rounded-md p-4 space-y-4">
        
        {/* 1. FHIRPath (copyable) */}
        <div>
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">FHIRPath</span>
          <div className="mt-1.5 flex items-center gap-2">
            <code className="flex-1 text-sm font-mono bg-gray-100 px-3 py-1.5 rounded text-gray-900 break-all">
              {rule.resourceType}.{rule.path}
            </code>
            <button
              onClick={handleCopyPath}
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
              title="Copy to clipboard"
            >
              {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            </button>
            {onNavigateToPath && (
              <button
                onClick={handleNavigateToField}
                className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                title="Navigate to field"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* 2. Rule Type + Severity */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Rule Type</span>
            <p className="text-sm text-gray-900 mt-1 font-medium">{rule.type}</p>
          </div>
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Severity</span>
            <p className="text-sm text-gray-900 mt-1 capitalize font-medium">{rule.severity}</p>
          </div>
        </div>

        {/* 3. Message */}
        <div>
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Message</span>
          <p className="text-sm text-gray-900 mt-1.5 leading-relaxed">{rule.message}</p>
        </div>

        {/* 4. Parameters (if any) */}
        {rule.params && Object.keys(rule.params).length > 0 && (
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Parameters</span>
            <div className="mt-1.5 bg-gray-50 rounded-md border border-gray-200 p-3">
              <pre className="text-xs text-gray-800 overflow-x-auto whitespace-pre-wrap break-words">
                {JSON.stringify(rule.params, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* 5. Rule Quality Advisory (if present) - Non-blocking, Collapsed by Default */}
        {advisoryIssues.length > 0 && (
          <div className="pt-3 border-t border-gray-200">
            <button
              onClick={() => setShowAdvisory(!showAdvisory)}
              className={`flex items-center gap-2 text-sm font-medium ${advisoryStyle.colorClass} hover:opacity-80 w-full transition-opacity`}
            >
              {showAdvisory ? (
                <ChevronUpIcon className="w-4 h-4" />
              ) : (
                <ChevronDownIcon className="w-4 h-4" />
              )}
              <advisoryStyle.Icon className="w-4 h-4" />
              <span>{advisoryStyle.label}</span>
              <span className="text-xs text-gray-500 font-normal">({advisoryIssues.length})</span>
              <span className="text-xs text-gray-500 font-normal ml-auto">Non-blocking</span>
            </button>

            {showAdvisory && (
              <div className="mt-3 space-y-3">
                {/* Non-blocking notice */}
                <div className={`p-2.5 rounded ${advisoryStyle.bgClass} ${advisoryStyle.borderClass} border text-xs ${advisoryStyle.colorClass}`}>
                  <p className="font-medium">
                    ℹ️ This does not block validation or rule editing
                  </p>
                  <p className="mt-1 text-gray-700">
                    These are suggestions to help improve rule quality, portability, or adherence to FHIR best practices.
                  </p>
                </div>

                {/* Advisory issues */}
                {advisoryIssues.map((issue, idx) => {
                  const title = formatRuleReviewTitle(issue);
                  const message = formatRuleReviewMessage(issue);
                  const suggestion = formatRuleReviewSuggestion(issue);
                  
                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg border ${advisoryStyle.bgClass} ${advisoryStyle.borderClass}`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-start gap-2">
                          <advisoryStyle.Icon className={`w-4 h-4 ${advisoryStyle.colorClass} flex-shrink-0 mt-0.5`} />
                          <p className={`text-sm font-medium ${advisoryStyle.colorClass}`}>
                            {title}
                          </p>
                        </div>
                        <p className="text-xs text-gray-700 leading-relaxed pl-6">
                          {message}
                        </p>
                        {suggestion && (
                          <div className={`text-xs ${advisoryStyle.colorClass} bg-white rounded px-3 py-2 mt-2 border ${advisoryStyle.borderClass}`}>
                            <span className="font-semibold">Consider:</span> {suggestion}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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
                <ChevronUpIcon className="w-4 h-4" />
              ) : (
                <ChevronDownIcon className="w-4 h-4" />
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
