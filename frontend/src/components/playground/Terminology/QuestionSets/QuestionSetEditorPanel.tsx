import React from 'react';
import type { QuestionSetFormState, QuestionSetDto } from './questionSet.types';
import {
  questionSetToFormState,
  formStateToCreateDto,
  validateQuestionSetForm,
} from './questionSet.utils';
import { questionSetsApi } from '../../../../api/questionSetsApi';
import { QuestionSetForm } from './QuestionSetForm';
import { QuestionSetPreviewPanel } from './QuestionSetPreviewPanel';

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
  onCancel,
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
  const [saveError, setSaveError] = React.useState<string | null>(null);

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
  }, [selectedQuestionSet]);

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
      } else {
        await questionSetsApi.createQuestionSet(projectId, dto);
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

  const isValid =
    Object.keys(errors).length === 0 && validateQuestionSetForm(formState).length === 0;

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {selectedQuestionSet ? 'Edit Question Set' : 'New Question Set'}
            </h2>
          </div>

          {saveError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700">{saveError}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-6">
            {/* Left: Form */}
            <div>
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-4 border-b pb-2">
                  Question Set Details
                </h3>
                <QuestionSetForm
                  projectId={projectId}
                  formState={formState}
                  onChange={handleChange}
                  errors={errors}
                  isEditing={!!selectedQuestionSet}
                />
              </div>
            </div>

            {/* Right: Preview */}
            <div>
              <div className="sticky top-6">
                <QuestionSetPreviewPanel projectId={projectId} formState={formState} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="border-t bg-white px-6 py-4 flex justify-end gap-3">
        <button
          onClick={onCancel}
          disabled={isSaving}
          className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving || !isValid}
          className="px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving
            ? 'Saving...'
            : selectedQuestionSet
            ? 'Update Question Set'
            : 'Create Question Set'}
        </button>
      </div>
    </div>
  );
};
