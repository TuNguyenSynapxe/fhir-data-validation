import React from 'react';
import type { QuestionDto } from './question.types';
import { questionsApi } from '../../../../api/questionsApi';

interface QuestionListPanelProps {
  projectId: string;
  selectedQuestionId: string | null;
  onSelectQuestion: (question: QuestionDto | null) => void;
  refreshTrigger: number;
}

export const QuestionListPanel: React.FC<QuestionListPanelProps> = ({
  projectId,
  selectedQuestionId,
  onSelectQuestion,
  refreshTrigger,
}) => {
  const [questions, setQuestions] = React.useState<QuestionDto[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [filterType, setFilterType] = React.useState<string>('');
  const [deleteConfirm, setDeleteConfirm] = React.useState<string | null>(null);

  const loadQuestions = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await questionsApi.getQuestions(projectId);
      setQuestions(data.sort((a, b) => a.code.code.localeCompare(b.code.code)));
    } catch (err: any) {
      setError(err.message || 'Failed to load questions');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  React.useEffect(() => {
    loadQuestions();
  }, [loadQuestions, refreshTrigger]);

  const handleDelete = async (id: string) => {
    try {
      await questionsApi.deleteQuestion(projectId, id);
      if (selectedQuestionId === id) {
        onSelectQuestion(null);
      }
      loadQuestions();
      setDeleteConfirm(null);
    } catch (err: any) {
      setError(err.message || 'Failed to delete question');
    }
  };

  const filteredQuestions = questions.filter((q) => {
    const matchesSearch =
      !searchTerm ||
      q.code.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.code.display?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = !filterType || q.answerType === filterType;

    return matchesSearch && matchesType;
  });

  const answerTypes = Array.from(new Set(questions.map((q) => q.answerType))).sort();

  return (
    <div className="w-80 border-r border-gray-200 bg-gray-50 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Questions</h2>

        {/* Search */}
        <input
          type="text"
          placeholder="🔍 Search..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 mb-2"
        />

        {/* Filter */}
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 mb-3"
        >
          <option value="">All Types</option>
          {answerTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>

        {/* New Question Button */}
        <button
          onClick={() => onSelectQuestion(null)}
          className="w-full px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
        >
          ＋ New Question
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-auto">
        {loading && (
          <div className="p-4 text-sm text-gray-500 text-center">Loading...</div>
        )}

        {error && (
          <div className="p-4 text-sm text-red-600">
            Error: {error}
          </div>
        )}

        {!loading && !error && filteredQuestions.length === 0 && (
          <div className="p-4 text-sm text-gray-500 text-center">
            {searchTerm || filterType ? 'No matching questions' : 'No questions yet'}
          </div>
        )}

        {!loading && filteredQuestions.map((question) => (
          <div
            key={question.id}
            className={`border-b border-gray-200 hover:bg-gray-100 cursor-pointer transition-colors ${
              selectedQuestionId === question.id ? 'bg-blue-50' : 'bg-white'
            }`}
          >
            <div
              onClick={() => onSelectQuestion(question)}
              className="p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {question.code.code}
                  </div>
                  <div className="text-xs text-gray-600 truncate mt-1">
                    {question.metadata.text}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {question.answerType}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteConfirm(question.id);
                  }}
                  className="ml-2 text-gray-400 hover:text-red-600"
                  title="Delete question"
                >
                  🗑️
                </button>
              </div>
            </div>

            {/* Delete Confirmation */}
            {deleteConfirm === question.id && (
              <div className="px-4 pb-3 bg-red-50 border-t border-red-200">
                <p className="text-xs text-red-700 mb-2">Delete this question?</p>
                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(question.id);
                    }}
                    className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Delete
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirm(null);
                    }}
                    className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-200 bg-white text-xs text-gray-500 text-center">
        {filteredQuestions.length} of {questions.length} question{questions.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
};
