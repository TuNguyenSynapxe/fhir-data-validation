import React from 'react';
import Editor from '@monaco-editor/react';

interface BundleJsonEditorProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  highlightedPath?: string;
}

export const BundleJsonEditor: React.FC<BundleJsonEditorProps> = ({
  value,
  onChange,
  readOnly = false,
  highlightedPath,
}) => {
  const handleEditorChange = (value: string | undefined) => {
    onChange(value || '');
  };

  return (
    <div className="h-full w-full">
      <Editor
        height="100%"
        defaultLanguage="json"
        value={value}
        onChange={handleEditorChange}
        options={{
          readOnly,
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
  );
};
