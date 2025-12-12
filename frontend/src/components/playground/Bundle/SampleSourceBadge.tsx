import React from 'react';
import type { SampleSource } from '../../../types/fhirSample';

interface SampleSourceBadgeProps {
  source: SampleSource;
  className?: string;
  showTooltip?: boolean;
}

export const SampleSourceBadge: React.FC<SampleSourceBadgeProps> = ({ 
  source, 
  className = '',
  showTooltip = true 
}) => {
  // Only render for HL7 samples
  if (source !== 'HL7') {
    return null;
  }

  const tooltipText = showTooltip 
    ? 'Official HL7 FHIR R4 example\nSource: HL7 FHIR R4 Specification' 
    : undefined;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 ${className}`}
      title={tooltipText}
    >
      HL7
    </span>
  );
};
