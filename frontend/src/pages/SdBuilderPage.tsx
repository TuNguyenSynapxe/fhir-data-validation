/**
 * SD Builder Page
 * 
 * Main interface for StructureDefinition authoring.
 * 
 * Layout:
 * - Header (resource type, actions)
 * - Element Tree (left)
 * - Editor Panel (right - modals)
 * - Validation Summary (bottom)
 * 
 * Rules:
 * - Single route only
 * - No nested routes
 * - Editors open via modals
 */

import React, { useState, useEffect } from 'react';
import { useSdBuilderStore } from '../stores/useSdBuilderStore';
import { SdTreeView } from '../components/SdBuilder/SdTreeView';
import { ElementDetailsPanel } from '../components/SdBuilder/ElementDetailsPanel';
import { SlicingEditor } from '../components/SlicingEditor';
import { SliceChildEditor } from '../components/SliceChildEditor';
import { ExportSdModal } from '../components/ExportSdModal';
import type { ElementDesign } from '../api/sdBuilderApi';
import '../components/SdBuilder/SdTreeView.css';

// ============================================================================
// Main Component
// ============================================================================

export const SdBuilderPage: React.FC = () => {
  const {
    sessionId,
    design,
    validation,
    dirty,
    loading,
    error,
    clearSession,
  } = useSdBuilderStore();

  // Modal state
  const [selectedElementForSlicing, setSelectedElementForSlicing] = useState<ElementDesign | null>(null);
  const [selectedElementForChildren, setSelectedElementForChildren] = useState<ElementDesign | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showStartModal, setShowStartModal] = useState(!sessionId);

  // Warn on page unload if dirty
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [dirty]);

  // ========================================================================
  // Handlers
  // ========================================================================

  const handleNewSession = () => {
    if (dirty && !confirm('You have unsaved changes. Start a new session?')) {
      return;
    }
    clearSession();
    setShowStartModal(true);
  };

  const handleOpenSlicingEditor = (element: ElementDesign) => {
    setSelectedElementForSlicing(element);
  };

  const handleOpenSliceChildEditor = (element: ElementDesign) => {
    setSelectedElementForChildren(element);
  };

  // ========================================================================
  // Render - No Session
  // ========================================================================

  if (!sessionId || showStartModal) {
    return (
      <div className="min-h-screen bg-gray-50">
        <StartSessionModal
          onClose={() => setShowStartModal(false)}
        />
      </div>
    );
  }

  if (!design) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading design state...</div>
      </div>
    );
  }

  // ========================================================================
  // Render - Active Session
  // ========================================================================

  const hasErrors = validation?.errors && validation.errors.length > 0;
  const hasWarnings = validation?.warnings && validation.warnings.length > 0;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                SD Builder
              </h1>
              <div className="flex items-center gap-4 mt-1">
                <span className="text-sm text-gray-600">
                  Resource: <span className="font-mono">{design.resourceType}</span>
                </span>
                <span className="text-sm text-gray-600">
                  Mode: {design.visibilityMode}
                </span>
                {dirty && (
                  <span className="text-sm text-orange-600 font-semibold">
                    ● Unsaved changes
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleNewSession}
                className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                New Session
              </button>
              <button
                onClick={() => setShowExportModal(true)}
                className="px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Export
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-3">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-2 text-red-800">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium">{error}</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Content - Split View */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left: Tree View */}
        <div className="w-1/2 border-r border-gray-200 overflow-hidden">
          <SdTreeView />
        </div>

        {/* Right: Element Details Panel */}
        <div className="w-1/2 overflow-hidden">
          <ElementDetailsPanel />
        </div>
      </main>

      {/* Validation Summary - Bottom Bar */}
      <div className="bg-white border-t border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <ValidationSummary validation={validation} />
        </div>
      </div>

      {/* Modals */}
      {selectedElementForSlicing && (
        <SlicingEditor
          element={selectedElementForSlicing}
          onClose={() => setSelectedElementForSlicing(null)}
        />
      )}

      {selectedElementForChildren && (
        <SliceChildEditor
          element={selectedElementForChildren}
          onClose={() => setSelectedElementForChildren(null)}
        />
      )}

      {showExportModal && (
        <ExportSdModal
          onClose={() => setShowExportModal(false)}
          onExportComplete={() => {
            setShowExportModal(false);
          }}
        />
      )}
    </div>
  );
};

// ============================================================================
// Start Session Modal Component
// ============================================================================

interface StartSessionModalProps {
  onClose: () => void;
}

