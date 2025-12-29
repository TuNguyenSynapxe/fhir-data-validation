/**
 * ResourceFilterDrawer
 * 
 * Drawer for configuring where filters for Resource requirements.
 * Reuses InstanceScopeDrawer patterns: detected filters from bundle + custom FHIRPath.
 * 
 * UX mirrors instance scope selection but outputs WhereFilter instead of InstanceScope.
 */

import React, { useState, useEffect } from 'react';
import { X, Check, AlertCircle, Filter as FilterIcon } from 'lucide-react';
import { detectFilterOptions } from '../../common/BundleAnalysis.utils';
import type { DetectedFilterOption } from '../../common/InstanceScope.types';
import { FhirPathPicker } from '../../../../common/FhirPathPicker';
import type { FhirPathPickerResult } from '../../../../common/FhirPathPicker';
import type { WhereFilter } from './ResourceConfigSection';

// Map detected filter spec to WhereFilter
function filterSpecToWhereFilter(spec: DetectedFilterOption['filterSpec']): WhereFilter {
  switch (spec.type) {
    case 'code':
      return { path: 'code', op: '=', value: spec.code };
    case 'systemCode':
      return { path: 'coding.where(system=\'' + spec.system + '\').code', op: '=', value: spec.code };
    case 'identifier':
      return { path: 'identifier.where(system=\'' + spec.system + '\').value', op: '=', value: spec.value };
    case 'custom':
      // Extract field and value from where clause if possible
      // For now, store as custom with contains operator
      return { path: spec.fhirPath, op: 'contains', value: '' };
  }
}

interface ResourceFilterDrawerProps {
  isOpen: boolean;
  resourceType: string;
  bundle: any;
  currentFilter?: WhereFilter;
  onChange: (filter: WhereFilter | null) => void;
  onClose: () => void;
}

export const ResourceFilterDrawer: React.FC<ResourceFilterDrawerProps> = ({
  isOpen,
  resourceType,
  bundle,
  currentFilter,
  onChange,
  onClose,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<WhereFilter | null>(currentFilter || null);
  const [isCustomFilterOpen, setIsCustomFilterOpen] = useState(false);
  const [detectedOptions, setDetectedOptions] = useState<DetectedFilterOption[]>([]);
  const [customPath, setCustomPath] = useState('');
  const [customOp, setCustomOp] = useState<'=' | '!=' | 'contains' | 'in'>('=');
  const [customValue, setCustomValue] = useState('');

  // Detect filter options from bundle
  useEffect(() => {
    if (bundle && isOpen) {
      const options = detectFilterOptions(bundle, resourceType);
      setDetectedOptions(options);
    }
  }, [bundle, resourceType, isOpen]);

  // Reset when opened
  useEffect(() => {
    if (isOpen) {
      setSelectedFilter(currentFilter || null);
      setIsCustomFilterOpen(false);
      setCustomPath('');
      setCustomOp('=');
      setCustomValue('');
    }
  }, [isOpen, currentFilter]);

  const handleApply = () => {
    onChange(selectedFilter);
    onClose();
  };

  const handleClear = () => {
    onChange(null);
    onClose();
  };

  const handleSelectDetected = (option: DetectedFilterOption) => {
    const filter = filterSpecToWhereFilter(option.filterSpec);
    setSelectedFilter(filter);
    // Auto-apply detected filters
    onChange(filter);
    onClose();
  };

  const handleCustomFilter = (result: FhirPathPickerResult) => {
    if (result.kind === 'filter') {
      // Extract field from path
      // For simplicity, use the composed path as the field
      const pathParts = result.composedPath.split('.where(');
      const fieldPath = pathParts[0].replace(resourceType + '[*].', '');
      
      setCustomPath(fieldPath);
      setIsCustomFilterOpen(false);
    }
  };

  const handleApplyCustom = () => {
    if (customPath.trim() && customValue.trim()) {
      setSelectedFilter({
        path: customPath.trim(),
        op: customOp,
        value: customValue.trim(),
      });
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-30 z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-[600px] bg-white shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Filter {resourceType}</h2>
            <p className="text-sm text-gray-600 mt-1">
              Select conditions to filter which {resourceType} resources to count
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* Detected Filters from Bundle */}
          {detectedOptions.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <FilterIcon size={16} className="text-blue-600" />
                Suggested from Sample Bundle
              </h3>
              <div className="space-y-2">
                {detectedOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleSelectDetected(option)}
                    className="w-full flex items-start gap-3 p-3 border border-gray-300 rounded-md hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
                  >
                    <Check size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900">
                        {option.label}
                      </div>
                      <div className="text-xs text-gray-600 mt-0.5">
                        {option.description}
                      </div>
                      {option.count !== undefined && (
                        <div className="text-xs text-gray-500 mt-1">
                          Found in {option.count} {resourceType} instance{option.count !== 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Custom Filter */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              Custom Filter
            </h3>
            
            {!isCustomFilterOpen ? (
              <button
                type="button"
                onClick={() => setIsCustomFilterOpen(true)}
                className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-md hover:border-blue-400 hover:bg-blue-50 transition-colors text-sm text-gray-600"
              >
                + Create custom filter condition
              </button>
            ) : (
              <div className="space-y-3 p-4 border border-gray-200 rounded-md bg-gray-50">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Field Path
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., category.coding.code"
                    value={customPath}
                    onChange={(e) => setCustomPath(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Use FHIRPath notation relative to {resourceType}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Operator
                  </label>
                  <select
                    value={customOp}
                    onChange={(e) => setCustomOp(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="=">=</option>
                    <option value="!=">!=</option>
                    <option value="contains">contains</option>
                    <option value="in">in</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Value
                  </label>
                  <input
                    type="text"
                    placeholder={customOp === 'in' ? "value1, value2, value3" : "value"}
                    value={customValue}
                    onChange={(e) => setCustomValue(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                  {customOp === 'in' && (
                    <p className="mt-1 text-xs text-gray-500">
                      Use commas to separate multiple values
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleApplyCustom}
                    disabled={!customPath.trim() || !customValue.trim()}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Apply Custom Filter
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCustomFilterOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Current Selection Preview */}
          {selectedFilter && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
              <div className="text-sm font-medium text-blue-900 mb-2">
                Current Filter
              </div>
              <div className="text-xs text-blue-800 font-mono">
                {selectedFilter.path} {selectedFilter.op} {selectedFilter.value}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
          <button
            type="button"
            onClick={handleClear}
            className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 transition-colors"
          >
            Clear Filter
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={!selectedFilter}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Apply Filter
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
