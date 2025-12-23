import React from 'react';
import type { QuestionFormData } from './question.types';
import { getAnswerTypeDescription } from './question.utils';

interface QuestionPreviewPanelProps {
  formData: QuestionFormData;
}

export const QuestionPreviewPanel: React.FC<QuestionPreviewPanelProps> = ({ formData }) => {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
      <div className="border-b pb-2">
        <h3 className="text-sm font-semibold text-gray-700">Preview</h3>
      </div>

      <div>
        <div className="text-xs text-gray-500">Question</div>
        <div className="text-sm font-medium text-gray-900">
          {formData.display || <span className="text-gray-400 italic">No display text</span>}
        </div>
      </div>

      <div>
        <div className="text-xs text-gray-500">Code</div>
        <div className="text-sm font-mono text-gray-700">
          {formData.code || <span className="text-gray-400 italic">No code</span>}
        </div>
      </div>

      <div>
        <div className="text-xs text-gray-500">Answer Type</div>
        <div className="text-sm text-gray-900">
          {formData.answerType ? (
            <>
              <span className="font-medium">{formData.answerType}</span>
              <span className="text-gray-500 ml-2 text-xs">
                {getAnswerTypeDescription(formData.answerType)}
              </span>
            </>
          ) : (
            <span className="text-gray-400 italic">Not selected</span>
          )}
        </div>
      </div>

      {formData.description && (
        <div>
          <div className="text-xs text-gray-500">Description</div>
          <div className="text-sm text-gray-700">{formData.description}</div>
        </div>
      )}

      {formData.answerType === 'Quantity' && formData.unitCode && (
        <div>
          <div className="text-xs text-gray-500">Unit</div>
          <div className="text-sm text-gray-900">
            {formData.unitDisplay || formData.unitCode} ({formData.unitCode})
          </div>
        </div>
      )}

      {(formData.min !== undefined || formData.max !== undefined) && (
        <div>
          <div className="text-xs text-gray-500">Range</div>
          <div className="text-sm text-gray-900">
            {formData.min !== undefined ? formData.min : '−∞'} to{' '}
            {formData.max !== undefined ? formData.max : '∞'}
          </div>
        </div>
      )}

      {formData.precision !== undefined && (
        <div>
          <div className="text-xs text-gray-500">Precision</div>
          <div className="text-sm text-gray-900">{formData.precision} decimal places</div>
        </div>
      )}

      {formData.maxLength !== undefined && (
        <div>
          <div className="text-xs text-gray-500">Max Length</div>
          <div className="text-sm text-gray-900">{formData.maxLength} characters</div>
        </div>
      )}

      {formData.regex && (
        <div>
          <div className="text-xs text-gray-500">Pattern</div>
          <div className="text-sm font-mono text-gray-700 break-all">{formData.regex}</div>
        </div>
      )}

      {formData.valueSetUrl && (
        <div>
          <div className="text-xs text-gray-500">Value Set</div>
          <div className="text-sm text-gray-700 break-all">{formData.valueSetUrl}</div>
          {formData.bindingStrength && (
            <div className="text-xs text-gray-500 mt-1 capitalize">
              Binding: {formData.bindingStrength}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
