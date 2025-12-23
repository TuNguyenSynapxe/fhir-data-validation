import React from 'react';
import { X, FileText } from 'lucide-react';

interface RuleModeSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectBasic: () => void;
  // onSelectAdvanced removed as Advanced Rules (Preview) is hidden
}

export const RuleModeSelectorModal: React.FC<RuleModeSelectorModalProps> = ({
  isOpen,
  onClose,
  onSelectBasic,
}) => {
  // ⚠️ LEGACY WARNING: This component should NOT be used for rule creation.
  // Rule creation now uses AddRuleModal (rule-type-first UX).
  // This component is kept for backward compatibility only.
  if (isOpen) {
    console.warn('[RuleModeSelectorModal] LEGACY: This modal should not be used for creation. Use AddRuleModal instead.');
  }
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Add Rule</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          <p className="text-sm text-gray-600 mb-6">
            Choose how you want to create a rule:
          </p>

          <div className="space-y-3">
            {/* Basic Rule Option */}
            <button
              onClick={onSelectBasic}
              className="w-full flex items-start gap-4 p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all group"
            >
              <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                <FileText size={20} className="text-blue-600" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-sm font-semibold text-gray-900 mb-1">
                  Basic Rule
                </h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Simple, form-based rule creation
                </p>
              </div>
            </button>

            {/* Advanced Rule Option - Hidden per requirements */}
            {/* <button
              onClick={onSelectAdvanced}
              className="w-full flex items-start gap-4 p-4 border-2 border-blue-200 bg-blue-50 rounded-lg hover:border-blue-500 hover:bg-blue-100 transition-all group"
            >
              <div className="flex-shrink-0 w-10 h-10 bg-blue-200 rounded-lg flex items-center justify-center group-hover:bg-blue-300 transition-colors">
                <Sparkles size={20} className="text-blue-600" />
              </div>
              <div className="flex-1 text-left">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Advanced Rule (Preview)
                  </h3>
                  <span className="text-xs text-blue-600 bg-blue-200 px-2 py-0.5 rounded font-medium">
                    BETA
                  </span>
                </div>
                <p className="text-xs text-gray-700 leading-relaxed">
                  Tree-based authoring using schema & observed data
                </p>
              </div>
            </button> */}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
