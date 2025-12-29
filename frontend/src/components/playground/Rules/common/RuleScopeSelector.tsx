import React from 'react';
import type { InstanceScope } from './InstanceScope.types';
import { getInstanceScopeSummary } from './InstanceScope.utils';

/**
 * SHARED RULE SCOPE SELECTOR
 * 
 * Universal instance scope selector used by ALL rule types.
 * Opens InstanceScopeDrawer for configuration.
 * 
 * RULE: This component is the SINGLE source of truth for scope selection UI.
 * DO NOT create rule-specific scope selector variants.
 */

interface RuleScopeSelectorProps {
  resourceType: string;
  value: InstanceScope;
  onSelect: () => void;
  error?: string;
  className?: string;
  disabled?: boolean;
}

export const RuleScopeSelector: React.FC<RuleScopeSelectorProps> = ({
  resourceType,
  value,
  onSelect,
  error,
  className = '',
  disabled = false,
}) => {
  const scopeSummary = getInstanceScopeSummary(resourceType, value);

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Applies to Instances
      </label>
      <button
        type="button"
        disabled={disabled}
        onClick={onSelect}
        className={`
          w-full px-4 py-3 text-left border rounded-md
          transition-colors
          ${error
            ? 'border-red-300 bg-red-50'
            : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-gray-900">{scopeSummary.text}</div>
            <div className="text-xs text-gray-500 mt-0.5">
              Click to configure instance filtering
            </div>
          </div>
          <div className="text-blue-500 text-sm">Configure</div>
        </div>
      </button>
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};
