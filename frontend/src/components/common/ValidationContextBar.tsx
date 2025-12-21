import React from 'react';
import { AlertCircle, CheckCircle2, XCircle, PlayCircle, Eye, RotateCcw } from 'lucide-react';
import { ValidationState } from '../../types/validationState';
import { useProjectValidationContext } from '../../contexts/project-validation/ProjectValidationContext';

interface ValidationContextBarProps {
  fhirVersion?: string;
  bundleSource?: string;
  validationState: string;
  errorCount?: number;
  warningCount?: number;
  onViewErrors?: () => void;
}

/**
 * Validation Context Bar
 * 
 * Single-line status strip showing validation readiness and actions.
 * Sticky at top of right panel to provide constant context.
 * 
 * NOTE: Uses ProjectValidationContext for runValidation action (Phase-3)
 */
export const ValidationContextBar: React.FC<ValidationContextBarProps> = ({
  fhirVersion = 'R4',
  bundleSource = 'Current',
  validationState,
  errorCount = 0,
  warningCount = 0,
  onViewErrors,
}) => {
  // Get validation action from Context
  const { runValidation } = useProjectValidationContext();
  // Determine status display and styling based on ValidationState
  const getStatusConfig = () => {
    switch (validationState) {
      case ValidationState.NoBundle:
        return {
          icon: <AlertCircle className="w-4 h-4" />,
          label: 'No Bundle',
          color: 'text-gray-500',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
        };
      
      case ValidationState.NotValidated:
        return {
          icon: <AlertCircle className="w-4 h-4" />,
          label: 'Not Validated',
          color: 'text-amber-600',
          bgColor: 'bg-amber-50',
          borderColor: 'border-amber-200',
        };
      
      case ValidationState.Validated:
        return {
          icon: <CheckCircle2 className="w-4 h-4" />,
          label: 'Validated',
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
        };
      
      case ValidationState.Failed:
        return {
          icon: <XCircle className="w-4 h-4" />,
          label: 'Validation Failed',
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
        };
      
      default:
        return {
          icon: <AlertCircle className="w-4 h-4" />,
          label: 'Unknown',
          color: 'text-gray-500',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
        };
    }
  };

  const statusConfig = getStatusConfig();
  const canRunValidation = validationState === ValidationState.NotValidated;
  const canViewErrors = validationState === ValidationState.Failed;
  const canReValidate = validationState === ValidationState.Validated;
  const showActions = canRunValidation || canViewErrors || canReValidate;

  return (
    <div 
      className={`
        sticky top-0 z-10 
        flex items-center justify-between 
        px-4 py-2
        border-b ${statusConfig.borderColor}
        ${statusConfig.bgColor}
        text-xs
      `}
    >
      {/* Left: Context Info */}
      <div className="flex items-center gap-4">
        {/* FHIR Version */}
        <div className="flex items-center gap-1.5 text-gray-700">
          <span className="font-medium">FHIR:</span>
          <span className="font-mono">{fhirVersion}</span>
        </div>

        {/* Separator */}
        <div className="w-px h-4 bg-gray-300" />

        {/* Bundle Source */}
        <div className="flex items-center gap-1.5 text-gray-700">
          <span className="font-medium">Bundle:</span>
          <span>{bundleSource}</span>
        </div>

        {/* Separator */}
        <div className="w-px h-4 bg-gray-300" />

        {/* Validation Status */}
        <div className={`flex items-center gap-1.5 ${statusConfig.color} font-medium`}>
          {statusConfig.icon}
          <span>{statusConfig.label}</span>
          
          {/* Error/Warning counts for Failed state */}
          {validationState === ValidationState.Failed && errorCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-[10px] font-semibold">
              {errorCount} {errorCount === 1 ? 'error' : 'errors'}
              {warningCount > 0 && `, ${warningCount} ${warningCount === 1 ? 'warning' : 'warnings'}`}
            </span>
          )}
          
          {/* Success indicator for Validated state */}
          {validationState === ValidationState.Validated && (
            <span className="ml-1 px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-[10px] font-semibold">
              No errors
            </span>
          )}
        </div>
      </div>

      {/* Right: Actions */}
      {showActions && (
        <div className="flex items-center gap-2">
          {/* NotValidated: Run Validation */}
          {canRunValidation && (
            <button
              onClick={() => runValidation('standard')}
              className="
                inline-flex items-center gap-1.5 
                px-3 py-1 
                text-xs font-medium
                text-white bg-blue-600 
                rounded hover:bg-blue-700 
                transition-colors
              "
            >
              <PlayCircle className="w-3.5 h-3.5" />
              Run Validation
            </button>
          )}

          {/* Failed: View Errors */}
          {canViewErrors && onViewErrors && (
            <button
              onClick={onViewErrors}
              className="
                inline-flex items-center gap-1.5 
                px-3 py-1 
                text-xs font-medium
                text-white bg-red-600 
                rounded hover:bg-red-700 
                transition-colors
              "
            >
              <Eye className="w-3.5 h-3.5" />
              View Errors
            </button>
          )}

          {/* Validated: Re-validate (optional) */}
          {canReValidate && (
            <button
              onClick={() => runValidation('standard')}
              className="
                inline-flex items-center gap-1.5 
                px-3 py-1 
                text-xs font-medium
                text-gray-700 bg-white border border-gray-300
                rounded hover:bg-gray-50 
                transition-colors
              "
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Re-validate
            </button>
          )}
        </div>
      )}
    </div>
  );
};
