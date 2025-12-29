import React, { useState } from 'react';
import { Package, Plus, Trash2, AlertCircle, Filter as FilterIcon, Edit2, ChevronDown, ChevronRight } from 'lucide-react';
import { ResourceSelector, ALL_RESOURCE_TYPES } from '../../common/ResourceSelector';
import { ResourceFilterDrawer } from './ResourceFilterDrawer';
import { getRequirementSummary, getFilterSummary } from './ResourceSummaryHelpers';

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
 * - Filter configuration via drawer
 * - Display bundle composition enforcement
 * 
 * The parent RuleForm handles: severity, userHint, preview, save/cancel.
 * 
 * NOTE: This rule validates at BUNDLE level, not instance level.
 * ErrorCode is FIXED: RESOURCE_REQUIREMENT_VIOLATION
 * 
 * REFACTORED: Uses ResourceSelector for resource type, drawer for filters
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

export const ResourceConfigSection: React.FC<ResourceConfigSectionProps> = ({
  requirements,
  onRequirementsChange,
  errors = {},
  projectBundle,
}) => {
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Get already selected resource types to prevent duplicates
  const selectedTypes = requirements.map(req => req.resourceType).filter(Boolean);

  // Helper to get resource counts from bundle
  const getResourceCount = (resourceType: string): number => {
    if (!projectBundle?.entry) return 0;
    return projectBundle.entry.filter((e: any) => 
      e?.resource?.resourceType === resourceType
    ).length;
  };

  const addRequirement = () => {
    onRequirementsChange([
      ...requirements,
      { resourceType: '', mode: 'min', count: 1, where: [] }
    ]);
  };

  const updateRequirement = (index: number, updates: Partial<ResourceRequirement>) => {
    const updated = [...requirements];
    updated[index] = { ...updated[index], ...updates };
    onRequirementsChange(updated);
  };

  const removeRequirement = (index: number) => {
    onRequirementsChange(requirements.filter((_, i) => i !== index));
  };

  const openFilterDrawer = (index: number) => {
    setEditingIndex(index);
    setFilterDrawerOpen(true);
  };

  const closeFilterDrawer = () => {
    setFilterDrawerOpen(false);
    setEditingIndex(null);
  };

  const handleFilterChange = (filter: WhereFilter | null) => {
    if (editingIndex !== null) {
      const updated = [...requirements];
      updated[editingIndex] = {
        ...updated[editingIndex],
        where: filter ? [filter] : []
      };
      onRequirementsChange(updated);
    }
  };

  return (
    <div className="space-y-4">
      {/* Bundle Enforcement Banner */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Package className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h4 className="text-sm font-medium text-purple-900 mb-1">
              Bundle Composition Enforcement
            </h4>
            <p className="text-sm text-purple-700 leading-relaxed">
              This rule validates at the <strong>bundle level</strong>. All submitted FHIR Bundles 
              must contain the specified resources matching your count and filter constraints.
              Any resources not explicitly declared in requirements below will be rejected.
            </p>
          </div>
        </div>
      </div>

      {errors.requirements && (
        <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
          {errors.requirements}
        </div>
      )}

      {/* Requirements List */}
      <div className="space-y-4">
        {requirements.map((req, index) => {
          const bundleCount = req.resourceType ? getResourceCount(req.resourceType) : null;
          const hasFilter = req.where && req.where.length > 0;
          const currentFilter = hasFilter ? req.where![0] : null;
          const summary = req.resourceType ? getRequirementSummary(req) : '';

          return (
            <div 
              key={index} 
              className="border border-gray-200 rounded-lg p-4 space-y-3 bg-white hover:border-blue-300 transition-colors"
            >
              {/* Summary Chip */}
              {req.resourceType && (
                <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                  <div className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                    {summary}
                  </div>
                  {bundleCount !== null && (
                    <div className={`px-2 py-0.5 rounded text-xs font-medium ${
                      bundleCount === 0 
                        ? 'bg-amber-100 text-amber-700' 
                        : 'bg-green-50 text-green-700'
                    }`}>
                      In bundle: {bundleCount}
                    </div>
                  )}
                </div>
              )}

              {/* Resource Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Resource Type
                </label>
                <ResourceSelector
                  value={req.resourceType}
                  onChange={(type) => updateRequirement(index, { resourceType: type })}
                  projectBundle={projectBundle}
                  supportedTypes={ALL_RESOURCE_TYPES.filter(type => 
                    !selectedTypes.includes(type) || type === req.resourceType
                  )}
                />

                {/* Warning if not in bundle */}
                {req.resourceType && bundleCount === 0 && (
                  <div className="mt-2 flex items-start gap-2 text-amber-700 bg-amber-50 rounded p-2 text-sm">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>This resource type is not present in the current sample bundle</span>
                  </div>
                )}
              </div>

              {/* Mode and Count (only show if resource type selected) */}
              {req.resourceType && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mode
                    </label>
                    <select
                      value={req.mode}
                      onChange={(e) => updateRequirement(index, { mode: e.target.value as 'min' | 'exact' })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="min">At least</option>
                      <option value="exact">Exactly</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Count
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={req.count}
                      onChange={(e) => updateRequirement(index, { count: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              )}

              {/* Filter Configuration (only show if resource type selected) */}
              {req.resourceType && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Filter (Optional)
                  </label>
                  {hasFilter ? (
                    // Show filter summary with edit/clear buttons
                    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <FilterIcon className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      <span className="text-sm text-gray-700 flex-1 font-mono">
                        {getFilterSummary(currentFilter!)}
                      </span>
                      <button
                        type="button"
                        onClick={() => openFilterDrawer(index)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                        title="Edit filter"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => updateRequirement(index, { where: [] })}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                        title="Clear filter"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    // Show "Add filter" button
                    <button
                      type="button"
                      onClick={() => openFilterDrawer(index)}
                      className="w-full px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
                    >
                      <FilterIcon className="w-4 h-4" />
                      Add filter
                    </button>
                  )}
                </div>
              )}

              {/* Remove Button */}
              <div className="pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => removeRequirement(index)}
                  className="text-sm text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Remove Requirement
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Requirement Button */}
      <button
        type="button"
        onClick={addRequirement}
        className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
      >
        <Plus className="w-5 h-5" />
        Add Resource Requirement
      </button>

      {/* Filter Drawer */}
      {editingIndex !== null && (
        <ResourceFilterDrawer
          isOpen={filterDrawerOpen}
          resourceType={requirements[editingIndex].resourceType}
          bundle={projectBundle}
          currentFilter={requirements[editingIndex].where?.[0] || undefined}
          onChange={handleFilterChange}
          onClose={closeFilterDrawer}
        />
      )}
    </div>
  );
};
