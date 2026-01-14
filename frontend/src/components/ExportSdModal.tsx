/**
 * Export StructureDefinition Modal Component
 * 
 * Features:
 * - Metadata form (url, name, version, status, description)
 * - Validate before export
 * - Block export if errors exist
 * - Show warnings but allow export
 * - Read-only JSON preview
 * 
 * Rules:
 * - Validation result comes from backend
 * - UI must not interpret severity rules
 */

import React, { useState, useEffect } from 'react';
import { useSdBuilderStore } from '../stores/useSdBuilderStore';
import type { SdMetadata, ValidationResult } from '../api/sdBuilderApi';

// ============================================================================
// Props
// ============================================================================

interface ExportSdModalProps {
  onClose: () => void;
  onExportComplete?: (structureDefinition: unknown) => void;
}

// ============================================================================
// Main Component
// ============================================================================

export const ExportSdModal: React.FC<ExportSdModalProps> = ({
  onClose,
  onExportComplete,
}) => {
  const { design, validation, validate, exportSd, loading } = useSdBuilderStore();

  // Metadata form state
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [version, setVersion] = useState('1.0.0');
  const [status, setStatus] = useState('draft');
  const [description, setDescription] = useState('');

  // UI state
  const [validating, setValidating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportedJson, setExportedJson] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Initialize metadata from design
  useEffect(() => {
    if (design) {
      setUrl(`http://example.org/fhir/StructureDefinition/${design.resourceType}Profile`);
      setName(`${design.resourceType}Profile`);
      setDescription(`Custom ${design.resourceType} profile`);
    }
  }, [design]);

  // Validation derived state
  const hasErrors = validation?.errors && validation.errors.length > 0;
  const hasWarnings = validation?.warnings && validation.warnings.length > 0;
  const canExport = validation?.isValid === true || !hasErrors;

  // ========================================================================
  // Handlers
  // ========================================================================

  const handleValidate = async () => {
    setValidating(true);
    try {
      await validate();
    } catch (error) {
      console.error('Validation failed:', error);
    } finally {
      setValidating(false);
    }
  };

  const handleExport = async () => {
    if (!canExport) {
      alert('Cannot export: validation errors exist. Please fix errors first.');
      return;
    }

    if (!url.trim() || !name.trim()) {
      alert('URL and Name are required');
      return;
    }

    setExporting(true);
    try {
      const metadata: SdMetadata = {
        url: url.trim(),
        name: name.trim(),
        version: version.trim(),
        status: status,
        description: description.trim(),
      };

      const structureDefinition = await exportSd(metadata);
      setExportedJson(JSON.stringify(structureDefinition, null, 2));
      setShowPreview(true);

      if (onExportComplete) {
        onExportComplete(structureDefinition);
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. See console for details.');
    } finally {
      setExporting(false);
    }
  };

  const handleDownload = () => {
    if (!exportedJson) return;

    const blob = new Blob([exportedJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name || 'StructureDefinition'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ========================================================================
  // Render
  // ========================================================================

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Export StructureDefinition</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-6">
          {/* Validation Status */}
          {!showPreview && (
            <>
              <div className="border border-gray-300 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Validation</h3>
                  <button
                    onClick={handleValidate}
                    disabled={validating || loading}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300"
                  >
                    {validating ? 'Validating...' : 'Validate'}
                  </button>
                </div>

                {validation && (
                  <div className="space-y-2">
                    {/* Errors */}
                    {hasErrors && (
                      <div className="bg-red-50 border border-red-200 rounded p-3">
                        <div className="font-semibold text-red-800 mb-2">
                          Errors ({validation.errors.length})
                        </div>
                        <div className="space-y-1">
                          {validation.errors.map((error, idx) => (
                            <div key={idx} className="text-sm text-red-700">
                              {error.path && (
                                <span className="font-mono">{error.path}: </span>
                              )}
                              {error.message}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Warnings */}
                    {hasWarnings && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                        <div className="font-semibold text-yellow-800 mb-2">
                          Warnings ({validation.warnings.length})
                        </div>
                        <div className="space-y-1">
                          {validation.warnings.map((warning, idx) => (
                            <div key={idx} className="text-sm text-yellow-700">
                              {warning.path && (
                                <span className="font-mono">{warning.path}: </span>
                              )}
                              {warning.message}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Success */}
                    {!hasErrors && !hasWarnings && (
                      <div className="bg-green-50 border border-green-200 rounded p-3">
                        <div className="text-green-800">
                          ✓ No validation issues found
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {!validation && (
                  <div className="text-sm text-gray-500">
                    Click "Validate" to check for issues before export
                  </div>
                )}

                {/* Export Blocker */}
                {hasErrors && (
                  <div className="bg-red-100 border border-red-300 rounded p-3 text-red-800">
                    ⚠️ Export is blocked due to validation errors. Please fix errors
                    before exporting.
                  </div>
                )}

                {hasWarnings && !hasErrors && (
                  <div className="bg-yellow-100 border border-yellow-300 rounded p-3 text-yellow-800">
                    ⚠️ Warnings detected but export is allowed. Review warnings before
                    proceeding.
                  </div>
                )}
              </div>

              {/* Metadata Form */}
              <div className="border border-gray-300 rounded-lg p-4 space-y-4">
                <h3 className="font-semibold">Metadata</h3>

                {/* URL */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    URL *
                  </label>
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                    placeholder="http://example.org/fhir/StructureDefinition/MyProfile"
                  />
                </div>

                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                    placeholder="MyProfile"
                  />
                </div>

                {/* Version */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Version
                  </label>
                  <input
                    type="text"
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                    placeholder="1.0.0"
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                  >
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="retired">Retired</option>
                  </select>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                    rows={3}
                    placeholder="Describe this profile..."
                  />
                </div>
              </div>

              {/* Export Button */}
              <div className="flex justify-end gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExport}
                  disabled={!canExport || exporting || !url.trim() || !name.trim()}
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {exporting ? 'Exporting...' : 'Export'}
                </button>
              </div>
            </>
          )}

          {/* JSON Preview */}
          {showPreview && exportedJson && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded p-4">
                <div className="text-green-800 font-semibold mb-2">
                  ✓ Export Successful
                </div>
                <div className="text-sm text-green-700">
                  StructureDefinition has been exported. You can download or copy the
                  JSON below.
                </div>
              </div>

              <div className="border border-gray-300 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">JSON Output</h3>
                  <button
                    onClick={handleDownload}
                    className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                  >
                    Download JSON
                  </button>
                </div>
                <pre className="bg-gray-50 p-4 rounded overflow-x-auto text-xs max-h-96 border border-gray-200">
                  {exportedJson}
                </pre>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
