import React from 'react';
import { HelpCircle, Info } from 'lucide-react';
import type {
  QuestionAnswerConstraint,
} from './QuestionAnswerConstraint.types';
import { CONSTRAINT_METADATA } from './QuestionAnswerConstraint.types';

interface QuestionAnswerConstraintSelectorProps {
  value: QuestionAnswerConstraint | '';
  onChange: (constraint: QuestionAnswerConstraint) => void;
  error?: string;
}

export const QuestionAnswerConstraintSelector: React.FC<
  QuestionAnswerConstraintSelectorProps
> = ({ value, onChange, error }) => {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <label className="text-sm font-medium text-gray-700">
          Constraint <span className="text-red-500">*</span>
        </label>
        <div className="group relative">
          <Info className="w-4 h-4 text-blue-500 cursor-help" />
          <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-80 p-3 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
            <div className="font-semibold mb-1">Why constraints, not error codes?</div>
            <div className="space-y-1">
              <p>
                <strong>You define:</strong> What must be true (constraint)
              </p>
              <p>
                <strong>System detects:</strong> Which question failed and why (runtime errorCode)
              </p>
              <p className="mt-2 pt-2 border-t border-gray-700">
                ONE rule handles ALL runtime scenarios.
                No need to predict failures or create multiple rules.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {CONSTRAINT_METADATA.map((constraint) => (
          <label
            key={constraint.value}
            className="flex items-start gap-3 p-3 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50 transition-colors"
          >
            <input
              type="radio"
              name="constraint"
              value={constraint.value}
              checked={value === constraint.value}
              onChange={(e) => onChange(e.target.value as QuestionAnswerConstraint)}
              className="mt-0.5"
            />
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900">
                {constraint.label}
              </div>
              <div className="text-xs text-gray-600 mt-0.5">
                {constraint.description}
              </div>
              {constraint.requiresParams && (
                <div className="text-xs text-blue-600 mt-1">
                  Requires: {constraint.paramFields?.join(', ')}
                </div>
              )}
            </div>
          </label>
        ))}
      </div>

      {error && (
        <div className="text-xs text-red-600 mt-1 flex items-center gap-1">
          <HelpCircle size={12} />
          <span>{error}</span>
        </div>
      )}

      <div className="mt-3 text-xs text-gray-500 bg-blue-50 border border-blue-200 rounded-md p-3">
        <div className="font-medium text-blue-900 mb-1">
          How this works:
        </div>
        <div className="space-y-1 text-blue-800">
          <div>1. Select the constraint that applies to this QuestionSet</div>
          <div>2. System validates all questions against this constraint</div>
          <div>3. Runtime errors are automatically attached to the failing question</div>
        </div>
      </div>
    </div>
  );
};
