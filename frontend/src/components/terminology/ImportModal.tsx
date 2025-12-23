/**
 * ImportModal — Bulk Import UI for CodeSystems
 * 
 * Supports drag-and-drop and manual file upload
 * Accepts JSON and CSV formats
 */

import React, { useCallback, useState } from 'react';
import { Upload, X, FileText, AlertCircle } from 'lucide-react';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFileSelect: (file: File) => void;
  isImporting: boolean;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onFileSelect,
  isImporting,
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.json') || file.name.endsWith('.csv'))) {
      onFileSelect(file);
    }
  }, [onFileSelect]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  }, [onFileSelect]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Import CodeSystems</h2>
          <button
            onClick={onClose}
            disabled={isImporting}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Drag and Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 bg-gray-50'
            }`}
          >
            <Upload className={`w-12 h-12 mx-auto mb-4 ${
              isDragging ? 'text-blue-500' : 'text-gray-400'
            }`} />
            <p className="text-sm font-medium text-gray-900 mb-2">
              Drag and drop your file here
            </p>
            <p className="text-xs text-gray-500 mb-4">or</p>
            <label className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 cursor-pointer transition-colors">
              <FileText className="w-4 h-4 mr-2" />
              Choose File
              <input
                type="file"
                accept=".json,.csv"
                onChange={handleFileInput}
                disabled={isImporting}
                className="hidden"
              />
            </label>
            <p className="text-xs text-gray-500 mt-2">Accepts: .json, .csv</p>
          </div>

          {/* Instructions */}
          <div className="space-y-4">
            <div className="flex items-start gap-2 text-xs text-gray-600">
              <AlertCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900 mb-1">Supported Formats:</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li><strong>JSON:</strong> Array of CodeSystems with url and concepts</li>
                  <li><strong>CSV:</strong> 3 columns (codesystem_url, code, display)</li>
                </ul>
              </div>
            </div>

            {/* JSON Example */}
            <div className="bg-gray-50 rounded p-3 border border-gray-200">
              <p className="text-xs font-semibold text-gray-700 mb-2">JSON Example:</p>
              <pre className="text-xs text-gray-600 overflow-x-auto">
{`[
  {
    "url": "https://fhir.synapxe.sg/CodeSystem/ethnicity",
    "concepts": [
      { "code": "CN", "display": "Chinese" },
      { "code": "MY", "display": "Malay" }
    ]
  }
]`}
              </pre>
            </div>

            {/* CSV Example */}
            <div className="bg-gray-50 rounded p-3 border border-gray-200">
              <p className="text-xs font-semibold text-gray-700 mb-2">CSV Example:</p>
              <pre className="text-xs text-gray-600 overflow-x-auto">
{`codesystem_url,code,display
https://fhir.synapxe.sg/CodeSystem/ethnicity,CN,Chinese
https://fhir.synapxe.sg/CodeSystem/ethnicity,MY,Malay`}
              </pre>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            disabled={isImporting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
