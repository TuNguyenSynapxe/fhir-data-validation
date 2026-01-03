import { AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react';
import type { ValidationResponse, ValidationIssue } from '../../types/public-validation';

interface ValidationResultPanelProps {
  result: ValidationResponse;
}

export function ValidationResultPanel({ result }: ValidationResultPanelProps) {
  const { summary, byPhase } = result;

  // Group issues by enforcement
  const mustFixIssues: ValidationIssue[] = [];
  const recommendedIssues: ValidationIssue[] = [];

  Object.values(byPhase).forEach((phaseIssues) => {
    phaseIssues?.forEach((issue: ValidationIssue) => {
      if (issue.enforcement === 'MUST_FIX') {
        mustFixIssues.push(issue);
      } else {
        recommendedIssues.push(issue);
      }
    });
  });

  const isValid = summary.totalErrors === 0;

  return (
    <div className="space-y-6">
      {/* Summary Header */}
      <div
        className={`p-4 rounded-lg border-2 ${
          isValid
            ? 'bg-green-50 border-green-300'
            : 'bg-red-50 border-red-300'
        }`}
      >
        <div className="flex items-center gap-3">
          {isValid ? (
            <CheckCircle2 className="w-6 h-6 text-green-600" />
          ) : (
            <AlertCircle className="w-6 h-6 text-red-600" />
          )}
          <div>
            <h2 className="text-lg font-semibold">
              {isValid ? 'Validation Passed' : 'Validation Failed'}
            </h2>
            <p className="text-sm text-gray-600">
              {summary.totalErrors} errors, {summary.totalWarnings} warnings
              {' • '}
              {summary.byEnforcement.mustFix} must fix,{' '}
              {summary.byEnforcement.recommended} recommended
            </p>
          </div>
        </div>
      </div>

      {/* Must Fix Issues */}
      {mustFixIssues.length > 0 && (
        <div className="border border-red-200 rounded-lg">
          <div className="bg-red-50 px-4 py-3 border-b border-red-200">
            <h3 className="font-semibold text-red-900 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Must Fix ({mustFixIssues.length})
            </h3>
            <p className="text-sm text-red-700 mt-1">
              These issues violate structural or business rules and must be resolved
            </p>
          </div>
          <div className="p-4 space-y-3">
            {mustFixIssues.map((issue, index) => (
              <ValidationIssueCard key={index} issue={issue} />
            ))}
          </div>
        </div>
      )}

      {/* Recommended Issues */}
      {recommendedIssues.length > 0 && (
        <div className="border border-yellow-200 rounded-lg">
          <div className="bg-yellow-50 px-4 py-3 border-b border-yellow-200">
            <h3 className="font-semibold text-yellow-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Recommended ({recommendedIssues.length})
            </h3>
            <p className="text-sm text-yellow-700 mt-1">
              Advisory hints and best practice suggestions
            </p>
          </div>
          <div className="p-4 space-y-3">
            {recommendedIssues.map((issue, index) => (
              <ValidationIssueCard key={index} issue={issue} />
            ))}
          </div>
        </div>
      )}

      {/* No Issues */}
      {mustFixIssues.length === 0 && recommendedIssues.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-500" />
          <p className="font-medium">No validation issues found</p>
        </div>
      )}
    </div>
  );
}

interface ValidationIssueCardProps {
  issue: ValidationIssue;
}

function ValidationIssueCard({ issue }: ValidationIssueCardProps) {
  const severityColor =
    issue.severity === 'error'
      ? 'text-red-700 bg-red-50'
      : 'text-yellow-700 bg-yellow-50';

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`px-2 py-0.5 rounded text-xs font-medium uppercase ${severityColor}`}
            >
              {issue.severity}
            </span>
            <span className="text-xs text-gray-500 uppercase">
              {issue.phase}
            </span>
            {issue.errorCode && (
              <span className="text-xs text-gray-400 font-mono">
                {issue.errorCode}
              </span>
            )}
          </div>
          {issue.path && (
            <div className="text-sm font-mono text-gray-600 bg-gray-50 px-2 py-1 rounded">
              {issue.path}
            </div>
          )}
          {issue.jsonPointer && !issue.path && (
            <div className="text-sm font-mono text-gray-600 bg-gray-50 px-2 py-1 rounded">
              {issue.jsonPointer}
            </div>
          )}
        </div>
      </div>

      {/* Message */}
      <p className="text-sm text-gray-900 font-medium mb-1">{issue.message}</p>

      {/* Explanation */}
      {issue.explanation && (
        <p className="text-sm text-gray-600 mt-2 border-l-2 border-gray-300 pl-3">
          {issue.explanation}
        </p>
      )}

      {/* Rule ID */}
      {issue.ruleId && (
        <div className="mt-2 text-xs text-gray-500">
          Rule: <span className="font-mono">{issue.ruleId}</span>
        </div>
      )}
    </div>
  );
}
