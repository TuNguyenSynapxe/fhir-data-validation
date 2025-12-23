/**
 * CodeMasterEditor — PHASE 1 Terminology (Lookup Tables)
 * 
 * SCOPE: Simple CodeSystem authoring with code + display only
 * 
 * Flow:
 * 1. List View: Shows all CodeSystems with Add/Import buttons
 * 2. Detail View: 2-column editor (only when CodeSystem selected)
 * 
 * IN-SCOPE (Phase 1):
 * - CodeSystem CRUD (create, read, update, delete)
 * - Concept CRUD (code + display only)
 * - Search concepts within CodeSystem
 * - Bulk import from JSON/CSV files
 * 
 * OUT-OF-SCOPE (Phase 2+):
 * - definition, designation, property fields
 * - Question Configuration (linking to Questionnaire items)
 * - ValueSet binding enforcement
 * - External terminology imports (SNOMED, LOINC)
 * - Bulk operations
 * - Version history
 * 
 * Migration Status:
 * - Phase A: Connected to TerminologyController (file-based storage)
 * - Bulk import: Supports JSON and CSV formats
 * - No longer uses Project.codeMasterJson or /codemaster endpoint
 * 
 * See: /docs/TERMINOLOGY_PHASE_1.md
 */

import React, { useState, useEffect } from 'react';
import { AlertCircle, Plus, Upload, ArrowLeft, List, Loader2 } from 'lucide-react';
import { ConceptListPanel } from '../../terminology/ConceptListPanel';
import { ConceptEditorPanel } from '../../terminology/ConceptEditorPanel';
import { ImportModal } from '../../terminology/ImportModal';
import { AddTerminologyModal } from '../../terminology/AddTerminologyModal';
import { DeleteConfirmModal } from '../../terminology/DeleteConfirmModal';
import type { CodeSetConcept } from '../../../types/codeSystem';
import {
  listCodeSystems,
  saveCodeSystem,
  deleteCodeSystem,
  type CodeSetDto,
} from '../../../api/terminologyApi';

interface CodeMasterEditorProps {
  projectId: string;
}

