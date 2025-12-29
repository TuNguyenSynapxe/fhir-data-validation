import React, { useState } from 'react';
import { HelpCircle, Lightbulb } from 'lucide-react';
import FhirPathSelectorDrawer from '../../../../rules/FhirPathSelectorDrawer';
import { validatePattern, testPattern, COMMON_PATTERNS } from './PatternRuleHelpers';

/**
 * PATTERN CONFIG SECTION
 * 
 * Rule-specific configuration for Pattern / Regex rules.
 * ONLY handles rule-specific parameters - NO shared UI (resource, scope, severity).
 * 
 * Responsibilities:
 * - Field path selection
 * - Regex pattern input and validation
 * - Pattern options (negate, case sensitive)
 * - Common pattern templates
 * - Pattern test tool
 * 
 * The parent RuleForm handles: resource, scope, severity, errorCode, userHint, preview, save/cancel.
 */

interface PatternConfigSectionProps {
  resourceType: string;
  fieldPath: string;
  pattern: string;
  negate: boolean;
  caseSensitive: boolean;
  onFieldPathChange: (path: string) => void;
  onPatternChange: (pattern: string) => void;
  onNegateChange: (negate: boolean) => void;
  onCaseSensitiveChange: (caseSensitive: boolean) => void;
  errors?: {
    fieldPath?: string;
    pattern?: string;
  };
  projectBundle?: object;
  hl7Samples?: any[];
}

export const PatternConfigSection: React.FC<PatternConfigSectionProps> = ({
  resourceType,
  fieldPath,
  pattern,
  negate,
  caseSensitive,
  onFieldPathChange,
  onPatternChange,
  onNegateChange,
  onCaseSensitiveChange,
  errors = {},
  projectBundle,
  hl7Samples,
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showPatternHelp, setShowPatternHelp] = useState(false);
  const [testValue, setTestValue] = useState('');

  const handlePathSelected = (path: string) => {
    onFieldPathChange(path);
    setIsDrawerOpen(false);
  };

  const handlePatternChange = (value: string) => {
    onPatternChange(value);
  };

  const handleSelectCommonPattern = (commonPattern: typeof COMMON_PATTERNS[number]) => {
    onPatternChange(commonPattern.pattern);
    setShowPatternHelp(false);
  };

  // Test pattern against test value
  const testResult = testValue && pattern
    ? testPattern(pattern, testValue, caseSensitive)
    : null;

  return (
    <div className="space-y-4">
      {/* Field Path Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Field to Validate <span className="text-red-500">*</span>
        </label>
        <button
          type="button"
          onClick={() => setIsDrawerOpen(true)}
          className={`
            w-full px-4 py-3 text-left border rounded-md
            transition-colors
            ${errors.fieldPath
              ? 'border-red-300 bg-red-50'
              : fieldPath
              ? 'border-green-300 bg-green-50 hover:border-green-400'
              : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
            }
          `}
        >
          <div className="flex items-center justify-between">
            <div>
              {fieldPath ? (
                <>
                  <div className="text-sm font-medium text-gray-900">
                    <code className="bg-white px-2 py-0.5 rounded text-xs">{fieldPath}</code>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">Click to change field</div>
                </>
              ) : (
                <div className="text-sm text-gray-500">Click to select a field</div>
              )}
            </div>
            <div className="text-blue-500 text-sm">Select</div>
          </div>
        </button>
        {errors.fieldPath && (
          <p className="mt-1 text-sm text-red-600">{errors.fieldPath}</p>
        )}
      </div>

      {/* Pattern Input with Common Patterns */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">
            Regular Expression Pattern <span className="text-red-500">*</span>
          </label>
          <button
            type="button"
            onClick={() => setShowPatternHelp(!showPatternHelp)}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
          >
            <Lightbulb size={14} />
            {showPatternHelp ? 'Hide' : 'Common patterns'}
          </button>
        </div>

        {showPatternHelp && (
          <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <div className="text-xs font-medium text-blue-900 mb-2">Common Patterns</div>
            <div className="space-y-1">
              {COMMON_PATTERNS.map((cp) => (
                <button
                  key={cp.name}
                  type="button"
                  onClick={() => handleSelectCommonPattern(cp)}
                  className="w-full text-left px-2 py-1.5 text-xs hover:bg-blue-100 rounded transition-colors"
                >
                  <div className="font-medium text-blue-900">{cp.name}</div>
                  <div className="text-blue-700">{cp.description}</div>
                  <code className="text-blue-600 text-[10px]">{cp.pattern}</code>
                </button>
              ))}
            </div>
          </div>
        )}

        <input
          type="text"
          value={pattern}
          onChange={(e) => handlePatternChange(e.target.value)}
          placeholder="^[A-Z0-9]{4,10}$"
          className={`
            w-full px-3 py-2 border rounded-md font-mono text-sm
            ${errors.pattern ? 'border-red-300 bg-red-50' : 'border-gray-300'}
          `}
        />
        {errors.pattern && (
          <p className="mt-1 text-sm text-red-600">{errors.pattern}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">
          JavaScript-compatible regular expression
        </p>
      </div>

      {/* Pattern Options */}
      <div className="space-y-2">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={negate}
            onChange={(e) => onNegateChange(e.target.checked)}
          />
          <span className="text-sm text-gray-700">
            <strong>Negate:</strong> Fail if value <em>matches</em> pattern (instead of not matching)
          </span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={caseSensitive}
            onChange={(e) => onCaseSensitiveChange(e.target.checked)}
          />
          <span className="text-sm text-gray-700">
            <strong>Case sensitive:</strong> Distinguish between uppercase and lowercase
          </span>
        </label>
      </div>

      {/* Pattern Tester */}
      {pattern && (
        <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
          <div className="flex items-center gap-2 mb-2">
            <HelpCircle size={16} className="text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Test Pattern</span>
          </div>
          <input
            type="text"
            value={testValue}
            onChange={(e) => setTestValue(e.target.value)}
            placeholder="Enter test value..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
          {testResult !== null && (
            <div className={`mt-2 text-sm ${testResult ? 'text-green-600' : 'text-red-600'}`}>
              {testResult ? '✓ Matches pattern' : '✗ Does not match pattern'}
            </div>
          )}
        </div>
      )}

      {/* FhirPath Selector Drawer */}
      <FhirPathSelectorDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSelect={handlePathSelected}
        resourceType={resourceType}
        projectBundle={projectBundle}
        hl7Samples={hl7Samples}
      />
    </div>
  );
};
