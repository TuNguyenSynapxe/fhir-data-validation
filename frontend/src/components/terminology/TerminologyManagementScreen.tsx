/**
 * TerminologyManagementScreen - Main container for terminology authoring
 * Phase 3C: Inline editing with save integration
 * 
 * Navigation: Project → Terminology → CodeSystem → Concepts
 * 
 * Layout: Three columns
 * - Left: ConceptListPanel (concept table with inline editing)
 * - Middle: ConceptEditorPanel (concept form with live updates)
 * - Right: ProjectConstraintsPanel (constraint list)
 */

import { useState, useEffect } from 'react';
import type { CodeSystem, CodeSystemConcept, AdvisoryResponse, RuleAdvisory } from '../../types/terminology';
import { LoadingState } from './SupportingComponents';
import { ConceptListPanel } from './ConceptListPanel';
import { ConceptEditorPanel } from './ConceptEditorPanel';
import { AdvisoryPanel } from './AdvisoryPanel';
import { saveCodeSystem, getCodeSystemByUrl } from '../../api/terminologyApi';
import { listConstraints } from '../../api/constraintApi';
import { getAdvisories } from '../../api/advisoryApi';
import { getResultData, logTerminologyError } from '../../utils/terminologyErrors';


interface TerminologyManagementScreenProps {
  /** Project ID (for breadcrumb and data fetching) */
  projectId: string;
  /** CodeSystem URL (identity) */
  codeSystemUrl: string;
  /** Callback to expose current CodeSystem state to parent */
  onCodeSystemLoaded?: (codeSystem: CodeSystem | null) => void;
}

