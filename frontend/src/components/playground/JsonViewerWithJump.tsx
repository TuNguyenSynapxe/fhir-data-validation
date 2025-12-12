import { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle } from 'lucide-react';

interface JsonViewerWithJumpProps {
  json: string | undefined;
  selectedPath?: string;
  title?: string;
}

export default function JsonViewerWithJump({ json, selectedPath, title = 'JSON' }: JsonViewerWithJumpProps) {
  const [parsedJson, setParsedJson] = useState<any>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [prettyJson, setPrettyJson] = useState<string>('');

  useEffect(() => {
    if (!json) {
      setParsedJson(null);
      setPrettyJson('');
      setParseError(null);
      return;
    }

    try {
      const parsed = JSON.parse(json);
      setParsedJson(parsed);
      setPrettyJson(JSON.stringify(parsed, null, 2));
      setParseError(null);
    } catch (error) {
      setParseError(error instanceof Error ? error.message : 'Invalid JSON');
      setParsedJson(null);
      setPrettyJson('');
    }
  }, [json]);

  if (!json) {
    return (
      <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm flex items-center justify-center">
        <div className="text-center text-gray-400">
          <p className="text-sm">No JSON to display</p>
        </div>
      </div>
    );
  }

  if (parseError) {
    return (
      <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        </div>
        <div className="p-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-red-800 font-medium mb-1">Invalid JSON</h4>
              <p className="text-red-700 text-sm">{parseError}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex-shrink-0">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          {parsedJson && (
            <div className="inline-flex items-center gap-1.5 text-xs text-green-700 bg-green-50 px-2 py-1 rounded border border-green-200">
              <CheckCircle size={12} />
              Valid JSON
            </div>
          )}
        </div>
        {selectedPath && (
          <div className="mt-2 text-xs">
            <span className="text-gray-500">Selected: </span>
            <code className="bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-200 font-mono">
              {selectedPath}
            </code>
          </div>
        )}
      </div>

      {/* JSON Content */}
      <div className="flex-1 overflow-auto">
        <pre className="p-4 text-xs font-mono leading-relaxed">
          {prettyJson.split('\n').map((line, index) => {
            const isHighlighted = selectedPath && line.includes(selectedPath.split('/').pop() || '');
            return (
              <div
                key={index}
                className={`${isHighlighted ? 'bg-yellow-100 border-l-4 border-yellow-500 pl-2' : ''}`}
              >
                {line}
              </div>
            );
          })}
        </pre>
      </div>
    </div>
  );
}
