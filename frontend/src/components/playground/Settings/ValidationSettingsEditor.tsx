import React from 'react';
import { Settings, Info, CheckCircle } from 'lucide-react';
import type { ValidationSettings, ReferenceResolutionPolicy } from '../../../types/validationSettings';
import { REFERENCE_POLICY_DESCRIPTIONS } from '../../../types/validationSettings';

interface ValidationSettingsEditorProps {
  settings: ValidationSettings;
  onSettingsChange: (settings: ValidationSettings) => void;
  onSave: () => void;
  hasChanges: boolean;
  isSaving?: boolean;
}

/**
 * ValidationSettingsEditor Component
 * 
 * UI for configuring runtime validation behavior.
 * This is NOT part of rule definitions - it controls engine behavior.
 */
export const ValidationSettingsEditor: React.FC<ValidationSettingsEditorProps> = ({
  settings,
  onSettingsChange,
  onSave,
  hasChanges,
  isSaving = false,
}) => {
  const handlePolicyChange = (policy: ReferenceResolutionPolicy) => {
    onSettingsChange({
      ...settings,
      referenceResolutionPolicy: policy,
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 border-b bg-gray-50 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-gray-600" />
            <h2 className="text-base font-semibold text-gray-900">Validation Settings</h2>
          </div>
          <button
            onClick={onSave}
            disabled={!hasChanges || isSaving}
            className={`px-3 py-1.5 text-sm rounded transition-colors ${
              hasChanges && !isSaving
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isSaving ? 'Saving...' : hasChanges ? 'Save Changes' : 'Saved'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Info Notice */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-medium mb-1">Runtime Configuration</p>
              <p className="text-blue-800">
                These settings control validation engine behavior at runtime.
                They are separate from rule definitions and apply to validation execution.
              </p>
            </div>
          </div>
        </div>

        {/* Reference Resolution Policy Section */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            Reference Resolution Policy
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Configure how the validation engine handles unresolved resource references.
            This affects Reference Validation severity and blocking behavior.
          </p>

          {/* Radio Options */}
          <div className="space-y-3">
            {(Object.keys(REFERENCE_POLICY_DESCRIPTIONS) as ReferenceResolutionPolicy[]).map((policy) => {
              const info = REFERENCE_POLICY_DESCRIPTIONS[policy];
              const isSelected = settings.referenceResolutionPolicy === policy;

              return (
                <label
                  key={policy}
                  className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="referencePolicy"
                    value={policy}
                    checked={isSelected}
                    onChange={() => handlePolicyChange(policy)}
                    className="mt-1 w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-gray-900">
                        {info.label}
                      </span>
                      {policy === 'AllowExternal' && (
                        <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full font-medium">
                          Recommended
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 mb-1">{info.description}</p>
                    <p className="text-xs text-gray-500 italic">{info.technical}</p>
                  </div>
                  {isSelected && (
                    <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-1" />
                  )}
                </label>
              );
            })}
          </div>
        </div>

        {/* Behavior Summary */}
        <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">
            Current Behavior
          </h4>
          <div className="text-sm text-gray-700 space-y-1">
            {settings.referenceResolutionPolicy === 'InBundleOnly' && (
              <>
                <p>✓ All references must exist within the Bundle</p>
                <p>✗ Unresolved references will <strong>block validation</strong></p>
              </>
            )}
            {settings.referenceResolutionPolicy === 'AllowExternal' && (
              <>
                <p>✓ In-bundle references are validated normally</p>
                <p>⚠ External references are allowed (downgraded to warnings)</p>
                <p>✓ Validation will <strong>not be blocked</strong> by external references</p>
              </>
            )}
            {settings.referenceResolutionPolicy === 'RequireResolution' && (
              <>
                <p>✓ All references must be resolvable</p>
                <p>✗ Unresolved references will <strong>block validation</strong></p>
                <p className="text-amber-600">⚠ Requires server connectivity or comprehensive test data</p>
              </>
            )}
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex gap-3">
            <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-900">
              <p className="font-medium mb-1">Export & Reuse</p>
              <p className="text-amber-800">
                These settings are project-specific and stored separately from rule definitions.
                When exporting rules for reuse, validation settings are not included.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
