/**
 * TerminologyRouter - Handles routing within Terminology tab
 * Phase 3F: Support Multiple CodeSystems per Project
 * 
 * Routes:
 * - /terminology/code-systems => CodeSystemListPanel
 * - /terminology/code-systems/{encoded-url} => TerminologyManagementScreen
 * 
 * Features:
 * - Auto-select if only one CodeSystem exists
 * - Handles URL encoding/decoding for canonical URLs
 * - Create/Import dialogs (placeholders for now)
 */

import { useState, useEffect } from 'react';
import { Download, ChevronDown } from 'lucide-react';
import type { CodeSystem } from '../../types/terminology';
import { CodeSystemListPanel } from './CodeSystemListPanel';
import { TerminologyManagementScreen } from './TerminologyManagementScreen';
import { exportCodeSystemAsJson, exportCodeSystemAsCsv } from '../../utils/exportCodeSystem';

interface TerminologyRouterProps {
  /** Project ID */
  projectId: string;
  /** Initial CodeSystem URL to open (optional) */
  initialCodeSystemUrl?: string;
  /** Callback when navigation changes */
  onNavigationChange?: (path: string) => void;
}

type TerminologyView = 
  | { type: 'list' }
  | { type: 'editor'; codeSystemUrl: string }
  | { type: 'create' }
  | { type: 'import' };

export function TerminologyRouter({
  projectId,
  initialCodeSystemUrl,
  onNavigationChange,
}: TerminologyRouterProps) {
  const [currentView, setCurrentView] = useState<TerminologyView>(
    initialCodeSystemUrl
      ? { type: 'editor', codeSystemUrl: initialCodeSystemUrl }
      : { type: 'list' }
  );
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [currentCodeSystem, setCurrentCodeSystem] = useState<CodeSystem | null>(null);

  useEffect(() => {
    // Notify parent of navigation changes
    if (currentView.type === 'list') {
      onNavigationChange?.('/terminology/code-systems');
    } else if (currentView.type === 'editor') {
      const encoded = encodeURIComponent(currentView.codeSystemUrl);
      onNavigationChange?.(`/terminology/code-systems/${encoded}`);
    }
  }, [currentView, onNavigationChange]);

  const handleSelectCodeSystem = (codeSystemUrl: string) => {
    setCurrentView({ type: 'editor', codeSystemUrl });
  };

  const handleBackToList = () => {
    setCurrentView({ type: 'list' });
  };

  // Render based on current view
  switch (currentView.type) {
    case 'list':
      return (
        <CodeSystemListPanel
          projectId={projectId}
          onSelectCodeSystem={handleSelectCodeSystem}
        />
      );

    case 'editor':
      return (
        <div className="flex flex-col h-full">
          {/* Header with Back button and Export */}
          <div className="border-b border-gray-200 px-4 py-2 bg-gray-50 flex items-center justify-between">
            <button
              onClick={handleBackToList}
              className="flex items-center text-sm text-blue-600 hover:text-blue-700"
            >
              <svg
                className="w-4 h-4 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back to CodeSystems
            </button>

            {/* Export Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded border border-gray-300"
              >
                <Download className="w-4 h-4" />
                Export
                <ChevronDown className="w-3 h-3" />
              </button>
              
              {showExportMenu && (
                <div className="absolute right-0 mt-1 w-44 bg-white rounded-md shadow-lg border border-gray-200 z-10">
                  <div className="py-1">
                    <button
                      onClick={() => {
                        if (currentCodeSystem) {
                          exportCodeSystemAsJson(currentCodeSystem);
                        }
                        setShowExportMenu(false);
                      }}
                      disabled={!currentCodeSystem}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Download className="w-4 h-4" />
                      Export as JSON
                    </button>
                    <button
                      onClick={() => {
                        if (currentCodeSystem) {
                          exportCodeSystemAsCsv(currentCodeSystem);
                        }
                        setShowExportMenu(false);
                      }}
                      disabled={!currentCodeSystem}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Download className="w-4 h-4" />
                      Export as CSV
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Editor */}
          <div className="flex-1 overflow-hidden">
            <TerminologyManagementScreen
              projectId={projectId}
              codeSystemUrl={currentView.codeSystemUrl}
              onCodeSystemLoaded={setCurrentCodeSystem}
            />
          </div>
        </div>
      );

    case 'create':
      // TODO: Implement create dialog
      return (
        <div className="flex items-center justify-center h-full">
          <p>Create CodeSystem dialog - coming soon</p>
        </div>
      );

    case 'import':
      // TODO: Implement import dialog
      return (
        <div className="flex items-center justify-center h-full">
          <p>Import CodeSystem dialog - coming soon</p>
        </div>
      );

    default:
      return null;
  }
}
