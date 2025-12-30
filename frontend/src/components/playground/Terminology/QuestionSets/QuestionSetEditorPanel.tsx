import React from 'react';
import { Plus, Upload, Copy, Trash2, Settings, Lock, AlertCircle, Loader2, GripVertical } from 'lucide-react';
import type { QuestionSetDto, QuestionSetQuestionRefDto } from './questionSet.types';
import { questionSetsApi } from '../../../../api/questionSetsApi';
import { questionsApi } from '../../../../api/questionsApi';
import { AddQuestionsDrawer } from './AddQuestionsDrawer';
import { ConfigureQuestionDrawer } from './ConfigureQuestionDrawer';
import { ImportQuestionsDrawer } from './ImportQuestionsDrawer';
import { ConfirmDialog } from './ConfirmDialog';
import type { CodeSetConceptDto } from '../../../../api/terminologyApi';
import type { QuestionDto } from '../../../../api/questionsApi';

/**
 * StackedAnswerCell - Displays multiple answers stacked vertically with expand/collapse
 */
interface StackedAnswerCellProps {
  answers: string[];
  maxVisible?: number;
}

const StackedAnswerCell: React.FC<StackedAnswerCellProps> = ({ answers, maxVisible = 2 }) => {
  const [isExpanded, setIsExpanded] = React.useState(false);

  if (answers.length === 0 || (answers.length === 1 && answers[0] === 'N/A')) {
    return <span className="text-sm text-gray-400 italic">N/A</span>;
  }

  const visibleAnswers = isExpanded ? answers : answers.slice(0, maxVisible);
  const hiddenCount = answers.length - maxVisible;

  return (
    <div className="flex flex-col gap-1">
      {visibleAnswers.map((answer, idx) => (
        <div key={idx} className="text-xs text-gray-700 leading-relaxed break-words">
          {answer}
        </div>
      ))}
      {!isExpanded && hiddenCount > 0 && (
        <button
          onClick={() => setIsExpanded(true)}
          className="text-sm text-blue-600 hover:text-blue-800 text-left mt-0.5"
        >
          +{hiddenCount} more ▾
        </button>
      )}
      {isExpanded && answers.length > maxVisible && (
        <button
          onClick={() => setIsExpanded(false)}
          className="text-sm text-blue-600 hover:text-blue-800 text-left mt-0.5"
        >
          Show fewer answers ▴
        </button>
      )}
    </div>
  );
};

interface QuestionSetEditorPanelProps {
  projectId: string;
  selectedQuestionSet: QuestionSetDto | null | undefined;
  onSave: () => void;
  onCancel: () => void;
}

