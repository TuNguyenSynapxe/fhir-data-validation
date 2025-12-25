/**
 * Question Authoring Screen
 * Single Progressive Screen - Main Component
 */

import React from 'react';
import { Search, Plus, Trash2, Copy, GripVertical, Info, X, Lock } from 'lucide-react';
import type {
  QuestionAuthoringState,
  StagedQuestion,
  AnswerType,
  AnswerMode,
} from './questionAuthoring.types';
import { listCodeSystems, type CodeSetDto } from '../../../../api/terminologyApi';
import { questionsApi, type CreateQuestionDto } from '../../../../api/questionsApi';
import { questionSetsApi, type CreateQuestionSetDto } from '../../../../api/questionSetsApi';

interface QuestionAuthoringScreenProps {
  projectId: string;
}

export const QuestionAuthoringScreen: React.FC<QuestionAuthoringScreenProps> = ({ projectId }) => {
  // Main state
  const [state, setState] = React.useState<QuestionAuthoringState>({
    questionSet: {
      name: '',
      description: '',
    },
    isQuestionSetSaved: false,
    activeTab: 'terminology',
    stagedQuestions: [],
  });

  const [errors, setErrors] = React.useState<{ [key: string]: string }>({});
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);

  // Add CSS animation for highlight effect
  React.useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @keyframes highlightFade {
        0% { background-color: rgb(239, 246, 255); }
        100% { background-color: transparent; }
      }
      .animate-pulse-once {
        animation: highlightFade 2s ease-out forwards;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // ============================================================================
  // SECTION A - QUESTION SET INFO
  // ============================================================================

  const handleQuestionSetChange = (field: 'name' | 'description', value: string) => {
    setState((prev) => ({
      ...prev,
      questionSet: {
        ...prev.questionSet,
        [field]: value,
      },
    }));
    // Clear error
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSaveQuestionSet = () => {
    // Validate
    const newErrors: { [key: string]: string } = {};
    if (!state.questionSet.name.trim()) {
      newErrors.name = 'Question Set name is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Mark as saved (enables Section B and C)
    setState((prev) => ({
      ...prev,
      isQuestionSetSaved: true,
    }));
    setErrors({});
  };

  // ============================================================================
  // SECTION B - ADD QUESTIONS (TERMINOLOGY TAB)
  // ============================================================================

  const [codeSystems, setCodeSystems] = React.useState<CodeSetDto[]>([]);
  const [selectedSystemUrl, setSelectedSystemUrl] = React.useState('');
  const [selectedSystem, setSelectedSystem] = React.useState<CodeSetDto | null>(null);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedConceptCodes, setSelectedConceptCodes] = React.useState<Set<string>>(new Set());
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  // Load code systems on mount
  React.useEffect(() => {
    const loadSystems = async () => {
      try {
        const systems = await listCodeSystems(projectId);
        setCodeSystems(systems);
      } catch (err) {
        console.error('Failed to load code systems:', err);
      }
    };
    loadSystems();
  }, [projectId]);

  const handleSystemChange = (url: string) => {
    setSelectedSystemUrl(url);
    const system = codeSystems.find((cs) => cs.url === url);
    setSelectedSystem(system || null);
    setSelectedConceptCodes(new Set());
    setSearchTerm('');
  };

  const handleToggleConceptSelection = (code: string) => {
    setSelectedConceptCodes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(code)) {
        newSet.delete(code);
      } else {
        newSet.add(code);
      }
      return newSet;
    });
  };

  const handleSelectAllVisible = (concepts: CodeSetDto['concepts']) => {
    setSelectedConceptCodes(new Set(concepts.map((c) => c.code)));
  };

  const handleDeselectAll = () => {
    setSelectedConceptCodes(new Set());
  };

  const handleAddSelectedConcepts = () => {
    if (!selectedSystem) return;

    const conceptsToAdd = selectedSystem.concepts.filter((c) =>
      selectedConceptCodes.has(c.code)
    );

    const newStaged: StagedQuestion[] = conceptsToAdd.map((concept, index) => ({
      stagingId: `staged-${Date.now()}-${Math.random()}`,
      text: concept.display || concept.code,
      answerType: 'EnumeratedString' as AnswerType,
      answerMode: 'enumerated-string' as AnswerMode,
      code: {
        system: selectedSystemUrl,
        code: concept.code,
        display: concept.display,
      },
      sourceType: 'terminology',
      isNewlyAdded: true, // Mark for highlight animation
      isLocked: index === 0, // TESTING: Lock the first question to demo lock UI
      enumConfig: {
        allowedValues: [],
        allowMultiple: false,
      },
    }));

    setState((prev) => ({
      ...prev,
      stagedQuestions: [...prev.stagedQuestions, ...newStaged],
    }));

    // Clear selection
    setSelectedConceptCodes(new Set());

    // Auto-scroll to Section C after a brief delay
    setTimeout(() => {
      const sectionC = document.querySelector('[data-section="section-c"]');
      if (sectionC) {
        sectionC.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);

    // Remove highlight flag after animation duration
    setTimeout(() => {
      setState((prev) => ({
        ...prev,
        stagedQuestions: prev.stagedQuestions.map((q) => ({
          ...q,
          isNewlyAdded: false,
        })),
      }));
    }, 2000);
  };

  // Client-side filtering of concepts
  const getFilteredConcepts = () => {
    if (!selectedSystem) return [];
    
    let concepts = [...selectedSystem.concepts];
    
    // Sort alphabetically by display (fallback to code)
    concepts.sort((a, b) => {
      const aText = (a.display || a.code).toLowerCase();
      const bText = (b.display || b.code).toLowerCase();
      return aText.localeCompare(bText);
    });

    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      concepts = concepts.filter(
        (c) =>
          c.code.toLowerCase().includes(search) ||
          c.display?.toLowerCase().includes(search) ||
          selectedSystemUrl.toLowerCase().includes(search)
      );
    }

    return concepts;
  };

  // Get visible concepts (first 20-30 by default, or all if ≤50)
  const getVisibleConcepts = () => {
    const filtered = getFilteredConcepts();
    
    // If filtered by search, show all results
    if (searchTerm) return filtered;
    
    // If ≤50 concepts, show all
    if (filtered.length <= 50) return filtered;
    
    // Otherwise show first 30
    return filtered.slice(0, 30);
  };

  const visibleConcepts = getVisibleConcepts();
  const totalConcepts = selectedSystem?.concepts.length || 0;
  const showDrawerButton = totalConcepts > 300;

  // ============================================================================
  // SECTION B - ADD QUESTIONS (MANUAL TAB)
  // ============================================================================

  const [manualForm, setManualForm] = React.useState({
    text: '',
    answerType: 'EnumeratedString' as AnswerType,
    answerMode: 'enumerated-string' as AnswerMode,
  });

  const handleAddManualQuestion = () => {
    if (!manualForm.text.trim()) {
      alert('Question text is required');
      return;
    }

    const newStaged: StagedQuestion = {
      stagingId: `staged-${Date.now()}-${Math.random()}`,
      text: manualForm.text,
      answerType: manualForm.answerType,
      answerMode: manualForm.answerMode,
      sourceType: 'manual',
      enumConfig: {
        allowedValues: [],
        allowMultiple: false,
      },
    };

    setState((prev) => ({
      ...prev,
      stagedQuestions: [...prev.stagedQuestions, newStaged],
    }));

    // Reset form
    setManualForm({
      text: '',
      answerType: 'EnumeratedString',
      answerMode: 'enumerated-string',
    });
  };

  // ============================================================================
  // SECTION C - CONFIGURE QUESTIONS
  // ============================================================================

  const handleUpdateQuestion = (stagingId: string, updates: Partial<StagedQuestion>) => {
    setState((prev) => ({
      ...prev,
      stagedQuestions: prev.stagedQuestions.map((q) =>
        q.stagingId === stagingId ? { ...q, ...updates } : q
      ),
    }));
  };

  const handleRemoveQuestion = (stagingId: string) => {
    setState((prev) => ({
      ...prev,
      stagedQuestions: prev.stagedQuestions.filter((q) => q.stagingId !== stagingId),
    }));
  };

  const handleDuplicateQuestion = (stagingId: string) => {
    const question = state.stagedQuestions.find((q) => q.stagingId === stagingId);
    if (!question) return;

    const duplicated: StagedQuestion = {
      ...question,
      stagingId: `staged-${Date.now()}-${Math.random()}`,
      text: `${question.text} (Copy)`,
    };

    setState((prev) => ({
      ...prev,
      stagedQuestions: [...prev.stagedQuestions, duplicated],
    }));
  };

  const handleAddAnswerOption = (stagingId: string) => {
    setState((prev) => ({
      ...prev,
      stagedQuestions: prev.stagedQuestions.map((q) => {
        if (q.stagingId !== stagingId) return q;
        const currentConfig = q.enumConfig || { allowedValues: [], allowMultiple: false };
        return {
          ...q,
          enumConfig: {
            ...currentConfig,
            allowedValues: [...currentConfig.allowedValues, ''],
          },
        };
      }),
    }));
  };

  const handleUpdateAnswerOption = (
    stagingId: string,
    index: number,
    field: 'value' | 'label',
    value: string
  ) => {
    // Only handle 'value' field for enumConfig
    if (field !== 'value') return;

    setState((prev) => ({
      ...prev,
      stagedQuestions: prev.stagedQuestions.map((q) => {
        if (q.stagingId !== stagingId || !q.enumConfig) return q;
        const values = [...q.enumConfig.allowedValues];
        values[index] = value.trim(); // Auto-trim whitespace
        return {
          ...q,
          enumConfig: { ...q.enumConfig, allowedValues: values },
        };
      }),
    }));
  };

  const handleRemoveAnswerOption = (stagingId: string, index: number) => {
    setState((prev) => ({
      ...prev,
      stagedQuestions: prev.stagedQuestions.map((q) => {
        if (q.stagingId !== stagingId || !q.enumConfig) return q;
        const values = q.enumConfig.allowedValues.filter((_, i) => i !== index);
        return {
          ...q,
          enumConfig: { ...q.enumConfig, allowedValues: values },
        };
      }),
    }));
  };

  const handleToggleAllowMultiple = (stagingId: string, allowMultiple: boolean) => {
    setState((prev) => ({
      ...prev,
      stagedQuestions: prev.stagedQuestions.map((q) => {
        if (q.stagingId !== stagingId || !q.enumConfig) return q;
        return {
          ...q,
          enumConfig: {
            ...q.enumConfig,
            allowMultiple,
            // Set default separator when enabling multiple, clear when disabling
            multipleValueSeparator: allowMultiple ? ',' : undefined,
          },
        };
      }),
    }));
  };

  const handleChangeSeparator = (stagingId: string, separator: ',' | '|' | ';') => {
    setState((prev) => ({
      ...prev,
      stagedQuestions: prev.stagedQuestions.map((q) => {
        if (q.stagingId !== stagingId || !q.enumConfig) return q;
        return {
          ...q,
          enumConfig: {
            ...q.enumConfig,
            multipleValueSeparator: separator,
          },
        };
      }),
    }));
  };

  const handleBulkAddValues = (stagingId: string, bulkText: string) => {
    setState((prev) => ({
      ...prev,
      stagedQuestions: prev.stagedQuestions.map((q) => {
        if (q.stagingId !== stagingId || !q.enumConfig) return q;
        
        // Split by newline, trim, and remove empties
        const newValues = bulkText
          .split('\n')
          .map(line => line.trim())
          .filter(line => line !== '');
        
        // Remove duplicates within new values
        const uniqueNewValues = [...new Set(newValues)];
        
        // Filter out values that already exist
        const existingValues = new Set(q.enumConfig.allowedValues);
        const valuesToAdd = uniqueNewValues.filter(v => !existingValues.has(v));
        
        return {
          ...q,
          enumConfig: {
            ...q.enumConfig,
            allowedValues: [...q.enumConfig.allowedValues, ...valuesToAdd],
          },
        };
      }),
    }));
  };

  // ============================================================================
  // SAVE BEHAVIOR
  // ============================================================================

  const handleSaveAll = async () => {
    // Warn if questions are incomplete
    const incomplete = state.stagedQuestions.filter((q) => {
      if (!q.text.trim()) return true;
      if (q.answerMode === 'enumerated-string' && (!q.answerOptions || q.answerOptions.length === 0))
        return true;
      if (q.answerMode === 'coded-manual' && !q.codedAnswer?.code) return true;
      if (q.answerMode === 'external-valueset' && !q.valueSetBinding?.url) return true;
      return false;
    });

    if (incomplete.length > 0) {
      const proceed = confirm(
        `${incomplete.length} question(s) are incomplete. Continue saving?`
      );
      if (!proceed) return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      // Step 1: Create/update Question Set
      let questionSetId = state.questionSet.id;
      if (!questionSetId) {
        const qsDto: CreateQuestionSetDto = {
          name: state.questionSet.name,
          description: state.questionSet.description,
          terminologyUrl: '', // For now, not required in this flow
          questions: [], // Will be updated after questions are created
        };
        const created = await questionSetsApi.createQuestionSet(projectId, qsDto);
        questionSetId = created.id;
      }

      // Step 2: Create/update Questions
      const questionRefs: { questionId: string; required: boolean }[] = [];
      for (const staged of state.stagedQuestions) {
        // Skip if from terminology and already has sourceId (already exists)
        let questionId = staged.sourceId;

        if (!questionId) {
          // Create new question
          const dto: CreateQuestionDto = {
            code: staged.code || { system: 'http://example.org/local', code: staged.stagingId, display: staged.text },
            answerType: staged.answerType,
            text: staged.text,
            description: staged.description,
            unit: undefined, // Not handled in this UI yet
            constraints: {
              min: staged.numericConstraints?.min,
              max: staged.numericConstraints?.max,
              precision: staged.numericConstraints?.precision,
              maxLength: staged.stringConstraints?.maxLength,
              regex: staged.stringConstraints?.regex,
            },
            valueSet: staged.valueSetBinding
              ? {
                  url: staged.valueSetBinding.url,
                  bindingStrength: staged.valueSetBinding.bindingStrength,
                }
              : undefined,
          };
          const created = await questionsApi.createQuestion(projectId, dto);
          questionId = created.id;
        }

        questionRefs.push({ questionId, required: false }); // Default to optional
      }

      // Step 3: Update Question Set with question references
      if (questionSetId) {
        const updateDto: CreateQuestionSetDto = {
          id: questionSetId,
          name: state.questionSet.name,
          description: state.questionSet.description,
          terminologyUrl: '',
          questions: questionRefs,
        };
        await questionSetsApi.updateQuestionSet(projectId, questionSetId, updateDto);
      }

      alert('Question Set saved successfully!');

      // Reset state
      setState({
        questionSet: { name: '', description: '' },
        isQuestionSetSaved: false,
        activeTab: 'terminology',
        stagedQuestions: [],
      });
    } catch (error: any) {
      const message = error.response?.data?.error || error.message || 'Failed to save';
      setSaveError(message);
    } finally {
      setIsSaving(false);
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  const sectionBEnabled = state.isQuestionSetSaved;
  const sectionCVisible = state.stagedQuestions.length > 0;

  return (
    <div className="h-full overflow-auto bg-gray-50">
      <div className="max-w-7xl mx-auto p-6 space-y-10">
        {/* SECTION A: QUESTION SET INFO */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Section A — Question Set Info (Required)
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Question Set Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={state.questionSet.name}
                onChange={(e) => handleQuestionSetChange('name', e.target.value)}
                disabled={state.isQuestionSetSaved}
                placeholder="e.g., Vital Signs Assessment"
                className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                } ${state.isQuestionSetSaved ? 'bg-gray-100' : ''}`}
              />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description (Optional)
              </label>
              <textarea
                value={state.questionSet.description}
                onChange={(e) => handleQuestionSetChange('description', e.target.value)}
                disabled={state.isQuestionSetSaved}
                placeholder="Brief description of this question set..."
                rows={3}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 ${
                  state.isQuestionSetSaved ? 'bg-gray-100' : ''
                }`}
              />
            </div>

            {!state.isQuestionSetSaved && (
              <button
                onClick={handleSaveQuestionSet}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
              >
                Save & Continue
              </button>
            )}

            {state.isQuestionSetSaved && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                  ✓
                </div>
                Question Set saved. Continue adding questions below.
              </div>
            )}
          </div>
        </div>

        {/* Helper text when not saved */}
        {!state.isQuestionSetSaved && (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">Create a Question Set to start adding questions</p>
          </div>
        )}

        {/* SECTION B: ADD QUESTIONS */}
        {sectionBEnabled && (
          <div
            className={`bg-white border border-gray-200 rounded-lg p-6 shadow-sm ${
              !sectionBEnabled ? 'opacity-50 pointer-events-none' : ''
            }`}
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Section B — Add Questions
            </h2>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-gray-200 mb-4">
              <button
                onClick={() => setState((prev) => ({ ...prev, activeTab: 'terminology' }))}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  state.activeTab === 'terminology'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Terminology
              </button>
              <button
                onClick={() => setState((prev) => ({ ...prev, activeTab: 'manual' }))}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  state.activeTab === 'manual'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Manual
              </button>
              <button
                onClick={() => setState((prev) => ({ ...prev, activeTab: 'import' }))}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  state.activeTab === 'import'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Import
              </button>
            </div>

            {/* TERMINOLOGY TAB */}
            {state.activeTab === 'terminology' && (
              <div className="space-y-5">
                {/* Grouped control row: System selector + Search */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      System
                    </label>
                    <select
                      value={selectedSystemUrl}
                      onChange={(e) => handleSystemChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select a system...</option>
                      {codeSystems.map((cs) => (
                        <option key={cs.url} value={cs.url}>
                          {cs.name || cs.url} ({cs.concepts.length} concepts)
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedSystemUrl && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Search
                      </label>
                      <div className="relative">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          placeholder="Filter by code or display..."
                          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Inline concepts table - visible by default */}
                {selectedSystemUrl && (
                  <>
                    {totalConcepts === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <p className="text-sm">No concepts found for this system.</p>
                      </div>
                    ) : (
                      <>
                        {/* Section label with selection indicator */}
                        <div className="flex items-center justify-between">
                          <div className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                            Available concepts
                          </div>
                          {selectedConceptCodes.size > 0 && (
                            <div className="text-sm font-medium text-blue-600 flex items-center gap-1.5">
                              <span className="text-green-600">✓</span>
                              <span>{selectedConceptCodes.size} selected</span>
                            </div>
                          )}
                        </div>

                        <div className="border border-gray-300 rounded-md overflow-hidden">
                          <div className="overflow-x-auto max-h-80">
                            <table className="w-full text-sm">
                              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                                <tr>
                                  <th className="px-4 py-2.5 text-left w-12">
                                    <input
                                      type="checkbox"
                                      checked={
                                        visibleConcepts.length > 0 &&
                                        visibleConcepts.every((c) =>
                                          selectedConceptCodes.has(c.code)
                                        )
                                      }
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          handleSelectAllVisible(visibleConcepts);
                                        } else {
                                          handleDeselectAll();
                                        }
                                      }}
                                      title="Select all visible"
                                    />
                                  </th>
                                  <th className="px-4 py-2.5 text-left">Code</th>
                                  <th className="px-4 py-2.5 text-left">Display</th>
                                  <th className="px-4 py-2.5 text-left text-xs text-gray-500">
                                    System
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {visibleConcepts.map((concept) => (
                                  <tr
                                    key={concept.code}
                                    className="border-b border-gray-200 hover:bg-gray-50 transition-colors"
                                  >
                                    <td className="px-4 py-2">
                                      <input
                                        type="checkbox"
                                        checked={selectedConceptCodes.has(concept.code)}
                                        onChange={() =>
                                          handleToggleConceptSelection(concept.code)
                                        }
                                      />
                                    </td>
                                    <td className="px-4 py-2 font-mono text-xs">
                                      {concept.code}
                                    </td>
                                    <td className="px-4 py-2">
                                      {concept.display || concept.code}
                                    </td>
                                    <td
                                      className="px-4 py-2 text-xs text-gray-500 truncate max-w-xs cursor-help"
                                      title={selectedSystemUrl}
                                    >
                                      {selectedSystemUrl.split('/').pop() || selectedSystemUrl}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Footer info and browse button */}
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <div>
                            Showing {visibleConcepts.length} concept
                            {visibleConcepts.length !== 1 ? 's' : ''}
                            {searchTerm && ` of ${totalConcepts} total`}
                          </div>

                          {/* Browse all button for large vocabularies */}
                          {showDrawerButton && (
                            <button
                              onClick={() => setDrawerOpen(true)}
                              className="text-blue-600 hover:text-blue-700 underline"
                            >
                              Browse all concepts →
                            </button>
                          )}
                        </div>

                        {/* Sticky action row with selection feedback */}
                        <div className="sticky bottom-0 bg-white border-t-2 border-blue-200 rounded-md p-4 shadow-sm">
                          <div className="flex items-center justify-between">
                            <div className="text-sm text-gray-700">
                              {selectedConceptCodes.size > 0 ? (
                                <span className="flex items-center gap-2">
                                  <span className="text-green-600">✓</span>
                                  <strong>{selectedConceptCodes.size}</strong>{' '}
                                  question{selectedConceptCodes.size !== 1 ? 's' : ''} selected
                                </span>
                              ) : (
                                <span className="text-gray-500">No questions selected</span>
                              )}
                            </div>
                            <button
                              onClick={handleAddSelectedConcepts}
                              disabled={selectedConceptCodes.size === 0}
                              className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                            >
                              {selectedConceptCodes.size === 0
                                ? 'Add to Question Set'
                                : `Add ${selectedConceptCodes.size} Question${selectedConceptCodes.size !== 1 ? 's' : ''}`}
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            )}

            {/* MANUAL TAB */}
            {state.activeTab === 'manual' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Question Text <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={manualForm.text}
                    onChange={(e) => setManualForm({ ...manualForm, text: e.target.value })}
                    placeholder="Enter question text..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Answer Type
                    </label>
                    <select
                      value={manualForm.answerType}
                      onChange={(e) =>
                        setManualForm({ ...manualForm, answerType: e.target.value as AnswerType })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="String">String</option>
                      <option value="Integer">Integer</option>
                      <option value="Decimal">Decimal</option>
                      <option value="Boolean">Boolean</option>
                      <option value="Date">Date</option>
                      <option value="DateTime">DateTime</option>
                      <option value="Time">Time</option>
                      <option value="EnumeratedString">Enumerated String</option>
                      <option value="Coded">Coded</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Answer Mode
                    </label>
                    <select
                      value={manualForm.answerMode}
                      onChange={(e) =>
                        setManualForm({ ...manualForm, answerMode: e.target.value as AnswerMode })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="string">String</option>
                      <option value="numeric">Numeric</option>
                      <option value="boolean">Boolean</option>
                      <option value="date-time">Date/Time</option>
                      <option value="enumerated-string">Enumerated String</option>
                      <option value="coded-manual">Coded (Manual)</option>
                      <option value="external-valueset">External ValueSet</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={handleAddManualQuestion}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Question
                </button>
              </div>
            )}

            {/* IMPORT TAB */}
            {state.activeTab === 'import' && (
              <div className="text-center py-8 text-gray-500">
                <p className="text-sm">Import functionality coming soon</p>
              </div>
            )}
          </div>
        )}

        {/* SECTION C: CONFIGURE QUESTIONS */}
        {sectionCVisible && (
          <div
            data-section="section-c"
            className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Section C — Configure Questions
            </h2>
            
            {/* Ordering hint */}
            <p className="text-xs text-gray-500 mb-4">
              Drag rows to reorder how questions appear in the form.
            </p>

            <div className="space-y-3">{state.stagedQuestions.map((question, index) => (
                <QuestionConfigRow
                  key={question.stagingId}
                  question={question}
                  index={index}
                  onUpdate={(updates) => handleUpdateQuestion(question.stagingId, updates)}
                  onRemove={() => handleRemoveQuestion(question.stagingId)}
                  onDuplicate={() => handleDuplicateQuestion(question.stagingId)}
                  onAddAnswerOption={() => handleAddAnswerOption(question.stagingId)}
                  onUpdateAnswerOption={handleUpdateAnswerOption}
                  onRemoveAnswerOption={handleRemoveAnswerOption}
                  onToggleAllowMultiple={handleToggleAllowMultiple}
                  onChangeSeparator={handleChangeSeparator}
                  onBulkAddValues={handleBulkAddValues}
                />
              ))}
            </div>
          </div>
        )}

        {/* SAVE ALL */}
        {sectionCVisible && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            {saveError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-700">{saveError}</p>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {state.stagedQuestions.length} question(s) configured
              </div>
              <button
                onClick={handleSaveAll}
                disabled={isSaving}
                className="px-6 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Question Set'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Drawer for large vocabularies */}
      {drawerOpen && selectedSystem && (
        <ConceptBrowserDrawer
          system={selectedSystem}
          selectedCodes={selectedConceptCodes}
          onConfirm={(codes) => {
            setSelectedConceptCodes(codes);
            setDrawerOpen(false);
          }}
          onClose={() => setDrawerOpen(false)}
        />
      )}
    </div>
  );
};

// ============================================================================
// CONCEPT BROWSER DRAWER (for >300 concepts)
// ============================================================================

interface ConceptBrowserDrawerProps {
  system: CodeSetDto;
  selectedCodes: Set<string>;
  onConfirm: (codes: Set<string>) => void;
  onClose: () => void;
}

const ConceptBrowserDrawer: React.FC<ConceptBrowserDrawerProps> = ({
  system,
  selectedCodes: initialSelected,
  onConfirm,
  onClose,
}) => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedCodes, setSelectedCodes] = React.useState<Set<string>>(
    new Set(initialSelected)
  );

  const handleToggle = (code: string) => {
    setSelectedCodes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(code)) {
        newSet.delete(code);
      } else {
        newSet.add(code);
      }
      return newSet;
    });
  };

  const handleSelectAll = (concepts: typeof system.concepts) => {
    setSelectedCodes(new Set(concepts.map((c) => c.code)));
  };

  const handleDeselectAll = () => {
    setSelectedCodes(new Set());
  };

  const filteredConcepts = system.concepts
    .filter((c) => {
      if (!searchTerm) return true;
      const search = searchTerm.toLowerCase();
      return (
        c.code.toLowerCase().includes(search) ||
        c.display?.toLowerCase().includes(search)
      );
    })
    .sort((a, b) => {
      const aText = (a.display || a.code).toLowerCase();
      const bText = (b.display || b.code).toLowerCase();
      return aText.localeCompare(bText);
    });

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />

      {/* Drawer */}
      <div className="absolute right-0 top-0 bottom-0 w-2/3 bg-white shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Browse All Concepts</h2>
            <p className="text-sm text-gray-500 mt-1">
              {system.name || system.url} — {system.concepts.length} concepts
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Search */}
        <div className="p-6 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by code or display..."
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Concept list */}
        <div className="flex-1 overflow-auto p-6">
          <div className="border border-gray-300 rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left w-12">
                    <input
                      type="checkbox"
                      checked={
                        filteredConcepts.length > 0 &&
                        filteredConcepts.every((c) => selectedCodes.has(c.code))
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          handleSelectAll(filteredConcepts);
                        } else {
                          handleDeselectAll();
                        }
                      }}
                      title="Select all visible"
                    />
                  </th>
                  <th className="px-4 py-3 text-left">Code</th>
                  <th className="px-4 py-3 text-left">Display</th>
                </tr>
              </thead>
              <tbody>
                {filteredConcepts.map((concept) => (
                  <tr
                    key={concept.code}
                    className="border-b border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedCodes.has(concept.code)}
                        onChange={() => handleToggle(concept.code)}
                      />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{concept.code}</td>
                    <td className="px-4 py-3">{concept.display || concept.code}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {selectedCodes.size} concept{selectedCodes.size !== 1 ? 's' : ''} selected
            </div>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => onConfirm(selectedCodes)}
                disabled={selectedCodes.size === 0}
                className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm selection
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// QUESTION CONFIG ROW COMPONENT
// ============================================================================

interface QuestionConfigRowProps {
  question: StagedQuestion;
  index: number;
  onUpdate: (updates: Partial<StagedQuestion>) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onAddAnswerOption: () => void;
  onUpdateAnswerOption: (stagingId: string, index: number, field: 'value' | 'label', value: string) => void;
  onRemoveAnswerOption: (stagingId: string, index: number) => void;
  onToggleAllowMultiple: (stagingId: string, allowMultiple: boolean) => void;
  onChangeSeparator: (stagingId: string, separator: ',' | '|' | ';') => void;
  onBulkAddValues: (stagingId: string, bulkText: string) => void;
}

const QuestionConfigRow: React.FC<QuestionConfigRowProps> = ({
  question,
  index,
  onUpdate,
  onRemove,
  onDuplicate,
  onAddAnswerOption,
  onUpdateAnswerOption,
  onRemoveAnswerOption,
  onToggleAllowMultiple,
  onChangeSeparator,
  onBulkAddValues,
}) => {
  const [expanded, setExpanded] = React.useState(false);
  const [bulkAddOpen, setBulkAddOpen] = React.useState(false);
  const [bulkAddText, setBulkAddText] = React.useState('');

  const handleBulkAddSubmit = () => {
    if (!bulkAddText.trim()) {
      alert('Please enter at least one value');
      return;
    }
    
    // Count valid lines
    const validLines = bulkAddText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line !== '');
    
    if (validLines.length === 0) {
      alert('No valid values found');
      return;
    }
    
    onBulkAddValues(question.stagingId, bulkAddText);
    setBulkAddOpen(false);
    setBulkAddText('');
  };

  // Determine configuration status
  const isConfigured = () => {
    if (question.answerMode === 'enumerated-string') {
      // Check for enumConfig with at least one non-empty value
      return question.enumConfig &&
        question.enumConfig.allowedValues.length > 0 &&
        question.enumConfig.allowedValues.some(v => v.trim() !== '');
    }
    if (question.answerMode === 'coded-manual') {
      return question.codedAnswer?.code;
    }
    if (question.answerMode === 'external-valueset') {
      return question.valueSetBinding?.url;
    }
    // Other modes don't require additional configuration
    return true;
  };

  const configured = isConfigured();

  // Generate collapsed summary text
  const getCollapsedSummary = () => {
    const parts: string[] = [];
    
    // Answer type
    parts.push(getCombinedAnswerType());
    
    // Enum-specific: value count and multiplicity
    if (question.answerMode === 'enumerated-string' && question.enumConfig) {
      const valueCount = question.enumConfig.allowedValues.filter(v => v.trim() !== '').length;
      
      if (valueCount === 0) {
        parts.push('⚠ No values configured');
      } else {
        parts.push(`${valueCount} value${valueCount !== 1 ? 's' : ''}`);
        
        // Multiplicity
        if (question.enumConfig.allowMultiple) {
          const sep = question.enumConfig.multipleValueSeparator || ',';
          parts.push(`Multiple (${sep})`);
        } else {
          parts.push('Single');
        }
      }
    }
    
    return parts.join(' · ');
  };

  // Combined Answer Type options
  const getCombinedAnswerType = () => {
    if (question.answerMode === 'coded-manual') return 'Coded (Manual)';
    if (question.answerMode === 'external-valueset') return 'Coded (ValueSet)';
    if (question.answerMode === 'enumerated-string') return 'String (Enum)';
    if (question.answerMode === 'string') return 'String (Free)';
    if (question.answerMode === 'numeric') return 'Number';
    if (question.answerMode === 'boolean') return 'Boolean';
    if (question.answerMode === 'date-time') return 'Date/Time';
    return 'String (Free)';
  };

  const handleCombinedAnswerTypeChange = (value: string) => {
    // Prevent changes if question is locked
    if (question.isLocked) return;

    switch (value) {
      case 'Coded (Manual)':
        onUpdate({ answerType: 'Coded', answerMode: 'coded-manual' });
        break;
      case 'Coded (ValueSet)':
        onUpdate({ answerType: 'Coded', answerMode: 'external-valueset' });
        break;
      case 'String (Free)':
        onUpdate({ answerType: 'String', answerMode: 'string' });
        break;
      case 'String (Enum)':
        onUpdate({ answerType: 'EnumeratedString', answerMode: 'enumerated-string' });
        break;
      case 'Number':
        onUpdate({ answerType: 'Integer', answerMode: 'numeric' });
        break;
      case 'Boolean':
        onUpdate({ answerType: 'Boolean', answerMode: 'boolean' });
        break;
      case 'Date/Time':
        onUpdate({ answerType: 'DateTime', answerMode: 'date-time' });
        break;
    }
  };

  return (
    <div
      className={`border border-gray-200 rounded-md transition-all ${
        question.isNewlyAdded
          ? 'ring-2 ring-blue-400 bg-blue-50 animate-pulse-once'
          : ''
      }`}
    >
      {/* Header Row */}
      <div className="flex items-center gap-3 p-4 bg-gray-50">
        <GripVertical className="w-4 h-4 text-gray-400 cursor-move" />
        <span className="text-sm font-medium text-gray-600 w-8">{index + 1}</span>

        {/* Status indicator */}
        <span
          className="text-lg cursor-help"
          title={configured ? '🟢 Ready to use' : '🟡 Needs configuration'}
        >
          {configured ? '🟢' : '🟡'}
        </span>

        {/* Question Text */}
        <input
          type="text"
          value={question.text}
          onChange={(e) => onUpdate({ text: e.target.value })}
          placeholder="Question text..."
          className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
        />

        {/* Collapsed Summary */}
        {!expanded && (
          <div className="flex items-center gap-2 text-xs text-gray-500 mr-2">
            <span>{getCollapsedSummary()}</span>
            {question.isLocked && (
              <span
                className="text-gray-400"
                title="Question Locked\nThis question is referenced by validation rules or mappings.\n\nYou cannot change:\n• Answer type\n• Code\n• System\n\nYou can still edit:\n• Question text\n• Description\n• Allowed values"
              >
                <Lock className="w-3.5 h-3.5" />
              </span>
            )}
          </div>
        )}

        {/* Combined Answer Type */}
        <div className="relative flex items-center gap-1">
          {question.isLocked && (
            <span
              className="text-gray-400 cursor-help"
              title="Question Locked\nThis question is referenced by validation rules or mappings.\n\nYou cannot change:\n• Answer type\n• Code\n• System\n\nYou can still edit:\n• Question text\n• Description\n• Allowed values"
            >
              <Lock className="w-4 h-4" />
            </span>
          )}
          <select
            value={getCombinedAnswerType()}
            onChange={(e) => handleCombinedAnswerTypeChange(e.target.value)}
            disabled={question.isLocked}
            className={`px-2 py-1 text-sm border border-gray-300 rounded w-56 focus:ring-2 focus:ring-blue-500 ${
              question.isLocked ? 'opacity-60 cursor-not-allowed bg-gray-50' : ''
            }`}
            title={
              question.isLocked
                ? 'This field is locked because the question is already used by validation rules.'
                : getCombinedAnswerType() !== 'String (Enum)'
                ? 'Only String (Enum) is supported in v1. Other types coming soon.'
                : ''
            }
          >
            <option value="String (Enum)">String (Enum)</option>
            <option value="Coded (Manual)" disabled>Coded (Manual) — Coming soon</option>
            <option value="Coded (ValueSet)" disabled>Coded (ValueSet) — Coming soon</option>
            <option value="String (Free)" disabled>String (Free) — Coming soon</option>
            <option value="Number" disabled>Number — Coming soon</option>
            <option value="Boolean" disabled>Boolean — Coming soon</option>
            <option value="Date/Time" disabled>Date/Time — Coming soon</option>
          </select>
        </div>

        {/* Actions */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="px-2 py-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
        >
          {expanded ? 'Collapse' : 'Configure'}
        </button>
        <button
          onClick={onDuplicate}
          className="p-1 text-gray-300 hover:text-gray-600 transition-colors"
          title="Duplicate"
        >
          <Copy className="w-4 h-4" />
        </button>
        <button
          onClick={onRemove}
          className="p-1 text-red-300 hover:text-red-600 transition-colors"
          title="Remove"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Expanded Configuration */}
      {expanded && (
        <div className="p-4 border-t border-gray-200 bg-white space-y-4">
          {/* Question Metadata (Code + System) */}
          {question.code && (
            <div className={`text-xs space-y-1 pb-2 border-b border-gray-100 ${
              question.isLocked ? 'text-gray-600' : 'text-gray-500'
            }`}>
              <div className="flex items-center gap-2">
                {question.isLocked && (
                  <span
                    className="text-gray-400 cursor-help"
                    title="Question Locked\nThis question is referenced by validation rules or mappings.\n\nYou cannot change:\n• Answer type\n• Code\n• System\n\nYou can still edit:\n• Question text\n• Description\n• Allowed values"
                  >
                    <Lock className="w-3 h-3" />
                  </span>
                )}
                <span className="font-medium">Code:</span>
                <span className="font-mono">{question.code.code}</span>
              </div>
              {question.code.system && (
                <div className="flex gap-2 ml-5">
                  <span className="font-medium">System:</span>
                  <span className="font-mono truncate" title={question.code.system}>
                    {question.code.system}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* V1 Scope Warning */}
          {question.answerMode !== 'enumerated-string' && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded text-sm">
              <span className="text-amber-600 font-semibold">⚠️</span>
              <div className="flex-1 text-amber-800">
                <strong>Unsupported Answer Type:</strong> This question uses a future answer type that is not yet fully supported in v1. Configuration options are read-only for now.
              </div>
            </div>
          )}
          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={question.description || ''}
              onChange={(e) => onUpdate({ description: e.target.value })}
              rows={2}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
            />
          </div>

          {/* Enumerated String Options */}
          {question.answerMode === 'enumerated-string' && (
            <div className="space-y-4">
              {/* Allowed Values Editor */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-gray-700">Allowed Values</label>
                  <div className="flex gap-2">
                    <button
                      onClick={onAddAnswerOption}
                      className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      + Add Value
                    </button>
                    <button
                      onClick={() => setBulkAddOpen(true)}
                      className="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
                    >
                      Bulk Add...
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  {question.enumConfig?.allowedValues.map((value, i) => {
                    const isDuplicate = question.enumConfig!.allowedValues.filter(v => v === value && v.trim() !== '').length > 1;
                    const isEmpty = value.trim() === '';
                    const hasError = isDuplicate || isEmpty;
                    
                    return (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={value}
                          onChange={(e) =>
                            onUpdateAnswerOption(question.stagingId, i, 'value', e.target.value)
                          }
                          placeholder="Enter value..."
                          className={`flex-1 px-2 py-1 text-sm border rounded ${
                            hasError ? 'border-red-500 bg-red-50' : 'border-gray-300'
                          }`}
                        />
                        <button
                          onClick={() => onRemoveAnswerOption(question.stagingId, i)}
                          className="p-1 text-red-400 hover:text-red-600"
                          title="Remove value"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                  {question.enumConfig?.allowedValues.length === 0 && (
                    <p className="text-xs text-gray-500 italic">No values defined yet. Click "+ Add Value" to start.</p>
                  )}
                </div>
                {/* Validation Messages */}
                {question.enumConfig && (
                  <>
                    {question.enumConfig.allowedValues.some(v => v.trim() === '') && (
                      <p className="text-xs text-red-600 mt-1">⚠️ Empty values are not allowed</p>
                    )}
                    {question.enumConfig.allowedValues.some((v, _, arr) =>
                      v.trim() !== '' && arr.filter(x => x === v).length > 1
                    ) && (
                      <p className="text-xs text-red-600 mt-1">⚠️ Duplicate values are not allowed</p>
                    )}
                  </>
                )}
              </div>

              {/* Multiple Value Toggle */}
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded border border-gray-200">
                <input
                  type="checkbox"
                  id={`allow-multiple-${question.stagingId}`}
                  checked={question.enumConfig?.allowMultiple || false}
                  onChange={(e) => onToggleAllowMultiple(question.stagingId, e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <label
                  htmlFor={`allow-multiple-${question.stagingId}`}
                  className="text-sm font-medium text-gray-700 cursor-pointer"
                >
                  Allow multiple values
                </label>
              </div>

              {/* Separator Selector (Conditional) */}
              {question.enumConfig?.allowMultiple && (
                <div className="p-3 bg-blue-50 rounded border border-blue-200">
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    Separator used between values:
                  </label>
                  <div className="space-y-2">
                    {[
                      { value: ',', label: 'Comma', symbol: ',' },
                      { value: '|', label: 'Pipe', symbol: '|' },
                      { value: ';', label: 'Semicolon', symbol: ';' },
                    ].map((option) => (
                      <label
                        key={option.value}
                        className="flex items-center gap-2 cursor-pointer text-sm"
                      >
                        <input
                          type="radio"
                          name={`separator-${question.stagingId}`}
                          value={option.value}
                          checked={question.enumConfig?.multipleValueSeparator === option.value}
                          onChange={() => onChangeSeparator(question.stagingId, option.value as ',' | '|' | ';')}
                          className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-gray-700">
                          {option.label} <code className="px-1 py-0.5 bg-white rounded text-xs">{option.symbol}</code>
                        </span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-gray-600 mt-2 italic">
                    Example: {question.enumConfig.allowedValues.slice(0, 3).filter(v => v.trim()).join(question.enumConfig.multipleValueSeparator || ',')}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Bulk Add Modal */}
          {bulkAddOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Bulk Add Allowed Values</h3>
                </div>

                {/* Body */}
                <div className="px-6 py-4 flex-1 overflow-y-auto">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Enter one value per line
                  </label>
                  <textarea
                    value={bulkAddText}
                    onChange={(e) => setBulkAddText(e.target.value)}
                    rows={12}
                    placeholder={'Enter one value per line\nExample:\nYes\nNo\nUnknown'}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                  <p className="text-xs text-gray-600 mt-2">
                    Each non-empty line will be converted into an allowed value. Duplicates will be automatically removed.
                  </p>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setBulkAddOpen(false);
                      setBulkAddText('');
                    }}
                    className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleBulkAddSubmit}
                    className="px-4 py-2 text-sm text-white bg-blue-600 rounded hover:bg-blue-700"
                  >
                    Add Values
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Coded (Manual) - Hidden in v1 */}
          {question.answerMode === 'coded-manual' && false && (
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Code</label>
                <input
                  type="text"
                  value={question.codedAnswer?.code || ''}
                  onChange={(e) =>
                    onUpdate({
                      codedAnswer: { ...question.codedAnswer, code: e.target.value, display: question.codedAnswer?.display || '' },
                    })
                  }
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Display</label>
                <input
                  type="text"
                  value={question.codedAnswer?.display || ''}
                  onChange={(e) =>
                    onUpdate({
                      codedAnswer: { ...question.codedAnswer, code: question.codedAnswer?.code || '', display: e.target.value },
                    })
                  }
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">System (opt)</label>
                <input
                  type="text"
                  value={question.codedAnswer?.system || ''}
                  onChange={(e) =>
                    onUpdate({
                      codedAnswer: { ...question.codedAnswer, system: e.target.value, code: question.codedAnswer?.code || '', display: question.codedAnswer?.display || '' },
                    })
                  }
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                />
              </div>
            </div>
          )}

          {/* External ValueSet - Hidden in v1 */}
          {question.answerMode === 'external-valueset' && false && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">ValueSet URL</label>
                <input
                  type="text"
                  value={question.valueSetBinding?.url || ''}
                  onChange={(e) =>
                    onUpdate({
                      valueSetBinding: {
                        ...question.valueSetBinding,
                        url: e.target.value,
                        bindingStrength: question.valueSetBinding?.bindingStrength || 'Required',
                      },
                    })
                  }
                  placeholder="http://..."
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                />
              </div>
              <div>
                <label className="flex items-center gap-1 text-xs font-medium text-gray-700 mb-1">
                  Binding Strength
                  <span title="FHIR binding strength">
                    <Info className="w-3 h-3 text-gray-400" />
                  </span>
                </label>
                <select
                  value={question.valueSetBinding?.bindingStrength || 'Required'}
                  onChange={(e) =>
                    onUpdate({
                      valueSetBinding: {
                        ...question.valueSetBinding,
                        url: question.valueSetBinding?.url || '',
                        bindingStrength: e.target.value as any,
                      },
                    })
                  }
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                >
                  <option value="Required">Required</option>
                  <option value="Extensible">Extensible</option>
                  <option value="Preferred">Preferred</option>
                  <option value="Example">Example</option>
                </select>
              </div>
            </div>
          )}

          {/* Numeric Constraints - Hidden in v1 */}
          {question.answerMode === 'numeric' && false && (
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Min</label>
                <input
                  type="number"
                  value={question.numericConstraints?.min || ''}
                  onChange={(e) =>
                    onUpdate({
                      numericConstraints: {
                        ...question.numericConstraints,
                        min: e.target.value ? Number(e.target.value) : undefined,
                      },
                    })
                  }
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Max</label>
                <input
                  type="number"
                  value={question.numericConstraints?.max || ''}
                  onChange={(e) =>
                    onUpdate({
                      numericConstraints: {
                        ...question.numericConstraints,
                        max: e.target.value ? Number(e.target.value) : undefined,
                      },
                    })
                  }
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Precision</label>
                <input
                  type="number"
                  value={question.numericConstraints?.precision || ''}
                  onChange={(e) =>
                    onUpdate({
                      numericConstraints: {
                        ...question.numericConstraints,
                        precision: e.target.value ? Number(e.target.value) : undefined,
                      },
                    })
                  }
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                />
              </div>
            </div>
          )}

          {/* String Constraints - Hidden in v1 */}
          {question.answerMode === 'string' && false && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Max Length</label>
                <input
                  type="number"
                  value={question.stringConstraints?.maxLength || ''}
                  onChange={(e) =>
                    onUpdate({
                      stringConstraints: {
                        ...question.stringConstraints,
                        maxLength: e.target.value ? Number(e.target.value) : undefined,
                      },
                    })
                  }
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Regex</label>
                <input
                  type="text"
                  value={question.stringConstraints?.regex || ''}
                  onChange={(e) =>
                    onUpdate({
                      stringConstraints: {
                        ...question.stringConstraints,
                        regex: e.target.value,
                      },
                    })
                  }
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
