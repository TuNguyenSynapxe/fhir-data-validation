import React from 'react';
import { AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';
import { HelpTooltip } from '../../common/HelpTooltip';

interface ValidationIssueExplanation {
  what: string;
  how?: string;
  confidence: 'high' | 'medium' | 'low';
}

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
  explanation?: ValidationIssueExplanation;
}

interface LintIssueCardProps {
  error: ValidationError;
  onClick?: () => void;
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
 * Extension tooltip content
 */
const EXTENSION_TOOLTIP = {
  title: 'Extension-related issue',
  body: `Extensions often require profiles to validate correctly.\nWithout profiles, only the base FHIR schema is checked.`,
  footer: '',
};

/**
 * Extract readable headline from LINT message
 */
const extractHeadline = (message: string, details?: Record<string, any>): string => {
  const propertyName = details?.propertyName || details?.property;
  
  if (propertyName && (message.includes('does not exist') || message.includes('is not defined'))) {
    return `Unknown field: ${propertyName}`;
  } else if (message.includes('expected') && message.includes('array')) {
    return `Field should be an array${propertyName ? `: ${propertyName}` : ''}`;
  } else if (message.includes('expected') && message.includes('object')) {
    return `Field should be an object${propertyName ? `: ${propertyName}` : ''}`;
  }
  
  return message.split('.')[0];
};

/**
 * Generate plain English explanation based on error code
 */
const getExplanation = (errorCode?: string): string => {
  switch (errorCode) {
    case 'UNKNOWN_ELEMENT':
      return 'This field is not defined in the FHIR R4 specification.';
    case 'LINT_EXPECTED_ARRAY':
      return 'According to the FHIR specification, this field should contain multiple values (array).';
    case 'LINT_EXPECTED_OBJECT':
      return 'According to the FHIR specification, this field should contain a single value (object).';
    default:
      return 'This may cause portability issues across different FHIR servers.';
  }
};

/**
 * Check if error is extension-related
 */
const isExtensionRelated = (path?: string): boolean => {
  const pathToCheck = path || '';
  return pathToCheck.includes('.extension') || pathToCheck.includes('.modifierExtension');
};

export const LintIssueCard: React.FC<LintIssueCardProps> = ({ error, onClick }) => {
  const [showDetails, setShowDetails] = React.useState(false);
  
  const headline = extractHeadline(error.message, error.details);
  const explanation = getExplanation(error.errorCode);
  const fhirPath = error.details?.fhirPath || error.path;
  const isExtension = isExtensionRelated(error.path);

  return (
    <div
      className="p-3 hover:bg-amber-50/50 cursor-pointer transition-colors border-l-4 border-l-amber-400"
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        {/* Warning icon - always yellow/amber for LINT */}
        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Headline */}
          <p className="text-sm font-medium text-gray-900 mb-1">
            {headline}
          </p>

          {/* FHIR Path - secondary line */}
          {fhirPath && (
            <p className="text-xs text-gray-600 mb-1">
              FHIR path: <code className="font-mono text-gray-800">{fhirPath}</code>
            </p>
          )}

          {/* Plain English explanation */}
          <p className="text-xs text-gray-600 mb-2 italic">
            {explanation}
          </p>

          {/* Structured explanation - HIDDEN */}
          {/* {error.explanation && (
            <div className="mt-3 border-t border-amber-200 pt-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowExplanation(!showExplanation);
                }}
                className="flex items-center justify-between gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors w-full"
              >
                <div className="flex items-center gap-2">
                  {showExplanation ? (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  )}
                  <InformationCircleIcon className="w-4 h-4 text-blue-600" />
                  <span>What is this?</span>
                </div>
                {getConfidenceBadge(error.explanation.confidence)}
              </button>

              {showExplanation && (
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

          {/* 
          {/* Badges row */}
          <div className="flex items-center gap-2 flex-wrap mb-2">
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

            {/* Extension badge if applicable */}
            {isExtension && (
              <div className="flex items-center gap-1">
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  Extension-related
                </span>
                <HelpTooltip 
                  title={EXTENSION_TOOLTIP.title}
                  body={EXTENSION_TOOLTIP.body}
                  footer={EXTENSION_TOOLTIP.footer}
                />
              </div>
            )}

            {/* Error code */}
            {error.errorCode && (
              <span className="text-xs text-gray-500 font-mono">
                {error.errorCode}
              </span>
            )}

            {/* Resource type */}
            {error.resourceType && (
              <span className="text-xs text-gray-600">
                {error.resourceType}
              </span>
            )}
          </div>

          {/* Collapsible technical details */}
          {error.details && Object.keys(error.details).length > 0 && (
            <div className="mt-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDetails(!showDetails);
                }}
                className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-800 transition-colors"
              >
                {showDetails ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
                Show technical details
              </button>

              {showDetails && (
                <div className="mt-2 p-2 bg-gray-50 rounded border border-gray-200">
                  <pre className="text-xs font-mono text-gray-700 whitespace-pre-wrap">
                    {JSON.stringify(error.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
