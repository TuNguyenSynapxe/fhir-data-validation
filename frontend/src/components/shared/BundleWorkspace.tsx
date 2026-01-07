import { useState } from 'react';
import { FileJson, GitBranch } from 'lucide-react';
import { BundleEditor } from '../public/BundleEditor';
import { BundleTree } from '../playground/Bundle/BundleTree';

interface BundleWorkspaceProps {
  bundleJson: string;
  onChange: (json: string) => void;
  onJsonValidChange?: (isValid: boolean) => void;
  selectedPath?: string | null;
  onPathSelect?: (path: string | null) => void;
}

/**
 * Bundle workspace with toggleable JSON/Tree view.
 * Reuses existing BundleEditor and BundleTree components.
 * No validation logic - pure presentation.
 */
export function BundleWorkspace({
  bundleJson,
  onChange,
  onJsonValidChange,
  selectedPath,
  onPathSelect,
}: BundleWorkspaceProps) {
  const [view, setView] = useState<'json' | 'tree'>('json');

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2">
          {view === 'json' ? (
            <FileJson className="w-4 h-4 text-gray-600" />
          ) : (
            <GitBranch className="w-4 h-4 text-gray-600" />
          )}
          <span className="text-sm font-semibold text-gray-900">
            {view === 'json' ? 'Bundle JSON' : 'Bundle Tree'}
          </span>
        </div>
        <button
          className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors px-2 py-1 rounded hover:bg-blue-50"
          onClick={() => setView(view === 'json' ? 'tree' : 'json')}
        >
          {view === 'json' ? 'Switch to Tree' : 'Switch to JSON'}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {view === 'json' ? (
          <BundleEditor
            value={bundleJson}
            onChange={onChange}
            onValidJson={onJsonValidChange}
          />
        ) : (
          <BundleTree
            bundleJson={bundleJson}
            selectedPath={selectedPath ?? undefined}
          />
        )}
      </div>
    </div>
  );
}
