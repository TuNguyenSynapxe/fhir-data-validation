import React, { useState } from 'react';
import { AlertTriangle, FileJson } from 'lucide-react';
import { CodeMasterEditor } from './CodeMaster/CodeMasterEditor';
import { Questions } from './Terminology/Questions';
import { QuestionSets } from './Terminology/QuestionSets';

interface TerminologyEditorProps {
  projectId: string;
  bundleSanityState?: {
    isValid: boolean;
    errors: string[];
  };
  onOpenBundleTab?: () => void;
}

export const TerminologyEditor: React.FC<TerminologyEditorProps> = ({ projectId, bundleSanityState, onOpenBundleTab }) => {
  const [activeSubTab, setActiveSubTab] = useState<'codesystems' | 'questions' | 'questionsets'>('codesystems');

  // Show blocking state if bundle is invalid
  if (bundleSanityState && !bundleSanityState.isValid) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 bg-gray-50">
        <div className="text-center max-w-md">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 mb-4">
            <AlertTriangle className="w-8 h-8 text-amber-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Terminology Locked</h3>
          <p className="text-sm text-gray-600 mb-6">
            A valid FHIR Bundle structure is required before terminology can be edited. Please fix the bundle structure issues to continue.
          </p>
          
          <div className="bg-white border border-amber-200 rounded-lg p-4 mb-6 text-left">
            <div className="flex items-start gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm font-medium text-gray-900">Bundle Structure Issues:</p>
            </div>
            <ul className="space-y-1 ml-6">
              {bundleSanityState.errors.map((error, idx) => (
                <li key={idx} className="text-sm text-gray-700 list-disc">{error}</li>
              ))}
            </ul>
          </div>

          <button
            onClick={onOpenBundleTab}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-md transition-colors"
          >
            <FileJson className="w-4 h-4" />
            Open Bundle Editor
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Sub-tabs */}
      <div className="flex border-b bg-gray-50 flex-shrink-0">
        <button
          onClick={() => setActiveSubTab('codesystems')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeSubTab === 'codesystems'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Code Systems
        </button>
        <button
          onClick={() => setActiveSubTab('questions')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeSubTab === 'questions'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Questions
        </button>
        <button
          onClick={() => setActiveSubTab('questionsets')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeSubTab === 'questionsets'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Question Sets
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeSubTab === 'codesystems' && <CodeMasterEditor projectId={projectId} />}
        {activeSubTab === 'questions' && <Questions projectId={projectId} />}
        {activeSubTab === 'questionsets' && <QuestionSets projectId={projectId} />}
      </div>
    </div>
  );
};
