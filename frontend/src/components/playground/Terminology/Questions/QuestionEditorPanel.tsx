import React from 'react';
import { Eye, X } from 'lucide-react';
import type { QuestionFormData, QuestionDto } from './question.types';
import { questionToFormData, formDataToCreateDto, validateQuestionForm } from './question.utils';
import { questionsApi } from '../../../../api/questionsApi';
import { QuestionForm } from './QuestionForm';
import { QuestionPreviewPanel } from './QuestionPreviewPanel';

interface QuestionEditorPanelProps {
  projectId: string;
  selectedQuestion: QuestionDto | null;
  onSave: () => void;
  onCancel: () => void;
}

export const QuestionEditorPanel: React.FC<QuestionEditorPanelProps> = ({
  projectId,
  selectedQuestion,
  onSave,
  onCancel,
}) => {
  const [formData, setFormData] = React.useState<QuestionFormData>({
    code: '',
    display: '',
    system: 'http://example.org/questions',
    answerType: 'String',
    description: '',
    bindingStrength: 'required',
  });

  const [errors, setErrors] = React.useState<{ [key: string]: string }>({});
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = React.useState(false);

  React.useEffect(() => {
    if (selectedQuestion) {
      setFormData(questionToFormData(selectedQuestion));
    } else {
      // Reset form for new question
      setFormData({
        code: '',
        display: '',
        system: 'http://example.org/questions',
        answerType: 'String',
        description: '',
        bindingStrength: 'required',
      });
    }
    setErrors({});
    setSaveError(null);
  }, [selectedQuestion]);

  const handleChange = (field: keyof QuestionFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
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
    const validationErrors = validateQuestionForm(formData);
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
      const dto = formDataToCreateDto(formData, selectedQuestion?.id);

      if (selectedQuestion) {
        await questionsApi.updateQuestion(projectId, selectedQuestion.id, dto);
      } else {
        await questionsApi.createQuestion(projectId, dto);
      }

      onSave();
    } catch (error: any) {
      const message = error.response?.data?.error || error.message || 'Failed to save question';
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

  const isValid = Object.keys(errors).length === 0 && validateQuestionForm(formData).length === 0;

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {selectedQuestion ? 'Edit Question' : 'New Question'}
            </h2>
            <button
              type="button"
              onClick={() => setIsPreviewOpen(true)}
              className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors flex items-center gap-2"
              title="Preview question"
            >
              <Eye className="w-4 h-4" />
              <span className="text-sm">Preview</span>
            </button>
          </div>

          {saveError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700">{saveError}</p>
            </div>
          )}

          {/* Single-column form with max-width */}
          <div className="max-w-[720px] mx-auto">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-6 border-b pb-2">
                Question Details
              </h3>
              <QuestionForm
                formData={formData}
                onChange={handleChange}
                errors={errors}
                isEditing={!!selectedQuestion}
                projectId={projectId}
              />
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
          {isSaving ? 'Saving...' : selectedQuestion ? 'Update Question' : 'Create Question'}
        </button>
      </div>

      {/* Preview Drawer */}
      {isPreviewOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-30 z-40 transition-opacity"
            onClick={() => setIsPreviewOpen(false)}
          />
          
          {/* Drawer */}
          <div className="fixed top-0 right-0 h-full w-[45%] bg-white shadow-xl z-50 overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Preview</h3>
              <button
                onClick={() => setIsPreviewOpen(false)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                title="Close preview"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6">
              <QuestionPreviewPanel formData={formData} />
            </div>
          </div>
        </>
      )}
    </div>
  );
};
