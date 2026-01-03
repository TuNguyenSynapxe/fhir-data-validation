import { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';

interface BundleEditorProps {
  value: string;
  onChange: (value: string) => void;
  onValidJson?: (isValid: boolean) => void;
  height?: string;
  readOnly?: boolean;
}

export function BundleEditor({
  value,
  onChange,
  onValidJson,
  height = '500px',
  readOnly = false,
}: BundleEditorProps) {
  const [parseError, setParseError] = useState<string | null>(null);

  useEffect(() => {
    if (!value.trim()) {
      setParseError(null);
      onValidJson?.(false);
      return;
    }

    try {
      JSON.parse(value);
      setParseError(null);
      onValidJson?.(true);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Invalid JSON';
      setParseError(errorMessage);
      onValidJson?.(false);
    }
  }, [value, onValidJson]);

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      {parseError && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2 text-sm text-red-700">
          <strong>JSON Parse Error:</strong> {parseError}
        </div>
      )}
      <Editor
        height={height}
        defaultLanguage="json"
        value={value}
        onChange={(newValue) => onChange(newValue || '')}
        theme="vs-light"
        options={{
          readOnly,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          fontSize: 13,
          tabSize: 2,
          wordWrap: 'on',
          automaticLayout: true,
        }}
      />
    </div>
  );
}
