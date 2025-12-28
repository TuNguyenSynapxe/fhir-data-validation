/**
 * CodeSystemListPanel - Landing page for Terminology Management
 * Phase 3F: Support Multiple CodeSystems per Project
 */

import { useState, useEffect } from 'react';
import { Plus, Upload, Loader2, AlertCircle, Database, Download, ChevronDown, Trash2 } from 'lucide-react';
import type { CodeSystem, CodeSystemConcept } from '../../types/terminology';
import { listCodeSystems, deleteCodeSystem } from '../../api/terminologyApi';
import { getResultData, logTerminologyError } from '../../utils/terminologyErrors';
import { CreateCodeSystemDialog } from './CreateCodeSystemDialog';
import { ImportCodeSystemDialog } from './ImportCodeSystemDialog';
import { exportCodeSystemAsJson, exportCodeSystemAsCsv } from '../../utils/exportCodeSystem';

interface CodeSystemListPanelProps {
  projectId: string;
  onSelectCodeSystem: (codeSystemUrl: string) => void;
}

export function CodeSystemListPanel({
  projectId,
  onSelectCodeSystem,
}: CodeSystemListPanelProps) {
  const [codeSystems, setCodeSystems] = useState<CodeSystem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ url: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleCreateNew = () => {
    setShowCreateDialog(true);
  };

  const handleCreateSuccess = (newCodeSystem: CodeSystem) => {
    setCodeSystems((prev) => [...prev, newCodeSystem]);
    onSelectCodeSystem(newCodeSystem.url);
  };

  const handleImport = () => {
    setShowImportDialog(true);
  };

  const handleImportSuccess = (importedCodeSystem: CodeSystem) => {
    // Check if CodeSystem already exists (overwrite case)
    const existingIndex = codeSystems.findIndex(
      (cs) => cs.url === importedCodeSystem.url
    );

    if (existingIndex !== -1) {
      // Replace existing
      setCodeSystems((prev) => {
        const updated = [...prev];
        updated[existingIndex] = importedCodeSystem;
        return updated;
      });
    } else {
      // Add new
      setCodeSystems((prev) => [...prev, importedCodeSystem]);
    }

    onSelectCodeSystem(importedCodeSystem.url);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;

    setIsDeleting(true);
    setError(null);

    try {
      const result = await deleteCodeSystem(projectId, deleteConfirm.url);

      if (!result.success) {
        logTerminologyError(result.error);
        setError(result.error.message || 'Failed to delete CodeSystem');
        setIsDeleting(false);
        return;
      }

      // Remove from list
      setCodeSystems((prev) => prev.filter((cs) => cs.url !== deleteConfirm.url));
      setDeleteConfirm(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete CodeSystem');
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    loadCodeSystems();
  }, [projectId]);

  const loadCodeSystems = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await listCodeSystems(projectId);
      const data = getResultData(result);

      if (!data) {
        if (!result.success) {
          logTerminologyError(result.error);
          setError(result.error.message || 'Failed to load CodeSystems');
        } else {
          setError('Failed to load CodeSystems');
        }
        return;
      }

      setCodeSystems(data);

      // Don't auto-navigate - let users see and interact with the list
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCodeSystems = codeSystems.filter((cs) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      cs.url.toLowerCase().includes(query) ||
      cs.name?.toLowerCase().includes(query) ||
      cs.title?.toLowerCase().includes(query)
    );
  });

  const countConcepts = (cs: CodeSystem): number => {
    if (!cs.concept) return 0;
    const countRecursive = (concepts: CodeSystemConcept[]): number => {
      let count = concepts.length;
      concepts.forEach((c) => {
        if (c.concept) {
          count += countRecursive(c.concept);
        }
      });
      return count;
    };
    return countRecursive(cs.concept);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-white p-8">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-4" />
        <p className="text-gray-600">Loading CodeSystems...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-white p-8">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to Load CodeSystems</h3>
        <p className="text-gray-600 text-center mb-4">{error}</p>
        <button
          onClick={loadCodeSystems}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Terminology Management</h2>
            <p className="text-sm text-gray-600 mt-1">Manage FHIR CodeSystems for this project</p>
          </div>
          <div className="flex items-center space-x-2">
            <button onClick={handleImport} className="flex items-center px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50">
              <Upload className="w-4 h-4 mr-2" />
              Import
            </button>
            <button onClick={handleCreateNew} className="flex items-center px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Create New
            </button>
          </div>
        </div>
        <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search by name or URL..." className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <div className="flex-1 overflow-y-auto">
        {filteredCodeSystems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8">
            <Database className="w-16 h-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">{searchQuery ? 'No matching CodeSystems' : 'No CodeSystems yet'}</h3>
            <p className="text-gray-600 text-center mb-4">{searchQuery ? 'Try a different search term' : 'Create your first CodeSystem to start managing terminology'}</p>
            {!searchQuery && (
              <button onClick={handleCreateNew} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Create New CodeSystem
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredCodeSystems.map((cs) => (
              <CodeSystemCard
                key={cs.url}
                codeSystem={cs}
                conceptCount={countConcepts(cs)}
                onClick={() => onSelectCodeSystem(cs.url)}
                onExportJson={(e) => {
                  e.stopPropagation();
                  exportCodeSystemAsJson(cs);
                }}
                onExportCsv={(e) => {
                  e.stopPropagation();
                  exportCodeSystemAsCsv(cs);
                }}
                onDelete={(e) => {
                  e.stopPropagation();
                  setDeleteConfirm({ url: cs.url, name: cs.title || cs.name || cs.url });
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <CreateCodeSystemDialog
        projectId={projectId}
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSuccess={handleCreateSuccess}
      />

      <ImportCodeSystemDialog
        projectId={projectId}
        existingCodeSystemUrls={codeSystems.map((cs) => cs.url)}
        isOpen={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        onSuccess={handleImportSuccess}
      />

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-start mb-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div className="ml-4 flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Delete CodeSystem?
                </h3>
                <p className="text-sm text-gray-600 mb-2">
                  Are you sure you want to delete <strong>{deleteConfirm.name}</strong>?
                </p>
                <p className="text-sm text-gray-500">
                  This action cannot be undone. Any rules referencing this CodeSystem may break.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-red-300 flex items-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface CodeSystemCardProps {
  codeSystem: CodeSystem;
  conceptCount: number;
  onClick: () => void;
  onExportJson: (e: React.MouseEvent) => void;
  onExportCsv: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
}

function CodeSystemCard({ codeSystem, conceptCount, onClick, onExportJson, onExportCsv, onDelete }: CodeSystemCardProps) {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const getStatusBadge = (status: string) => {
    const colors = {
      draft: 'bg-yellow-100 text-yellow-800',
      active: 'bg-green-100 text-green-800',
      retired: 'bg-gray-100 text-gray-800',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="px-6 py-4 hover:bg-blue-50 transition-colors group">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0 cursor-pointer" onClick={onClick}>
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-base font-medium text-gray-900 truncate">{codeSystem.title || codeSystem.name || 'Untitled'}</h3>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(codeSystem.status)}`}>{codeSystem.status}</span>
          </div>
          <p className="text-xs text-gray-600 mb-2 font-mono truncate">{codeSystem.url}</p>
          {codeSystem.description && <p className="text-xs text-gray-600 mb-2 line-clamp-2">{codeSystem.description}</p>}
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center">
              <Database className="w-3 h-3 mr-1" />
              {conceptCount} concept{conceptCount !== 1 ? 's' : ''}
            </span>
            {codeSystem.version && <span>v{codeSystem.version}</span>}
            {codeSystem.publisher && <span>{codeSystem.publisher}</span>}
          </div>
        </div>
        <div className="ml-4 flex items-center gap-2">
          {/* Export dropdown */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowExportMenu(!showExportMenu);
              }}
              className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded border border-gray-300"
              title="Export CodeSystem"
            >
              <Download className="w-4 h-4" />
              <ChevronDown className="w-3 h-3" />
            </button>
            
            {showExportMenu && (
              <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10">
                <div className="py-1">
                  <button
                    onClick={onExportJson}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Export as JSON
                  </button>
                  <button
                    onClick={onExportCsv}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Export as CSV
                  </button>
                  <div className="border-t border-gray-200 my-1"></div>
                  <button
                    onClick={onDelete}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete CodeSystem
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* Arrow indicator */}
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </div>
  );
}
