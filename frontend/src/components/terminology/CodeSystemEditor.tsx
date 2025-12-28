/**
 * CodeSystemEditor - Phase 1 CodeSystem Editor
 * 
 * 2-column layout:
 * - Left: Concept list
 * - Right: Concept editor
 * 
 * Phase 1: Code + Display ONLY
 * No constraints panel, no advanced fields
 */

import React, { useState, useEffect } from 'react';
import { ConceptListPanel } from './ConceptListPanel';
import { ConceptEditorPanel } from './ConceptEditorPanel';
import { listCodeSystems, saveCodeSystem } from '../../api/codeSystemApi';
import type { CodeSet, CodeSetConcept } from '../../types/codeSystem';

interface CodeSystemEditorProps {
  projectId: string;
  codeSystemUrl: string;
}

export const CodeSystemEditor: React.FC<CodeSystemEditorProps> = ({
  projectId,
  codeSystemUrl,
}) => {
  const [codeSet, setCodeSet] = useState<CodeSet | null>(null);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load CodeSystem on mount
  useEffect(() => {
    loadCodeSystem();
  }, [projectId, codeSystemUrl]);

  const loadCodeSystem = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const systems = await listCodeSystems(projectId);
      const found = systems.find((s) => s.url === codeSystemUrl);
      if (found) {
        setCodeSet(found);
        // Auto-select first concept
        if (found.concepts.length > 0 && !selectedCode) {
          setSelectedCode(found.concepts[0].code);
        }
      } else {
        setError('CodeSystem not found');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load CodeSystem');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddConcept = () => {
    if (!codeSet) return;

    const newCode = `NEW_${Date.now()}`;
    const newConcept: CodeSetConcept = {
      code: newCode,
      display: 'New Concept',
    };

    const updated = {
      ...codeSet,
      concepts: [...codeSet.concepts, newConcept],
    };

    setCodeSet(updated);
    setSelectedCode(newCode);
  };

  const handleSaveConcept = async (updatedConcept: CodeSetConcept) => {
    if (!codeSet) return;

    const conceptIndex = codeSet.concepts.findIndex((c) => c.code === selectedCode);
    if (conceptIndex === -1) return;

    const updatedConcepts = [...codeSet.concepts];
    updatedConcepts[conceptIndex] = updatedConcept;

    const updated = {
      ...codeSet,
      concepts: updatedConcepts,
    };

    try {
      await saveCodeSystem(projectId, updated);
      setCodeSet(updated);
      setSelectedCode(updatedConcept.code);
    } catch (err) {
      alert(`Failed to save: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleDeleteConcept = async (code: string) => {
    if (!codeSet) return;

    const updatedConcepts = codeSet.concepts.filter((c) => c.code !== code);
    const updated = {
      ...codeSet,
      concepts: updatedConcepts,
    };

    try {
      await saveCodeSystem(projectId, updated);
      setCodeSet(updated);
      setSelectedCode(updatedConcepts.length > 0 ? updatedConcepts[0].code : null);
    } catch (err) {
      alert(`Failed to delete: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (!codeSet) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <p className="text-sm text-gray-500">No CodeSystem loaded</p>
      </div>
    );
  }

  const selectedConcept = codeSet.concepts.find((c) => c.code === selectedCode) || null;

  return (
    <div className="flex h-full">
      {/* Left: Concept List (1/3 width) */}
      <div className="w-1/3 min-w-[250px]">
        <ConceptListPanel
          concepts={codeSet.concepts}
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
          systemUrl={codeSet.url}
          allConcepts={codeSet.concepts}
          onSave={handleSaveConcept}
          onDelete={handleDeleteConcept}
        />
      </div>
    </div>
  );
};
