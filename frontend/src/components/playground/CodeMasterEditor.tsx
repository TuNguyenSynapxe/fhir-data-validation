import { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Save, Loader2 } from 'lucide-react';

interface CodeMasterEditorProps {
  value: string | undefined;
  onChange: (value: string) => void;
  onSave: (value: string) => void;
  isSaving?: boolean;
}

export default function CodeMasterEditor({ value, onChange, onSave, isSaving }: CodeMasterEditorProps) {
  const [hasChanges, setHasChanges] = useState(false);
  const [localValue, setLocalValue] = useState(value || '');
  const [initialValue, setInitialValue] = useState(value || '');

  useEffect(() => {
    setLocalValue(value || '');
    setInitialValue(value || '');
    setHasChanges(false);
  }, [value]);

  const handleEditorChange = (newValue: string | undefined) => {
    const val = newValue || '';
    setLocalValue(val);
    setHasChanges(val !== initialValue);
  };

  const handleSave = () => {
    onChange(localValue);
    onSave(localValue);
    setInitialValue(localValue);
    setHasChanges(false);
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-900">CodeMaster (Lookups)</h3>
        <button
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Save size={14} />
          )}
          Save CodeMaster
        </button>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <Editor
          language="json"
          value={localValue}
          onChange={handleEditorChange}
          options={{
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 13,
            tabSize: 2,
            automaticLayout: true,
            wordWrap: 'on',
          }}
          theme="vs-light"
        />
      </div>
    </div>
  );
}