export const QuestionSetEditorPanel: React.FC<QuestionSetEditorPanelProps> = ({
  projectId,
  selectedQuestionSet,
  onSave,
  onCancel,
}) => {
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [showAddDrawer, setShowAddDrawer] = React.useState(false);
  const [showImportDrawer, setShowImportDrawer] = React.useState(false);
  const [showConfigureDrawer, setShowConfigureDrawer] = React.useState(false);
  const [editingQuestion, setEditingQuestion] = React.useState<QuestionDto | null>(null);
  const [currentView, setCurrentView] = React.useState<'questions' | 'answers'>('questions');
  const [showDeleteQuestionSetConfirm, setShowDeleteQuestionSetConfirm] = React.useState(false);
  const [showDeleteQuestionConfirm, setShowDeleteQuestionConfirm] = React.useState(false);
  const [questionToDelete, setQuestionToDelete] = React.useState<{ index: number; text: string } | null>(null);

  // Auto-hide success message
  React.useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const handleCopyId = () => {
    if (selectedQuestionSet?.id) {
      navigator.clipboard.writeText(selectedQuestionSet.id);
      setSuccessMessage('ID copied to clipboard');
    }
  };

  const handleRemoveQuestion = async (questionIndex: number) => {
    if (!selectedQuestionSet) return;

    const question = selectedQuestionSet.questions[questionIndex]?.question;
    const questionText = question?.metadata?.text || 'this question';

    setQuestionToDelete({ index: questionIndex, text: questionText });
    setShowDeleteQuestionConfirm(true);
  };

  const confirmRemoveQuestion = async () => {
    if (!selectedQuestionSet || !questionToDelete) return;

    const updatedQuestions = selectedQuestionSet.questions.filter((_, idx) => idx !== questionToDelete.index);
    
    setIsSaving(true);
    setError(null);

    try {
      await questionSetsApi.updateQuestionSet(projectId, selectedQuestionSet.id, {
        name: selectedQuestionSet.name,
        description: selectedQuestionSet.description,
        questions: updatedQuestions,
        terminologyUrl: '',
      });
      alert(`✅ Question removed successfully!`);
      onSave();
    } catch (err: any) {
      setError(err.message || 'Failed to remove question');
    } finally {
      setIsSaving(false);
      setQuestionToDelete(null);
    }
  };

  const handleDeleteQuestionSet = async () => {
    if (!selectedQuestionSet) return;

    setIsSaving(true);
    setError(null);

    try {
      await questionSetsApi.deleteQuestionSet(projectId, selectedQuestionSet.id);
      setSuccessMessage('Question set deleted');
      onSave(); // Trigger list refresh
      onCancel(); // Navigate away after successful deletion
    } catch (err: any) {
      setError(err.message || 'Failed to delete question set');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddQuestions = async (concepts: CodeSetConceptDto[], terminologyUrl: string) => {
    if (!selectedQuestionSet) return;

    setIsSaving(true);
    setError(null);

    try {
      // Step 1: Create Question entities for each concept
      const createdQuestions = await Promise.all(
        concepts.map(async (concept) => {
          const questionDto = await questionsApi.createQuestion(projectId, {
            code: {
              system: terminologyUrl,
              code: concept.code,
              display: concept.display,
            },
            answerType: 'String',
            text: concept.display || concept.code,
            description: undefined,
            unit: undefined,
            constraints: undefined,
            valueSet: undefined,
          });
          return questionDto;
        })
      );

      // Step 2: Create question references using the created question IDs
      const newQuestions = createdQuestions.map(q => ({
        questionId: q.id,
        required: false,
      }));

      const updatedQuestions = [...selectedQuestionSet.questions, ...newQuestions];

      // Step 3: Update the question set with the new references
      await questionSetsApi.updateQuestionSet(projectId, selectedQuestionSet.id, {
        name: selectedQuestionSet.name,
        description: selectedQuestionSet.description,
        terminologyUrl: terminologyUrl,
        questions: updatedQuestions,
      });
      
      alert(`✅ Added ${concepts.length} question${concepts.length !== 1 ? 's' : ''} successfully!`);
      onSave();
    } catch (err: any) {
      setError(err.message || 'Failed to add questions');
    } finally {
      setIsSaving(false);
      setShowAddDrawer(false);
    }
  };

  const handleImportQuestions = async (questionIds: string[]) => {
    if (!selectedQuestionSet) return;

    setIsSaving(true);
    setError(null);

    try {
      const newQuestions = questionIds.map(id => ({
        questionId: id,
        required: false,
      }));

      const updatedQuestions = [...selectedQuestionSet.questions, ...newQuestions];

      await questionSetsApi.updateQuestionSet(projectId, selectedQuestionSet.id, {
        name: selectedQuestionSet.name,
        description: selectedQuestionSet.description,
        questions: updatedQuestions,
        terminologyUrl: '',
      });
      
      alert(`✅ Imported ${questionIds.length} question${questionIds.length !== 1 ? 's' : ''} successfully!`);
      onSave();
    } catch (err: any) {
      setError(err.message || 'Failed to import questions');
    } finally {
      setIsSaving(false);
      setShowImportDrawer(false);
    }
  };

  const parseEnumConfig = (question: QuestionDto | null | undefined) => {
    if (!question?.constraints?.regex) return null;

    try {
      const config = JSON.parse(question.constraints.regex);
      if (config.allowedValues && Array.isArray(config.allowedValues)) {
        return {
          allowedValues: config.allowedValues,
          allowMultiple: config.allowMultiple === true,
          separator: config.separator || ',',
        };
      }
    } catch {
      // Invalid JSON, return null
    }
    return null;
  };

  const formatEnumSummary = (enumConfig: { allowedValues: string[]; allowMultiple: boolean; separator: string }) => {
    const count = enumConfig.allowedValues.length;
    
    if (count === 0) {
      return 'No values';
    }

    if (count === 1) {
      return '1 value';
    }

    return `${count} values`;
  };

  /**
   * Truncates a string to a maximum length and adds ellipsis if truncated.
   * Returns an object with the display text and whether truncation occurred.
   */
  const _truncateWithEllipsis = (text: string, maxChars: number = 28): { displayText: string; isTruncated: boolean } => {
    if (text.length <= maxChars) {
      return { displayText: text, isTruncated: false };
    }
    return { displayText: text.substring(0, maxChars) + '…', isTruncated: true };
  };

  // Memoized transformation for Answers View - ONE ROW PER QUESTION
  const answersViewRows = React.useMemo(() => {
    if (!selectedQuestionSet) return [];

    const rows: Array<{
      questionNumber: number;
      questionText: string;
      answers: string[]; // Array of answer values (not merged)
      answerType: string;
      notes: string;
    }> = [];

    selectedQuestionSet.questions.forEach((questionRef, index) => {
      const question = questionRef.question;
      if (!question) return;

      const questionNumber = index + 1;
      const questionText = question.metadata?.text || 'Loading...';
      const answerType = question.answerType || 'Not set';

      // Check if this is a String enum question
      const enumConfig = question.answerType === 'String' ? parseEnumConfig(question) : null;

      if (enumConfig && enumConfig.allowedValues.length > 0) {
        // Store answers as array
        rows.push({
          questionNumber,
          questionText,
          answers: enumConfig.allowedValues,
          answerType: enumConfig.allowMultiple ? 'String (Enum, multi)' : 'String (Enum)',
          notes: '',
        });
      } else {
        // Non-enum question: N/A
        rows.push({
          questionNumber,
          questionText,
          answers: ['N/A'],
          answerType,
          notes: 'Not applicable for this answer view',
        });
      }
    });

    return rows;
  }, [selectedQuestionSet]);

  const getQuestionStatus = (questionRef: QuestionSetQuestionRefDto) => {
    const question = questionRef.question;
    if (!question) {
      return {
        label: 'Loading',
        color: 'bg-gray-100 text-gray-600',
        icon: Loader2,
      };
    }

    const hasCode = question.code?.code && question.code?.system;
    const hasAnswerType = question.answerType && question.answerType !== '';
    const hasText = question.metadata?.text && question.metadata.text.trim() !== '';

    // For String answer type, check if enum values are configured
    let hasEnumValues = true;
    if (question.answerType === 'String') {
      const enumConfig = parseEnumConfig(question);
      if (enumConfig && enumConfig.allowedValues.length === 0) {
        hasEnumValues = false;
      }
    }

    if (hasCode && hasAnswerType && hasText && hasEnumValues) {
      return {
        label: 'Configured',
        color: 'bg-green-100 text-green-700',
        icon: undefined,
      };
    }

    return {
      label: 'Incomplete',
      color: 'bg-amber-100 text-amber-700',
      icon: AlertCircle,
    };
  };

  // Empty state - no question set selected
  if (selectedQuestionSet === undefined) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">📝</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Question Set Selected</h3>
          <p className="text-sm text-gray-600">
            Select a question set from the left panel to view and manage its questions
          </p>
        </div>
      </div>
    );
  }

  // Create new question set state
  if (selectedQuestionSet === null) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">✨</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Create Question Set</h3>
          <p className="text-sm text-gray-600 mb-4">
            Question Set creation flow coming soon. For now, use the existing creation modal.
          </p>
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  const questions = selectedQuestionSet.questions || [];

  return (
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

      {/* Section 1: Header (Very Light) */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{selectedQuestionSet.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs text-gray-500">
                Question Set · {questions.length} question{questions.length !== 1 ? 's' : ''}
              </p>
            </div>
            {selectedQuestionSet.id && (
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xs text-gray-400 font-mono">{selectedQuestionSet.id}</p>
                <button
                  onClick={handleCopyId}
                  className="p-0.5 text-gray-400 hover:text-gray-600"
                  title="Copy ID"
                >
                  <Copy className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setShowDeleteQuestionSetConfirm(true)}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-red-700 bg-white border border-red-300 rounded hover:bg-red-50 transition-colors disabled:opacity-50"
                title="Delete Question Set"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
              <button
                onClick={() => setShowImportDrawer(true)}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors disabled:opacity-50"
                title="Import Questions"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Import</span>
              </button>
              <button
                onClick={() => setShowAddDrawer(true)}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
                title="Add Questions"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Questions</span>
              </button>
            </div>
            
            {/* View Toggle - positioned below action buttons */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">View:</span>
              <div className="inline-flex rounded shadow-sm" role="group">
                <button
                  type="button"
                  onClick={() => setCurrentView('questions')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-l border transition-colors ${
                    currentView === 'questions'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Questions
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentView('answers')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-r border-t border-r border-b transition-colors ${
                    currentView === 'answers'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Answers
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Question List (Primary Content) */}
      <div className="flex-1 overflow-auto">{currentView === 'questions' ? (
        // Questions View (existing table)
        questions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="text-6xl mb-4">📋</div>
            <p className="text-sm font-medium text-gray-900 mb-1">No questions yet</p>
            <p className="text-sm text-gray-500 mb-4">Add questions from terminology or import from file</p>
            <button
              onClick={() => setShowAddDrawer(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Questions
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-12">
                  <GripVertical className="w-4 h-4 text-gray-400" />
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-16">
                  #
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Question Text
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-32">
                  Answer Type
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-28">
                  Status
                </th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider w-40">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {questions.map((questionRef, index) => {
                const status = getQuestionStatus(questionRef);
                const question = questionRef.question;
                const isLocked = false; // TODO: Implement lock detection via API
                
                return (
                  <tr key={index} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2.5">
                      <button
                        className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
                        title="Drag to reorder"
                      >
                        <GripVertical className="w-4 h-4" />
                      </button>
                    </td>
                    <td className="px-4 py-2.5 text-sm text-gray-500 font-medium">
                      {index + 1}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2">
                            <span className="text-sm text-gray-900 break-words">
                              {question?.metadata?.text || 'Loading...'}
                            </span>
                            {isLocked && (
                              <Lock
                                className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5"
                              />
                            )}
                          </div>
                          {question && (
                            <div className="text-xs text-gray-400 font-mono mt-0.5 truncate">
                              {question.code?.code} · {question.code?.system?.split('/').pop() || question.code?.system}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <div>
                        {(() => {
                          const enumConfig = question?.answerType === 'String' ? parseEnumConfig(question) : null;
                          const answerTypeLabel = question?.answerType || '';
                          
                          // Show "String (Enum, multi)" if allowMultiple
                          let displayLabel = answerTypeLabel;
                          if (enumConfig) {
                            displayLabel = enumConfig.allowMultiple 
                              ? 'String (Enum, multi)' 
                              : 'String (Enum)';
                          }

                          return (
                            <>
                              <div className="text-sm text-gray-900">
                                {displayLabel || <span className="text-gray-400 italic">Not set</span>}
                              </div>
                              {enumConfig && (
                                <div
                                  className="text-xs text-gray-500 mt-0.5"
                                  title={enumConfig.allowedValues.length > 0 
                                    ? enumConfig.allowedValues.join(enumConfig.separator + ' ') 
                                    : undefined
                                  }
                                >
                                  {formatEnumSummary(enumConfig)}
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${status.color}`}
                      >
                        {status.icon && <status.icon className="w-3 h-3" />}
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            if (question) {
                              setEditingQuestion(question);
                              setShowConfigureDrawer(true);
                            }
                          }}
                          disabled={!question}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 rounded hover:bg-blue-100 transition-colors disabled:opacity-50"
                        >
                          <Settings className="w-3 h-3" />
                          <span>Configure</span>
                        </button>
                        <button
                          onClick={() => handleRemoveQuestion(index)}
                          disabled={isSaving}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-700 bg-red-50 rounded hover:bg-red-100 transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Remove</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )
      ) : (
        // Answers View (new read-only table)
        <>
          <div className="px-4 py-3 bg-blue-50 border-b border-blue-100">
            <p className="text-xs text-blue-700">
              This view shows all possible answers across questions for review and QA. Editing is done in Questions View.
            </p>
          </div>
          {answersViewRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <div className="text-6xl mb-4">📋</div>
              <p className="text-sm font-medium text-gray-900 mb-1">No answers to display</p>
              <p className="text-sm text-gray-500">Add questions to see their possible answer values here</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-20">
                    Question #
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Question Text
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Answer Value
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-40">
                    Answer Type
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-56">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {answersViewRows.map((row, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2.5 text-sm text-gray-700 font-medium">
                      {row.questionNumber}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-sm text-gray-900">{row.questionText}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <StackedAnswerCell answers={row.answers} maxVisible={2} />
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-sm text-gray-700">{row.answerType}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      {row.notes && (
                        <span className="text-xs text-gray-500 italic">{row.notes}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
      </div>

      {/* Add Questions Drawer */}
      <AddQuestionsDrawer
        isOpen={showAddDrawer}
        onClose={() => setShowAddDrawer(false)}
        onAddQuestions={handleAddQuestions}
        projectId={projectId}
      />

      {/* Import Questions Drawer */}
      <ImportQuestionsDrawer
        isOpen={showImportDrawer}
        onClose={() => setShowImportDrawer(false)}
        onImport={handleImportQuestions}
        projectId={projectId}
        terminologyUrl={selectedQuestionSet.terminologyUrl || ''}
      />

      {/* Configure Question Drawer */}
      {editingQuestion && (
        <ConfigureQuestionDrawer
          isOpen={showConfigureDrawer}
          onClose={() => {
            setShowConfigureDrawer(false);
            setEditingQuestion(null);
          }}
          onSave={() => {
            setSuccessMessage('Question updated');
            setShowConfigureDrawer(false);
            setEditingQuestion(null);
            onSave(); // Refresh to get updated data, will stay in current question set
          }}
          projectId={projectId}
          question={editingQuestion}
          isLocked={false} // TODO: Implement lock detection logic
          lockReason={undefined}
        />
      )}

      {/* Delete Question Set Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteQuestionSetConfirm}
        onClose={() => setShowDeleteQuestionSetConfirm(false)}
        onConfirm={handleDeleteQuestionSet}
        title="Delete Question Set"
        message={`Are you sure you want to delete "${selectedQuestionSet.name}"?`}
        confirmLabel="Delete"
        isDangerous={true}
      />

      {/* Delete Question Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteQuestionConfirm}
        onClose={() => {
          setShowDeleteQuestionConfirm(false);
          setQuestionToDelete(null);
        }}
        onConfirm={confirmRemoveQuestion}
        title="Remove Question"
        message={`Are you sure you want to remove "${questionToDelete?.text}" from this question set?`}
        confirmLabel="Remove"
        isDangerous={true}
      />
    </div>
  );
};
