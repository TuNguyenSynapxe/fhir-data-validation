import React from 'react';
import { ValidationErrorItem } from './ValidationErrorItem';
import { CheckCircle2 } from 'lucide-react';

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

interface ValidationResultListProps {
  errors: ValidationError[];
  onErrorClick?: (error: ValidationError) => void;
}

export const ValidationResultList: React.FC<ValidationResultListProps> = ({ 
  errors, 
  onErrorClick 
}) => {
  if (errors.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <CheckCircle2 className="w-16 h-16 text-green-500 mb-3" />
        <p className="text-sm font-medium text-green-700">Validation Passed</p>
        <p className="text-xs text-gray-500 mt-1">No issues found in your FHIR bundle</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {errors.map((error, index) => (
        <ValidationErrorItem 
          key={`error-${index}-${error.errorCode || 'unknown'}`} 
          error={error} 
          onClick={() => onErrorClick?.(error)}
        />
      ))}
    </div>
  );
};