const StartSessionModal: React.FC<StartSessionModalProps> = ({ onClose }) => {
  const { startSession } = useSdBuilderStore();
  const [resourceType, setResourceType] = useState('Patient');
  const [baseSdUrl, setBaseSdUrl] = useState('');
  const [visibilityMode, setVisibilityMode] = useState<'Full' | 'Minimal'>('Full');
  const [starting, setStarting] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const handleStart = async () => {
    setStarting(true);
    try {
      await startSession({
        fhirVersion: 'R5',
        resourceType,
        baseSdUrl: baseSdUrl.trim() || undefined,
        visibilityMode,
      });
      onClose();
    } catch (error) {
      console.error('Failed to start session:', error);
      alert('Failed to start session. See console for details.');
    } finally {
      setStarting(false);
    }
  };

  if (showImport) {
    return <ImportSessionModal onClose={() => setShowImport(false)} onBack={() => setShowImport(false)} />;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-6">
        <h2 className="text-2xl font-bold">Start New Session</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Resource Type
            </label>
            <select
              value={resourceType}
              onChange={(e) => setResourceType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded"
            >
              <option value="Patient">Patient</option>
              <option value="Observation">Observation</option>
              <option value="Condition">Condition</option>
              <option value="Procedure">Procedure</option>
              <option value="MedicationRequest">MedicationRequest</option>
              <option value="Bundle">Bundle</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Base SD URL (Optional)
            </label>
            <input
              type="text"
              value={baseSdUrl}
              onChange={(e) => setBaseSdUrl(e.target.value)}
              placeholder="Leave empty for default FHIR base"
              className="w-full px-3 py-2 border border-gray-300 rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Visibility Mode
            </label>
            <select
              value={visibilityMode}
              onChange={(e) => setVisibilityMode(e.target.value as 'Full' | 'Minimal')}
              className="w-full px-3 py-2 border border-gray-300 rounded"
            >
              <option value="Full">Full (Include all elements)</option>
              <option value="Minimal">Minimal (Exclude optional 0..* elements)</option>
            </select>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleStart}
            disabled={starting}
            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300"
          >
            {starting ? 'Starting...' : 'Start Session'}
          </button>
          <button
            onClick={() => setShowImport(true)}
            className="flex-1 px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
          >
            Import SD
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Import Session Modal Component
// ============================================================================

interface ImportSessionModalProps {
  onClose: () => void;
  onBack: () => void;
}

const ImportSessionModal: React.FC<ImportSessionModalProps> = ({ onClose, onBack }) => {
  const { startSession } = useSdBuilderStore();
  const [profileJson, setProfileJson] = useState('');
  const [importing, setImporting] = useState(false);

  const handleImport = async () => {
    if (!profileJson.trim()) {
      alert('Please paste StructureDefinition JSON');
      return;
    }

    setImporting(true);
    try {
      const response = await fetch('/api/sd-builder/session/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileSdJson: profileJson }),
      });

      if (!response.ok) {
        throw new Error('Import failed');
      }

      const data = await response.json();
      
      // Manually set the session in the store
      useSdBuilderStore.setState({
        sessionId: data.sessionId,
        design: data.design,
        validation: null,
        dirty: false,
      });

      onClose();
    } catch (error) {
      console.error('Import failed:', error);
      alert('Failed to import StructureDefinition. Check JSON format and try again.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Import StructureDefinition</h2>
          <button
            onClick={onBack}
            className="text-gray-500 hover:text-gray-700"
          >
            ← Back
          </button>
        </div>

        <p className="text-sm text-gray-600">
          Paste the JSON of a StructureDefinition profile to import into the editor.
        </p>

        <textarea
          value={profileJson}
          onChange={(e) => setProfileJson(e.target.value)}
          placeholder='{"resourceType": "StructureDefinition", ...}'
          className="w-full h-64 px-3 py-2 border border-gray-300 rounded font-mono text-sm"
        />

        <div className="flex gap-3 justify-end">
          <button
            onClick={onBack}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={importing || !profileJson.trim()}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:bg-gray-300"
          >
            {importing ? 'Importing...' : 'Import'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Validation Summary Component
// ============================================================================

interface ValidationSummaryProps {
  validation: any;
}

const ValidationSummary: React.FC<ValidationSummaryProps> = ({ validation }) => {
  const { validate, loading } = useSdBuilderStore();

  const handleValidate = async () => {
    try {
      await validate();
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const hasErrors = validation?.errors && validation.errors.length > 0;
  const hasWarnings = validation?.warnings && validation.warnings.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Validation</h2>
        <button
          onClick={handleValidate}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300"
        >
          {loading ? 'Validating...' : 'Validate'}
        </button>
      </div>

      {!validation && (
        <div className="text-sm text-gray-500">
          Click "Validate" to check for issues
        </div>
      )}

      {validation && (
        <div className="space-y-3">
          {/* Summary */}
          <div className="flex items-center gap-4">
            {hasErrors && (
              <span className="text-red-600 font-semibold">
                {validation.errors.length} Error(s)
              </span>
            )}
            {hasWarnings && (
              <span className="text-yellow-600 font-semibold">
                {validation.warnings.length} Warning(s)
              </span>
            )}
            {!hasErrors && !hasWarnings && (
              <span className="text-green-600 font-semibold">
                ✓ No issues found
              </span>
            )}
          </div>

          {/* Errors */}
          {hasErrors && (
            <div className="bg-red-50 border border-red-200 rounded p-3">
              <div className="font-semibold text-red-800 mb-2">Errors</div>
              <div className="space-y-1">
                {validation.errors.map((error: any, idx: number) => (
                  <div key={idx} className="text-sm text-red-700">
                    {error.path && <span className="font-mono">{error.path}: </span>}
                    {error.message}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Warnings */}
          {hasWarnings && (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
              <div className="font-semibold text-yellow-800 mb-2">Warnings</div>
              <div className="space-y-1">
                {validation.warnings.map((warning: any, idx: number) => (
                  <div key={idx} className="text-sm text-yellow-700">
                    {warning.path && <span className="font-mono">{warning.path}: </span>}
                    {warning.message}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
