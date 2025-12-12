import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';

interface JsonEditorProps {
  title: string;
  initialValue: string;
  onSave: (value: string) => void;
  isSaving?: boolean;
}

export default function JsonEditor({ title, initialValue, onSave, isSaving }: JsonEditorProps) {
  const [value, setValue] = useState(initialValue);
  const [hasChanges, setHasChanges] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setValue(initialValue);
    setHasChanges(false);
  }, [initialValue]);

  const handleChange = (newValue: string) => {
    setValue(newValue);
    setHasChanges(newValue !== initialValue);
    setError(null);
  };

  const handleSave = () => {
    try {
      JSON.parse(value);
      setError(null);
      onSave(value);
      setHasChanges(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid JSON');
    }
  };

  const handleFormat = () => {
    try {
      const formatted = JSON.stringify(JSON.parse(value), null, 2);
      setValue(formatted);
      setHasChanges(formatted !== initialValue);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid JSON');
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <div className="flex gap-2">
          <button
            onClick={handleFormat}
            className="px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors"
          >
            Format
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            <Save size={14} />
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
      
      {error && (
        <div className="px-4 py-2 bg-red-50 border-b border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}
      
      <div className="flex-1 overflow-hidden">
        <textarea
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          className="w-full h-full p-4 font-mono text-sm resize-none focus:outline-none"
          spellCheck={false}
        />
      </div>
    </div>
  );
}