export const CodeMasterEditor: React.FC<CodeMasterEditorProps> = ({ projectId }) => {
  const [codeSets, setCodeSets] = useState<CodeSetDto[]>([]);
  const [selectedCodeSetUrl, setSelectedCodeSetUrl] = useState<string | null>(null);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ url: string; name: string } | null>(null);

  // Load CodeSystems from TerminologyController on mount
  useEffect(() => {
    loadCodeSystems();
  }, [projectId]);

  const loadCodeSystems = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const systems = await listCodeSystems(projectId);
      // Ensure all CodeSets have concepts array (normalize API response)
      const normalizedSystems = systems.map(system => ({
        ...system,
        concepts: system.concepts || []
      }));
      setCodeSets(normalizedSystems);
    } catch (err) {
      console.error('Failed to load CodeSystems:', err);
      setError(err instanceof Error ? err.message : 'Failed to load terminologies');
    } finally {
      setIsLoading(false);
    }
  };



  // Auto-select first concept when CodeSet selected
  useEffect(() => {
    const selectedCodeSet = codeSets.find((cs) => cs.url === selectedCodeSetUrl);
    if (selectedCodeSet && selectedCodeSet.concepts.length > 0 && !selectedCode) {
      setSelectedCode(selectedCodeSet.concepts[0].code);
    }
  }, [selectedCodeSetUrl, codeSets, selectedCode]);

  // Show success message temporarily
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const handleSelectCodeSet = (url: string) => {
    setSelectedCodeSetUrl(url);
    setSelectedCode(null);
    setError(null);
  };

  const handleBackToList = () => {
    setSelectedCodeSetUrl(null);
    setSelectedCode(null);
    setSearchQuery('');
    setError(null);
  };

  const handleAddCodeSet = () => {
    setShowAddModal(true);
  };

  const handleConfirmAddCodeSet = async (url: string, name: string) => {
    try {
      setIsSaving(true);
      setError(null);
      setShowAddModal(false);
      
      const newCodeSet: CodeSetDto = {
        url,
        name,
        concepts: [],
      };
      
      await saveCodeSystem(projectId, newCodeSet);
      await loadCodeSystems(); // Refresh list
      setSelectedCodeSetUrl(newCodeSet.url);
      setSuccessMessage('Terminology created');
    } catch (err) {
      console.error('Failed to create CodeSystem:', err);
      setError(err instanceof Error ? err.message : 'Failed to create terminology');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCodeSet = (url: string) => {
    const codeSet = codeSets.find(cs => cs.url === url);
    if (codeSet) {
      setDeleteTarget({ url: codeSet.url, name: codeSet.name || codeSet.url });
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    
    try {
      setIsSaving(true);
      setError(null);
      
      await deleteCodeSystem(projectId, deleteTarget.url);
      await loadCodeSystems(); // Refresh list
      
      if (selectedCodeSetUrl === deleteTarget.url) {
        handleBackToList();
      }
      setSuccessMessage('Terminology deleted');
      setDeleteTarget(null); // Close modal
    } catch (err) {
      console.error('Failed to delete CodeSystem:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete terminology');
      setDeleteTarget(null); // Close modal even on error
    } finally {
      setIsSaving(false);
    }
  };

  const handleBulkImport = () => {
    setShowImportModal(true);
  };

  const handleFileSelect = async (file: File) => {

    try {
      setIsImporting(true);
      setError(null);

      const fileContent = await file.text();
      let codeSetsToImport: Array<{ url: string; name?: string; concepts: Array<{ code: string; display?: string }> }> = [];

      if (file.name.endsWith('.json')) {
        // Parse JSON format
        try {
          const parsed = JSON.parse(fileContent);
          if (Array.isArray(parsed)) {
            codeSetsToImport = parsed;
          } else {
            setError('JSON file must contain an array of CodeSystems');
            return;
          }
        } catch (parseErr) {
          setError('Invalid JSON format');
          return;
        }
      } else if (file.name.endsWith('.csv')) {
        // Parse CSV format (codesystem_url,code,display)
        const lines = fileContent.split('\n').filter(line => line.trim() !== '');
        if (lines.length === 0) {
          setError('CSV file is empty');
          return;
        }

        // Skip header if present
        const startIndex = lines[0].toLowerCase().includes('codesystem_url') ? 1 : 0;
        const codeSystemMap = new Map<string, Array<{ code: string; display?: string }>>();

        for (let i = startIndex; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          const parts = line.split(',');
          if (parts.length < 2) continue;

          const url = parts[0].trim();
          const code = parts[1].trim();
          const display = parts.length > 2 ? parts.slice(2).join(',').trim() : code;

          if (!codeSystemMap.has(url)) {
            codeSystemMap.set(url, []);
          }
          codeSystemMap.get(url)!.push({ code, display });
        }

        codeSetsToImport = Array.from(codeSystemMap.entries()).map(([url, concepts]) => ({
          url,
          name: url.split('/').pop(),
          concepts,
        }));
      } else {
        setError('Unsupported file format. Please upload .json or .csv file');
        return;
      }

      if (codeSetsToImport.length === 0) {
        setError('No CodeSystems found in file');
        return;
      }

      // Import each CodeSet
      let successCount = 0;
      let errorCount = 0;
      for (const codeSet of codeSetsToImport) {
        try {
          // Ensure concepts is always an array
          const concepts = Array.isArray(codeSet.concepts) ? codeSet.concepts : [];
          
          console.log('Importing CodeSet:', {
            url: codeSet.url,
            rawConcepts: codeSet.concepts,
            normalizedConcepts: concepts,
            conceptsLength: concepts.length
          });
          
          const dto: CodeSetDto = {
            url: codeSet.url,
            name: codeSet.name || codeSet.url.split('/').pop() || 'Imported CodeSystem',
            concepts: concepts.map(c => ({
              code: c.code || '',
              display: c.display || c.code || '',
            })),
          };
          
          console.log('Sending DTO:', dto);
          
          await saveCodeSystem(projectId, dto);
          successCount++;
        } catch (err) {
          console.error(`Failed to import CodeSystem ${codeSet.url}:`, err);
          errorCount++;
        }
      }

      // Refresh list
      await loadCodeSystems();
      
      // Close modal
      setShowImportModal(false);
      
      if (errorCount === 0) {
        setSuccessMessage(`Imported ${successCount} CodeSystem${successCount !== 1 ? 's' : ''}`);
      } else {
        setSuccessMessage(`Imported ${successCount} CodeSystem${successCount !== 1 ? 's' : ''} (${errorCount} failed)`);
      }
    } catch (err) {
      console.error('Failed to import file:', err);
      setError(err instanceof Error ? err.message : 'Failed to import file');
      setShowImportModal(false);
    } finally {
      setIsImporting(false);
    }
  };

  const handleAddConcept = async () => {
    const codeSet = codeSets.find((cs) => cs.url === selectedCodeSetUrl);
    if (!codeSet) return;

    const newCode = `NEW_${Date.now()}`;
    const newConcept: CodeSetConcept = {
      code: newCode,
      display: 'New Concept',
    };

    try {
      setIsSaving(true);
      setError(null);
      
      const updated: CodeSetDto = {
        ...codeSet,
        concepts: [...codeSet.concepts, newConcept],
      };
      
      await saveCodeSystem(projectId, updated);
      await loadCodeSystems(); // Refresh to get latest data
      setSelectedCode(newCode);
      setSuccessMessage('Concept added');
    } catch (err) {
      console.error('Failed to add concept:', err);
      setError(err instanceof Error ? err.message : 'Failed to add concept');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveConcept = async (updatedConcept: CodeSetConcept) => {
    const codeSet = codeSets.find((cs) => cs.url === selectedCodeSetUrl);
    if (!codeSet) return;

    const conceptIndex = codeSet.concepts.findIndex((c) => c.code === selectedCode);
    if (conceptIndex === -1) return;

    try {
      setIsSaving(true);
      setError(null);
      
      const updatedConcepts = [...codeSet.concepts];
      updatedConcepts[conceptIndex] = updatedConcept;

      const updated: CodeSetDto = {
        ...codeSet,
        concepts: updatedConcepts,
      };
      
      await saveCodeSystem(projectId, updated);
      await loadCodeSystems(); // Refresh to get latest data
      
      // PHASE 1 STABILIZATION: Update selectedCode if code changed
      setSelectedCode(updatedConcept.code);
      setSuccessMessage('Concept saved');
    } catch (err) {
      console.error('Failed to save concept:', err);
      setError(err instanceof Error ? err.message : 'Failed to save concept');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConcept = async (code: string) => {
    const codeSet = codeSets.find((cs) => cs.url === selectedCodeSetUrl);
    if (!codeSet) return;

    try {
      setIsSaving(true);
      setError(null);
      
      const updatedConcepts = codeSet.concepts.filter((c) => c.code !== code);
      const updated: CodeSetDto = {
        ...codeSet,
        concepts: updatedConcepts,
      };
      
      await saveCodeSystem(projectId, updated);
      await loadCodeSystems(); // Refresh to get latest data
      setSelectedCode(updatedConcepts.length > 0 ? updatedConcepts[0].code : null);
      setSuccessMessage('Concept deleted');
    } catch (err) {
      console.error('Failed to delete concept:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete concept');
    } finally {
      setIsSaving(false);
    }
  };

  const selectedCodeSet = codeSets.find((cs) => cs.url === selectedCodeSetUrl);
  const selectedConcept = selectedCodeSet?.concepts.find((c) => c.code === selectedCode) || null;

  // Render content based on state
  let content;

  // Loading state
  if (isLoading) {
    content = (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="flex items-center gap-2 text-gray-600">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading terminologies...</span>
        </div>
      </div>
    );
  }
  // List View - Show all CodeSets
  else if (!selectedCodeSetUrl) {
    content = (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between border-b bg-gray-50 px-4 py-2">
          <div className="flex items-center gap-2">
            <List className="w-5 h-5 text-gray-600" />
            <h3 className="font-semibold">Terminology</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleBulkImport}
              disabled={isImporting}
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors disabled:opacity-50"
              title="Import CodeSystems from JSON or CSV file"
            >
              <Upload className="w-4 h-4" />
              {isImporting ? 'Importing...' : 'Import'}
            </button>
            <button
              onClick={handleAddCodeSet}
              disabled={isSaving}
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 rounded hover:bg-blue-100 transition-colors disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border-b border-green-200 text-green-700 text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border-b border-red-200 text-red-700 text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        {/* Terminology List */}
        <div className="flex-1 overflow-auto p-4">
          {codeSets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <List className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-sm font-medium text-gray-900 mb-1">No Terminologies</p>
              <p className="text-sm text-gray-500 mb-4">Create your first lookup table</p>
              <button
                onClick={handleAddCodeSet}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Terminology
              </button>
            </div>
          ) : (
            <div className="grid gap-3">
              {codeSets.map((codeSet) => (
                <div
                  key={codeSet.url}
                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-gray-900 truncate">
                        {codeSet.name || 'Unnamed Terminology'}
                      </h4>
                      <p className="text-xs text-gray-500 font-mono truncate mt-0.5">
                        {codeSet.url}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        {(codeSet.concepts || []).length} concept{(codeSet.concepts || []).length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDeleteCodeSet(codeSet.url)}
                        disabled={isSaving}
                        className="px-3 py-1 text-xs font-medium text-red-700 bg-red-50 rounded hover:bg-red-100 transition-colors disabled:opacity-50"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => handleSelectCodeSet(codeSet.url)}
                        className="px-3 py-1 text-xs font-medium text-blue-700 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
                      >
                        Edit Concepts →
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }
  // Detail View - Edit selected CodeSet
  else {
    content = (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="border-b bg-gray-50">
          <div className="flex items-center justify-between px-4 py-2">
            <button
              onClick={handleBackToList}
              className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <div>
              <h3 className="font-semibold">{selectedCodeSet?.name}</h3>
              <p className="text-xs text-gray-500 font-mono">{selectedCodeSet?.url}</p>
            </div>
          </div>
          {isSaving && (
            <div className="flex items-center gap-2 px-2 py-1 bg-blue-50 text-blue-700 text-xs">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Saving...</span>
            </div>
          )}
        </div>

        {/* Success/Error Messages */}
        {successMessage && (
          <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border-b border-green-200 text-green-700 text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>{successMessage}</span>
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border-b border-red-200 text-red-700 text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        {/* 2-Column Layout */}
        {selectedCodeSet && (
          <div className="flex flex-1 overflow-hidden">
            {/* Left: Concept List (1/3 width) */}
            <div className="w-1/3 min-w-[250px]">
              <ConceptListPanel
                concepts={selectedCodeSet.concepts || []}
                selectedCode={selectedCode}
                onSelectConcept={setSelectedCode}
                onAddConcept={handleAddConcept}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
              />
            </div>

            {/* Right: Concept Editor (2/3 width) */}
            <div className="flex-1">
              <ConceptEditorPanel
                concept={selectedConcept}
                systemUrl={selectedCodeSet.url}
                allConcepts={selectedCodeSet.concepts || []}
                onSave={handleSaveConcept}
                onDelete={handleDeleteConcept}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  // Render with modals always available
  return (
    <>
      {content}

      {/* Add Terminology Modal */}
      <AddTerminologyModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onConfirm={handleConfirmAddCodeSet}
        existingUrls={codeSets.map(cs => cs.url)}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Terminology"
        message={`Are you sure you want to delete "${deleteTarget?.name}"?`}
        confirmText="Delete"
      />

      {/* Import Modal */}
      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onFileSelect={handleFileSelect}
        isImporting={isImporting}
      />
    </>
  );
};
