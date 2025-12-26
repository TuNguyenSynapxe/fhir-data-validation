/**
 * ConceptDrawer — Right-side drawer for concept editing
 * 
 * Features:
 * - Drawer slides in from the right
 * - Shows System (read-only), Code, Display, Description
 * - Lock icon with tooltip if concept is referenced
 * - Preserves scroll position and navigation state
 * - Consistent with existing drawer patterns
 */

import React, { useEffect, useState } from 'react';
import { X, Lock } from 'lucide-react';
import type { CodeSetConcept } from '../../types/codeSystem';

interface ConceptDrawerProps {
  isOpen: boolean;
  concept: CodeSetConcept | null;
  systemUrl: string;
  systemName: string;
  allConcepts: CodeSetConcept[];
  isReferenced?: boolean;
  referenceInfo?: string;
  onClose: () => void;
  onSave: (concept: CodeSetConcept) => void;
  onDelete?: (code: string) => void;
}

export const ConceptDrawer: React.FC<ConceptDrawerProps> = ({
  isOpen,
  concept,
  systemUrl,
  systemName,
  allConcepts,
  isReferenced = false,
  referenceInfo,
  onClose,
  onSave,
  onDelete,
}) => {
  const [code, setCode] = useState('');
  const [display, setDisplay] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<{ code?: string; display?: string }>({});

  // Sync form with selected concept
  useEffect(() => {
    if (concept) {
      setCode(concept.code);
      setDisplay(concept.display || '');
      setDescription(concept.description || '');
      setErrors({});
    } else {
      // New concept
      setCode('');
      setDisplay('');
      setDescription('');
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
      description: description.trim() || undefined,
    });
  };

  const handleDelete = () => {
    if (concept && onDelete) {
      if (confirm(`Delete concept "${concept.code}"?\n\nThis action cannot be undone.`)) {
        onDelete(concept.code);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-30 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-[500px] bg-white shadow-2xl z-50 flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-900">
            {concept ? 'Edit Concept' : 'New Concept'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Context: System and CodeSystem Name */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2 mb-2">
              <div className="text-xs font-semibold text-blue-900 uppercase tracking-wide">
                CodeSystem Context
              </div>
            </div>
            <div className="text-sm font-medium text-blue-900 mb-1">
              {systemName}
            </div>
            <div className="text-xs font-mono text-blue-700 break-all">
              {systemUrl}
            </div>
          </div>

          {/* Code */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Code <span className="text-red-500">*</span>
              {isReferenced && (
                <span className="ml-2 inline-flex items-center gap-1 text-xs text-amber-700">
                  <Lock className="w-3 h-3" />
                  <span>Locked (referenced)</span>
                </span>
              )}
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={isReferenced}
              className={`w-full px-3 py-2 text-sm font-mono border rounded focus:outline-none focus:ring-2 ${
                errors.code
                  ? 'border-red-500 focus:ring-red-500'
                  : isReferenced
                  ? 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed'
                  : 'border-gray-300 focus:ring-blue-500'
              }`}
              placeholder="e.g. US, CN, ACTIVE"
            />
            {errors.code ? (
              <p className="text-xs text-red-600 mt-1">{errors.code}</p>
            ) : isReferenced && referenceInfo ? (
              <div className="flex items-start gap-2 mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                <Lock className="w-3 h-3 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium mb-1">Code cannot be changed</p>
                  <p>{referenceInfo}</p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-500 mt-1">
                Unique identifier stored in data (e.g. US, CN, ACTIVE)
              </p>
            )}
          </div>

          {/* Display */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
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
            <p className="text-xs text-gray-500 mt-1">
              Friendly name displayed in the UI
            </p>
          </div>

          {/* Description (optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Description <span className="text-gray-400">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Additional details about this concept..."
            />
            <p className="text-xs text-gray-500 mt-1">
              Optional explanation or usage notes
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <div>
            {concept && onDelete && (
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-sm font-medium text-red-700 bg-white border border-red-300 rounded hover:bg-red-50 transition-colors"
              >
                Delete Concept
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors"
            >
              {concept ? 'Save Changes' : 'Create Concept'}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
      `}</style>
    </>
  );
};
