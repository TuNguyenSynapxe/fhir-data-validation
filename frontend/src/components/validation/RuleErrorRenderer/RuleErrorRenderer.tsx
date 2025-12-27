import React from 'react';
import { renderErrorMessage } from '../../../constants/errorMessages';
import type { ValidationIssue } from '../../../constants/errorMessages';
import { AlertCircle, AlertTriangle, Info, ChevronRight } from 'lucide-react';

interface RuleErrorRendererProps {
  issue: ValidationIssue;
  verbosity?: 'summary' | 'detailed';
  showPath?: boolean;
  className?: string;
}

/**
 * RULE ERROR RENDERER
 * 
 * Renders validation errors using centralized message mapping.
 * Backend provides errorCode + structured data, this component renders UI.
 * 
 * Features:
 * - Title + summary from ERROR_MESSAGE_MAP
 * - Optional user hint from rule definition
 * - Detailed view with constraints/values
 * - Optional remediation guidance
 * - Smart path display
 */
export const RuleErrorRenderer: React.FC<RuleErrorRendererProps> = ({
  issue,
  verbosity = 'summary',
  showPath = true,
  className = ''
}) => {
  const errorMessage = renderErrorMessage(issue, verbosity);
  const severityDisplay = getSeverityDisplay(issue.severity);
  const Icon = severityDisplay.icon;
  
  return (
    <div className={`border-l-4 ${severityDisplay.borderColor} ${severityDisplay.bgColor} p-4 ${className}`}>
      {/* Header: Icon + Title + Badge */}
      <div className="flex items-start gap-3 mb-2">
        <Icon className={`${severityDisplay.color} mt-0.5 flex-shrink-0`} size={20} />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-gray-900">{errorMessage.title}</h4>
            <span className={`text-xs px-2 py-0.5 rounded ${getSourceBadgeColor(issue.source)}`}>
              {issue.source}
            </span>
          </div>
          
          {/* Summary */}
          <p className="text-sm text-gray-700 mb-2">{errorMessage.summary}</p>
          
          {/* User Hint (if provided) */}
          {errorMessage.userHint && (
            <div className="text-xs text-gray-600 italic mb-2">
              Context: {errorMessage.userHint}
            </div>
          )}
          
          {/* Path (if enabled) */}
          {showPath && issue.path && (
            <div className="text-xs text-gray-500 font-mono mb-2">
              {issue.resourceType && <span className="text-blue-600">{issue.resourceType}</span>}
              {issue.resourceType && ': '}
              {issue.path}
            </div>
          )}
          
          {/* Detailed View */}
          {verbosity === 'detailed' && (
            <>
              {/* Details */}
              {errorMessage.details && errorMessage.details.length > 0 && (
                <div className="mt-3 p-3 bg-white rounded border border-gray-200">
                  <div className="text-xs font-semibold text-gray-700 mb-2">Details</div>
                  <ul className="space-y-1">
                    {errorMessage.details.map((detail, idx) => (
                      <li key={idx} className="text-xs text-gray-600 flex items-start gap-1">
                        <ChevronRight size={12} className="mt-0.5 flex-shrink-0 text-gray-400" />
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Remediation */}
              {errorMessage.remediation && (
                <div className="mt-3 p-3 bg-blue-50 rounded border border-blue-200">
                  <div className="text-xs font-semibold text-blue-900 mb-1">How to fix</div>
                  <p className="text-xs text-blue-800">{errorMessage.remediation}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Get severity icon and styling
 */
function getSeverityDisplay(severity: string) {
  const normalized = severity.toLowerCase();
  
  if (normalized === 'error') {
    return {
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-l-red-500',
    };
  } else if (normalized === 'warning') {
    return {
      icon: AlertTriangle,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-l-yellow-500',
    };
  } else {
    return {
      icon: Info,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-l-blue-500',
    };
  }
}

/**
 * Get source badge styling
 */
function getSourceBadgeColor(source: string): string {
  const normalized = source.toLowerCase();
  
  if (normalized === 'fhir' || normalized === 'firely') {
    return 'bg-purple-100 text-purple-800';
  } else if (normalized === 'business') {
    return 'bg-blue-100 text-blue-800';
  } else if (normalized === 'codemaster') {
    return 'bg-green-100 text-green-800';
  } else if (normalized === 'reference') {
    return 'bg-orange-100 text-orange-800';
  } else {
    return 'bg-gray-100 text-gray-800';
  }
}
