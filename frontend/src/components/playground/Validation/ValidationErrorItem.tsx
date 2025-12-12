import React from 'react';
import { AlertCircle, AlertTriangle, Info, MapPin } from 'lucide-react';

interface ValidationError {
  id: string;
  severity: 'error' | 'warning' | 'information';
  source: 'Firely' | 'BusinessRules' | 'CodeMaster' | 'Reference';
  message: string;
  location?: string;
  fhirPath?: string;
  details?: string;
}

interface ValidationErrorItemProps {
  error: ValidationError;
  onClick?: () => void;
}

/**
 * Get severity icon and color
 */
const getSeverityDisplay = (severity: ValidationError['severity']) => {
  switch (severity) {
    case 'error':
      return {
        icon: AlertCircle,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-l-red-500',
      };
    case 'warning':
      return {
        icon: AlertTriangle,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-l-yellow-500',
      };
    case 'information':
      return {
        icon: Info,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-l-blue-500',
      };
    default:
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
const getSourceBadgeColor = (source: ValidationError['source']): string => {
  switch (source) {
    case 'Firely':
      return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'BusinessRules':
      return 'bg-purple-100 text-purple-800 border-purple-300';
    case 'CodeMaster':
      return 'bg-orange-100 text-orange-800 border-orange-300';
    case 'Reference':
      return 'bg-red-100 text-red-800 border-red-300';
    default:
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

            {/* Location */}
            {error.location && (
              <span className="flex items-center gap-1 text-xs text-gray-600">
                <MapPin className="w-3 h-3" />
                {error.location}
              </span>
            )}
          </div>

          {/* FHIRPath */}
          {error.fhirPath && (
            <div className="mt-2">
              <code className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded font-mono">
                {error.fhirPath}
              </code>
            </div>
          )}

          {/* Details */}
          {error.details && (
            <p className="text-xs text-gray-600 mt-2 leading-relaxed">
              {error.details}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
