import React from 'react';
import type { QuestionSetQuestionRefDto } from './questionSet.types';
import { listCodeSystems, type CodeSetDto } from '../../../../api/terminologyApi';
import { questionsApi, type QuestionDto } from '../../../../api/questionsApi';

interface QuestionSetQuestionPickerProps {
  projectId: string;
  selectedTerminologyUrl: string;
  selectedQuestions: QuestionSetQuestionRefDto[];
  onTerminologyChange: (url: string) => void;
  onQuestionsChange: (questions: QuestionSetQuestionRefDto[]) => void;
  errors: { [key: string]: string };
}

export const QuestionSetQuestionPicker: React.FC<QuestionSetQuestionPickerProps> = ({
  projectId,
  selectedTerminologyUrl,
  selectedQuestions,
  onTerminologyChange,
  onQuestionsChange,
  errors,
}) => {
  const [codeSystems, setCodeSystems] = React.useState<CodeSetDto[]>([]);
  const [availableQuestions, setAvailableQuestions] = React.useState<QuestionDto[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Load CodeSystems on mount
  React.useEffect(() => {
    const loadCodeSystems = async () => {
      try {
        const systems = await listCodeSystems(projectId);
        setCodeSystems(systems);
      } catch (err) {
        console.error('Failed to load code systems:', err);
        setError('Failed to load terminology options');
      }
    };
    loadCodeSystems();
  }, [projectId]);

  // Load Questions when terminology is selected
  React.useEffect(() => {
    if (!selectedTerminologyUrl) {
      setAvailableQuestions([]);
      return;
    }

    const loadQuestions = async () => {
      setLoading(true);
      setError(null);
      try {
        const allQuestions = await questionsApi.getQuestions(projectId);
        // Filter questions that belong to the selected terminology
        const filteredQuestions = allQuestions.filter(
          (q) => q.code.system === selectedTerminologyUrl
        );
        setAvailableQuestions(filteredQuestions);
      } catch (err) {
        console.error('Failed to load questions:', err);
        setError('Failed to load questions');
        setAvailableQuestions([]);
      } finally {
        setLoading(false);
      }
    };

    loadQuestions();
  }, [projectId, selectedTerminologyUrl]);

  const handleTerminologyChange = (url: string) => {
    onTerminologyChange(url);
    // Clear selected questions when terminology changes
    onQuestionsChange([]);
  };

  const handleToggleQuestion = (questionId: string) => {
    const existing = selectedQuestions.find((q) => q.questionId === questionId);
    
    if (existing) {
      // Remove question
      onQuestionsChange(selectedQuestions.filter((q) => q.questionId !== questionId));
    } else {
      // Add question (default to optional)
      onQuestionsChange([...selectedQuestions, { questionId, required: false }]);
    }
  };

  const handleToggleRequired = (questionId: string) => {
    onQuestionsChange(
      selectedQuestions.map((q) =>
        q.questionId === questionId ? { ...q, required: !q.required } : q
      )
    );
  };

  const isQuestionSelected = (questionId: string) => {
    return selectedQuestions.some((q) => q.questionId === questionId);
  };

  const getQuestionRequiredStatus = (questionId: string) => {
    return selectedQuestions.find((q) => q.questionId === questionId)?.required || false;
  };

  return (
    <div className="space-y-4">
      {/* Step 1: Select Terminology */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Select Question Terminology <span className="text-red-500">*</span>
        </label>
        <select
          value={selectedTerminologyUrl}
          onChange={(e) => handleTerminologyChange(e.target.value)}
          className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 ${
            errors.terminologyUrl ? 'border-red-500' : 'border-gray-300'
          }`}
        >
          <option value="">Select a terminology...</option>
          {codeSystems.map((cs) => (
            <option key={cs.url} value={cs.url}>
              {cs.name || cs.url} ({cs.concepts.length} codes)
            </option>
          ))}
        </select>
        {errors.terminologyUrl && (
          <p className="text-xs text-red-500 mt-1">{errors.terminologyUrl}</p>
        )}
        <p className="text-xs text-gray-500 mt-1">
          Questions must belong to this terminology
        </p>
      </div>

      {/* Step 2: Select Questions */}
      {selectedTerminologyUrl && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Available Questions <span className="text-red-500">*</span>
          </label>

          {loading && (
            <div className="text-sm text-gray-500 py-4 text-center">Loading questions...</div>
          )}

          {error && (
            <div className="text-sm text-red-600 py-4 text-center">{error}</div>
          )}

          {!loading && !error && availableQuestions.length === 0 && (
            <div className="text-sm text-gray-500 py-4 text-center bg-gray-50 rounded-md border border-gray-200">
              No questions found for this terminology.
              <br />
              Create questions in the Questions tab first.
            </div>
          )}

          {!loading && !error && availableQuestions.length > 0 && (
            <div className="border border-gray-300 rounded-md max-h-64 overflow-y-auto">
              <div className="divide-y">
                {availableQuestions.map((question) => {
                  const isSelected = isQuestionSelected(question.id);
                  const isRequired = getQuestionRequiredStatus(question.id);

                  return (
                    <div
                      key={question.id}
                      className={`p-3 hover:bg-gray-50 transition-colors ${
                        isSelected ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Selection checkbox */}
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleQuestion(question.id)}
                          className="mt-1"
                        />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {question.code.code}
                              </div>
                              <div className="text-xs text-gray-600">
                                {question.metadata.text}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                Type: {question.answerType}
                              </div>
                            </div>

                            {/* Required toggle (only visible if selected) */}
                            {isSelected && (
                              <label className="flex items-center gap-2 text-sm whitespace-nowrap">
                                <input
                                  type="checkbox"
                                  checked={isRequired}
                                  onChange={() => handleToggleRequired(question.id)}
                                  className="rounded"
                                />
                                <span className={isRequired ? 'font-medium text-blue-700' : 'text-gray-600'}>
                                  {isRequired ? 'Required' : 'Optional'}
                                </span>
                              </label>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {errors.questions && (
            <p className="text-xs text-red-500 mt-1">{errors.questions}</p>
          )}
        </div>
      )}

      {/* Selected Summary */}
      {selectedQuestions.length > 0 && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
          <div className="text-sm font-medium text-gray-700 mb-2">
            Selected Questions ({selectedQuestions.length})
          </div>
          <div className="text-xs text-gray-600 space-y-1">
            {selectedQuestions.map((ref) => {
              const question = availableQuestions.find((q) => q.id === ref.questionId);
              return (
                <div key={ref.questionId} className="flex items-center gap-2">
                  <span className="font-mono">{question?.code.code || ref.questionId}</span>
                  <span className={ref.required ? 'text-blue-700 font-medium' : 'text-gray-500'}>
                    ({ref.required ? 'required' : 'optional'})
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
