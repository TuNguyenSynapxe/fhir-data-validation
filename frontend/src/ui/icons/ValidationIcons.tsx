import {
  XCircleIcon as XCircleIconSolid,
  ExclamationTriangleIcon as ExclamationTriangleIconSolid,
  InformationCircleIcon as InformationCircleIconOutline,
  BeakerIcon as BeakerIconOutline,
  SparklesIcon as SparklesIconOutline,
} from '@heroicons/react/24/solid';

import {
  XCircleIcon as XCircleIconOutline,
  ExclamationTriangleIcon as ExclamationTriangleIconOutline,
} from '@heroicons/react/24/outline';

export type ValidationSource = 
  | 'Firely' 
  | 'ProjectRule' 
  | 'HL7Advisory' 
  | 'Lint' 
  | 'RuleQualityAdvisory';

export type ValidationSeverity = 'error' | 'warning' | 'information' | 'info';

export interface ValidationIconConfig {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  colorClass: string;
  label: string;
}

/**
 * Get the appropriate validation icon configuration based on source and severity.
 * 
 * Mapping rules:
 * 1. FHIR Structural Validation (Firely) - blocking, engine-level
 *    Icon: XCircleIcon (solid), Color: text-red-600
 * 
 * 2. Project Rule - business rule, blocking
 *    Icon: ExclamationTriangleIcon (solid for error, outline for warning), Color: text-red-500
 * 
 * 3. HL7 Advisory - spec guidance, non-blocking
 *    Icon: InformationCircleIcon (outline), Color: text-amber-500
 * 
 * 4. Lint / Best-effort - heuristic, portability
 *    Icon: BeakerIcon (outline), Color: text-blue-500
 * 
 * 5. Rule Quality Advisory - authoring guidance
 *    Icon: SparklesIcon (outline), Color: text-indigo-500
 */
export function getValidationIcon(
  source: ValidationSource | string,
  severity?: ValidationSeverity | string
): ValidationIconConfig {
  const isError = severity === 'error';
  
  switch (source) {
    case 'Firely':
      return {
        icon: XCircleIconSolid,
        colorClass: 'text-red-600',
        label: 'FHIR Structural Validation Error'
      };
    
    case 'ProjectRule':
      return {
        icon: isError ? ExclamationTriangleIconSolid : ExclamationTriangleIconOutline,
        colorClass: 'text-red-500',
        label: isError ? 'Project Rule Error' : 'Project Rule Warning'
      };
    
    case 'HL7Advisory':
      return {
        icon: InformationCircleIconOutline,
        colorClass: 'text-amber-500',
        label: 'HL7 Advisory'
      };
    
    case 'Lint':
      return {
        icon: BeakerIconOutline,
        colorClass: 'text-blue-500',
        label: 'Lint / Best Practice'
      };
    
    case 'RuleQualityAdvisory':
      return {
        icon: SparklesIconOutline,
        colorClass: 'text-indigo-500',
        label: 'Rule Quality Advisory'
      };
    
    default:
      // Fallback for unknown sources
      return {
        icon: isError ? XCircleIconOutline : InformationCircleIconOutline,
        colorClass: isError ? 'text-red-500' : 'text-gray-500',
        label: 'Validation Issue'
      };
  }
}

/**
 * Render a validation icon with appropriate styling and accessibility attributes.
 */
export function ValidationIcon({
  source,
  severity,
  className = 'h-5 w-5',
  title,
}: {
  source: ValidationSource | string;
  severity?: ValidationSeverity | string;
  className?: string;
  title?: string;
}) {
  const config = getValidationIcon(source, severity);
  const Icon = config.icon;
  
  return (
    <span title={title || config.label}>
      <Icon
        className={`${config.colorClass} ${className}`}
        aria-hidden="true"
      />
    </span>
  );
}