export function TerminologyManagementScreen({
  projectId,
  codeSystemUrl,
  onCodeSystemLoaded,
}: TerminologyManagementScreenProps) {
  // ===== STATE =====
  
  const [selectedConceptCode, setSelectedConceptCode] = useState<string | undefined>(undefined);
  const [codeSystem, setCodeSystem] = useState<CodeSystem | null>(null);
  const [originalCodeSystem, setOriginalCodeSystem] = useState<CodeSystem | null>(null);
  const [advisoryResponse, setAdvisoryResponse] = useState<AdvisoryResponse | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingAdvisories, setIsLoadingAdvisories] = useState(false);
  const [advisoryError, setAdvisoryError] = useState<string | undefined>();
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isAdvisoryPanelCollapsed, setIsAdvisoryPanelCollapsed] = useState(false);

  // ===== COMPUTED STATE =====
  
  const hasUnsavedChanges = codeSystem && originalCodeSystem
    ? JSON.stringify(codeSystem) !== JSON.stringify(originalCodeSystem)
    : false;

  const selectedConcept = selectedConceptCode && codeSystem
    ? findConceptByCode(codeSystem.concept, selectedConceptCode)
    : undefined;

  // ===== EFFECTS =====
  
  // Load CodeSystem from API
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      
      // Fetch real CodeSystem from backend
      const codeSystemResult = await getCodeSystemByUrl(projectId, codeSystemUrl);
      const loadedCodeSystem = getResultData(codeSystemResult);

      if (!loadedCodeSystem) {
        if (!codeSystemResult.success) {
          logTerminologyError(codeSystemResult.error);
        }
        setIsLoading(false);
        return;
      }

      // Load constraints (not used in CodeSet phase, but load for future)
      await listConstraints(projectId);

      setCodeSystem(loadedCodeSystem);
      setOriginalCodeSystem(loadedCodeSystem);
      setIsLoading(false);

      // Load advisories
      loadAdvisories();
    };

    loadData();
  }, [projectId, codeSystemUrl]);

  // Notify parent when CodeSystem is loaded
  useEffect(() => {
    onCodeSystemLoaded?.(codeSystem);
  }, [codeSystem, onCodeSystemLoaded]);

  // Load advisories
  const loadAdvisories = async () => {
    setIsLoadingAdvisories(true);
    setAdvisoryError(undefined);

    const result = await getAdvisories(projectId);

    if (result.success) {
      setAdvisoryResponse(result.data);
    } else {
      logTerminologyError(result.error);
      setAdvisoryError(result.error.message);
    }

    setIsLoadingAdvisories(false);
  };

  // Auto-hide save message after 3 seconds
  useEffect(() => {
    if (saveMessage) {
      const timer = setTimeout(() => setSaveMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [saveMessage]);

  // ===== HANDLERS =====
  
  const handleSelectConcept = (code: string) => {
    setSelectedConceptCode(code);
  };

  const handleConceptUpdate = (oldCode: string, updatedConcept: CodeSystemConcept) => {
    if (!codeSystem) return;

    // Update concept in tree (recursive)
    const updateConceptInTree = (concepts: CodeSystemConcept[]): CodeSystemConcept[] => {
      return concepts.map((concept) => {
        if (concept.code === oldCode) {
          return updatedConcept;
        }
        if (concept.concept) {
          return {
            ...concept,
            concept: updateConceptInTree(concept.concept),
          };
        }
        return concept;
      });
    };

    const updatedCodeSystem = {
      ...codeSystem,
      concept: updateConceptInTree(codeSystem.concept),
    };

    setCodeSystem(updatedCodeSystem);

    // Update selected code if it was renamed
    if (oldCode !== updatedConcept.code && selectedConceptCode === oldCode) {
      
      // Reload advisories after save (in case new broken references)
      loadAdvisories();
      setSelectedConceptCode(updatedConcept.code);
    }
  };

  const handleConceptChange = (concept: CodeSystemConcept) => {
    // Update the concept in the tree
    handleConceptUpdate(concept.code, concept);
  };

  const handleSave = async () => {
    if (!codeSystem) return;

    setIsSaving(true);
    setSaveMessage(null);

    const result = await saveCodeSystem(projectId, codeSystem);

    if (result.success) {
      setOriginalCodeSystem(codeSystem);
      setSaveMessage({ type: 'success', text: 'Changes saved successfully' });
    } else {
      logTerminologyError(result.error);
      setSaveMessage({
        type: 'error',
        text: `Save failed: ${result.error.message}`,
      });
    }

    setIsSaving(false);
  };

  const handleDiscard = () => {
    if (originalCodeSystem) {
      setCodeSystem(originalCodeSystem);
      setSaveMessage({ type: 'success', text: 'Changes discarded' });
    }
  };

  const handleAdvisoryClick = (advisory: RuleAdvisory) => {
    // Navigate to related concept or constraint
    if (advisory.context.code) {
      // Select the concept in the list
      setSelectedConceptCode(advisory.context.code);
    }
    
    // Future: Navigate to constraint editor if constraintId is present
    // if (advisory.context.constraintId) {
    //   openConstraintEditor(advisory.context.constraintId);
    // }
  };

  // ===== RENDER =====

  if (isLoading || !codeSystem) {
    return (
      <div className="flex flex-col h-screen bg-gray-50">
        <LoadingState message="Loading CodeSystem..." />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Save Bar (sticky) */}
      {hasUnsavedChanges && (
        <div className="px-6 py-3 bg-yellow-50 border-b border-yellow-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-yellow-800 font-medium">⚠️ Unsaved changes</span>
            <span className="text-yellow-700 text-sm">
              You have unsaved changes. Save to persist them to the backend.
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleDiscard}
              disabled={isSaving}
              className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
            >
              Discard
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
            >
              {isSaving && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              )}
              <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Save Message Toast */}
      {saveMessage && (
        <div
          className={`fixed top-4 right-4 px-4 py-3 rounded shadow-lg ${
            saveMessage.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
          }`}
        >
          {saveMessage.text}
        </div>
      )}

      {/* Main Content Area (with advisory panel) */}
      <div className="flex-1 flex flex-col overflow-auto">
        {/* Two-Column Layout: Concept List + Editor */}
        <div className="flex-1 grid grid-cols-[1fr_2fr] gap-0 overflow-auto">
          {/* Left Column: Concept List */}
          <ConceptListPanel
            concepts={codeSystem.concept}
            selectedConceptCode={selectedConceptCode}
            onSelectConcept={handleSelectConcept}
            onConceptUpdate={handleConceptUpdate}
            readOnly={false}
          />

          {/* Right Column: Concept Editor */}
          <ConceptEditorPanel
            concept={selectedConcept}
            codeSystemUrl={codeSystemUrl}
            onChange={handleConceptChange}
            readOnly={false}
          />
        </div>

        {/* Advisory Panel (bottom, collapsible) */}
        <AdvisoryPanel
          advisoryResponse={advisoryResponse}
          isLoading={isLoadingAdvisories}
          error={advisoryError}
          onAdvisoryClick={handleAdvisoryClick}
          isCollapsed={isAdvisoryPanelCollapsed}
          onToggleCollapse={() => setIsAdvisoryPanelCollapsed(!isAdvisoryPanelCollapsed)}
        />
      </div>
    </div>
  );
}

// ===== HELPER FUNCTIONS =====

/**
 * Recursively finds a concept by code
 */
function findConceptByCode(
  concepts: CodeSystemConcept[],
  code: string
): CodeSystemConcept | undefined {
  for (const concept of concepts) {
    if (concept.code === code) {
      return concept;
    }
    if (concept.concept) {
      const found = findConceptByCode(concept.concept, code);
      if (found) {
        return found;
      }
    }
  }
  return undefined;
}
