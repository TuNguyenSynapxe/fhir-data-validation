/**
 * InstanceScopePreview
 * 
 * Renders semantic preview of InstanceScope without FHIRPath syntax.
 * PHASE 4: Structured instance scope - no [*], [0], or where() rendering.
 */

import React from 'react';
import type { InstanceScope } from './InstanceScope.types';

interface InstanceScopePreviewProps {
  resourceType: string;
  instanceScope: InstanceScope;
  variant?: 'inline' | 'card' | 'muted';
}

export const InstanceScopePreview: React.FC<InstanceScopePreviewProps> = ({
  resourceType,
  instanceScope,
  variant = 'card',
}) => {
  const getSemanticDescription = (): string => {
    switch (instanceScope.kind) {
      case 'all':
        return `Applies to all ${resourceType} resources in the bundle`;
      
      case 'first':
        return `Applies only to the first ${resourceType} resource`;
      
      case 'filter':
        return `Applies to ${resourceType} resources matching a condition`;
      
      default:
        return `Applies to ${resourceType} resources`;
    }
  };

  const getFilterConditionDisplay = (): string | null => {
    if (instanceScope.kind !== 'filter') {
      return null;
    }

    const filter = instanceScope.filter;

    switch (filter.type) {
      case 'code':
        return `code = '${filter.code}'`;
      
      case 'systemCode':
        return `system='${filter.system}' and code='${filter.code}'`;
      
      case 'identifier':
        return `identifier: ${filter.system}|${filter.value}`;
      
      case 'custom':
        return filter.fhirPath;
      
      default:
        return 'Unknown condition';
    }
  };

  const description = getSemanticDescription();
  const condition = getFilterConditionDisplay();

  // Inline variant - single line text
  if (variant === 'inline') {
    return (
      <span className="text-sm text-gray-700">
        {description}
      </span>
    );
  }

  // Muted variant - subdued colors
  if (variant === 'muted') {
    return (
      <div className="text-sm text-gray-600">
        <div>{description}</div>
        {condition && (
          <div className="mt-1 text-xs font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded">
            Condition: {condition}
          </div>
        )}
      </div>
    );
  }

  // Card variant (default) - styled box
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
      <div className="text-xs font-medium text-blue-900 mb-2">Preview:</div>
      <div className="text-sm text-blue-900">{description}</div>
      {condition && (
        <div className="mt-2 text-xs font-mono text-blue-700 bg-blue-100 px-2 py-1 rounded">
          Condition: {condition}
        </div>
      )}
    </div>
  );
};
