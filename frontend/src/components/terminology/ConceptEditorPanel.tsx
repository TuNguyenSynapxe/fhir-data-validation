/**
 * ConceptEditorPanel — PHASE 1 CodeSystem Concept Editor
 * 
 * PHASE 1 SCOPE: Simple form for code + display
 * 
 * Editable Fields:
 * - Code (required, unique within CodeSystem)
 * - Display (required, human-readable label)
 * 
 * PHASE 1 LIMITATION: Does NOT edit:
 * - Definition (concept explanation)
 * - Designation (alternate labels, translations)
 * - Property (additional metadata)
 * - Constraints, Rules, Value Lists
 * - Any advanced FHIR metadata
 * 
 * TODO (Phase 2): Add definition textarea
 * TODO (Phase 2): Add designation list editor (multi-language)
 * TODO (Phase 2): Add property key-value pairs
 * TODO (Phase 2): Link to Question Configuration
 * 
 * See: /docs/TERMINOLOGY_PHASE_1.md
 */

import React, { useEffect, useState } from 'react';
import type { CodeSetConcept } from '../../types/codeSystem';

interface ConceptEditorPanelProps {
  concept: CodeSetConcept | null;
  systemUrl: string;
  allConcepts: CodeSetConcept[];
  onSave: (concept: CodeSetConcept) => void;
  onDelete?: (code: string) => void;
}

export const ConceptEditorPanel: React.FC<ConceptEditorPanelProps> = ({
  concept,
  systemUrl,
  allConcepts,
  onSave,
  onDelete,
}) => {
  const [code, setCode] = useState('');
  const [display, setDisplay] = useState('');
  const [errors, setErrors] = useState<{ code?: string; display?: string }>({});

  // Sync form with selected concept
  useEffect(() => {
    if (concept) {
      setCode(concept.code);
      setDisplay(concept.display || '');
      setErrors({});
    }
  }, [concept]);

  const validate = (): boolean => {
    const newErrors: { code?: string; display?: string } = {};

    if (!code.trim()) {
      newErrors.code = 'Code is required';
    } else if (allConcepts.some((c) => c.code === code && c.code !== concept?.code)) {
      newErrors.code = 'Code must be unique';
    }

    if (!display.trim()) {
      newErrors.display = 'Display is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;

    onSave({
      code: code.trim(),
      display: display.trim(),
    });
  };

  const handleDelete = () => {
    if (concept && onDelete) {
      if (confirm(`Delete concept "${concept.code}"?`)) {
        onDelete(concept.code);
      }
    }
  };

  if (!concept) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <p className="text-sm text-gray-500">Select a concept to edit</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header with Actions */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Edit Concept</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDelete}
            className="px-3 py-2 text-sm font-medium text-red-700 bg-red-50 rounded hover:bg-red-100 transition-colors"
          >
            Delete
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* System (read-only, de-emphasized) */}
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
            System
          </label>
          <div className="px-3 py-2 text-xs font-mono text-gray-500 bg-gray-50 border border-gray-200 rounded">
            {systemUrl}
          </div>
          <p className="text-xs text-gray-400 mt-1">Context only (read-only)</p>
        </div>

        {/* Code */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">
            Code <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className={`w-full px-3 py-2 text-sm font-mono border rounded focus:outline-none focus:ring-2 ${
              errors.code
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:ring-blue-500'
            }`}
            placeholder="e.g. CN, MY, XX"
          />
          {errors.code ? (
            <p className="text-xs text-red-600 mt-1">{errors.code}</p>
          ) : (
            <p className="text-xs text-gray-500 mt-1">
              Short code stored in data (e.g. CN, MY, XX)
            </p>
          )}
        </div>

        {/* Display */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">
            Display <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={display}
            onChange={(e) => setDisplay(e.target.value)}
            className={`w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 ${
              errors.display
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:ring-blue-500'
            }`}
            placeholder="Human-readable label shown to users"
          />
          {errors.display && (
            <p className="text-xs text-red-600 mt-1">{errors.display}</p>
          )}
        </div>
      </div>
    </div>
  );
};
