import React from 'react';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { formatSmartPath, getScopedSegments, convertToJsonPath } from '../../../utils/smartPathFormatting';
import { SmartPathBreadcrumb } from './SmartPathBreadcrumb';
import { PathInfoTooltip } from './PathInfoTooltip';

interface ValidationIssueExplanation {
  what: string;
  how?: string;
  confidence: 'high' | 'medium' | 'low';
}

interface ValidationError {
  source: string; // FHIR, Business, CodeMaster, Reference
  severity: string; // error, warning, info
  resourceType?: string;
  path?: string;
  jsonPointer?: string;
  errorCode?: string;
  message: string;
  details?: Record<string, any>;
  navigation?: {
    jsonPointer?: string;
    breadcrumb?: string;
    resourceIndex?: number;
  };
  explanation?: ValidationIssueExplanation;
}

interface ValidationErrorItemProps {
  error: ValidationError;
  onClick?: () => void;
}

/**
 * Get severity icon and color
 */
const getSeverityDisplay = (severity: string) => {
  const normalizedSeverity = severity.toLowerCase();
  
  if (normalizedSeverity === 'error') {
    return {
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-l-red-500',
    };
  } else if (normalizedSeverity === 'warning') {
    return {
      icon: AlertTriangle,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-l-yellow-500',
    };
  } else if (normalizedSeverity === 'info' || normalizedSeverity === 'information') {
    return {
      icon: Info,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-l-blue-500',
    };
  } else {
    return {
      icon: Info,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      borderColor: 'border-l-gray-500',
    };
  }
};

/**
 * Get source badge color
 */
const getSourceBadgeColor = (source: string): string => {
  const normalizedSource = source.toLowerCase();
  
  if (normalizedSource === 'fhir' || normalizedSource === 'firely') {
    return 'bg-blue-100 text-blue-800 border-blue-300';
  } else if (normalizedSource === 'business' || normalizedSource === 'businessrules') {
    return 'bg-purple-100 text-purple-800 border-purple-300';
  } else if (normalizedSource === 'codemaster') {
    return 'bg-orange-100 text-orange-800 border-orange-300';
  } else if (normalizedSource === 'reference') {
    return 'bg-red-100 text-red-800 border-red-300';
  } else if (normalizedSource === 'lint') {
    return 'bg-amber-100 text-amber-800 border-amber-300';
  } else if (normalizedSource === 'spec_hint' || normalizedSource === 'spechint') {
    return 'bg-cyan-100 text-cyan-800 border-cyan-300';
  } else {
    return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};

/**
 * ValidationErrorItem Component
 * 
 * Generic error card for Firely, Business Rules, CodeMaster, and Reference errors.
 * NOTE: LINT errors are handled by LintIssueCard component.
 */
export const ValidationErrorItem: React.FC<ValidationErrorItemProps> = ({ 
  error, 
  onClick 
}) => {
  const display = getSeverityDisplay(error.severity);
  const Icon = display.icon;

  return (
    <div
      className={`p-3 hover:bg-gray-50 cursor-pointer transition-colors border-l-4 ${display.borderColor}`}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        {/* Severity icon */}
        <Icon className={`w-4 h-4 ${display.color} flex-shrink-0 mt-0.5`} />

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Message */}
          <p className="text-sm font-medium text-gray-900 mb-1">
            {error.message}
          </p>

          {/* Location and source */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Source badge */}
            <span className={`text-xs px-2 py-0.5 rounded-full border ${getSourceBadgeColor(error.source)}`}>
              {error.source}
            </span>

            {/* Severity badge */}
            <span className={`text-xs px-2 py-0.5 rounded-full ${display.bgColor} ${display.color} capitalize`}>
              {error.severity}
            </span>

            {/* Error Code */}
            {error.errorCode && (
              <span className="text-xs text-gray-600 font-mono">
                {error.errorCode}
              </span>
            )}

            {/* Resource Type */}
            {error.resourceType && (
              <span className="text-xs text-gray-600">
                {error.resourceType}
              </span>
            )}
          </div>

          {/* FHIRPath - Smart Breadcrumb */}
          {(error.path || error.jsonPointer) && (
            <div className="group/row mt-2 p-2.5 bg-gray-50/50 rounded-md border border-gray-200/60 hover:bg-gray-50/80 transition-all">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <SmartPathBreadcrumb
                    resourceType={error.resourceType}
                    segments={getScopedSegments(
                      formatSmartPath(error.path || error.jsonPointer || '', error.resourceType).segments,
                      error.resourceType
                    )}
                    fullPath={error.path}
                    onNavigate={onClick}
                  />
                </div>
                
                {/* Path Info Tooltip */}
                <PathInfoTooltip
                  fhirPath={error.path || error.jsonPointer || ''}
                  jsonPath={convertToJsonPath(error.jsonPointer || error.navigation?.jsonPointer)}
                />
              </div>
            </div>
          )}

          {/* Details */}
          {error.details && Object.keys(error.details).length > 0 && (
            <div className="text-xs text-gray-600 mt-2 leading-relaxed">
              <pre className="whitespace-pre-wrap">{JSON.stringify(error.details, null, 2)}</pre>
            </div>
          )}

          {/* Explanation Section - HIDDEN */}
          {/* {error.explanation && (
            <div className="mt-3 border-t border-gray-200 pt-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExplanationExpanded(!isExplanationExpanded);
                }}
                className="flex items-center justify-between gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors w-full"
              >
                <div className="flex items-center gap-2">
                  {isExplanationExpanded ? (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  )}
                  <InformationCircleIcon className="w-4 h-4 text-blue-600" />
                  <span>What is this?</span>
                </div>
                {getConfidenceBadge(error.explanation.confidence)}
              </button>

              {isExplanationExpanded && (
                <div className="mt-2 space-y-3 pl-6">
                  <div className="text-sm text-gray-700 leading-relaxed bg-blue-50/50 p-3 rounded-md border border-blue-100">
                    {error.explanation.what}
                  </div>

                  {error.explanation.how && (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <WrenchScrewdriverIcon className="w-4 h-4 text-green-600" />
                        <span>How to fix</span>
                      </div>
                      <div className="text-sm text-gray-700 leading-relaxed bg-green-50/50 p-3 rounded-md border border-green-100 whitespace-pre-line">
                        {error.explanation.how}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )} */}
        </div>
      </div>
    </div>
  );
};
