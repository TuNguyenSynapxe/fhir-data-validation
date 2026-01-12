import React from 'react';
import { AlertTriangle, FileJson } from 'lucide-react';
import { CodeMasterEditor } from './CodeMaster/CodeMasterEditor';
import { QuestionSets } from './Terminology/QuestionSets';

interface TerminologyEditorProps {
  projectId: string;
  bundleSanityState?: {
    isValid: boolean;
    errors: string[];
  };
  onOpenBundleTab?: () => void;
  activeSubTab?: 'codesystems' | 'questionsets'; // Controlled by parent
}

export const TerminologyEditor: React.FC<TerminologyEditorProps> = ({ 
  projectId, 
  bundleSanityState, 
  onOpenBundleTab,
  activeSubTab = 'codesystems' // Default to Code Systems if not provided
}) => {

  // Show advisory warning if bundle is invalid (non-blocking)
  const showBundleWarning = bundleSanityState && !bundleSanityState.isValid;

  return (
    <div className="flex flex-col h-full">
      {/* Bundle Structure Advisory Warning (Non-blocking) */}
      {showBundleWarning && (
        <div className="flex-shrink-0 bg-amber-50 border-b border-amber-200 px-6 py-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-amber-900 mb-1">
                Bundle structure issues detected
              </p>
              <p className="text-xs text-amber-800">
                Fix these issues to enable validation. Terminology editing is not affected.
              </p>
            </div>
            <button
              onClick={onOpenBundleTab}
              className="flex-shrink-0 text-xs font-medium text-amber-900 hover:text-amber-700 underline"
            >
              View Issues
            </button>
          </div>
        </div>
      )}

      {/* Terminology Editor Content */}
      <div className="flex-1 overflow-auto">
        <div className="flex flex-col h-full">
          {/* Content - tabs now managed by parent */}
          <div className="flex-1 overflow-hidden">
            {activeSubTab === 'codesystems' && <CodeMasterEditor projectId={projectId} />}
            {activeSubTab === 'questionsets' && <QuestionSets projectId={projectId} />}
          </div>
        </div>
      </div>
    </div>
  );
};
