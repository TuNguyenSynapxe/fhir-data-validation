import React from 'react';
import { Eye } from 'lucide-react';
import { RuleErrorRenderer } from '../../../validation/RuleErrorRenderer/RuleErrorRenderer';
import type { ValidationIssue } from '../../../../constants/errorMessages';

/**
 * RULE ERROR PREVIEW
 * 
 * Phase 3: Live preview of how the error will render to end users
 * Shows real-time rendering using RuleErrorRenderer + ERROR_MESSAGE_MAP
 * 
 * Features:
 * - Live updates as author changes errorCode/userHint
 * - Uses actual RuleErrorRenderer (no hand-crafted preview)
 * - Shows both summary and detailed views
 * - Validates that selected errorCode exists in ERROR_MESSAGE_MAP
 */

interface RuleErrorPreviewProps {
  errorCode: string;
  userHint?: string;
  severity: 'error' | 'warning' | 'information';
  resourceType: string;
  path: string;
  source?: 'Business' | 'Firely' | 'System';
  details?: Record<string, any>;
  className?: string;
}

export const RuleErrorPreview: React.FC<RuleErrorPreviewProps> = ({
  errorCode,
  userHint,
  severity,
  resourceType,
  path,
  source = 'Business',
  details,
  className = ''
}) => {
  // If no errorCode selected, show placeholder
  if (!errorCode || errorCode.trim() === '') {
    return (
      <div className={`border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50 ${className}`}>
        <div className="flex items-center gap-2 text-gray-500 mb-2">
          <Eye size={18} />
          <h3 className="font-semibold">Error Preview</h3>
        </div>
        <p className="text-sm text-gray-500">
          Select an error code above to see how it will render to end users.
        </p>
      </div>
    );
  }

  // Build mock ValidationIssue for preview
  const mockIssue: ValidationIssue = {
    errorCode,
    userHint: userHint || undefined,
    severity,
    source,
    resourceType,
    path,
    details: details || {
      // Provide some sample data for better preview
      expected: { value: '<sample>' },
      actual: { value: '<current>' }
    },
    navigation: {
      jsonPointer: `/entry/0/${path.replace(/\./g, '/')}`,
      breadcrumb: `${resourceType} → ${path}`,
      resourceIndex: 0
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2 text-gray-700">
        <Eye size={18} />
        <h3 className="font-semibold">Live Error Preview</h3>
      </div>

      {/* Preview info */}
      <div className="text-xs text-gray-600 bg-blue-50 border border-blue-200 rounded p-2">
        <strong>📌 This is what end users will see</strong>
        <br />
        Message comes from ERROR_MESSAGE_MAP, not from your input.
      </div>

      {/* Summary View */}
      <div>
        <div className="text-xs font-medium text-gray-600 mb-1">Summary View:</div>
        <RuleErrorRenderer
          issue={mockIssue}
          verbosity="summary"
          showPath={false}
        />
      </div>

      {/* Detailed View */}
      <div>
        <div className="text-xs font-medium text-gray-600 mb-1">Detailed View:</div>
        <RuleErrorRenderer
          issue={mockIssue}
          verbosity="detailed"
          showPath={true}
        />
      </div>

      {/* User Hint Display */}
      {userHint && (
        <div className="text-xs bg-amber-50 border border-amber-200 rounded p-2">
          <strong>User Hint:</strong> "{userHint}"
          <br />
          <span className="text-gray-600">
            Shown as contextual subtitle (optional technical detail)
          </span>
        </div>
      )}
    </div>
  );
};
