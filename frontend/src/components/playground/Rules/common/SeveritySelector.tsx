import React from 'react';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';

/**
 * SHARED SEVERITY SELECTOR
 * 
 * Universal severity selector used by ALL rule types.
 * Radio button list with icons and descriptions.
 * 
 * RULE: This component is the SINGLE source of truth for severity selection UI.
 * DO NOT create rule-specific severity selector variants.
 */

const SEVERITY_LEVELS = [
  {
    value: 'error' as const,
    label: 'Error',
    description: 'Blocks validation - must be fixed',
    icon: AlertCircle,
    colorClass: 'text-red-600',
  },
  {
    value: 'warning' as const,
    label: 'Warning',
    description: 'Should be reviewed but does not block',
    icon: AlertTriangle,
    colorClass: 'text-yellow-600',
  },
  {
    value: 'information' as const,
    label: 'Information',
    description: 'For reference only - no action required',
    icon: Info,
    colorClass: 'text-blue-600',
  },
];

interface SeveritySelectorProps {
  value: 'error' | 'warning' | 'information';
  onChange: (severity: 'error' | 'warning' | 'information') => void;
  className?: string;
  disabled?: boolean;
}

export const SeveritySelector: React.FC<SeveritySelectorProps> = ({
  value,
  onChange,
  className = '',
  disabled = false,
}) => {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Severity
      </label>
      <div className="space-y-2">
        {SEVERITY_LEVELS.map((level) => {
          const Icon = level.icon;
          return (
            <label
              key={level.value}
              className={`
                flex items-start gap-3 p-3 border rounded-md
                transition-colors
                ${value === level.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <input
                type="radio"
                name="severity"
                value={level.value}
                checked={value === level.value}
                onChange={() => onChange(level.value)}
                disabled={disabled}
                className="mt-0.5"
              />
              <Icon size={18} className={level.colorClass} />
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">{level.label}</div>
                <div className="text-xs text-gray-600">{level.description}</div>
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
};
