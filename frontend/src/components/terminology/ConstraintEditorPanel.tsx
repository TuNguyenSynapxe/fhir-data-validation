/**
 * ConstraintEditorPanel - Editable constraint authoring
 * Phase 3C: Grid-style editing for allowed answers
 * Spreadsheet-like UX with inline cells
 */

import type { TerminologyConstraint, AllowedAnswer } from '../../types/terminology';
import { EmptyState, PanelHeader, FormField } from './SupportingComponents';
import { EditableCell } from './EditableComponents';
import { InfoTooltip, TooltipContent } from './InfoTooltip';

interface ConstraintEditorPanelProps {
  /** Constraint being edited */
  constraint?: TerminologyConstraint;
  /** Callback when constraint is modified */
  onChange: (constraint: TerminologyConstraint) => void;
  /** Whether editing is enabled */
  readOnly?: boolean;
}

export function ConstraintEditorPanel({
  constraint,
  onChange,
  readOnly = false,
}: ConstraintEditorPanelProps) {
  if (!constraint) {
    return (
      <div className="flex flex-col h-full bg-white">
        <PanelHeader
        title={
          <span className="flex items-center">
            Constraint Editor
            <InfoTooltip content={TooltipContent.constraint} />
          </span>
        }
      />
        <EmptyState
          icon="📝"
          message="Select a constraint to edit"
          subMessage="Choose from the constraints list"
        />
      </div>
    );
  }

  const handleFieldChange = (field: keyof TerminologyConstraint, value: string) => {
    onChange({ ...constraint, [field]: value });
  };

  const handleAllowedAnswerAdd = () => {
    const newAnswer: AllowedAnswer = {
      system: '',
      code: '',
      display: '',
    };
    onChange({
      ...constraint,
      allowedAnswers: [...constraint.allowedAnswers, newAnswer],
    });
  };

  const handleAllowedAnswerUpdate = (index: number, updatedAnswer: AllowedAnswer) => {
    const newAnswers = [...constraint.allowedAnswers];
    newAnswers[index] = updatedAnswer;
    onChange({
      ...constraint,
      allowedAnswers: newAnswers,
    });
  };

  const handleAllowedAnswerDelete = (index: number) => {
    const newAnswers = constraint.allowedAnswers.filter((_, i) => i !== index);
    onChange({
      ...constraint,
      allowedAnswers: newAnswers,
    });
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <PanelHeader
        title={
          <span className="flex items-center">
            Constraint Editor
            <InfoTooltip content={TooltipContent.constraint} />
          </span>
        }
        actions={
          !readOnly && (
            <span className="text-xs text-gray-500">
              Changes are tracked, click Save to persist
            </span>
          )
        }
      />

      <div className="flex-1 overflow-y-auto p-6">
        {/* Constraint ID */}
        <FormField label="Constraint ID" required>
          <input
            type="text"
            value={constraint.id}
            onChange={(e) => handleFieldChange('id', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., patient-status-binding"
            disabled={readOnly}
          />
        </FormField>

        {/* Resource Type */}
        <FormField
          label={
            <span className="flex items-center">
              Resource Type
              <InfoTooltip content={TooltipContent.resourceType} />
            </span>
          }
          required
        >
          <input
            type="text"
            value={constraint.resourceType}
            onChange={(e) => handleFieldChange('resourceType', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., Patient, Observation"
            disabled={readOnly}
          />
        </FormField>

        {/* FHIRPath */}
        <FormField
          label={
            <span className="flex items-center">
              FHIRPath Expression
              <InfoTooltip content={TooltipContent.fhirPath} />
            </span>
          }
          required
          help="Path to the element being constrained"
        >
          <textarea
            value={constraint.path}
            onChange={(e) => handleFieldChange('path', e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            placeholder="e.g., Patient.extension.where(url = '...').value"
            disabled={readOnly}
          />
        </FormField>

        {/* Constraint Type */}
        <FormField
          label={
            <span className="flex items-center">
              Constraint Type
              <InfoTooltip content={TooltipContent.constraintType} />
            </span>
          }
          required
        >
          <select
            value={constraint.constraintType}
            onChange={(e) => handleFieldChange('constraintType', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={readOnly}
          >
            <option value="binding">Binding</option>
            <option value="fixed">Fixed Value</option>
            <option value="pattern">Pattern</option>
          </select>
        </FormField>

        {/* Binding Strength (if binding) */}
        {constraint.constraintType === 'binding' && (
          <FormField
            label={
              <span className="flex items-center">
                Binding Strength
                <InfoTooltip content={TooltipContent.bindingStrength} />
              </span>
            }
            required
          >
            <select
              value={constraint.bindingStrength || 'required'}
              onChange={(e) => handleFieldChange('bindingStrength', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={readOnly}
            >
              <option value="required">Required</option>
              <option value="extensible">Extensible</option>
              <option value="preferred">Preferred</option>
              <option value="example">Example</option>
            </select>
          </FormField>
        )}

        {/* Allowed Answers Grid */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-900 flex items-center">
              Allowed Answers
              <InfoTooltip content={TooltipContent.allowedAnswers} />
              <span className="ml-2 text-xs text-gray-500">
                ({constraint.allowedAnswers.length})
              </span>
            </h3>
            {!readOnly && (
              <button
                onClick={handleAllowedAnswerAdd}
                className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
              >
                + Add Answer
              </button>
            )}
          </div>

          <AllowedAnswersGrid
            answers={constraint.allowedAnswers}
            onUpdate={handleAllowedAnswerUpdate}
            onDelete={handleAllowedAnswerDelete}
            readOnly={readOnly}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * AllowedAnswersGrid - Spreadsheet-like grid for allowed answers
 */
interface AllowedAnswersGridProps {
  answers: AllowedAnswer[];
  onUpdate: (index: number, answer: AllowedAnswer) => void;
  onDelete: (index: number) => void;
  readOnly: boolean;
}

function AllowedAnswersGrid({
  answers,
  onUpdate,
  onDelete,
  readOnly,
}: AllowedAnswersGridProps) {
  if (answers.length === 0) {
    return (
      <div className="p-4 border-2 border-dashed border-gray-300 rounded text-center text-gray-500">
        <p className="text-sm">No allowed answers defined</p>
        <p className="text-xs mt-1">Click "Add Answer" to create one</p>
      </div>
    );
  }

  const handleCellCommit = (index: number, field: keyof AllowedAnswer, value: string) => {
    const updatedAnswer = { ...answers[index], [field]: value };
    onUpdate(index, updatedAnswer);
  };

  return (
    <div className="border border-gray-200 rounded overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase w-2/5">
              System
            </th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase w-1/5">
              Code
            </th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase w-1/3">
              Display
            </th>
            {!readOnly && (
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase w-16">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {answers.map((answer, index) => (
            <tr key={index} className="border-t border-gray-200 hover:bg-gray-50">
              <td className="px-3 py-2">
                {readOnly ? (
                  <span className="text-sm font-mono text-gray-900">{answer.system}</span>
                ) : (
                  <EditableCell
                    value={answer.system}
                    onCommit={(value) => handleCellCommit(index, 'system', value)}
                    placeholder="System URL"
                    displayClassName="text-sm font-mono text-gray-900"
                    editClassName="text-sm font-mono"
                  />
                )}
              </td>
              <td className="px-3 py-2">
                {readOnly ? (
                  <span className="text-sm font-mono text-gray-900">{answer.code}</span>
                ) : (
                  <EditableCell
                    value={answer.code}
                    onCommit={(value) => handleCellCommit(index, 'code', value)}
                    placeholder="Code"
                    displayClassName="text-sm font-mono text-gray-900"
                    editClassName="text-sm font-mono"
                    validate={(value) => {
                      if (!value.trim()) return 'Code is required';
                      return undefined;
                    }}
                  />
                )}
              </td>
              <td className="px-3 py-2">
                {readOnly ? (
                  <span className="text-sm text-gray-700">{answer.display}</span>
                ) : (
                  <EditableCell
                    value={answer.display || ''}
                    onCommit={(value) => handleCellCommit(index, 'display', value)}
                    placeholder="Display name"
                    displayClassName="text-sm text-gray-700"
                    editClassName="text-sm"
                  />
                )}
              </td>
              {!readOnly && (
                <td className="px-3 py-2">
                  <button
                    onClick={() => onDelete(index)}
                    className="text-red-600 hover:text-red-800 text-sm"
                    title="Delete this answer"
                  >
                    🗑️
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
