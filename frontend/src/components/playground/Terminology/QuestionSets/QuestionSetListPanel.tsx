import React from 'react';
import { Plus, Upload, List, Loader2, Search } from 'lucide-react';
import type { QuestionSetDto } from './questionSet.types';
import { questionSetsApi } from '../../../../api/questionSetsApi';
import { CreateQuestionSetDialog } from './CreateQuestionSetDialog';

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
  const [_deleteConfirm, _setDeleteConfirm] = React.useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = React.useState(false);
  const [isCreating, setIsCreating] = React.useState(false);

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

  const _handleDelete = async (id: string) => {
    try {
      await questionSetsApi.deleteQuestionSet(projectId, id);
      if (selectedQuestionSetId === id) {
        onSelectQuestionSet(null);
      }
      loadQuestionSets();
      _setDeleteConfirm(null);
    } catch (err: any) {
      setError(err.message || 'Failed to delete question set');
    }
  };

  const handleCreate = async (name: string, description?: string) => {
    setIsCreating(true);
    try {
      const newQuestionSet = await questionSetsApi.createQuestionSet(projectId, {
        name,
        description,
        terminologyUrl: '', // Empty for now
        questions: [], // Start with empty list
      });
      
      // Reload the list
      await loadQuestionSets();
      
      // Select the newly created question set
      onSelectQuestionSet(newQuestionSet);
      
      // Show success message
      alert(`✅ Question set "${name}" created successfully!`);
      
      // Close dialog
      setShowCreateDialog(false);
    } catch (err: any) {
      setError(err.message || 'Failed to create question set');
    } finally {
      setIsCreating(false);
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
      <div className="px-3 py-2 border-b border-gray-200 bg-white flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-gray-900 whitespace-nowrap">Question Sets</h2>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => setShowCreateDialog(true)}
            title="Add Question Set"
            className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
          <button
            disabled
            title="Import Question Set (Coming Soon)"
            className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-gray-400 bg-white border border-gray-300 rounded cursor-not-allowed"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-2 py-2 border-b border-gray-200 bg-white">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-auto">
        {loading && (
          <div className="flex items-center justify-center p-8">
            <div className="flex items-center gap-2 text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-xs">Loading...</span>
            </div>
          </div>
        )}

        {error && <div className="p-4 text-xs text-red-600">Error: {error}</div>}

        {!loading && !error && filteredQuestionSets.length === 0 && (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <List className="w-10 h-10 text-gray-300 mb-2" />
            <p className="text-xs text-gray-500">
              {searchTerm ? 'No matching question sets' : 'No question sets yet'}
            </p>
          </div>
        )}

        {!loading && !error && filteredQuestionSets.length > 0 && (
          <div className="p-1.5 space-y-0.5">
            {filteredQuestionSets.map((questionSet) => (
              <button
                key={questionSet.id}
                onClick={() => onSelectQuestionSet(questionSet)}
                className={`w-full text-left px-2.5 py-2 rounded transition-colors ${
                  selectedQuestionSetId === questionSet.id
                    ? 'bg-blue-100 border-2 border-blue-500'
                    : 'bg-white border border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                }`}
              >
                <div className="text-sm font-medium text-gray-900 truncate">
                  {questionSet.name}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {questionSet.questions.length} question
                  {questionSet.questions.length !== 1 ? 's' : ''}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <CreateQuestionSetDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onCreate={handleCreate}
        isCreating={isCreating}
      />
    </div>
  );
};
