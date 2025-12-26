import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDangerous?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDangerous = false,
}) => {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
          {/* Header */}
          <div className="flex items-start gap-3 px-6 py-4 border-b border-gray-200">
            <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
              isDangerous ? 'bg-red-100' : 'bg-amber-100'
            }`}>
              <AlertTriangle className={`w-6 h-6 ${
                isDangerous ? 'text-red-600' : 'text-amber-600'
              }`} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 rounded"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-4">
            <p className="text-sm text-gray-700 mb-2">{message}</p>
            {isDangerous && (
              <p className="text-sm text-red-600 font-medium">
                This action cannot be undone.
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 rounded-b-lg">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            >
              {cancelLabel}
            </button>
            <button
              onClick={handleConfirm}
              className={`px-4 py-2 text-sm font-medium text-white rounded transition-colors ${
                isDangerous
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
