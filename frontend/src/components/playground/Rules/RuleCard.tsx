import React, { useState } from 'react';
import { Edit, Trash2, ChevronDown, ChevronRight, HelpCircle } from 'lucide-react';
import type { Rule } from '../../../types/rightPanelProps';

interface RuleCardProps {
  rule: Rule;
  onEdit: (rule: Rule) => void;
  onDelete: (ruleId: string) => void;
}

// Static rule type descriptions (documentation tooltips)
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

export const RuleCard: React.FC<RuleCardProps> = ({ rule, onEdit, onDelete }) => {
  const [showTechnical, setShowTechnical] = useState(false);
  
  // Map severity to enforcement
  const enforcement = rule.severity === 'error' ? 'Must Fix' : 'Recommended';
  const enforcementColor = rule.severity === 'error' ? 'text-red-700' : 'text-amber-700';
  const borderColor = rule.severity === 'error' ? 'border-l-red-500' : 'border-l-amber-500';
  
  // Get rule type display name
  const ruleTypeDisplay = rule.type.charAt(0).toUpperCase() + rule.type.slice(1);
  const ruleTypeDescription = RULE_TYPE_DESCRIPTIONS[ruleTypeDisplay] || 'Custom validation rule';
  
  // Format FHIRPath display
  const fhirPathDisplay = rule.fieldPath 
    ? `${rule.resourceType}.${rule.fieldPath}`
    : rule.path || rule.resourceType;

  // Render parameters based on rule type
  const renderParameters = () => {
    if (!rule.params) return null;

    // Normalize type for comparison (handle AllowedValues, allowedValues, ALLOWEDVALUES, etc.)
    const normalizedType = rule.type.toLowerCase().replace(/[^a-z]/g, '');
    
    switch (normalizedType) {
      case 'fixedvalue':
        return (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Expected value</p>
            <p className="text-sm text-gray-900 font-mono bg-gray-50 px-2 py-1 rounded">
              {String(rule.params.value)}
            </p>
          </div>
        );

      case 'allowedvalues':
        const allowedValues = rule.params.values || [];
        return (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Allowed values</p>
            <ul className="text-sm text-gray-900 space-y-1">
              {allowedValues.map((value: any, idx: number) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-gray-400">•</span>
                  <span className="font-mono">{String(value)}</span>
                </li>
              ))}
            </ul>
          </div>
        );

      case 'arraylength':
        return (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Cardinality</p>
            <div className="text-sm text-gray-900 space-y-1">
              {rule.params.min !== undefined && (
                <div><span className="font-semibold">Minimum:</span> {rule.params.min}</div>
              )}
              {rule.params.max !== undefined && (
                <div><span className="font-semibold">Maximum:</span> {rule.params.max === '*' ? 'unbounded' : rule.params.max}</div>
              )}
            </div>
          </div>
        );

      case 'resource':
        const resources = rule.params.requirements || rule.params.resources || [];
        return (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Allowed resources</p>
            <ul className="text-sm text-gray-900 space-y-1">
              {resources.map((res: any, idx: number) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-gray-400">•</span>
                  <span>
                    {res.resourceType || res.type} <span className="text-gray-500 text-xs">
                      (min: {res.min || 0}, max: {res.max || '*'})
                    </span>
                  </span>
                </li>
              ))}
            </ul>
            {rule.params.rejectUndeclaredResources && (
              <p className="text-xs text-gray-600 italic mt-2">
                Other resource types are not allowed
              </p>
            )}
          </div>
        );

      case 'questionanswer':
        return (
          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">Questionnaire</p>
              <p className="text-sm text-gray-900 font-mono">{rule.params.questionSetId}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">Question path</p>
              <p className="text-sm text-gray-900 font-mono">{rule.params.questionPath}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">Answer path</p>
              <p className="text-sm text-gray-900 font-mono">{rule.params.answerPath}</p>
            </div>
          </div>
        );

      case 'codesystem':
        return (
          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">Code system</p>
              <p className="text-sm text-gray-900 font-mono break-all">{rule.params.system || rule.params.codeSystem}</p>
            </div>
            {rule.params.strength && (
              <div>
                <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">Binding strength</p>
                <p className="text-sm text-gray-900">{rule.params.strength}</p>
              </div>
            )}
          </div>
        );

      case 'regex':
        return (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Pattern</p>
            <p className="text-sm text-gray-900 font-mono bg-gray-50 px-2 py-1 rounded break-all">
              {rule.params.pattern}
            </p>
          </div>
        );

      default:
        // Unknown rule type - show collapsible technical parameters
        return (
          <div className="space-y-2">
            <button
              onClick={() => setShowTechnical(!showTechnical)}
              className="flex items-center gap-2 text-xs font-semibold text-gray-700 uppercase tracking-wide hover:text-gray-900"
            >
              {showTechnical ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              Technical Parameters
            </button>
            {showTechnical && (
              <pre className="text-xs text-gray-700 bg-gray-50 p-2 rounded overflow-auto max-h-32">
                {JSON.stringify(rule.params, null, 2)}
              </pre>
            )}
          </div>
        );
    }
  };

  return (
    <div className={`border-l-4 ${borderColor} bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          {/* Primary title */}
          <h3 className="text-base font-semibold text-gray-900 mb-1">
            {fhirPathDisplay} — {ruleTypeDisplay}
          </h3>
          {/* Secondary meta */}
          <div className="flex items-center gap-3 text-xs text-gray-600">
            <span>
              Enforcement: <span className={`font-semibold ${enforcementColor}`}>{enforcement}</span>
            </span>
            <span className="text-gray-400">·</span>
            <span>Scope: Project</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 ml-4">
          <button
            onClick={() => onEdit(rule)}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="Edit rule"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(rule.id)}
            className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
            title="Delete rule"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content sections */}
      <div className="space-y-4">
        {/* Applies To */}
        <div>
          <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">Applies To</p>
          <p className="text-sm text-gray-900 font-mono bg-gray-50 px-2 py-1 rounded break-all">
            {fhirPathDisplay}
          </p>
        </div>

        {/* Rule Type */}
        <div>
          <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">Rule Type</p>
          <p className="text-sm text-gray-900">
            <span className="font-semibold">{ruleTypeDisplay}</span>
            <span className="text-gray-600"> — {ruleTypeDescription}</span>
          </p>
        </div>

        {/* Parameters */}
        {renderParameters()}

        {/* Hint (only if exists) */}
        {rule.userHint && (
          <div className="p-2.5 bg-blue-50 border border-blue-200 rounded">
            <div className="flex items-start gap-2">
              <HelpCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-blue-900 uppercase tracking-wide mb-1">Hint</p>
                <p className="text-sm text-blue-900">{rule.userHint}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
