import React from 'react';
import { Trash2, Plus } from 'lucide-react';
import type { QuestionFormData, TerminologyMode, InlineAllowedValue } from './question.types';
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
  const [showModeWarning, setShowModeWarning] = React.useState(false);

  const renderQuantitySection = () => (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-700 border-b pb-2 flex-1">Value Constraints</h3>
          <HelpTooltip
            title="Value Constraints"
            body={`Used for non-coded answers.

Examples:
• Number range (min / max)
• Text length
• Regular expression patterns
• Required fields

These are structural constraints, not terminology bindings.`}
          />
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Value constraints control the shape or range of the answer.
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Binding strength is not applicable to this answer type.
        </p>
      </div>
      
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

  const renderCodeSection = () => {
    // Determine mode based on existing data
    // Default to valueset mode if no data, or infer from existing data
    const currentMode: TerminologyMode = formData.terminologyMode || 
      (formData.allowedValues && formData.allowedValues.length > 0 ? 'inline' : 'valueset');
    
    const handleModeChange = (newMode: TerminologyMode) => {
      // Check if switching modes with existing data
      const hasInlineData = formData.allowedValues && formData.allowedValues.length > 0;
      const hasValueSetData = !!formData.valueSetUrl;
      
      if ((currentMode === 'inline' && hasInlineData && newMode === 'valueset') ||
          (currentMode === 'valueset' && hasValueSetData && newMode === 'inline')) {
        setShowModeWarning(true);
        setTimeout(() => setShowModeWarning(false), 3000);
      }
      
      onChange('terminologyMode', newMode);
    };
    
    const handleAddAllowedValue = () => {
      const currentValues = formData.allowedValues || [];
      onChange('allowedValues', [...currentValues, { code: '', display: '', system: '' }]);
    };
    
    const handleRemoveAllowedValue = (index: number) => {
      const currentValues = formData.allowedValues || [];
      onChange('allowedValues', currentValues.filter((_, i) => i !== index));
    };
    
    const handleUpdateAllowedValue = (index: number, field: keyof InlineAllowedValue, value: string) => {
      const currentValues = formData.allowedValues || [];
      const updated = [...currentValues];
      updated[index] = { ...updated[index], [field]: value };
      onChange('allowedValues', updated);
    };
    
    const hasValueSet = !!formData.valueSetUrl;
    
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">Terminology</h3>
          <p className="text-xs text-gray-500 mt-2">
            Terminology binding controls which codes are allowed.
          </p>
        </div>
        
        {/* Mode Warning */}
        {showModeWarning && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
            <p className="text-xs text-amber-700">
              Switching modes may ignore previously entered values.
            </p>
          </div>
        )}
        
        {/* Mode Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Allowed Values Source
          </label>
          <div className="flex gap-3">
            <label className="flex items-center">
              <input
                type="radio"
                value="inline"
                checked={currentMode === 'inline'}
                onChange={() => handleModeChange('inline')}
                className="mr-2"
              />
              <span className="text-sm">Define allowed values</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="valueset"
                checked={currentMode === 'valueset'}
                onChange={() => handleModeChange('valueset')}
                className="mr-2"
              />
              <span className="text-sm">Use external ValueSet</span>
            </label>
          </div>
        </div>
        
        {/* Mode 1: Inline Allowed Values */}
        {currentMode === 'inline' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">Allowed Values</label>
              <button
                type="button"
                onClick={handleAddAllowedValue}
                className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors"
              >
                <Plus className="w-3 h-3" />
                Add Value
              </button>
            </div>
            
            {(!formData.allowedValues || formData.allowedValues.length === 0) && (
              <div className="p-4 bg-gray-50 rounded-md text-center">
                <p className="text-sm text-gray-500">No allowed values defined yet.</p>
                <p className="text-xs text-gray-400 mt-1">Click "Add Value" to define codes.</p>
              </div>
            )}
            
            {formData.allowedValues && formData.allowedValues.length > 0 && (
              <div className="space-y-2">
                {formData.allowedValues.map((value, index) => (
                  <div key={index} className="flex gap-2 items-start p-3 bg-gray-50 rounded-md">
                    <div className="flex-1 space-y-2">
                      <div>
                        <label className="text-xs text-gray-600 mb-1 block">
                          Code <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={value.code}
                          onChange={(e) => handleUpdateAllowedValue(index, 'code', e.target.value)}
                          placeholder="e.g., never-smoker"
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600 mb-1 block">
                          Display <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={value.display}
                          onChange={(e) => handleUpdateAllowedValue(index, 'display', e.target.value)}
                          placeholder="e.g., Never Smoker"
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600 mb-1 block">
                          System <span className="text-gray-400">(optional)</span>
                        </label>
                        <input
                          type="text"
                          value={value.system || ''}
                          onChange={(e) => handleUpdateAllowedValue(index, 'system', e.target.value)}
                          placeholder="e.g., http://snomed.info/sct"
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveAllowedValue(index)}
                      className="mt-5 p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Remove this value"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            <p className="text-xs text-gray-500">
              Define specific codes allowed as answers. Code and Display are required.
            </p>
          </div>
        )}
        
        {/* Mode 2: External ValueSet */}
        {currentMode === 'valueset' && (
          <div className="space-y-4">
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
                <label className={`text-sm font-medium ${hasValueSet ? 'text-gray-700' : 'text-gray-400'}`}>
                  Binding Strength
                </label>
                <HelpTooltip
                  title="FHIR Binding Strength"
                  body={`Applies only to coded answers.

Controls how strictly the answer must conform to the selected ValueSet.

• Required — Must use one of the allowed codes (Error)
• Extensible — Other codes allowed if needed (Warning)
• Preferred — Recommendation only (Advisory)

Defined by HL7 FHIR.`}
                  footer="These definitions follow HL7 FHIR standards."
                />
              </div>
              {!hasValueSet && (
                <p className="text-xs text-gray-500 mb-2">
                  Binding strength is available after a ValueSet is selected.
                </p>
              )}
              <div className="space-y-2">
                {['required', 'extensible', 'preferred'].map((strength) => {
                  const severityInfo = {
                    required: { label: 'Error', color: 'text-red-600', tooltip: 'Blocking validation issue. Must be fixed before validation can pass.' },
                    extensible: { label: 'Warning', color: 'text-amber-600', tooltip: 'Non-blocking issue. Data is allowed but does not fully follow best practice.' },
                    preferred: { label: 'Advisory', color: 'text-blue-600', tooltip: 'Informational guidance only. Does not affect validation results.' }
                  };
                  const info = severityInfo[strength as keyof typeof severityInfo];
                  
                  return (
                    <label key={strength} className={`flex items-center justify-between group p-2 rounded transition-colors ${
                      hasValueSet ? 'hover:bg-gray-50 cursor-pointer' : 'opacity-50 cursor-not-allowed'
                    }`}>
                      <div className="flex items-center">
                        <input
                          type="radio"
                          value={strength}
                          checked={formData.bindingStrength === strength}
                          onChange={(e) => onChange('bindingStrength', e.target.value)}
                          disabled={!hasValueSet}
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
        )}
      </div>
    );
  };

  const renderEnumeratedStringSection = () => {
    const handleAddValue = () => {
      const currentValues = formData.enumeratedValues || [];
      onChange('enumeratedValues', [...currentValues, '']);
    };
    
    const handleRemoveValue = (index: number) => {
      const currentValues = formData.enumeratedValues || [];
      onChange('enumeratedValues', currentValues.filter((_, i) => i !== index));
    };
    
    const handleUpdateValue = (index: number, value: string) => {
      const currentValues = formData.enumeratedValues || [];
      const updated = [...currentValues];
      updated[index] = value;
      onChange('enumeratedValues', updated);
    };
    
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">Allowed Values</h3>
          <p className="text-xs text-gray-500 mt-2">
            This defines a fixed list of allowed text values.
          </p>
          <p className="text-xs text-gray-400 mt-1">
            These are not terminology codes.
          </p>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">Values</label>
            <button
              type="button"
              onClick={handleAddValue}
              className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors"
            >
              <Plus className="w-3 h-3" />
              Add value
            </button>
          </div>
          
          {(!formData.enumeratedValues || formData.enumeratedValues.length === 0) && (
            <div className="p-4 bg-gray-50 rounded-md text-center">
              <p className="text-sm text-gray-500">No values defined yet.</p>
              <p className="text-xs text-gray-400 mt-1">Click "Add value" to define allowed text values.</p>
            </div>
          )}
          
          {formData.enumeratedValues && formData.enumeratedValues.length > 0 && (
            <div className="space-y-2">
              {formData.enumeratedValues.map((value, index) => (
                <div key={index} className="flex gap-2 items-center p-2 bg-gray-50 rounded-md">
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => handleUpdateValue(index, e.target.value)}
                    placeholder="e.g., Yes, No, Unknown"
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveValue(index)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Remove this value"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
          
          {errors.enumeratedValues && (
            <p className="text-xs text-red-500 mt-1">{errors.enumeratedValues}</p>
          )}
          
          <p className="text-xs text-gray-500">
            Each value must be unique and non-empty. Duplicates are not allowed.
          </p>
        </div>
      </div>
    );
  };

  const renderStringSection = () => (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-700 border-b pb-2 flex-1">Value Constraints</h3>
          <HelpTooltip
            title="Value Constraints"
            body={`Used for non-coded answers.

Examples:
• Number range (min / max)
• Text length
• Regular expression patterns
• Required fields

These are structural constraints, not terminology bindings.`}
          />
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Value constraints control the shape or range of the answer.
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Binding strength is not applicable to this answer type.
        </p>
      </div>
      
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
      <div>
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-700 border-b pb-2 flex-1">Value Constraints</h3>
          <HelpTooltip
            title="Value Constraints"
            body={`Used for non-coded answers.

Examples:
• Number range (min / max)
• Text length
• Regular expression patterns
• Required fields

These are structural constraints, not terminology bindings.`}
          />
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Value constraints control the shape or range of the answer.
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Binding strength is not applicable to this answer type.
        </p>
      </div>
      {renderNumericConstraints(false)}
    </div>
  );

  const renderDecimalSection = () => (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-700 border-b pb-2 flex-1">Value Constraints</h3>
          <HelpTooltip
            title="Value Constraints"
            body={`Used for non-coded answers.

Examples:
• Number range (min / max)
• Text length
• Regular expression patterns
• Required fields

These are structural constraints, not terminology bindings.`}
          />
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Value constraints control the shape or range of the answer.
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Binding strength is not applicable to this answer type.
        </p>
      </div>
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
    case 'String (Enumerated)':
      return renderEnumeratedStringSection();
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
