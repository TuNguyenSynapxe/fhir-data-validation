import React from 'react';
import { X, AlertCircle } from 'lucide-react';
import type { RuleIntent } from '../../types/ruleIntent';

/**
 * RulePreviewDrawer - Preview panel for pending rule intents
 * 
 * Requirements:
 * - Show what rules WILL be created (not created yet)
 * - Display: path, type, severity, generated message
 * - Messages are READ-ONLY (system-generated)
 * - No editing capability
 * 
 * UX:
 * - Drawer/modal style (choose based on layout)
 * - Clear visual distinction: "Preview" not "Edit"
 * - Show generated system message
 */
interface RulePreviewDrawerProps {
  isOpen: boolean;
  intents: RuleIntent[];
  onClose: () => void;
}

/**
 * Generate preview message (matches backend template logic)
 * Backend will do the actual generation - this is just for preview
 */
function generatePreviewMessage(intent: RuleIntent): string {
  switch (intent.type) {
    case 'REQUIRED':
      return `${intent.path} is required.`;
    case 'ARRAY_LENGTH': {
      const { min, max, nonEmpty } = intent.params as any || {};
      const parts: string[] = [];
      
      if (min !== undefined && max !== undefined) {
        parts.push(`must contain between ${min} and ${max} items`);
      } else if (min !== undefined) {
        parts.push(`must contain at least ${min} item${min !== 1 ? 's' : ''}`);
      } else if (max !== undefined) {
        parts.push(`must contain at most ${max} item${max !== 1 ? 's' : ''}`);
      }
      
      if (nonEmpty) {
        parts.push('all items must be non-empty');
      }
      
      return `${intent.path} ${parts.join(', ')}.`;
    }
    case 'CODE_SYSTEM': {
      const { system } = intent.params as any || {};
      return `${intent.path} must use code system: ${system}`;
    }
    case 'ALLOWED_CODES': {
      const { codes } = intent.params as any || {};
      const codeList = codes?.join(', ') || '';
      return `${intent.path} must be one of: ${codeList}`;
    }
    default:
      return `Rule will be created for ${intent.path}`;
  }
}

const RulePreviewDrawer: React.FC<RulePreviewDrawerProps> = ({
  isOpen,
  intents,
  onClose,
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-[500px] bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Rule Preview
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {intents.length} rule{intents.length !== 1 ? 's' : ''} will be created
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {intents.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>No pending rules</p>
            </div>
          ) : (
            <div className="space-y-4">
              {intents.map((intent, index) => (
                <div
                  key={`${intent.path}-${index}`}
                  className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                >
                  {/* Rule Type Badge */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      intent.type === 'REQUIRED' ? 'bg-blue-100 text-blue-700' :
                      intent.type === 'ARRAY_LENGTH' ? 'bg-purple-100 text-purple-700' :
                      intent.type === 'CODE_SYSTEM' || intent.type === 'ALLOWED_CODES' ? 'bg-orange-100 text-orange-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {intent.type === 'REQUIRED' ? 'Required' :
                       intent.type === 'ARRAY_LENGTH' ? 'Array Length' :
                       intent.type === 'CODE_SYSTEM' ? 'Code System' :
                       intent.type === 'ALLOWED_CODES' ? 'Allowed Codes' :
                       intent.type}
                    </span>
                    <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded">
                      ERROR
                    </span>
                  </div>

                  {/* Path */}
                  <div className="mb-3">
                    <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                      Path
                    </label>
                    <p className="text-sm font-mono text-gray-900 mt-1">
                      {intent.path}
                    </p>
                  </div>

                  {/* Array Length Parameters */}
                  {intent.type === 'ARRAY_LENGTH' && intent.params && (
                    <div className="mb-3 flex gap-3">
                      {(intent.params as any).min !== undefined && (
                        <div className="flex-1">
                          <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                            Min
                          </label>
                          <p className="text-sm text-gray-900 mt-1 font-semibold">
                            {(intent.params as any).min}
                          </p>
                        </div>
                      )}
                      {(intent.params as any).max !== undefined && (
                        <div className="flex-1">
                          <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                            Max
                          </label>
                          <p className="text-sm text-gray-900 mt-1 font-semibold">
                            {(intent.params as any).max}
                          </p>
                        </div>
                      )}
                      {(intent.params as any).nonEmpty && (
                        <div className="flex-1">
                          <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                            Non-Empty
                          </label>
                          <p className="text-sm text-green-600 mt-1 font-semibold">
                            Yes
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Code System Parameters */}
                  {intent.type === 'CODE_SYSTEM' && intent.params && (
                    <div className="mb-3">
                      <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                        System
                      </label>
                      <p className="text-sm font-mono text-gray-900 mt-1 break-all">
                        {(intent.params as any).system}
                      </p>
                    </div>
                  )}

                  {/* Allowed Codes Parameters */}
                  {intent.type === 'ALLOWED_CODES' && intent.params && (
                    <div className="mb-3">
                      <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                        Allowed Codes ({(intent.params as any).codes?.length || 0})
                      </label>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {((intent.params as any).codes || []).map((code: string, idx: number) => (
                          <span key={idx} className="px-2 py-1 bg-orange-50 border border-orange-200 rounded text-xs font-mono text-orange-900">
                            {code}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Generated Message (READ-ONLY) */}
                  <div>
                    <label className="text-xs font-medium text-gray-600 uppercase tracking-wide flex items-center gap-1">
                      Message
                      <span className="text-gray-400">(system-generated)</span>
                    </label>
                    <div className="mt-1 p-3 bg-white border border-gray-200 rounded text-sm text-gray-700">
                      {generatePreviewMessage(intent)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="px-6 py-4 border-t border-gray-200 bg-blue-50">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-blue-800">
              Rules will be created as <strong>Draft</strong> when you click Apply.
              Error messages are generated automatically and cannot be edited during creation.
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default RulePreviewDrawer;
