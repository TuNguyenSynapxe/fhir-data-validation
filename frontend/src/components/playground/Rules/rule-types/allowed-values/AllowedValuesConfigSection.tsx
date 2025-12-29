import React from 'react';
import { List } from 'lucide-react';
import FhirPathSelectorDrawer from '../../../../rules/FhirPathSelectorDrawer';

/**
 * ALLOWED VALUES CONFIG SECTION
 * 
 * Rule-specific configuration for AllowedValues rules.
 * ONLY handles rule-specific parameters - NO shared UI (resource, scope, severity).
 * 
 * Responsibilities:
 * - Field path selection
 * - Allowed values list management
 * 
 * The parent RuleForm handles: resource, scope (instance), severity, errorCode, userHint, preview, save/cancel.
 * 
 * NOTE: errorCode is FIXED as "VALUE_NOT_ALLOWED" - displayed as read-only badge by RuleForm.
 */

interface AllowedValuesConfigSectionProps {
  fieldPath: string;
  allowedValues: string[];
  onFieldPathChange: (path: string) => void;
  onAllowedValuesChange: (values: string[]) => void;
  errors?: {
    fieldPath?: string;
    allowedValues?: string;
  };
  projectBundle?: object;
  hl7Samples?: any[];
  resourceType: string;
}

export const AllowedValuesConfigSection: React.FC<AllowedValuesConfigSectionProps> = ({
  fieldPath,
  allowedValues,
  onFieldPathChange,
  onAllowedValuesChange,
  errors = {},
  projectBundle,
  hl7Samples,
  resourceType,
}) => {
  const [isPathDrawerOpen, setIsPathDrawerOpen] = React.useState(false);
  const [newValue, setNewValue] = React.useState('');

  const handleAddValue = () => {
    if (newValue.trim() && !allowedValues.includes(newValue.trim())) {
      onAllowedValuesChange([...allowedValues, newValue.trim()]);
      setNewValue('');
    }
  };

  const handleRemoveValue = (index: number) => {
    onAllowedValuesChange(allowedValues.filter((_, i) => i !== index));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddValue();
    }
  };

  return (
    <div className="space-y-6">
      {/* Conceptual Model Hint */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <div className="flex items-start gap-3">
          <List className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-blue-900">
              Allowed Values Validation
            </div>
            <div className="text-xs text-blue-800 mt-1">
              Validates that a field value is within a predefined set of allowed values.
              Useful for enforcing controlled vocabularies or status codes.
            </div>
          </div>
        </div>
      </div>

      {/* Field Path Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Field to Validate <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={fieldPath}
            readOnly
            placeholder="Click 'Select Field' to choose a field"
            className={`
              flex-1 px-3 py-2 border rounded-md bg-gray-50 font-mono text-sm
              ${errors.fieldPath ? 'border-red-300' : 'border-gray-300'}
            `}
          />
          <button
            onClick={() => setIsPathDrawerOpen(true)}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Select Field
          </button>
        </div>
        {errors.fieldPath && (
          <p className="mt-1 text-sm text-red-600">{errors.fieldPath}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">
          The field that must contain one of the allowed values
        </p>
      </div>

      {/* Allowed Values List */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Allowed Values <span className="text-red-500">*</span>
        </label>
        
        {/* Add Value Input */}
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a value and press Enter or Add"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
          <button
            onClick={handleAddValue}
            disabled={!newValue.trim()}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add
          </button>
        </div>

        {/* Values List */}
        {allowedValues.length > 0 ? (
          <div className="border border-gray-300 rounded-md divide-y divide-gray-200 max-h-48 overflow-y-auto">
            {allowedValues.map((value, index) => (
              <div
                key={index}
                className="flex items-center justify-between px-3 py-2 hover:bg-gray-50"
              >
                <code className="text-sm text-gray-800">{value}</code>
                <button
                  onClick={() => handleRemoveValue(index)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="border border-dashed border-gray-300 rounded-md px-4 py-8 text-center text-sm text-gray-500">
            No values added yet. Add at least one allowed value.
          </div>
        )}
        
        {errors.allowedValues && (
          <p className="mt-1 text-sm text-red-600">{errors.allowedValues}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">
          The field value must be one of these values
        </p>
      </div>

      {/* FhirPath Selector Drawer */}
      {isPathDrawerOpen && (
        <FhirPathSelectorDrawer
          isOpen={isPathDrawerOpen}
          onClose={() => setIsPathDrawerOpen(false)}
          onSelect={(path) => {
            onFieldPathChange(path);
            setIsPathDrawerOpen(false);
          }}
          resourceType={resourceType}
          projectBundle={projectBundle}
          hl7Samples={hl7Samples}
        />
      )}
    </div>
  );
};
