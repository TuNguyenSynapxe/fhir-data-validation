import React from 'react';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import type { ArrayLayerRefinement, RefinementMode, FilterCondition } from '../../types/fhirPathRefinement';
import RefinementModeSelector from './RefinementModeSelector';
import IndexRefinementInput from './IndexRefinementInput';
import FilterRefinementBuilder from './FilterRefinementBuilder';

/**
 * NestedArrayRefinementBuilder - Stacked scope selector for nested arrays
 * 
 * Displays one section per array level in top-down order (parent → child).
 * Each level allows exactly one refinement mode: all, index, or filter.
 * 
 * Constraints:
 * - User must resolve parent array before child array
 * - No mixing index + filter at same level
 * - No skipping array levels
 */
interface NestedArrayRefinementBuilderProps {
  /** Array layers detected in path */
  layers: ArrayLayerRefinement[];
  /** Callback when any layer changes */
  onChange: (layers: ArrayLayerRefinement[]) => void;
  /** Base path for value suggestions */
  basePath?: string;
  /** Project bundle for suggestions */
  projectBundle?: any;
  /** HL7 sample for suggestions */
  hlSample?: any;
}

const NestedArrayRefinementBuilder: React.FC<NestedArrayRefinementBuilderProps> = ({
  layers,
  onChange,
  basePath = '',
  projectBundle,
  hlSample,
}) => {
  // Extract resource type from basePath for schema lookup
  const resourceType = React.useMemo(() => {
    if (!basePath) return undefined;
    const firstSegment = basePath.split('.')[0];
    // FHIR resource types start with uppercase letter
    if (firstSegment && /^[A-Z][a-zA-Z]*$/.test(firstSegment)) {
      return firstSegment;
    }
    return undefined;
  }, [basePath]);

  const [expandedLayers, setExpandedLayers] = React.useState<Set<number>>(
    new Set([0]) // First layer expanded by default
  );

  const toggleLayer = (index: number) => {
    setExpandedLayers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const handleModeChange = (index: number, mode: RefinementMode) => {
    const newLayers = [...layers];
    newLayers[index] = {
      ...newLayers[index],
      mode,
    };
    onChange(newLayers);
  };

  const handleIndexChange = (index: number, value: number) => {
    const newLayers = [...layers];
    newLayers[index] = {
      ...newLayers[index],
      indexValue: value,
    };
    onChange(newLayers);
  };

  const handleFilterChange = (index: number, condition: FilterCondition) => {
    const newLayers = [...layers];
    newLayers[index] = {
      ...newLayers[index],
      filterCondition: condition,
    };
    onChange(newLayers);
  };

  // Check if parent layers are resolved (not in 'first' mode)
  const isParentResolved = (layerIndex: number): boolean => {
    if (layerIndex === 0) return true;
    for (let i = 0; i < layerIndex; i++) {
      if (layers[i].mode === 'first') {
        return false;
      }
    }
    return true;
  };

  const getLayerTitle = (layer: ArrayLayerRefinement, index: number): string => {
    const levelLabel = index === 0 ? 'Parent Array' : index === 1 ? 'Child Array' : `Level ${index + 1}`;
    return `${levelLabel}: ${layer.segment}`;
  };

  const getLayerSummary = (layer: ArrayLayerRefinement): string => {
    switch (layer.mode) {
      case 'all':
        return 'All items [*]';
      case 'index':
        return `Index [${layer.indexValue ?? 0}]`;
      case 'filter':
        if (layer.filterCondition?.property) {
          return `Where ${layer.filterCondition.property} ${layer.filterCondition.operator} '${layer.filterCondition.value}'`;
        }
        return 'Filter (not configured)';
      case 'first':
      default:
        return 'First item (default)';
    }
  };

  // Build path context for each layer (for filter suggestions)
  const getLayerBasePath = (layerIndex: number): string => {
    if (!basePath) return '';
    const segments = basePath.split('.');
    const targetSegment = layers[layerIndex].segment;
    const segmentIndex = segments.indexOf(targetSegment);
    if (segmentIndex === -1) return basePath;
    return segments.slice(0, segmentIndex + 1).join('.');
  };

  return (
    <div className="space-y-3">
      <div className="text-xs text-gray-600 mb-2">
        <p className="font-medium">Nested Array Refinement</p>
        <p className="mt-1">Configure each array level from parent to child.</p>
      </div>

      {layers.map((layer, index) => {
        const isExpanded = expandedLayers.has(index);
        const disabled = !isParentResolved(index);
        const layerPath = getLayerBasePath(index);

        return (
          <div
            key={index}
            className={`border rounded-lg ${
              disabled ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-300'
            }`}
          >
            {/* Layer Header */}
            <button
              onClick={() => !disabled && toggleLayer(index)}
              disabled={disabled}
              className={`w-full px-3 py-2 flex items-center justify-between ${
                disabled ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2">
                {isExpanded ? (
                  <ChevronDownIcon className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronRightIcon className="w-4 h-4 text-gray-500" />
                )}
                <span className="text-sm font-medium text-gray-900">
                  {getLayerTitle(layer, index)}
                </span>
              </div>
              <span className={`text-xs ${disabled ? 'text-gray-400' : 'text-gray-600'}`}>
                {getLayerSummary(layer)}
              </span>
            </button>

            {/* Layer Content */}
            {isExpanded && !disabled && (
              <div className="px-3 pb-3 pt-2 border-t border-gray-200 space-y-3">
                {/* Refinement Mode Selector */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    How should this array be refined?
                  </label>
                  <RefinementModeSelector
                    selectedMode={layer.mode}
                    onChange={(mode) => handleModeChange(index, mode)}
                  />
                </div>

                {/* Index Input (conditional) */}
                {layer.mode === 'index' && (
                  <IndexRefinementInput
                    value={layer.indexValue ?? 0}
                    onChange={(value) => handleIndexChange(index, value)}
                  />
                )}

                {/* Filter Builder (conditional) */}
                {layer.mode === 'filter' && (
                  <FilterRefinementBuilder
                    condition={layer.filterCondition ?? { property: '', operator: 'equals', value: '' }}
                    onChange={(condition) => handleFilterChange(index, condition)}
                    basePath={layerPath}
                    projectBundle={projectBundle}
                    hlSample={hlSample}
                    resourceType={resourceType}
                  />
                )}
              </div>
            )}

            {/* Disabled Notice */}
            {disabled && (
              <div className="px-3 pb-2 text-xs text-gray-500">
                Resolve parent array level first
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default NestedArrayRefinementBuilder;
