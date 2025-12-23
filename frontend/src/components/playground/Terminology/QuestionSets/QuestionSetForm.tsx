import React from 'react';
import type { QuestionSetFormState, QuestionSetQuestionRefDto } from './questionSet.types';
import { QuestionSetQuestionPicker } from './QuestionSetQuestionPicker';

interface QuestionSetFormProps {
  projectId: string;
  formState: QuestionSetFormState;
  onChange: (field: keyof QuestionSetFormState, value: any) => void;
  errors: { [key: string]: string };
  isEditing: boolean;
}

export const QuestionSetForm: React.FC<QuestionSetFormProps> = ({
  projectId,
  formState,
  onChange,
  errors,
  isEditing,
}) => {
  return (
    <div className="space-y-6">
      {/* Common Fields */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ID <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formState.id}
            onChange={(e) => onChange('id', e.target.value)}
            disabled={isEditing}
            placeholder="vitals"
            className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 ${
              isEditing ? 'bg-gray-100 cursor-not-allowed' : ''
            } ${errors.id ? 'border-red-500' : 'border-gray-300'}`}
          />
          {errors.id && <p className="text-xs text-red-500 mt-1">{errors.id}</p>}
          {isEditing && (
            <p className="text-xs text-gray-500 mt-1">ID cannot be changed after creation</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formState.name}
            onChange={(e) => onChange('name', e.target.value)}
            placeholder="Vitals Questions"
            className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 ${
              errors.name ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={formState.description}
            onChange={(e) => onChange('description', e.target.value)}
            placeholder="Collection of vital sign measurements"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Question Picker */}
      <div className="pt-4 border-t">
        <QuestionSetQuestionPicker
          projectId={projectId}
          selectedTerminologyUrl={formState.terminologyUrl}
          selectedQuestions={formState.questions}
          onTerminologyChange={(url) => onChange('terminologyUrl', url)}
          onQuestionsChange={(questions: QuestionSetQuestionRefDto[]) =>
            onChange('questions', questions)
          }
          errors={errors}
        />
      </div>
    </div>
  );
};
