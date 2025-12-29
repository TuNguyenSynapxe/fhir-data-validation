import React, { useState, useEffect } from 'react';
import FhirPathSelectorDrawer from '../../../../rules/FhirPathSelectorDrawer';

/**
 * REQUIRED CONFIG SECTION
 * 
 * Rule-specific configuration for Required Field rules.
 * ONLY handles field-level validation - NO bundle-level logic.
 * 
 * Responsibilities:
 * - Field path selection via FhirPathSelectorDrawer
 * - Validation that field is present and not empty
 * 
 * The parent RuleForm handles: resource, scope, severity, errorCode, userHint, preview, save/cancel.
 * 
 * NOTE: For bundle-level resource requirements, use ResourceConfigSection instead.
 */

// ========== DATA TYPES ==========

export interface RequiredFieldParams {
  path: string;
}

export type RequiredParams = RequiredFieldParams;

// ========== COMPONENT ==========

interface RequiredConfigSectionProps {
  mode: 'create' | 'edit';
  resourceType: string;
  initialParams?: RequiredParams;
  onParamsChange: (params: RequiredParams, isValid: boolean) => void;
  projectBundle?: object;
  hl7Samples?: any[];
}

export const RequiredConfigSection: React.FC<RequiredConfigSectionProps> = ({
  mode,
  resourceType,
  initialParams,
  onParamsChange,
  projectBundle,
  hl7Samples,
}) => {
  // ========== STATE ==========
  
  const [fieldPath, setFieldPath] = useState<string>('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ========== INITIALIZATION (EDIT MODE) ==========

  useEffect(() => {
    if (mode === 'edit' && initialParams) {
      const fieldParams = initialParams as RequiredFieldParams;
      setFieldPath(fieldParams.path || '');
    }
  }, [mode, initialParams]);

  // ========== VALIDATION & CHANGE NOTIFICATION ==========

  useEffect(() => {
    const newErrors: Record<string, string> = {};
    let isValid = true;

    if (!fieldPath.trim()) {
      newErrors.fieldPath = 'Field path is required';
      isValid = false;
    }

    const params: RequiredFieldParams = { path: fieldPath };
    onParamsChange(params, isValid);
    setErrors(newErrors);
  }, [fieldPath, onParamsChange]);

  // ========== HANDLERS ==========

  const handleFieldPathSelected = (path: string) => {
    setFieldPath(path);
    setIsDrawerOpen(false);
  };

  // ========== RENDER ==========

  return (
    <div className="space-y-6">
      {/* FIELD PATH SELECTION */}
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
            ${errors.fieldPath
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
        {errors.fieldPath && (
          <p className="mt-1 text-sm text-red-600">{errors.fieldPath}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">
          The field that must be present and not empty
        </p>
      </div>

      <FhirPathSelectorDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSelect={handleFieldPathSelected}
        resourceType={resourceType}
        projectBundle={projectBundle}
        hl7Samples={hl7Samples}
      />

      {/* SUMMARY */}
      <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-md">
        <h4 className="text-xs font-medium text-gray-700 mb-1">Summary</h4>
        <p className="text-sm text-gray-900">
          {fieldPath ? `Field "${fieldPath}" must be present and not empty` : 'No field selected'}
        </p>
      </div>
    </div>
  );
};
