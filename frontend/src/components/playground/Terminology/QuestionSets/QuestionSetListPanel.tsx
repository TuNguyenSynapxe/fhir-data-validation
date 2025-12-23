import React from 'react';
import type { QuestionSetDto } from './questionSet.types';
import { questionSetsApi } from '../../../../api/questionSetsApi';

interface QuestionSetListPanelProps {
  projectId: string;
  selectedQuestionSetId: string | null;
  onSelectQuestionSet: (questionSet: QuestionSetDto | null) => void;
  refreshTrigger: number;
}

export const QuestionSetListPanel: React.FC<QuestionSetListPanelProps> = ({
  projectId,
  selectedQuestionSetId,
  onSelectQuestionSet,
  refreshTrigger,
}) => {
  const [questionSets, setQuestionSets] = React.useState<QuestionSetDto[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [deleteConfirm, setDeleteConfirm] = React.useState<string | null>(null);

  const loadQuestionSets = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await questionSetsApi.getQuestionSets(projectId);
      setQuestionSets(data.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err: any) {
      setError(err.message || 'Failed to load question sets');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  React.useEffect(() => {
    loadQuestionSets();
  }, [loadQuestionSets, refreshTrigger]);

  const handleDelete = async (id: string) => {
    try {
      await questionSetsApi.deleteQuestionSet(projectId, id);
      if (selectedQuestionSetId === id) {
        onSelectQuestionSet(null);
      }
      loadQuestionSets();
      setDeleteConfirm(null);
    } catch (err: any) {
      setError(err.message || 'Failed to delete question set');
    }
  };

  const filteredQuestionSets = questionSets.filter((qs) => {
    const matchesSearch =
      !searchTerm ||
      qs.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      qs.id.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  return (
    <div className="w-80 border-r border-gray-200 bg-gray-50 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Question Sets</h2>

        {/* Search */}
        <input
          type="text"
          placeholder="🔍 Search..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 mb-3"
        />

        {/* New Question Set Button */}
        <button
          onClick={() => onSelectQuestionSet(null)}
          className="w-full px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
        >
          ＋ New Question Set
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-auto">
        {loading && <div className="p-4 text-sm text-gray-500 text-center">Loading...</div>}

        {error && <div className="p-4 text-sm text-red-600">Error: {error}</div>}

        {!loading && !error && filteredQuestionSets.length === 0 && (
          <div className="p-4 text-sm text-gray-500 text-center">
            {searchTerm ? 'No matching question sets' : 'No question sets yet'}
          </div>
        )}

        {!loading &&
          filteredQuestionSets.map((questionSet) => (
            <div
              key={questionSet.id}
              className={`border-b border-gray-200 hover:bg-gray-100 cursor-pointer transition-colors ${
                selectedQuestionSetId === questionSet.id ? 'bg-blue-50' : 'bg-white'
              }`}
            >
              <div onClick={() => onSelectQuestionSet(questionSet)} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {questionSet.name}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {questionSet.questions.length} question
                      {questionSet.questions.length !== 1 ? 's' : ''}
                    </div>
                    {questionSet.description && (
                      <div className="text-xs text-gray-500 mt-1 truncate">
                        {questionSet.description}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirm(questionSet.id);
                    }}
                    className="ml-2 text-gray-400 hover:text-red-600"
                    title="Delete question set"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              {/* Delete Confirmation */}
              {deleteConfirm === questionSet.id && (
                <div className="px-4 pb-3 bg-red-50 border-t border-red-200">
                  <p className="text-xs text-red-700 mb-2">Delete this question set?</p>
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(questionSet.id);
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
        {filteredQuestionSets.length} of {questionSets.length} question set
        {questionSets.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
};
