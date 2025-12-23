/**
 * InstanceScopeDrawer
 * 
 * Reusable drawer for selecting instance scope with smart filtering.
 * Supports: first-only, all-instances, and filter-based scoping.
 */

import React, { useState, useEffect } from 'react';
import { X, Check, AlertCircle, Filter as FilterIcon } from 'lucide-react';
import type { InstanceScope, DetectedFilterOption } from './InstanceScope.types';
import { detectFilterOptions } from './BundleAnalysis.utils';
import { getInstanceScopeSummary, formatFhirPathForDisplay } from './InstanceScope.utils';
import { FhirPathPicker } from '../../../common/FhirPathPicker';
import type { FhirPathPickerResult } from '../../../common/FhirPathPicker';

interface InstanceScopeDrawerProps {
  isOpen: boolean;
  resourceType: string;
  bundle: any;
  value?: InstanceScope;
  onChange: (scope: InstanceScope) => void;
  onClose: () => void;
}

export const InstanceScopeDrawer: React.FC<InstanceScopeDrawerProps> = ({
  isOpen,
  resourceType,
  bundle,
  value = { kind: 'all' },
  onChange,
  onClose,
}) => {
  const [selectedKind, setSelectedKind] = useState<'first' | 'all' | 'filter'>(value.kind);
  const [selectedFilter, setSelectedFilter] = useState<DetectedFilterOption | null>(null);
  const [isCustomFilterOpen, setIsCustomFilterOpen] = useState(false);
  const [detectedOptions, setDetectedOptions] = useState<DetectedFilterOption[]>([]);

  // Detect filter options from bundle
  useEffect(() => {
    if (selectedKind === 'filter' && bundle) {
      const options = detectFilterOptions(bundle, resourceType);
      setDetectedOptions(options);
    }
  }, [selectedKind, bundle, resourceType]);

  // Reset when resource type changes
  useEffect(() => {
    setSelectedKind(value.kind);
    setSelectedFilter(null);
  }, [resourceType, value]);

  const handleApply = () => {
    let scope: InstanceScope;

    switch (selectedKind) {
      case 'first':
        scope = { kind: 'first' };
        break;

      case 'all':
        scope = { kind: 'all' };
        break;

      case 'filter':
        if (!selectedFilter) {
          // Validation: must select a filter
          return;
        }
        scope = { kind: 'filter', filter: selectedFilter.filterSpec };
        break;

      default:
        scope = { kind: 'all' };
    }

    onChange(scope);
    onClose();
  };

  const handleCustomFilter = (result: FhirPathPickerResult) => {
    if (result.kind === 'filter') {
      // Extract the where(...) part from the composed path
      const whereMatch = result.composedPath.match(/\.where\((.+)\)$/);
      if (whereMatch) {
        const fhirPath = `where(${whereMatch[1]})`;
        
        setSelectedFilter({
          id: 'custom',
          label: 'Custom filter',
          description: fhirPath,
          filterSpec: { type: 'custom', fhirPath },
        });
        
        setIsCustomFilterOpen(false);
      }
    }
  };

  // Calculate preview scope based on current selections
  const getPreviewScope = (): InstanceScope => {
    switch (selectedKind) {
      case 'first':
        return { kind: 'first' };
      case 'all':
        return { kind: 'all' };
      case 'filter':
        if (selectedFilter) {
          return { kind: 'filter', filter: selectedFilter.filterSpec };
        }
        // No filter selected yet, show default
        return { kind: 'all' };
      default:
        return { kind: 'all' };
    }
  };

  const previewScope = getPreviewScope();
  const summary = getInstanceScopeSummary(resourceType, previewScope);

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
            <h2 className="text-lg font-semibold text-gray-900">Instance Scope</h2>
            <p className="text-sm text-gray-600 mt-1">
              Select which {resourceType} instances this rule applies to
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
          {/* Scope Kind Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Scope Type
            </label>
            <div className="space-y-2">
              {/* All Instances */}
              <label className="flex items-start gap-3 p-3 border border-gray-300 rounded-md cursor-pointer hover:bg-blue-50 hover:border-blue-500 transition-colors">
                <input
                  type="radio"
                  name="scopeKind"
                  value="all"
                  checked={selectedKind === 'all'}
                  onChange={() => {
                    setSelectedKind('all');
                    setSelectedFilter(null);
                  }}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">
                    All instances
                  </div>
                  <div className="text-xs text-gray-600 mt-0.5">
                    Apply to all {resourceType} resources in the bundle
                  </div>
                  <div className="text-xs text-gray-500 font-mono mt-1">
                    {resourceType}[*]
                  </div>
                </div>
              </label>

              {/* First Only */}
              <label className="flex items-start gap-3 p-3 border border-gray-300 rounded-md cursor-pointer hover:bg-blue-50 hover:border-blue-500 transition-colors">
                <input
                  type="radio"
                  name="scopeKind"
                  value="first"
                  checked={selectedKind === 'first'}
                  onChange={() => {
                    setSelectedKind('first');
                    setSelectedFilter(null);
                  }}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">
                    First instance only
                  </div>
                  <div className="text-xs text-gray-600 mt-0.5">
                    Apply to the first {resourceType} resource only
                  </div>
                  <div className="text-xs text-gray-500 font-mono mt-1">
                    {resourceType}[0]
                  </div>
                </div>
              </label>

              {/* Filter */}
              <label className="flex items-start gap-3 p-3 border border-gray-300 rounded-md cursor-pointer hover:bg-blue-50 hover:border-blue-500 transition-colors">
                <input
                  type="radio"
                  name="scopeKind"
                  value="filter"
                  checked={selectedKind === 'filter'}
                  onChange={() => setSelectedKind('filter')}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                    <FilterIcon size={14} />
                    Filter by condition
                  </div>
                  <div className="text-xs text-gray-600 mt-0.5">
                    Apply to {resourceType} resources matching a condition
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Filter Options */}
          {selectedKind === 'filter' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Select Filter Condition
              </label>

              {detectedOptions.length === 0 ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle size={16} className="text-yellow-600 mt-0.5" />
                    <div>
                      <div className="text-sm font-medium text-yellow-900">
                        No filter patterns detected
                      </div>
                      <div className="text-xs text-yellow-700 mt-1">
                        The sample bundle does not contain common filter patterns for {resourceType}.
                        You can create a custom filter below.
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 mb-4">
                  {detectedOptions.map((option) => (
                    <label
                      key={option.id}
                      className={`flex items-start gap-3 p-3 border rounded-md cursor-pointer transition-colors ${
                        selectedFilter?.id === option.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="filterOption"
                        value={option.id}
                        checked={selectedFilter?.id === option.id}
                        onChange={() => setSelectedFilter(option)}
                        className="mt-0.5"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">
                          {option.label}
                        </div>
                        <div className="text-xs text-gray-600 mt-0.5">
                          {option.description}
                        </div>
                      </div>
                      {selectedFilter?.id === option.id && (
                        <Check size={16} className="text-blue-600 mt-0.5" />
                      )}
                    </label>
                  ))}
                </div>
              )}

              {/* Custom Filter Button */}
              <button
                onClick={() => setIsCustomFilterOpen(true)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {selectedFilter?.id === 'custom' ? 'Edit custom filter' : 'Create custom filter'}
              </button>

              {selectedFilter?.id === 'custom' && (
                <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-md">
                  <div className="text-xs font-medium text-gray-700 mb-1">Custom Filter:</div>
                  <div className="text-xs font-mono text-gray-900">
                    {selectedFilter.description}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Preview */}
          {(selectedKind !== 'filter' || selectedFilter) && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <div className="text-xs font-medium text-blue-900 mb-2">Preview:</div>
              <div className="text-sm text-blue-900 mb-1">{summary.text}</div>
              <pre className="text-xs font-mono text-blue-700 whitespace-pre-wrap break-all">
                {formatFhirPathForDisplay(summary.fhirPath)}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={selectedKind === 'filter' && !selectedFilter}
            className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Apply
          </button>
        </div>
      </div>

      {/* Custom Filter Picker */}
      <FhirPathPicker
        mode="filter"
        isOpen={isCustomFilterOpen}
        bundle={bundle}
        basePath={resourceType}
        resourceType={resourceType}
        onSelect={handleCustomFilter}
        onCancel={() => setIsCustomFilterOpen(false)}
      />
    </>
  );
};
