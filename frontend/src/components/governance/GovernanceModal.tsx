import React from 'react';
import { X } from 'lucide-react';
import { RuleReviewBadge } from './RuleReviewBadge';
import type { RuleReviewStatus } from './RuleReviewBadge';
import { RuleReviewSummary } from './RuleReviewSummary';
import type { RuleReviewFinding } from './RuleReviewSummary';

interface GovernanceModalProps {
  isOpen: boolean;
  status: RuleReviewStatus;
  findings: RuleReviewFinding[];
  onClose: () => void;
  onConfirm?: () => void;
}

/**
 * Phase 8: Governance enforcement modal
 * BLOCKED: Shows issues, no save button (cannot bypass)
 * WARNING: Shows issues, requires explicit confirmation
 * OK: Not shown (save proceeds normally)
 */
export const GovernanceModal: React.FC<GovernanceModalProps> = ({
  isOpen,
  status,
  findings,
  onClose,
  onConfirm,
}) => {
  if (!isOpen) return null;

  const isBlocked = status === 'BLOCKED';
  const isWarning = status === 'WARNING';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <RuleReviewBadge status={status} size="md" />
            <h2 className="text-lg font-semibold">
              {isBlocked && 'Rules Cannot Be Saved'}
              {isWarning && 'Rule Quality Warning'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1">
          {isBlocked && (
            <div className="mb-4 text-sm text-gray-700">
              The following governance issues must be fixed before saving:
            </div>
          )}
          {isWarning && (
            <div className="mb-4 text-sm text-gray-700">
              The following issues were detected. You can save anyway or fix them first:
            </div>
          )}

          <RuleReviewSummary findings={findings} />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
          >
            {isBlocked ? 'Close' : 'Cancel'}
          </button>
          {isWarning && onConfirm && (
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className="px-4 py-2 text-white bg-yellow-600 rounded hover:bg-yellow-700"
            >
              Save Anyway
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
