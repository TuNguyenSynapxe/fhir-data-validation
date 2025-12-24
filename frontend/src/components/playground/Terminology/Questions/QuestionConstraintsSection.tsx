import React from 'react';
import type { QuestionFormData } from './question.types';
import { COMMON_UCUM_UNITS, testRegexPattern } from './question.utils';
import { HelpTooltip } from '../../../common/HelpTooltip';

interface QuestionConstraintsSectionProps {
  formData: QuestionFormData;
  onChange: (field: keyof QuestionFormData, value: any) => void;
  errors: { [key: string]: string };
}

export const QuestionConstraintsSection: React.FC<QuestionConstraintsSectionProps> = ({
  formData,
  onChange,
  errors,
}) => {
  const [regexTestValue, setRegexTestValue] = React.useState('');

  const renderQuantitySection = () => (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">Quantity Configuration</h3>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Unit (UCUM) <span className="text-red-500">*</span>
        </label>
        <select
          value={formData.unitCode || ''}
          onChange={(e) => {
            const unit = COMMON_UCUM_UNITS.find((u) => u.code === e.target.value);
            onChange('unitCode', e.target.value);
            if (unit) {
              onChange('unitDisplay', unit.display);
            }
          }}
          className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 ${
            errors.unitCode ? 'border-red-500' : 'border-gray-300'
          }`}
        >
          <option value="">Select a unit...</option>
          {COMMON_UCUM_UNITS.map((unit) => (
            <option key={unit.code} value={unit.code}>
              {unit.display} ({unit.code})
            </option>
          ))}
        </select>
        {errors.unitCode && <p className="text-xs text-red-500 mt-1">{errors.unitCode}</p>}
      </div>

      {renderNumericConstraints(true)}
    </div>
  );

  const renderCodeSection = () => (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">Coded Answer Configuration</h3>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Value Set <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.valueSetUrl || ''}
          onChange={(e) => onChange('valueSetUrl', e.target.value)}
          placeholder="http://example.org/valueset/smoking-status"
          className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 ${
            errors.valueSetUrl ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors.valueSetUrl && <p className="text-xs text-red-500 mt-1">{errors.valueSetUrl}</p>}
        <p className="text-xs text-gray-500 mt-1">Canonical URL of the ValueSet</p>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-2">
          <label className="text-sm font-medium text-gray-700">Binding Strength</label>
          <HelpTooltip
            title="FHIR Binding Strength"
            body="Controls how strictly the answer must follow the selected ValueSet.\n\n• Required — Must use one of the allowed codes (Validation Error)\n• Extensible — Should use the ValueSet, but other codes are allowed (Warning)\n• Preferred — Best practice recommendation only (Advisory)"
            footer="These definitions follow HL7 FHIR standards."
          />
        </div>
        <div className="space-y-2">
          {['required', 'extensible', 'preferred'].map((strength) => {
            const severityInfo = {
              required: { label: 'Error', color: 'text-red-600', tooltip: 'Blocking validation issue. Must be fixed before validation can pass.' },
              extensible: { label: 'Warning', color: 'text-amber-600', tooltip: 'Non-blocking issue. Data is allowed but does not fully follow best practice.' },
              preferred: { label: 'Advisory', color: 'text-blue-600', tooltip: 'Informational guidance only. Does not affect validation results.' }
            };
            const info = severityInfo[strength as keyof typeof severityInfo];
            
            return (
              <label key={strength} className="flex items-center justify-between group hover:bg-gray-50 p-2 rounded transition-colors">
                <div className="flex items-center">
                  <input
                    type="radio"
                    value={strength}
                    checked={formData.bindingStrength === strength}
                    onChange={(e) => onChange('bindingStrength', e.target.value)}
                    className="mr-2"
                  />
                  <span className="text-sm capitalize">{strength}</span>
                </div>
                <span
                  className={`text-xs font-medium ${info.color} cursor-help`}
                  title={info.tooltip}
                >
                  {info.label}
                </span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderStringSection = () => (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">Text Configuration</h3>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Max Length</label>
        <input
          type="number"
          value={formData.maxLength || ''}
          onChange={(e) => onChange('maxLength', e.target.value ? parseInt(e.target.value) : undefined)}
          placeholder="500"
          min="1"
          className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 ${
            errors.maxLength ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors.maxLength && <p className="text-xs text-red-500 mt-1">{errors.maxLength}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Regular Expression (optional)</label>
        <input
          type="text"
          value={formData.regex || ''}
          onChange={(e) => onChange('regex', e.target.value || undefined)}
          placeholder="^[a-zA-Z0-9 .,()-]*$"
          className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 ${
            errors.regex ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors.regex && <p className="text-xs text-red-500 mt-1">{errors.regex}</p>}
      </div>

      {formData.regex && (
        <div className="p-3 bg-gray-50 rounded-md">
          <label className="block text-xs font-medium text-gray-700 mb-1">Test Pattern</label>
          <input
            type="text"
            value={regexTestValue}
            onChange={(e) => setRegexTestValue(e.target.value)}
            placeholder="Enter test value..."
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
          />
          {regexTestValue && (
            <p className={`text-xs mt-1 ${testRegexPattern(formData.regex, regexTestValue) ? 'text-green-600' : 'text-red-600'}`}>
              {testRegexPattern(formData.regex, regexTestValue) ? '✓ Matches' : '✗ Does not match'}
            </p>
          )}
        </div>
      )}
    </div>
  );

  const renderNumericConstraints = (allowPrecision: boolean) => (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Min Value</label>
          <input
            type="number"
            value={formData.min ?? ''}
            onChange={(e) => onChange('min', e.target.value ? parseFloat(e.target.value) : undefined)}
            step={formData.answerType === 'Integer' ? '1' : 'any'}
            className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 ${
              errors.min ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.min && <p className="text-xs text-red-500 mt-1">{errors.min}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Max Value</label>
          <input
            type="number"
            value={formData.max ?? ''}
            onChange={(e) => onChange('max', e.target.value ? parseFloat(e.target.value) : undefined)}
            step={formData.answerType === 'Integer' ? '1' : 'any'}
            className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 ${
              errors.max ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.max && <p className="text-xs text-red-500 mt-1">{errors.max}</p>}
        </div>
      </div>

      {allowPrecision && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Decimal Places</label>
          <input
            type="number"
            value={formData.precision ?? ''}
            onChange={(e) => onChange('precision', e.target.value ? parseInt(e.target.value) : undefined)}
            min="0"
            className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 ${
              errors.precision ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.precision && <p className="text-xs text-red-500 mt-1">{errors.precision}</p>}
        </div>
      )}
    </>
  );

  const renderIntegerSection = () => (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">Numeric Configuration</h3>
      {renderNumericConstraints(false)}
    </div>
  );

  const renderDecimalSection = () => (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">Numeric Configuration</h3>
      {renderNumericConstraints(true)}
    </div>
  );

  const renderBooleanSection = () => (
    <div className="p-4 bg-gray-50 rounded-md">
      <p className="text-sm text-gray-600">
        ✓ Boolean questions accept Yes/No answers only. No additional configuration needed.
      </p>
    </div>
  );

  // Render appropriate section based on answer type
  switch (formData.answerType) {
    case 'Quantity':
      return renderQuantitySection();
    case 'Code':
      return renderCodeSection();
    case 'String':
      return renderStringSection();
    case 'Integer':
      return renderIntegerSection();
    case 'Decimal':
      return renderDecimalSection();
    case 'Boolean':
      return renderBooleanSection();
    default:
      return null;
  }
};
