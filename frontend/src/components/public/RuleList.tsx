import type { RuleDefinition } from '../../types/public-validation';
import { Shield, AlertTriangle, FileText } from 'lucide-react';

interface RuleListProps {
  rules: RuleDefinition[];
  title?: string;
  showStats?: boolean;
}

export function RuleList({ rules, title, showStats = true }: RuleListProps) {
  const mustFixCount = rules.filter(
    (r) => r.enforcement === 'MUST_FIX'
  ).length;
  const recommendedCount = rules.filter(
    (r) => r.enforcement === 'RECOMMENDED'
  ).length;

  return (
    <div className="space-y-4">
      {title && (
        <div>
          <h2 className="text-xl font-semibold mb-1">{title}</h2>
          {showStats && (
            <p className="text-sm text-gray-600">
              {rules.length} rules • {mustFixCount} must fix •{' '}
              {recommendedCount} recommended
            </p>
          )}
        </div>
      )}

      {rules.length === 0 ? (
        <div className="text-center py-8 text-gray-500 border border-gray-200 rounded-lg">
          <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>No rules defined for this project</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule, index) => (
            <RuleCard key={rule.id || index} rule={rule} />
          ))}
        </div>
      )}
    </div>
  );
}

interface RuleCardProps {
  rule: RuleDefinition;
}

export function RuleCard({ rule }: RuleCardProps) {
  const isMustFix = rule.enforcement === 'MUST_FIX';

  return (
    <div
      className={`border rounded-lg p-4 ${
        isMustFix
          ? 'border-red-200 bg-red-50'
          : 'border-yellow-200 bg-yellow-50'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          {isMustFix ? (
            <Shield className="w-5 h-5 text-red-600" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
          )}
          <span
            className={`px-2 py-1 rounded text-xs font-semibold uppercase ${
              isMustFix
                ? 'bg-red-600 text-white'
                : 'bg-yellow-600 text-white'
            }`}
          >
            {isMustFix ? 'Must Fix' : 'Recommended'}
          </span>
        </div>
        <span className="text-xs text-gray-500 font-mono">{rule.id}</span>
      </div>

      {/* Message */}
      {rule.message && (
        <p className="text-sm font-medium text-gray-900 mb-2">
          {rule.message}
        </p>
      )}

      {/* Applies To */}
      <div className="space-y-2">
        {rule.appliesToResourceType && (
          <div className="text-sm">
            <span className="font-semibold text-gray-700">Resource Type:</span>
            <span className="ml-2 font-mono text-gray-900">
              {rule.appliesToResourceType}
            </span>
          </div>
        )}
        {rule.appliesTo && (
          <div className="text-sm">
            <span className="font-semibold text-gray-700">Applies To:</span>
            <code className="ml-2 bg-white px-2 py-1 rounded text-xs border border-gray-300">
              {rule.appliesTo}
            </code>
          </div>
        )}
      </div>

      {/* Rule Type & Parameters */}
      <div className="mt-3 pt-3 border-t border-gray-300">
        <div className="text-sm">
          <span className="font-semibold text-gray-700">Rule Type:</span>
          <span className="ml-2 text-gray-900">{rule.ruleType}</span>
        </div>
        {rule.parameters && Object.keys(rule.parameters).length > 0 && (
          <div className="mt-2">
            <span className="text-sm font-semibold text-gray-700">
              Parameters:
            </span>
            <div className="mt-1 space-y-1">
              {Object.entries(rule.parameters).map(([key, value]) => (
                <div key={key} className="text-sm flex items-start gap-2">
                  <span className="font-mono text-gray-600 min-w-24">
                    {key}:
                  </span>
                  <span className="text-gray-900">
                    {formatParameterValue(value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Hint */}
      {rule.hint && (
        <div className="mt-3 pt-3 border-t border-gray-300 text-sm text-gray-700 italic">
          💡 {rule.hint}
        </div>
      )}
    </div>
  );
}

function formatParameterValue(value: any): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean')
    return String(value);
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object' && value !== null) {
    return JSON.stringify(value, null, 2);
  }
  return String(value);
}
