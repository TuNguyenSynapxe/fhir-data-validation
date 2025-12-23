import React, { useState } from 'react';
import { CodeMasterEditor } from './CodeMaster/CodeMasterEditor';
import { Questions } from './Terminology/Questions';
import { QuestionSets } from './Terminology/QuestionSets';

interface TerminologyEditorProps {
  projectId: string;
}

export const TerminologyEditor: React.FC<TerminologyEditorProps> = ({ projectId }) => {
  const [activeSubTab, setActiveSubTab] = useState<'codesystems' | 'questions' | 'questionsets'>('codesystems');

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
