import React, { useMemo } from 'react';
import type { FilterCondition, FilterOperator } from '../../types/fhirPathRefinement';
import SuggestedValueDropdown from '../SuggestedValueDropdown';
import { buildSuggestedValueGroups } from '../../utils/fhirPathValueExtractor';

/**
 * FilterRefinementBuilder - Single condition filter builder
 * 
 * Phase 1: Single filter condition only
 * - Property (free text)
 * - Operator (equals | contains)
 * - Value (free text with optional suggestions)
 * 
 * No validation, no schema inference, no AND/OR support
 */
interface FilterRefinementBuilderProps {
  condition: FilterCondition;
  onChange: (condition: FilterCondition) => void;
  basePath?: string; // Base FHIRPath for value extraction
  projectBundle?: any; // Optional project bundle for suggestions
  hlSample?: any; // Optional HL7 sample for suggestions
}

const FilterRefinementBuilder: React.FC<FilterRefinementBuilderProps> = ({
  condition,
  onChange,
  basePath = '',
  projectBundle,
  hlSample,
}) => {
  // Build value suggestions when property and basePath are available
  const valueSuggestions = useMemo(() => {
    if (!condition.property || !basePath) {
      return [];
    }
    return buildSuggestedValueGroups(projectBundle, hlSample, basePath, condition.property);
  }, [projectBundle, hlSample, basePath, condition.property]);

  const handlePropertyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...condition,
      property: e.target.value,
    });
  };

  const handleOperatorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({
      ...condition,
      operator: e.target.value as FilterOperator,
    });
  };

  const handleValueChange = (value: string) => {
    onChange({
      ...condition,
      value,
    });
  };

  return (
    <div className="mt-3 p-3 bg-gray-50 border border-gray-300 rounded-md space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Property:
        </label>
        <input
          type="text"
          value={condition.property}
          onChange={handlePropertyChange}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g., system, use, type"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Operator:
        </label>
        <select
          value={condition.operator}
          onChange={handleOperatorChange}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="equals">equals (=)</option>
          <option value="contains">contains</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Value:
        </label>
        <SuggestedValueDropdown
          value={condition.value}
          onChange={handleValueChange}
          suggestions={valueSuggestions}
          placeholder="e.g., https://example.org, official"
        />
      </div>

      <div className="pt-2 border-t border-gray-300">
        <p className="text-xs text-gray-500">
          Phase 1: Single condition only. No AND/OR support.
        </p>
      </div>
    </div>
  );
};

export default FilterRefinementBuilder;
