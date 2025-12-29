import React from 'react';
import FhirPathSelectorDrawer from '../../../../rules/FhirPathSelectorDrawer';

/**
 * REQUIRED CONFIG SECTION
 * 
 * Rule-specific configuration for Required field rules.
 * ONLY handles rule-specific parameters - NO shared UI (resource, scope, severity).
 * 
 * Responsibilities:
 * - Field path selection via FhirPathSelectorDrawer
 * - Field path validation
 * 
 * The parent RuleForm handles: resource, scope, severity, errorCode, userHint, preview, save/cancel.
 */

interface RequiredConfigSectionProps {
  resourceType: string;
  fieldPath: string;
  onFieldPathChange: (path: string) => void;
  error?: string;
  projectBundle?: object;
  hl7Samples?: any[];
}

export const RequiredConfigSection: React.FC<RequiredConfigSectionProps> = ({
  resourceType,
  fieldPath,
  onFieldPathChange,
  error,
  projectBundle,
  hl7Samples,
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);

  const handlePathSelected = (path: string) => {
    onFieldPathChange(path);
    setIsDrawerOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* Field Path Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Field to Validate <span className="text-red-500">*</span>
        </label>
        <button
          type="button"
          onClick={() => setIsDrawerOpen(true)}
          className={`
            w-full px-4 py-3 text-left border rounded-md
            transition-colors
            ${error
              ? 'border-red-300 bg-red-50'
              : fieldPath
              ? 'border-green-300 bg-green-50 hover:border-green-400'
              : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
            }
          `}
        >
          <div className="flex items-center justify-between">
            <div>
              {fieldPath ? (
                <>
                  <div className="text-sm font-medium text-gray-900">
                    <code className="bg-white px-2 py-0.5 rounded text-xs">{fieldPath}</code>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">Click to change field</div>
                </>
              ) : (
                <div className="text-sm text-gray-500">Click to select a field</div>
              )}
            </div>
            <div className="text-blue-500 text-sm">Select</div>
          </div>
        </button>
        {error && (
          <p className="mt-1 text-sm text-red-600">{error}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">
          The field that must be present and not empty
        </p>
      </div>

      {/* FhirPath Selector Drawer */}
      <FhirPathSelectorDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSelect={handlePathSelected}
        resourceType={resourceType}
        projectBundle={projectBundle}
        hl7Samples={hl7Samples}
      />
    </div>
  );
};
