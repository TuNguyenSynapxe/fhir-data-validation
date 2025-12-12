import React from 'react';
import Editor from '@monaco-editor/react';
import { Save } from 'lucide-react';

interface CodeMasterEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  hasChanges?: boolean;
  isSaving?: boolean;
}

export const CodeMasterEditor: React.FC<CodeMasterEditorProps> = ({
  value,
  onChange,
  onSave,
  hasChanges = false,
  isSaving = false,
}) => {
  const handleEditorChange = (value: string | undefined) => {
    onChange(value || '');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between border-b bg-gray-50 px-4 py-2">
        <h3 className="font-semibold">CodeMaster (Lookup Tables)</h3>
        <button
          onClick={onSave}
          disabled={!hasChanges || isSaving}
          className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {isSaving ? 'Saving...' : 'Save CodeMaster'}
        </button>
      </div>

      <div className="flex-1">
        <Editor
          height="100%"
          defaultLanguage="json"
          value={value}
          onChange={handleEditorChange}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            automaticLayout: true,
          }}
          theme="vs"
        />
      </div>
    </div>
  );
};
