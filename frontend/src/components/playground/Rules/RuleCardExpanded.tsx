import React, { useState } from 'react';
import { ExternalLink, Copy, Check } from 'lucide-react';
import { ChevronDownIcon, ChevronUpIcon, SparklesIcon, InformationCircleIcon, BeakerIcon } from '@heroicons/react/24/outline';
import RuleExplainabilityPanel from '../../rules/RuleExplainabilityPanel';
import type { RuleReviewIssue } from '../../../playground/rule-review';
import { formatRuleReviewMessage, formatRuleReviewTitle, formatRuleReviewSuggestion } from '../../../playground/rule-review';
import { isInternalRule } from './ruleHelpers';
import type { Rule } from '../../../types/rightPanelProps';

// Rule type descriptions (must match RuleCard.tsx)
const RULE_TYPE_DESCRIPTIONS: Record<string, string> = {
  'FixedValue': 'Enforces an exact value',
  'AllowedValues': 'Restricts allowed values',
  'ArrayLength': 'Enforces array cardinality',
  'Resource': 'Restricts allowed resource types',
  'QuestionAnswer': 'Validates questionnaire-based answers',
  'CodeSystem': 'Enforces terminology binding',
  'Regex': 'Validates against a pattern',
  'Required': 'Enforces field presence',
  'CustomFhirPath': 'Custom FHIRPath expression',
};

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
  const [showTechnicalParams, setShowTechnicalParams] = useState(false);
  
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
      await navigator.clipboard.writeText(rule.path || '');
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

  // Get parameter section title based on rule type
  const getParameterSectionTitle = (): string => {
    const normalizedType = rule.type.toLowerCase().replace(/[^a-z]/g, '');
    
    switch (normalizedType) {
      case 'allowedvalues': return 'Allowed values';
      case 'fixedvalue': return 'Expected value';
      case 'arraylength': return 'Cardinality';
      case 'resource': return 'Allowed resources';
      case 'questionanswer': return 'Questionnaire mapping';
      case 'codesystem': return 'Terminology binding';
      case 'regex': return 'Pattern';
      default: return 'Parameters';
    }
  };

  // Render parameters based on rule type (must match RuleCard.tsx)
  const renderParameters = () => {
    if (!rule.params || Object.keys(rule.params).length === 0) {
      return null;
    }

    // Normalize rule type for comparison
    const normalizedType = rule.type.toLowerCase().replace(/[^a-z]/g, '');

    switch (normalizedType) {
      case 'fixedvalue':
        return (
          <code className="block text-[13px] font-mono bg-gray-50 px-3 py-2 rounded text-gray-900 break-all leading-relaxed">
            {rule.params.value}
          </code>
        );

      case 'allowedvalues':
        return (
          <ul className="list-none space-y-2 pl-0">
            {(rule.params.values || []).map((value: string, idx: number) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-gray-400 mt-0.5">•</span>
                <code className="font-mono text-[13px] bg-gray-50 px-2.5 py-1 rounded text-gray-900">{value}</code>
              </li>
            ))}
          </ul>
        );

      case 'arraylength':
        return (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Minimum</p>
              <p className="text-[14px] text-gray-900 font-semibold">{rule.params.min ?? 0}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Maximum</p>
              <p className="text-[14px] text-gray-900 font-semibold">
                {rule.params.max === '*' ? 'unbounded' : rule.params.max}
              </p>
            </div>
          </div>
        );

      case 'resource':
        return (
          <div>
            <ul className="list-none space-y-2 pl-0">
              {(rule.params.requirements || rule.params.resourceTypes || []).map((rt: any, idx: number) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-gray-400 mt-0.5">•</span>
                  <div className="flex-1">
                    <code className="font-mono text-[13px] bg-gray-50 px-2.5 py-1 rounded font-semibold text-gray-900">{rt.resourceType}</code>
                    {(rt.min !== undefined || rt.max !== undefined) && (
                      <span className="text-xs text-gray-500 ml-2">
                        ({rt.min ?? 0}..{rt.max === '*' ? 'unbounded' : rt.max})
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            {(rule.params.rejectUndeclaredResources === true || rule.params.allowOtherResourceTypes === false) && (
              <p className="text-xs text-gray-500 italic mt-3">
                Other resource types are not allowed
              </p>
            )}
          </div>
        );

      case 'questionanswer':
        return (
          <div className="space-y-3">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Question set</p>
              <code className="block text-[13px] font-mono bg-gray-50 px-3 py-2 rounded text-gray-900 break-all leading-relaxed">
                {rule.params.questionSetId || rule.params.questionnaireId}
              </code>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Question path</p>
              <code className="block text-[13px] font-mono bg-gray-50 px-3 py-2 rounded text-gray-900 break-all leading-relaxed">
                {rule.params.questionPath}
              </code>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Answer path</p>
              <code className="block text-[13px] font-mono bg-gray-50 px-3 py-2 rounded text-gray-900 break-all leading-relaxed">
                {rule.params.answerPath}
              </code>
            </div>
          </div>
        );

      case 'codesystem':
        return (
          <div className="space-y-3">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Code system</p>
              <code className="block text-[13px] font-mono bg-gray-50 px-3 py-2 rounded text-gray-900 break-all leading-relaxed">
                {rule.params.system || rule.params.codeSystem}
              </code>
            </div>
            {rule.params.bindingStrength && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Binding strength</p>
                <p className="text-[13px] text-gray-900 capitalize font-semibold">{rule.params.bindingStrength}</p>
              </div>
            )}
          </div>
        );

      case 'regex':
        return (
          <code className="block text-[13px] font-mono bg-gray-50 px-3 py-2 rounded text-gray-900 break-all leading-relaxed">
            {rule.params.pattern}
          </code>
        );

      default:
        // Unknown rule type - show collapsible technical parameters
        return (
          <div className="space-y-2">
            <button
              onClick={() => setShowTechnicalParams(!showTechnicalParams)}
              className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-800 font-medium"
            >
              {showTechnicalParams ? (
                <ChevronUpIcon className="w-3.5 h-3.5" />
              ) : (
                <ChevronDownIcon className="w-3.5 h-3.5" />
              )}
              Technical Parameters
            </button>
            {showTechnicalParams && (
              <div className="mt-1.5 bg-gray-50 rounded-md border border-gray-200 p-3">
                <pre className="text-xs text-gray-800 overflow-x-auto whitespace-pre-wrap break-words">
                  {JSON.stringify(rule.params, null, 2)}
                </pre>
              </div>
            )}
          </div>
        );
    }
  };

  // Enforcement label (Must Fix / Recommended)
  const enforcementLabel = rule.severity === 'error' ? 'Must Fix' : 'Recommended';
  const enforcementBgColor = rule.severity === 'error' ? 'bg-red-100' : 'bg-amber-100';
  const enforcementTextColor = rule.severity === 'error' ? 'text-red-700' : 'text-amber-700';
  const enforcementBorderColor = rule.severity === 'error' ? 'border-red-200' : 'border-amber-200';

  // Strip trailing dots from path
  const cleanPath = rule.path?.replace(/\.$/, '') || '';
  
  // Check if rule targets resource root (path is empty, resource name only, or just ".")
  const isResourceRoot = !cleanPath || cleanPath === rule.resourceType;
  
  // Get relative path (strip resource name prefix if present)
  const getRelativePath = () => {
    if (isResourceRoot) return '';
    // If path starts with resourceType., strip it
    if (cleanPath.startsWith(rule.resourceType + '.')) {
      return cleanPath.substring(rule.resourceType.length + 1);
    }
    return cleanPath;
  };

  return (
    <div className="px-4 pb-4 bg-gray-50 border-t border-gray-200">
      <div className="bg-white rounded-md p-4 space-y-4">
        
        {/* 1. Enforcement badge only */}
        <div>
          <span className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold uppercase tracking-wide ${enforcementBgColor} ${enforcementTextColor} border ${enforcementBorderColor}`}>
            {enforcementLabel}
          </span>
        </div>

        {/* 2. Applies to - inline format (only for non-root paths) */}
        {!isResourceRoot && (
          <div className="text-sm">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Applies to:</span>{' '}
            <code className="font-mono text-[13px] text-gray-800">{getRelativePath()}</code>
          </div>
        )}

        {/* 3. Rule Type Section */}
        <div className="border-t border-gray-200 pt-4">
          <p className="text-[15px] font-semibold text-gray-800 mb-2">Rule type</p>
          <p className="text-[14px] leading-relaxed">
            <span className="font-semibold text-gray-900">{rule.type}</span>
            {RULE_TYPE_DESCRIPTIONS[rule.type] && (
              <span className="text-[13px] text-gray-600 font-normal"> — {RULE_TYPE_DESCRIPTIONS[rule.type]}</span>
            )}
          </p>
        </div>

        {/* 4. Parameters Section - rule-type-specific title */}
        {rule.params && Object.keys(rule.params).length > 0 && (
          <div className="border-t border-gray-200 pt-4">
            <p className="text-[15px] font-semibold text-gray-800 mb-3">{getParameterSectionTitle()}</p>
            {renderParameters()}
          </div>
        )}

        {/* 5. Hint Section (Optional) */}
        {rule.userHint && (
          <div className="border-t border-gray-200 pt-4">
            <p className="text-[15px] font-semibold text-gray-800 mb-2">Hint</p>
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <p className="text-[13px] text-gray-800 leading-relaxed">{rule.userHint}</p>
            </div>
          </div>
        )}

        {/* 6. Rule Quality Advisory (if present) - Non-blocking, Collapsed by Default */}
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
