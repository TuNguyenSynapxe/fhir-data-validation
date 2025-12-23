import React from 'react';
import type { QuestionSetFormState } from './questionSet.types';
import { questionsApi, type QuestionDto } from '../../../../api/questionsApi';

interface QuestionSetPreviewPanelProps {
  projectId: string;
  formState: QuestionSetFormState;
}

export const QuestionSetPreviewPanel: React.FC<QuestionSetPreviewPanelProps> = ({
  projectId,
  formState,
}) => {
  const [questions, setQuestions] = React.useState<QuestionDto[]>([]);

  React.useEffect(() => {
    const loadQuestions = async () => {
      try {
        const allQuestions = await questionsApi.getQuestions(projectId);
        setQuestions(allQuestions);
      } catch (err) {
        console.error('Failed to load questions for preview:', err);
      }
    };
    loadQuestions();
  }, [projectId]);

  const getQuestionDetails = (questionId: string) => {
    return questions.find((q) => q.id === questionId);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
      <div className="border-b pb-2">
        <h3 className="text-sm font-semibold text-gray-700">Preview</h3>
      </div>

      <div>
        <div className="text-xs text-gray-500">Question Set</div>
        <div className="text-sm font-medium text-gray-900">
          {formState.name || <span className="text-gray-400 italic">No name</span>}
        </div>
      </div>

      <div>
        <div className="text-xs text-gray-500">ID</div>
        <div className="text-sm font-mono text-gray-700">
          {formState.id || <span className="text-gray-400 italic">No ID</span>}
        </div>
      </div>

      {formState.description && (
        <div>
          <div className="text-xs text-gray-500">Description</div>
          <div className="text-sm text-gray-700">{formState.description}</div>
        </div>
      )}

      {formState.terminologyUrl && (
        <div>
          <div className="text-xs text-gray-500">Terminology</div>
          <div className="text-sm text-gray-700 break-all">{formState.terminologyUrl}</div>
        </div>
      )}

      <div>
        <div className="text-xs text-gray-500 mb-2">
          Questions ({formState.questions.length})
        </div>
        {formState.questions.length === 0 ? (
          <div className="text-sm text-gray-400 italic">No questions selected</div>
        ) : (
          <div className="space-y-2">
            {formState.questions.map((ref, index) => {
              const question = getQuestionDetails(ref.questionId);
              return (
                <div
                  key={ref.questionId}
                  className="text-sm flex items-start gap-2 py-1 border-l-2 border-gray-300 pl-2"
                >
                  <span className="text-gray-500">{index + 1}.</span>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">
                      {question?.code.code || ref.questionId}
                    </div>
                    {question && (
                      <div className="text-xs text-gray-600">{question.metadata.text}</div>
                    )}
                    <div
                      className={`text-xs mt-1 ${
                        ref.required ? 'text-blue-700 font-medium' : 'text-gray-500'
                      }`}
                    >
                      {ref.required ? '✓ Required' : '○ Optional'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
