import { useState } from 'react';
import { 
  ChevronDown, 
  ChevronRight, 
  AlertCircle, 
  AlertTriangle, 
  Shield, 
  Info,
  FileSearch,
  X
} from 'lucide-react';

// Lint Issue type matching backend LintIssue.cs
export interface LintIssue {
  ruleId: string;
  category: string;
  severity: string;
  confidence: string;
  title: string;
  description: string;
  message: string;
  disclaimer?: string;
  resourceType?: string;
  jsonPointer?: string;
  fhirPath?: string;
  details?: Record<string, unknown>;
}

interface LintExplainabilityPanelProps {
  lintIssues: LintIssue[];
  fhirVersion?: string;
  onClose: () => void;
}

interface GroupedIssues {
  [category: string]: {
    [severity: string]: LintIssue[];
  };
}

export default function LintExplainabilityPanel({ 
  lintIssues, 
  fhirVersion,
  onClose 
}: LintExplainabilityPanelProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedIssues, setExpandedIssues] = useState<Set<string>>(new Set());

  // Group issues by category and severity
  const groupedIssues = lintIssues.reduce<GroupedIssues>((acc, issue, index) => {
    const category = issue.category || 'Other';
    const severity = issue.severity || 'error';
    
    if (!acc[category]) {
      acc[category] = {};
    }
    if (!acc[category][severity]) {
      acc[category][severity] = [];
    }
    
    // Add unique index for expandable tracking
    acc[category][severity].push({ ...issue, details: { ...issue.details, _index: index } });
    return acc;
  }, {});

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const toggleIssue = (issueKey: string) => {
    setExpandedIssues(prev => {
      const next = new Set(prev);
      if (next.has(issueKey)) {
        next.delete(issueKey);
      } else {
        next.add(issueKey);
      }
      return next;
    });
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'error':
        return <AlertCircle className="text-red-500" size={16} />;
      case 'warning':
        return <AlertTriangle className="text-yellow-500" size={16} />;
      case 'info':
        return <Info className="text-blue-500" size={16} />;
      default:
        return <AlertCircle className="text-gray-500" size={16} />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'error':
        return 'bg-red-50 border-red-200 text-red-900';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-900';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-900';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-900';
    }
  };

  const getConfidenceBadge = (confidence: string) => {
    const colors = {
      high: 'bg-green-100 text-green-800 border-green-300',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      low: 'bg-orange-100 text-orange-800 border-orange-300',
    };
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border ${colors[confidence as keyof typeof colors] || colors.medium}`}>
        <Shield size={12} />
        {confidence} confidence
      </span>
    );
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'json':
        return '📄';
      case 'structure':
        return '🏗️';
      case 'schemashape':
        return '📐';
      case 'primitive':
        return '🔢';
      case 'compatibility':
        return '🔄';
      default:
        return '📋';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'json':
        return 'bg-purple-100 border-purple-300 text-purple-900';
      case 'structure':
        return 'bg-blue-100 border-blue-300 text-blue-900';
      case 'schemashape':
        return 'bg-indigo-100 border-indigo-300 text-indigo-900';
      case 'primitive':
        return 'bg-pink-100 border-pink-300 text-pink-900';
      case 'compatibility':
        return 'bg-teal-100 border-teal-300 text-teal-900';
      default:
        return 'bg-gray-100 border-gray-300 text-gray-900';
    }
  };

  const totalIssues = lintIssues.length;
  const errorCount = lintIssues.filter(i => i.severity === 'error').length;
  const warningCount = lintIssues.filter(i => i.severity === 'warning').length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b-2 border-blue-300 bg-blue-50">
          <div className="flex items-center gap-3">
            <FileSearch className="text-blue-600" size={28} />
            <div>
              <h2 className="text-xl font-bold text-blue-900">
                Lint Pre-Validation Report
              </h2>
              <p className="text-sm text-blue-700 mt-0.5">
                Best-effort checks • Firely remains the final authority
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-blue-400 hover:text-blue-600 transition-colors"
            aria-label="Close lint panel"
          >
            <X size={24} />
          </button>
        </div>

        {/* Summary Stats */}
        <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div className="bg-white rounded-lg p-3 border border-blue-200">
              <div className="text-blue-600 font-medium">Total Issues</div>
              <div className="text-2xl font-bold text-blue-900">{totalIssues}</div>
            </div>
            <div className="bg-white rounded-lg p-3 border border-red-200">
              <div className="text-red-600 font-medium">Errors</div>
              <div className="text-2xl font-bold text-red-900">{errorCount}</div>
            </div>
            <div className="bg-white rounded-lg p-3 border border-yellow-200">
              <div className="text-yellow-600 font-medium">Warnings</div>
              <div className="text-2xl font-bold text-yellow-900">{warningCount}</div>
            </div>
            <div className="bg-white rounded-lg p-3 border border-purple-200">
              <div className="text-purple-600 font-medium">FHIR Version</div>
              <div className="text-2xl font-bold text-purple-900">{fhirVersion || 'N/A'}</div>
            </div>
          </div>

          {/* Important Notice */}
          <div className="mt-4 bg-amber-50 border border-amber-300 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="text-amber-600 flex-shrink-0 mt-0.5" size={16} />
              <div className="text-sm text-amber-900">
                <strong className="font-semibold">Non-blocking validation:</strong> These lint checks are best-effort pre-validations to help identify potential issues early. 
                They do <strong>not</strong> replace or override Firely's authoritative FHIR validation.
                Always review Firely errors for final validation results.
              </div>
            </div>
          </div>
        </div>

        {/* Issues by Category */}
        <div className="flex-1 overflow-y-auto p-4">
          {Object.keys(groupedIssues).length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <Shield className="text-green-500 mb-4" size={64} />
              <h3 className="text-xl font-semibold text-green-900 mb-2">
                No Lint Issues Found
              </h3>
              <p className="text-green-700">
                All best-effort pre-validation checks passed successfully.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedIssues).map(([category, severityGroups]) => {
                const isExpanded = expandedCategories.has(category);
                const categoryIssueCount = Object.values(severityGroups).flat().length;

                return (
                  <div key={category} className="border rounded-lg overflow-hidden">
                    {/* Category Header */}
                    <button
                      onClick={() => toggleCategory(category)}
                      className={`w-full flex items-center justify-between p-4 border-2 ${getCategoryColor(category)} hover:opacity-80 transition-opacity`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{getCategoryIcon(category)}</span>
                        <div className="text-left">
                          <h3 className="text-lg font-bold capitalize">
                            {category}
                          </h3>
                          <p className="text-sm opacity-75">
                            {categoryIssueCount} issue{categoryIssueCount !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      {isExpanded ? <ChevronDown size={24} /> : <ChevronRight size={24} />}
                    </button>

                    {/* Category Content */}
                    {isExpanded && (
                      <div className="bg-white p-4 space-y-4">
                        {Object.entries(severityGroups).map(([severity, issues]) => (
                          <div key={severity} className="space-y-2">
                            <div className="flex items-center gap-2 mb-3">
                              {getSeverityIcon(severity)}
                              <h4 className="font-semibold capitalize text-gray-700">
                                {severity} ({issues.length})
                              </h4>
                            </div>

                            {issues.map((issue) => {
                              const issueKey = `${category}-${severity}-${issue.details?._index}`;
                              const isIssueExpanded = expandedIssues.has(issueKey);

                              return (
                                <div
                                  key={issueKey}
                                  className={`border rounded-lg overflow-hidden ${getSeverityColor(severity)}`}
                                >
                                  {/* Issue Header */}
                                  <button
                                    onClick={() => toggleIssue(issueKey)}
                                    className="w-full flex items-start justify-between p-3 hover:bg-opacity-70 transition-colors text-left"
                                  >
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="font-bold text-sm font-mono">
                                          {issue.ruleId}
                                        </span>
                                        {getConfidenceBadge(issue.confidence)}
                                      </div>
                                      <h5 className="font-semibold text-base mb-1">
                                        {issue.title}
                                      </h5>
                                      <p className="text-sm opacity-90 line-clamp-1">
                                        {issue.message}
                                      </p>
                                    </div>
                                    <div className="ml-4 flex-shrink-0">
                                      {isIssueExpanded ? (
                                        <ChevronDown size={20} />
                                      ) : (
                                        <ChevronRight size={20} />
                                      )}
                                    </div>
                                  </button>

                                  {/* Issue Details */}
                                  {isIssueExpanded && (
                                    <div className="p-4 bg-white border-t space-y-3">
                                      {/* Description */}
                                      <div>
                                        <h6 className="font-semibold text-gray-700 mb-1">
                                          Description
                                        </h6>
                                        <p className="text-sm text-gray-600">
                                          {issue.description}
                                        </p>
                                      </div>

                                      {/* Paths */}
                                      <div className="grid grid-cols-2 gap-3">
                                        {issue.resourceType && (
                                          <div>
                                            <h6 className="font-semibold text-gray-700 mb-1 text-sm">
                                              Resource Type
                                            </h6>
                                            <code className="text-xs bg-gray-100 px-2 py-1 rounded border border-gray-300 block">
                                              {issue.resourceType}
                                            </code>
                                          </div>
                                        )}
                                        {issue.jsonPointer && (
                                          <div>
                                            <h6 className="font-semibold text-gray-700 mb-1 text-sm">
                                              JSON Pointer
                                            </h6>
                                            <code className="text-xs bg-gray-100 px-2 py-1 rounded border border-gray-300 block overflow-x-auto">
                                              {issue.jsonPointer}
                                            </code>
                                          </div>
                                        )}
                                      </div>

                                      {issue.fhirPath && (
                                        <div>
                                          <h6 className="font-semibold text-gray-700 mb-1 text-sm">
                                            FHIR Path
                                          </h6>
                                          <code className="text-xs bg-blue-50 px-2 py-1 rounded border border-blue-300 block overflow-x-auto">
                                            {issue.fhirPath}
                                          </code>
                                        </div>
                                      )}

                                      {/* Additional Details */}
                                      {issue.details && Object.keys(issue.details).filter(k => k !== '_index').length > 0 && (
                                        <div>
                                          <h6 className="font-semibold text-gray-700 mb-1 text-sm">
                                            Additional Context
                                          </h6>
                                          <div className="bg-gray-50 rounded border border-gray-300 p-2 space-y-1">
                                            {Object.entries(issue.details)
                                              .filter(([key]) => key !== '_index')
                                              .map(([key, value]) => (
                                                <div key={key} className="text-xs">
                                                  <span className="font-semibold text-gray-700">
                                                    {key}:
                                                  </span>{' '}
                                                  <span className="text-gray-600">
                                                    {typeof value === 'object' 
                                                      ? JSON.stringify(value) 
                                                      : String(value)}
                                                  </span>
                                                </div>
                                              ))}
                                          </div>
                                        </div>
                                      )}

                                      {/* Disclaimer */}
                                      {issue.disclaimer && (
                                        <div className="bg-blue-50 border border-blue-300 rounded p-3">
                                          <div className="flex items-start gap-2">
                                            <Info className="text-blue-600 flex-shrink-0 mt-0.5" size={14} />
                                            <p className="text-xs text-blue-900">
                                              <strong className="font-semibold">Note:</strong> {issue.disclaimer}
                                            </p>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-blue-200 bg-blue-50">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-blue-700">
              <Shield size={16} />
              <span className="font-medium">Read-only visualization • No rule editing from this panel</span>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
