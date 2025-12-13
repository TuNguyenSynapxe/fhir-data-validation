import React from 'react';
import type { ConfidenceLevel } from '../types/ruleTemplate';
import { getConfidenceColors } from '../types/ruleExplainability';

/**
 * ConfidenceBadge - Visual indicator for confidence levels
 * 
 * Displays confidence level with color coding and optional numeric value
 */
interface ConfidenceBadgeProps {
  confidence: ConfidenceLevel;
  numericConfidence?: number; // 0.0 - 1.0
  showNumeric?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const ConfidenceBadge: React.FC<ConfidenceBadgeProps> = ({
  confidence,
  numericConfidence,
  showNumeric = false,
  size = 'md',
}) => {
  const colors = getConfidenceColors(confidence);

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  const label = confidence.charAt(0).toUpperCase() + confidence.slice(1);

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded ${colors.text} ${colors.bg} border ${colors.border} ${sizeClasses[size]}`}
    >
      {/* Confidence indicator dots */}
      <span className="flex items-center gap-0.5">
        <span className={`w-1.5 h-1.5 rounded-full ${confidence === 'high' || confidence === 'medium' || confidence === 'low' ? colors.text.replace('text-', 'bg-') : 'bg-gray-300'}`}></span>
        <span className={`w-1.5 h-1.5 rounded-full ${confidence === 'high' || confidence === 'medium' ? colors.text.replace('text-', 'bg-') : 'bg-gray-300'}`}></span>
        <span className={`w-1.5 h-1.5 rounded-full ${confidence === 'high' ? colors.text.replace('text-', 'bg-') : 'bg-gray-300'}`}></span>
      </span>

      {label}

      {/* Optional numeric confidence */}
      {showNumeric && numericConfidence !== undefined && (
        <span className="font-mono text-xs opacity-75">
          {(numericConfidence * 100).toFixed(0)}%
        </span>
      )}
    </span>
  );
};

export default ConfidenceBadge;
