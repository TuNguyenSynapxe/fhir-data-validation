import React from 'react';
import { Ruler } from 'lucide-react';
import FhirPathSelectorDrawer from '../../../../rules/FhirPathSelectorDrawer';

/**
 * ARRAY LENGTH CONFIG SECTION
 * 
 * Rule-specific configuration for ArrayLength rules.
 * ONLY handles rule-specific parameters - NO shared UI (resource, scope, severity).
 * 
 * Responsibilities:
 * - Array path selection
 * - Min/Max length constraints
 * 
 * The parent RuleForm handles: resource, scope (instance), severity, errorCode, userHint, preview, save/cancel.
 * 
 * NOTE: errorCode is FIXED as "ARRAY_LENGTH_VIOLATION" - displayed as read-only badge by RuleForm.
 */

interface ArrayLengthConfigSectionProps {
  arrayPath: string;
  min?: number;
  max?: number;
  onArrayPathChange: (path: string) => void;
  onMinChange: (value: number | undefined) => void;
  onMaxChange: (value: number | undefined) => void;
  errors?: {
    arrayPath?: string;
    min?: string;
    max?: string;
    constraint?: string;
  };
  projectBundle?: object;
  hl7Samples?: any[];
  resourceType: string;
}

export const ArrayLengthConfigSection: React.FC<ArrayLengthConfigSectionProps> = ({
  arrayPath,
  min,
  max,
  onArrayPathChange,
  onMinChange,
  onMaxChange,
  errors = {},
  projectBundle,
  hl7Samples,
  resourceType,
}) => {
  const [isPathDrawerOpen, setIsPathDrawerOpen] = React.useState(false);

  return (
    <div className="space-y-6">
      {/* Conceptual Model Hint */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <div className="flex items-start gap-3">
          <Ruler className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-blue-900">
              Array Length Validation
            </div>
            <div className="text-xs text-blue-800 mt-1">
              Validates that an array or collection has a minimum and/or maximum number of elements.
              Useful for ensuring required cardinality or preventing excessive data.
            </div>
          </div>
        </div>
      </div>

      {/* Array Path Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Array Field to Validate <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={arrayPath}
            readOnly
            placeholder="Click 'Select Field' to choose an array field"
            className={`
              flex-1 px-3 py-2 border rounded-md bg-gray-50 font-mono text-sm
              ${errors.arrayPath ? 'border-red-300' : 'border-gray-300'}
            `}
          />
          <button
            onClick={() => setIsPathDrawerOpen(true)}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Select Field
          </button>
        </div>
        {errors.arrayPath && (
          <p className="mt-1 text-sm text-red-600">{errors.arrayPath}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">
          The array or collection field to validate
        </p>
      </div>

      {/* Min/Max Length Constraints */}
      <div className="grid grid-cols-2 gap-4">
        {/* Minimum Length */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Minimum Length
          </label>
          <input
            type="number"
            value={min !== undefined ? min : ''}
            onChange={(e) => {
              const value = e.target.value === '' ? undefined : parseInt(e.target.value);
              onMinChange(value);
            }}
            placeholder="No minimum"
            min="0"
            className={`
              w-full px-3 py-2 border rounded-md text-sm
              ${errors.min ? 'border-red-300 bg-red-50' : 'border-gray-300'}
            `}
          />
          {errors.min && (
            <p className="mt-1 text-sm text-red-600">{errors.min}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Minimum number of elements (optional)
          </p>
        </div>

        {/* Maximum Length */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Maximum Length
          </label>
          <input
            type="number"
            value={max !== undefined ? max : ''}
            onChange={(e) => {
              const value = e.target.value === '' ? undefined : parseInt(e.target.value);
              onMaxChange(value);
            }}
            placeholder="No maximum"
            min="0"
            className={`
              w-full px-3 py-2 border rounded-md text-sm
              ${errors.max ? 'border-red-300 bg-red-50' : 'border-gray-300'}
            `}
          />
          {errors.max && (
            <p className="mt-1 text-sm text-red-600">{errors.max}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Maximum number of elements (optional)
          </p>
        </div>
      </div>

      {/* Constraint Validation Error */}
      {errors.constraint && (
        <div className="px-4 py-3 border border-red-200 bg-red-50 rounded-md">
          <p className="text-sm text-red-800">{errors.constraint}</p>
        </div>
      )}

      {/* Constraint Summary */}
      {(min !== undefined || max !== undefined) && (
        <div className="px-4 py-3 border border-green-200 bg-green-50 rounded-md">
          <div className="text-sm font-medium text-green-900">Constraint Summary</div>
          <div className="text-xs text-green-800 mt-1">
            {min !== undefined && max !== undefined && (
              <>Array must have between {min} and {max} elements</>
            )}
            {min !== undefined && max === undefined && (
              <>Array must have at least {min} {min === 1 ? 'element' : 'elements'}</>
            )}
            {min === undefined && max !== undefined && (
              <>Array must have at most {max} {max === 1 ? 'element' : 'elements'}</>
            )}
          </div>
        </div>
      )}

      {/* FhirPath Selector Drawer */}
      {isPathDrawerOpen && (
        <FhirPathSelectorDrawer
          isOpen={isPathDrawerOpen}
          onClose={() => setIsPathDrawerOpen(false)}
          onSelect={(path) => {
            onArrayPathChange(path);
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
