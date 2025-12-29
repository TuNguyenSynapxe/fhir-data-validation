import React, { useState } from 'react';
import { Package, Plus, Trash2, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';

/**
 * RESOURCE CONFIG SECTION
 * 
 * Rule-specific configuration for Resource rules (bundle-level validation).
 * ONLY handles rule-specific parameters - NO shared UI (resource, scope, severity).
 * 
 * Responsibilities:
 * - Manage requirements array (resourceType + count constraints + where filters)
 * - Add/remove requirement rows
 * - Mode selection: "At least" vs "Exactly"
 * - Advanced where filter configuration
 * - Display rejectUndeclaredResources enforcement
 * 
 * The parent RuleForm handles: severity, userHint, preview, save/cancel.
 * 
 * NOTE: This rule validates at BUNDLE level, not instance level.
 * ErrorCode is FIXED: RESOURCE_REQUIREMENT_VIOLATION
 */

export interface WhereFilter {
  path: string;
  op: '=' | '!=' | 'contains' | 'in';
  value: string; // For 'in' operator, use comma-separated values
}

export interface ResourceRequirement {
  resourceType: string;
  mode: 'min' | 'exact';
  count: number;
  where?: WhereFilter[];
}

interface ResourceConfigSectionProps {
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

export const ResourceConfigSection: React.FC<ResourceConfigSectionProps> = ({
  requirements,
  onRequirementsChange,
  errors = {},
  projectBundle,
}) => {
  const [expandedFilters, setExpandedFilters] = useState<Set<number>>(new Set());

  const handleAddRequirement = () => {
    onRequirementsChange([
      ...requirements,
      { resourceType: 'Patient', mode: 'min', count: 1, where: [] },
    ]);
  };

  const handleRemoveRequirement = (index: number) => {
    onRequirementsChange(requirements.filter((_, i) => i !== index));
  };

  const handleUpdateRequirement = (
    index: number,
    field: keyof ResourceRequirement,
    value: string | number | WhereFilter[]
  ) => {
    const updated = [...requirements];
    updated[index] = { ...updated[index], [field]: value };
    onRequirementsChange(updated);
  };

  const toggleFilterExpansion = (index: number) => {
    const newExpanded = new Set(expandedFilters);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedFilters(newExpanded);
  };

  const handleAddFilter = (reqIndex: number) => {
    const req = requirements[reqIndex];
    const newFilter: WhereFilter = { path: '', op: '=', value: '' };
    handleUpdateRequirement(reqIndex, 'where', [...(req.where || []), newFilter]);
    // Auto-expand when adding filter
    const newExpanded = new Set(expandedFilters);
    newExpanded.add(reqIndex);
    setExpandedFilters(newExpanded);
  };

  const handleRemoveFilter = (reqIndex: number, filterIndex: number) => {
    const req = requirements[reqIndex];
    const updatedFilters = (req.where || []).filter((_, i) => i !== filterIndex);
    handleUpdateRequirement(reqIndex, 'where', updatedFilters);
  };

  const handleUpdateFilter = (
    reqIndex: number,
    filterIndex: number,
    field: keyof WhereFilter,
    value: string
  ) => {
    const req = requirements[reqIndex];
    const updatedFilters = [...(req.where || [])];
    updatedFilters[filterIndex] = { ...updatedFilters[filterIndex], [field]: value };
    handleUpdateRequirement(reqIndex, 'where', updatedFilters);
  };

  // Check if resource exists in bundle
  const getResourceCountInBundle = (resourceType: string): number | null => {
    if (!projectBundle || typeof projectBundle !== 'object') return null;
    try {
      const bundle = projectBundle as any;
      if (!bundle.entry || !Array.isArray(bundle.entry)) return null;
      return bundle.entry.filter(
        (entry: any) => entry.resource?.resourceType === resourceType
      ).length;
    } catch {
      return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Info Banner - Reject Undeclared Resources */}
      <div className="px-4 py-3 border-2 border-amber-300 bg-amber-50 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertCircle className="text-amber-600 mt-0.5 flex-shrink-0" size={20} />
          <div className="flex-1 space-y-2">
            <div className="font-semibold text-amber-900 text-sm">
              Closed Bundle Enforcement
            </div>
            <ul className="text-xs text-amber-800 space-y-1">
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

      {/* Requirements List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700">
            Resource Requirements
          </label>
          <button
            type="button"
            onClick={handleAddRequirement}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
          >
            <Plus size={16} />
            Add Requirement
          </button>
        </div>

        {errors.requirements && (
          <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
            {errors.requirements}
          </div>
        )}

        {requirements.length === 0 && (
          <div className="px-4 py-8 border-2 border-dashed border-gray-300 rounded-lg text-center text-sm text-gray-500">
            No requirements defined. Click "Add Requirement" to specify required resources.
          </div>
        )}

        {requirements.map((req, index) => {
          const bundleCount = getResourceCountInBundle(req.resourceType);
          const notInBundle = bundleCount === 0;
          const hasFilters = req.where && req.where.length > 0;
          const isExpanded = expandedFilters.has(index);

          return (
            <div key={index} className="border border-gray-300 rounded-lg overflow-hidden">
              {/* Main Requirement Row */}
              <div className="p-4 bg-white space-y-3">
                <div className="grid grid-cols-12 gap-3">
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
                        handleUpdateRequirement(index, 'mode', e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="min">At least</option>
                      <option value="exact">Exactly</option>
                    </select>
                  </div>

                  {/* Count */}
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Count
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={req.count}
                      onChange={(e) =>
                        handleUpdateRequirement(index, 'count', parseInt(e.target.value) || 1)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>

                  {/* Actions */}
                  <div className="col-span-3 flex items-end gap-2">
                    <button
                      type="button"
                      onClick={() => handleAddFilter(index)}
                      className="flex-1 px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                      title="Add where filter"
                    >
                      + Filter
                    </button>
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
                <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded text-xs text-gray-700">
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
                  {hasFilters && (
                    <span className="ml-2 text-blue-600 font-medium">
                      • {req.where!.length} filter{req.where!.length !== 1 ? 's' : ''} applied
                    </span>
                  )}
                </div>
              </div>

              {/* Where Filters Section (Expandable) */}
              {hasFilters && (
                <div className="border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => toggleFilterExpansion(index)}
                    className="w-full px-4 py-2 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors text-sm font-medium text-gray-700"
                  >
                    <span>Where Filters ({req.where!.length})</span>
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>

                  {isExpanded && (
                    <div className="p-4 bg-gray-50 space-y-3">
                      {req.where!.map((filter, filterIndex) => (
                        <div
                          key={filterIndex}
                          className="grid grid-cols-12 gap-2 p-3 bg-white border border-gray-200 rounded-md"
                        >
                          {/* Path */}
                          <div className="col-span-5">
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Field Path
                            </label>
                            <input
                              type="text"
                              placeholder="e.g., category.coding.code"
                              value={filter.path}
                              onChange={(e) =>
                                handleUpdateFilter(index, filterIndex, 'path', e.target.value)
                              }
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs"
                            />
                          </div>

                          {/* Operator */}
                          <div className="col-span-2">
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Op
                            </label>
                            <select
                              value={filter.op}
                              onChange={(e) =>
                                handleUpdateFilter(index, filterIndex, 'op', e.target.value)
                              }
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs"
                            >
                              <option value="=">=</option>
                              <option value="!=">!=</option>
                              <option value="contains">contains</option>
                              <option value="in">in</option>
                            </select>
                          </div>

                          {/* Value */}
                          <div className="col-span-4">
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Value
                            </label>
                            <input
                              type="text"
                              placeholder={filter.op === 'in' ? "e.g., value1, value2, value3" : "e.g., vital-signs"}
                              value={filter.value}
                              onChange={(e) =>
                                handleUpdateFilter(index, filterIndex, 'value', e.target.value)
                              }
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs"
                            />
                            {filter.op === 'in' && (
                              <div className="mt-0.5 text-xs text-gray-500">
                                Use commas to separate values
                              </div>
                            )}
                          </div>

                          {/* Remove Filter */}
                          <div className="col-span-1 flex items-end">
                            <button
                              type="button"
                              onClick={() => handleRemoveFilter(index, filterIndex)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Remove filter"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Info Note */}
      <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-md text-xs text-blue-800">
        <strong>Note:</strong> Where filters use FHIRPath expressions to match specific resource attributes.
        <strong> Conditions apply before counting resources.</strong> Only resources matching ALL filters will count toward the requirement.
      </div>
    </div>
  );
};
