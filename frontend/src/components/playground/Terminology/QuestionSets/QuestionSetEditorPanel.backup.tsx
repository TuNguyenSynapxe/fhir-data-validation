import React from 'react';
import { Trash2, Save, AlertCircle, Loader2 } from 'lucide-react';
import type { QuestionSetFormState, QuestionSetDto } from './questionSet.types';
import {
  questionSetToFormState,
  formStateToCreateDto,
  validateQuestionSetForm,
} from './questionSet.utils';
import { questionSetsApi } from '../../../../api/questionSetsApi';
import { QuestionSetQuestionPicker } from './QuestionSetQuestionPicker';

interface QuestionSetEditorPanelProps {
  projectId: string;
  selectedQuestionSet: QuestionSetDto | null;
  onSave: () => void;
  onCancel: () => void;
}

export const QuestionSetEditorPanel: React.FC<QuestionSetEditorPanelProps> = ({
  projectId,
  selectedQuestionSet,
  onSave,
  onCancel: _onCancel,
}) => {
  const [formState, setFormState] = React.useState<QuestionSetFormState>({
    id: '',
    name: '',
    description: '',
    terminologyUrl: '',
    questions: [],
  });

  const [errors, setErrors] = React.useState<{ [key: string]: string }>({});
  const [isSaving, setIsSaving] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);

  React.useEffect(() => {
    if (selectedQuestionSet) {
      setFormState(questionSetToFormState(selectedQuestionSet));
    } else {
      // Reset form for new question set
      setFormState({
        id: '',
        name: '',
        description: '',
        terminologyUrl: '',
        questions: [],
      });
    }
    setErrors({});
    setSaveError(null);
    setSuccessMessage(null);
  }, [selectedQuestionSet]);

  // Auto-hide success message
  React.useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const handleChange = (field: keyof QuestionSetFormState, value: any) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSave = async () => {
    // Validate form
    const validationErrors = validateQuestionSetForm(formState);
    if (validationErrors.length > 0) {
      const errorMap: { [key: string]: string } = {};
      validationErrors.forEach((err) => {
        errorMap[err.field] = err.message;
      });
      setErrors(errorMap);
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const dto = formStateToCreateDto(formState, selectedQuestionSet?.id);

      if (selectedQuestionSet) {
        await questionSetsApi.updateQuestionSet(projectId, selectedQuestionSet.id, dto);
        setSuccessMessage('Question Set updated');
      } else {
        await questionSetsApi.createQuestionSet(projectId, dto);
        setSuccessMessage('Question Set created');
      }

      onSave();
    } catch (error: any) {
      const message = error.response?.data?.error || error.message || 'Failed to save question set';
      setSaveError(message);

      // Try to map backend errors to fields
      if (error.response?.data?.errors) {
        const backendErrors: { [key: string]: string } = {};
        Object.entries(error.response.data.errors).forEach(([field, messages]) => {
          backendErrors[field] = (messages as string[]).join(', ');
        });
        setErrors(backendErrors);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedQuestionSet) return;

    setIsDeleting(true);
    setSaveError(null);

    try {
      await questionSetsApi.deleteQuestionSet(projectId, selectedQuestionSet.id);
      setShowDeleteConfirm(false);
      onSave();
    } catch (error: any) {
      const message =
        error.response?.data?.error || error.message || 'Failed to delete question set';
      setSaveError(message);
    } finally {
      setIsDeleting(false);
    }
  };

  const isValid =
    Object.keys(errors).length === 0 && validateQuestionSetForm(formState).length === 0;

  // Empty state - no question set selected
  if (selectedQuestionSet === undefined || (selectedQuestionSet === null && formState.id === '')) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">📝</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Question Set Selected</h3>
          <p className="text-sm text-gray-600">
            Select a question set from the left panel to view and edit, or create a new one
          </p>
        </div>
      </div>
    );
  }

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
      {saveError && (
        <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border-b border-red-200 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4" />
          <span>{saveError}</span>
        </div>
      )}

      {/* Header */}
      <div className="px-4 py-2.5 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">
            {selectedQuestionSet ? formState.name || 'Edit Question Set' : 'New Question Set'}
          </h2>
          {selectedQuestionSet && formState.id && (
            <p className="text-xs text-gray-400 font-mono mt-0.5">{formState.id}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {selectedQuestionSet && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isSaving || isDeleting}
              className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-red-700 bg-white border border-red-300 rounded hover:bg-red-50 transition-colors disabled:opacity-50"
              title="Delete Question Set"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving || !isValid}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Saving...' : 'Save'}</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl space-y-4">
          {/* Section A: Details */}
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="px-4 py-2 border-b border-gray-200 bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-700">Question Set Details</h3>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formState.id}
                  onChange={(e) => handleChange('id', e.target.value)}
                  disabled={!!selectedQuestionSet}
                  placeholder="vitals"
                  className={`w-full px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    selectedQuestionSet ? 'bg-gray-100 cursor-not-allowed' : ''
                  } ${errors.id ? 'border-red-500' : 'border-gray-300'}`}
                />
                {errors.id && <p className="text-xs text-red-500 mt-1">{errors.id}</p>}
                {selectedQuestionSet && (
                  <p className="text-xs text-gray-500 mt-1">ID cannot be changed after creation</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formState.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Vitals Questions"
                  className={`w-full px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formState.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Collection of vital sign measurements"
                  rows={2}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Section B: Questions */}
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="px-4 py-2 border-b border-gray-200 bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-700">Questions</h3>
            </div>
            <div className="p-4">
              <QuestionSetQuestionPicker
                projectId={projectId}
                selectedTerminologyUrl={formState.terminologyUrl}
                selectedQuestions={formState.questions}
                onTerminologyChange={(url) => handleChange('terminologyUrl', url)}
                onQuestionsChange={(questions) => handleChange('questions', questions)}
                errors={errors}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="text-base font-semibold text-gray-900">Delete Question Set</h3>
            </div>
            <div className="p-4">
              <p className="text-sm text-gray-600">
                Are you sure you want to delete "{formState.name}"? This action cannot be undone.
              </p>
            </div>
            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
