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
  // Show blocking state if bundle is invalid
  if (bundleSanityState && !bundleSanityState.isValid) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 bg-gray-50">
        <div className="text-center max-w-md">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 mb-4">
            <AlertTriangle className="w-8 h-8 text-amber-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Metadata Locked</h3>
          <p className="text-sm text-gray-600 mb-6">
            A valid FHIR Bundle structure is required before metadata can be edited. Please fix the bundle structure issues to continue.
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
