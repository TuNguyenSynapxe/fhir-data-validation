import React from 'react';
import { Save, AlertTriangle, FileJson } from 'lucide-react';

interface RuleSetMetadataProps {
  version: string;
  project?: string;
  fhirVersion: string;
  onVersionChange: (version: string) => void;
  onProjectChange: (project: string) => void;
  onFhirVersionChange: (version: string) => void;
  onSave: () => void;
  hasChanges?: boolean;
  bundleSanityState?: {
    isValid: boolean;
    errors: string[];
  };
  onOpenBundleTab?: () => void;
}

export const RuleSetMetadata: React.FC<RuleSetMetadataProps> = ({
  version,
  project,
  fhirVersion,
  onVersionChange,
  onProjectChange,
  onFhirVersionChange,
  onSave,
  hasChanges = false,
  bundleSanityState,
  onOpenBundleTab,
}) => {
  // Show advisory warning if bundle is invalid (non-blocking, project-level metadata)
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
                Fix these issues to enable validation. Metadata editing is not affected.
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

      {/* Metadata Editor Content */}
      <div className="flex items-center justify-between border-b bg-gray-50 px-4 py-2">
        <h3 className="font-semibold">RuleSet Metadata</h3>
        <button
          onClick={onSave}
          disabled={!hasChanges}
          className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          Save Metadata
        </button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Version</label>
            <input
              type="text"
              value={version}
              onChange={(e) => onVersionChange(e.target.value)}
              className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
              placeholder="1.0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Project Name</label>
            <input
              type="text"
              value={project || ''}
              onChange={(e) => onProjectChange(e.target.value)}
              className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
              placeholder="Optional project identifier"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">FHIR Version</label>
            <select
              value={fhirVersion}
              onChange={(e) => onFhirVersionChange(e.target.value)}
              className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
            >
              <option value="R4">R4</option>
              <option value="R5">R5</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};
