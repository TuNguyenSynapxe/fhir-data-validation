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
import { AlertCircle, Plus, Upload, List, Loader2 } from 'lucide-react';
import { ConceptTable } from '../../terminology/ConceptTable';
import { ConceptDrawer } from '../../terminology/ConceptDrawer';
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
import { checkConceptReferences, type ConceptReferenceInfo } from '../../../utils/conceptReferenceChecker';

interface CodeMasterEditorProps {
  projectId: string;
}

export const CodeMasterEditor: React.FC<CodeMasterEditorProps> = ({ projectId }) => {
  const [codeSets, setCodeSets] = useState<CodeSetDto[]>([]);
  const [selectedCodeSetUrl, setSelectedCodeSetUrl] = useState<string | null>(null);
  const [editingConcept, setEditingConcept] = useState<CodeSetConcept | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [conceptReferenceInfo, setConceptReferenceInfo] = useState<ConceptReferenceInfo | null>(null);
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



  // Show success message temporarily
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const handleSelectCodeSet = (url: string) => {
    setSelectedCodeSetUrl(url);
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
        setSelectedCodeSetUrl(null); // Deselect if deleting the currently selected CodeSystem
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
    setEditingConcept(null); // New concept
    setConceptReferenceInfo(null);
    setIsDrawerOpen(true);
  };

  const handleEditConcept = async (concept: CodeSetConcept) => {
    setEditingConcept(concept);
    setIsDrawerOpen(true);
    
    // Check if concept is referenced
    const codeSet = codeSets.find((cs) => cs.url === selectedCodeSetUrl);
    if (codeSet) {
      try {
        const refInfo = await checkConceptReferences(projectId, codeSet.url, concept.code);
        setConceptReferenceInfo(refInfo);
      } catch (error) {
        console.error('Failed to check concept references:', error);
        setConceptReferenceInfo(null);
      }
    }
  };

  const handleSaveConcept = async (updatedConcept: CodeSetConcept) => {
    const codeSet = codeSets.find((cs) => cs.url === selectedCodeSetUrl);
    if (!codeSet) return;

    try {
      setIsSaving(true);
      setError(null);
      
      let updatedConcepts: CodeSetConcept[];
      
      if (editingConcept) {
        // Update existing concept
        const conceptIndex = codeSet.concepts.findIndex((c) => c.code === editingConcept.code);
        if (conceptIndex === -1) {
          setError('Concept not found');
          return;
        }
        updatedConcepts = [...codeSet.concepts];
        updatedConcepts[conceptIndex] = updatedConcept;
      } else {
        // Add new concept
        updatedConcepts = [...codeSet.concepts, updatedConcept];
      }

      const updated: CodeSetDto = {
        ...codeSet,
        concepts: updatedConcepts,
      };
      
      await saveCodeSystem(projectId, updated);
      await loadCodeSystems(); // Refresh to get latest data
      setSuccessMessage(editingConcept ? 'Concept updated' : 'Concept added');
      setIsDrawerOpen(false);
      setEditingConcept(null);
      setConceptReferenceInfo(null);
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
      await loadCodeSystems(); // Refresh
      setSuccessMessage('Concept deleted');
      setIsDrawerOpen(false);
      setEditingConcept(null);
      setConceptReferenceInfo(null);
    } catch (err) {
      console.error('Failed to delete concept:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete concept');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setEditingConcept(null);
    setConceptReferenceInfo(null);
  };

  const selectedCodeSet = codeSets.find((cs) => cs.url === selectedCodeSetUrl);

  // Always render 2-panel master-detail layout
  return (
    <>
      <div className="flex h-full">
        {/* LEFT PANEL: CodeSystem Navigator */}
        <div className="w-80 border-r border-gray-200 bg-gray-50 flex flex-col">
          {/* Header */}
          <div className="px-3 py-2 border-b border-gray-200 bg-white flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Code Systems</h2>
            <div className="flex items-center gap-1">
              <button
                onClick={handleAddCodeSet}
                disabled={isSaving}
                title="Add CodeSystem"
                className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded hover:bg-blue-100 transition-colors disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
              <button
                onClick={handleBulkImport}
                disabled={isImporting}
                title="Import CodeSystem"
                className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {isImporting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Upload className="w-3.5 h-3.5" />
                )}
                <span>Import</span>
              </button>
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center p-8">
              <div className="flex items-center gap-2 text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-xs">Loading...</span>
              </div>
            </div>
          )}

          {/* CodeSystem List */}
          {!isLoading && (
            <div className="flex-1 overflow-auto">
              {codeSets.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                  <List className="w-10 h-10 text-gray-300 mb-2" />
                  <p className="text-xs text-gray-500">No code systems yet</p>
                </div>
              ) : (
                <div className="p-1.5 space-y-0.5">
                  {codeSets.map((codeSet) => (
                    <button
                      key={codeSet.url}
                      onClick={() => handleSelectCodeSet(codeSet.url)}
                      className={`w-full text-left px-2.5 py-2 rounded transition-colors ${
                        codeSet.url === selectedCodeSetUrl
                          ? 'bg-blue-100 border-2 border-blue-500'
                          : 'bg-white border border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                      }`}
                    >
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {codeSet.name || 'Unnamed CodeSystem'}
                      </div>
                      <div className="text-xs text-gray-400 font-mono truncate mt-0.5">
                        {codeSet.url}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {(codeSet.concepts || []).length} concept{(codeSet.concepts || []).length !== 1 ? 's' : ''}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT PANEL: CodeSystem Workspace */}
        <div className="flex-1 flex flex-col bg-white">
          {/* Messages */}
          {isSaving && (
            <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border-b border-blue-200 text-blue-700 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Saving...</span>
            </div>
          )}
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

          {/* Workspace Content */}
          {!selectedCodeSet ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center max-w-md">
                <div className="text-6xl mb-4">📋</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No CodeSystem Selected</h3>
                <p className="text-sm text-gray-600">
                  Select a code system from the left panel to view and manage its concepts
                </p>
              </div>
            </div>
          ) : (
            <ConceptTable
              concepts={selectedCodeSet.concepts || []}
              systemName={selectedCodeSet.name || selectedCodeSet.url}
              systemUrl={selectedCodeSet.url}
              onEditConcept={handleEditConcept}
              onAddConcept={handleAddConcept}
              onDeleteCodeSystem={() => handleDeleteCodeSet(selectedCodeSet.url)}
            />
          )}
        </div>
      </div>

      {/* Concept Drawer */}
      {selectedCodeSet && (
        <ConceptDrawer
          isOpen={isDrawerOpen}
          concept={editingConcept}
          systemUrl={selectedCodeSet.url}
          systemName={selectedCodeSet.name || selectedCodeSet.url}
          allConcepts={selectedCodeSet.concepts || []}
          isReferenced={conceptReferenceInfo?.isReferenced || false}
          referenceInfo={conceptReferenceInfo?.referenceDetails}
          onClose={handleCloseDrawer}
          onSave={handleSaveConcept}
          onDelete={handleDeleteConcept}
        />
      )}

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
