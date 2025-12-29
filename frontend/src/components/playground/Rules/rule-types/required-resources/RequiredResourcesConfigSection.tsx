import React from 'react';
import { Package, Plus, Trash2, AlertCircle } from 'lucide-react';

/**
 * REQUIRED RESOURCES CONFIG SECTION
 * 
 * Rule-specific configuration for RequiredResources rules (bundle-level validation).
 * ONLY handles rule-specific parameters - NO shared UI (resource, scope, severity).
 * 
 * Responsibilities:
 * - Manage requirements array (resourceType + count constraints)
 * - Add/remove requirement rows
 * - Mode selection: "At least" vs "Exactly"
 * 
 * The parent RuleForm handles: severity, userHint, preview, save/cancel.
 * 
 * NOTE: This rule validates at BUNDLE level, not instance level.
 * ErrorCode is FIXED: REQUIRED_RESOURCE_MISSING
 */

export interface ResourceRequirement {
  resourceType: string;
  mode: 'min' | 'exact';
  count: number;
}

interface RequiredResourcesConfigSectionProps {
  requirements: ResourceRequirement[];
  onRequirementsChange: (requirements: ResourceRequirement[]) => void;
  errors?: {
    requirements?: string;
    [key: string]: string | undefined;
  };
  projectBundle?: any;
}

const RESOURCE_TYPES = [
  'Patient',
  'Observation',
  'Condition',
  'Procedure',
  'Medication',
  'Encounter',
  'AllergyIntolerance',
  'Immunization',
  'DiagnosticReport',
  'Organization',
  'Practitioner',
  'Location',
  'Device',
  'Specimen',
];

export const RequiredResourcesConfigSection: React.FC<RequiredResourcesConfigSectionProps> = ({
  requirements,
  onRequirementsChange,
  errors = {},
  projectBundle,
}) => {
  const handleAddRequirement = () => {
    onRequirementsChange([
      ...requirements,
      { resourceType: 'Patient', mode: 'min', count: 1 },
    ]);
  };

  const handleRemoveRequirement = (index: number) => {
    onRequirementsChange(requirements.filter((_, i) => i !== index));
  };

  const handleUpdateRequirement = (
    index: number,
    field: keyof ResourceRequirement,
    value: string | number
  ) => {
    const updated = [...requirements];
    updated[index] = { ...updated[index], [field]: value };
    onRequirementsChange(updated);
  };

  // Check if resource exists in bundle
  const getResourceCountInBundle = (resourceType: string): number | null => {
    if (!projectBundle?.entry) return null;
    return projectBundle.entry.filter(
      (e: any) => e.resource?.resourceType === resourceType
    ).length;
  };

  return (
    <div className="space-y-6">
      {/* Closed Bundle Enforcement Info Panel */}
      <div className="bg-amber-50 border border-amber-200 rounded-md p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-amber-900 mb-2">
              Bundle Validation Rules
            </div>
            <ul className="text-xs text-amber-800 space-y-1.5">
              <li className="flex items-start gap-2">
                <span className="text-amber-600 mt-0.5">•</span>
                <span>Only resource types declared below are allowed in the bundle</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-600 mt-0.5">•</span>
                <span>Any undeclared resource in the bundle will cause validation to fail</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-600 mt-0.5">•</span>
                <span><strong>"Exactly"</strong> enforces no more and no less than the specified count</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-600 mt-0.5">•</span>
                <span>This rule defines the <strong>full allowed bundle composition</strong></span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Conceptual Model Hint */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <div className="flex items-start gap-3">
          <Package className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-blue-900">
              Bundle-Level Resource Validation
            </div>
            <div className="text-xs text-blue-800 mt-1">
              This rule validates the presence and count of specific resources in the bundle.
              Use <strong>"At least"</strong> for minimum counts or <strong>"Exactly"</strong> for exact matches.
            </div>
          </div>
        </div>
      </div>

      {/* Requirements List */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-medium text-gray-700">
            Resource Requirements <span className="text-red-500">*</span>
          </label>
          <button
            type="button"
            onClick={handleAddRequirement}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
          >
            <Plus size={14} />
            Add Requirement
          </button>
        </div>

        {requirements.length === 0 ? (
          <div className="px-4 py-8 border-2 border-dashed border-gray-300 rounded-md text-center">
            <Package className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600 mb-3">No requirements defined</p>
            <button
              type="button"
              onClick={handleAddRequirement}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
            >
              <Plus size={16} />
              Add First Requirement
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {requirements.map((req, index) => {
              const bundleCount = getResourceCountInBundle(req.resourceType);
              const notInBundle = bundleCount === 0;
              const rowError = errors[`requirement_${index}`];

              return (
                <div
                  key={index}
                  className={`p-4 border rounded-md ${
                    rowError ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="grid grid-cols-12 gap-3 items-start">
                    {/* Resource Type */}
                    <div className="col-span-4">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Resource Type
                      </label>
                      <select
                        value={req.resourceType}
                        onChange={(e) =>
                          handleUpdateRequirement(index, 'resourceType', e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      >
                        {RESOURCE_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                      {notInBundle && bundleCount !== null && (
                        <div className="mt-1 flex items-center gap-1 text-xs text-orange-700">
                          <AlertCircle size={12} />
                          Not found in bundle
                        </div>
                      )}
                    </div>

                    {/* Mode */}
                    <div className="col-span-3">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Mode
                      </label>
                      <select
                        value={req.mode}
                        onChange={(e) =>
                          handleUpdateRequirement(index, 'mode', e.target.value as 'min' | 'exact')
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      >
                        <option value="min">At least</option>
                        <option value="exact">Exactly</option>
                      </select>
                    </div>

                    {/* Count */}
                    <div className="col-span-3">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Count
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={req.count}
                        onChange={(e) =>
                          handleUpdateRequirement(index, 'count', parseInt(e.target.value, 10) || 1)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                    </div>

                    {/* Remove Button */}
                    <div className="col-span-2 flex items-end justify-end">
                      <button
                        type="button"
                        onClick={() => handleRemoveRequirement(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        title="Remove requirement"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Row Summary */}
                  <div className="mt-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded text-xs text-gray-700">
                    {req.mode === 'exact' ? (
                      <>
                        <strong>Exactly {req.count}</strong> {req.resourceType} resource
                        {req.count !== 1 ? 's' : ''} must exist in the bundle
                      </>
                    ) : (
                      <>
                        <strong>At least {req.count}</strong> {req.resourceType} resource
                        {req.count !== 1 ? 's' : ''} required
                      </>
                    )}
                    {bundleCount !== null && (
                      <span className="ml-2 text-gray-600">
                        (bundle has {bundleCount})
                      </span>
                    )}
                  </div>

                  {rowError && (
                    <p className="mt-2 text-xs text-red-600">{rowError}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {errors.requirements && (
          <p className="mt-2 text-sm text-red-600">{errors.requirements}</p>
        )}
      </div>

      {/* Governance Notice */}
      <div className="px-4 py-3 border border-yellow-200 bg-yellow-50 rounded-md">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-yellow-900">
              Validation Rules
            </div>
            <ul className="text-xs text-yellow-800 mt-1 space-y-1">
              <li>• Count must be at least 1</li>
              <li>• Each resource type can only appear once</li>
              <li>• Range counts (min &lt; max) are not supported</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
