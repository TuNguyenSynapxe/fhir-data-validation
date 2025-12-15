import React, { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';
import { HelpTooltip } from '../../common/HelpTooltip';

interface ValidationError {
  source: string;
  severity: string;
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
}

interface GroupedLintIssueCardProps {
  errors: ValidationError[];
  errorCode: string;
  resourceType?: string;
  onClick?: (error: ValidationError) => void;
}

/**
 * LINT tooltip content
 */
const LINT_TOOLTIP = {
  title: 'What is LINT?',
  body: `LINT checks detect portability and interoperability issues based on the official FHIR specification.
Some FHIR engines (including Firely) are permissive and may still accept this payload.
Other FHIR servers may reject it.`,
  footer: 'Final validation is always performed by the FHIR engine.',
};

/**
 * Get group headline based on error code
 */
const getGroupHeadline = (errorCode: string, count: number): string => {
  switch (errorCode) {
    case 'UNKNOWN_ELEMENT':
      return `${count} unknown field${count > 1 ? 's' : ''} detected`;
    case 'LINT_EXPECTED_ARRAY':
      return `${count} field${count > 1 ? 's' : ''} should be array${count > 1 ? 's' : ''}`;
    case 'LINT_EXPECTED_OBJECT':
      return `${count} field${count > 1 ? 's' : ''} should be object${count > 1 ? 's' : ''}`;
    default:
      return `${count} LINT issue${count > 1 ? 's' : ''}`;
  }
};

/**
 * GroupedLintIssueCard Component
 * 
 * Groups multiple LINT errors with the same error code and resource type.
 */
export const GroupedLintIssueCard: React.FC<GroupedLintIssueCardProps> = ({ 
  errors, 
  errorCode, 
  resourceType,
  onClick 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const headline = getGroupHeadline(errorCode, errors.length);

  return (
    <div className="p-3 hover:bg-amber-50/50 cursor-pointer transition-colors border-l-4 border-l-amber-400">
      <div className="flex items-start gap-3">
        {/* Warning icon */}
        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Group headline */}
          <div 
            className="flex items-center gap-2 mb-2"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-600" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-600" />
            )}
            <p className="text-sm font-medium text-gray-900">
              {headline}
            </p>
          </div>

          {/* Badges row */}
          <div className="flex items-center gap-2 flex-wrap mb-2 ml-6">
            {/* LINT badge with info tooltip */}
            <div className="flex items-center gap-1">
              <span className="text-xs px-2 py-0.5 rounded-full border bg-amber-100 text-amber-800 border-amber-300">
                LINT
              </span>
              <HelpTooltip 
                title={LINT_TOOLTIP.title}
                body={LINT_TOOLTIP.body}
                footer={LINT_TOOLTIP.footer}
              />
            </div>

            {/* Error code */}
            <span className="text-xs text-gray-500 font-mono">
              {errorCode}
            </span>

            {/* Resource type */}
            {resourceType && (
              <span className="text-xs text-gray-600">
                {resourceType}
              </span>
            )}

            {/* Count badge */}
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
              {errors.length} issue{errors.length > 1 ? 's' : ''}
            </span>
          </div>

          {/* Expandable list of individual errors */}
          {isExpanded && (
            <div className="ml-6 mt-3 space-y-2">
              {errors.map((error, index) => {
                const displayPath = error.path || error.navigation?.breadcrumb || 'Unknown';
                const jsonPointer = error.jsonPointer || error.navigation?.jsonPointer;
                const propertyName = error.details?.propertyName || error.details?.property;
                
                return (
                  <div
                    key={index}
                    className="p-2 bg-amber-50/50 rounded border border-amber-200 hover:bg-amber-100/50 transition-colors cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      onClick?.(error);
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        {propertyName && (
                          <p className="text-xs font-medium text-gray-800 mb-1">
                            {propertyName}
                          </p>
                        )}
                        {fhirPath && (
                          <code className="text-xs font-mono text-gray-600 break-all">
                            {fhirPath}
                          </code>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
