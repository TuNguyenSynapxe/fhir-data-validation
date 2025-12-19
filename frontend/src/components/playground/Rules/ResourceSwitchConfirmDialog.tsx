import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ResourceSwitchConfirmDialogProps {
  isOpen: boolean;
  currentResource: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ResourceSwitchConfirmDialog: React.FC<ResourceSwitchConfirmDialogProps> = ({
  isOpen,
  currentResource,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-start gap-3 px-6 py-4 border-b border-gray-200">
          <div className="flex-shrink-0 w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
            <AlertTriangle size={20} className="text-amber-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900">
              Switch resource?
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              You have pending rule changes for <span className="font-medium">{currentResource}</span>.
              Switching resource will discard them.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
          >
            Switch Resource
          </button>
        </div>
      </div>
    </div>
  );
};
