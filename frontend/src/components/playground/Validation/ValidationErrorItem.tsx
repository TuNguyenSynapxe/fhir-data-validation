import React from 'react';
import { AlertCircle, AlertTriangle, Info, MapPin } from 'lucide-react';

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
  } else {
    return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};

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

            {/* Location */}
            {(error.path || error.navigation?.breadcrumb) && (
              <span className="flex items-center gap-1 text-xs text-gray-600">
                <MapPin className="w-3 h-3" />
                {error.navigation?.breadcrumb || error.path}
              </span>
            )}
          </div>

          {/* FHIRPath or JSON Pointer */}
          {(error.path || error.jsonPointer) && (
            <div className="mt-2">
              <code className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded font-mono">
                {error.path || error.jsonPointer}
              </code>
            </div>
          )}

          {/* Details */}
          {error.details && Object.keys(error.details).length > 0 && (
            <div className="text-xs text-gray-600 mt-2 leading-relaxed">
              <pre className="whitespace-pre-wrap">{JSON.stringify(error.details, null, 2)}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
