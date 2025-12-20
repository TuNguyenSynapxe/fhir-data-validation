import React, { useMemo, useState, useEffect } from 'react';
import type { FilterCondition, FilterOperator } from '../../types/fhirPathRefinement';
import SuggestedValueDropdown from '../SuggestedValueDropdown';
import PropertySuggestionCombobox from './PropertySuggestionCombobox';
import { buildSuggestedValueGroups } from '../../utils/fhirPathValueExtractor';
import {
  fetchPropertySuggestions,
  extractObservedProperties,
  mergePropertySuggestions,
  type PropertySuggestion,
} from '../../utils/schemaPropertyExtractor';

/**
 * FilterRefinementBuilder - Single condition filter builder with smart property suggestions
 * 
 * Phase 2: Enhanced with schema-based property suggestions
 * - Property (combobox with schema + project data suggestions)
 * - Operator (equals | contains)
 * - Value (dropdown with optional suggestions)
 * 
 * Features:
 * - Detects array item type from FHIR schema (e.g. telecom[] → ContactPoint)
 * - Loads valid child properties for that type
 * - Overlays observed properties from project bundle
 * - Non-blocking advisory for unknown properties
 * - Never blocks manual input
 */
interface FilterRefinementBuilderProps {
  condition: FilterCondition;
  onChange: (condition: FilterCondition) => void;
  basePath?: string; // Base FHIRPath for value extraction and property detection
  projectBundle?: any; // Optional project bundle for suggestions
  hlSample?: any; // Optional HL7 sample for suggestions
  resourceType?: string; // Resource type for schema lookup (e.g. "Patient")
}

const FilterRefinementBuilder: React.FC<FilterRefinementBuilderProps> = ({
  condition,
  onChange,
  basePath = '',
  projectBundle,
  hlSample,
  resourceType,
}) => {
  const [propertySuggestions, setPropertySuggestions] = useState<PropertySuggestion[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(false);

  // Extract array path from basePath
  // Example: "Patient.telecom" → "telecom"
  // Example: "Patient.address.line" → "address.line"
  const arrayPath = useMemo(() => {
    if (!basePath || !resourceType) return '';
    
    // Remove resource type prefix if present
    let path = basePath;
    if (path.startsWith(resourceType + '.')) {
      path = path.substring(resourceType.length + 1);
    }
    
    // Remove any array indices or filters
    path = path
      .replace(/\[\d+\]/g, '')
      .replace(/\[\*\]/g, '')
      .replace(/\.where\([^)]+\)/g, '');
    
    return path;
  }, [basePath, resourceType]);

  // Load property suggestions when basePath/resourceType changes
  useEffect(() => {
    if (!resourceType || !arrayPath) {
      setPropertySuggestions([]);
      return;
    }

    let isCancelled = false;
    setLoadingProperties(true);

    const loadSuggestions = async () => {
      try {
        // Fetch schema-based suggestions
        const schemaProps = await fetchPropertySuggestions(resourceType, arrayPath);
        
        if (isCancelled) return;

        // Extract observed properties from project bundle
        const observedProps = projectBundle 
          ? extractObservedProperties(projectBundle, resourceType, arrayPath)
          : [];

        // Merge schema and observed properties
        const merged = mergePropertySuggestions(schemaProps, observedProps);
        
        if (!isCancelled) {
          setPropertySuggestions(merged);
        }
      } catch (error) {
        console.error('Failed to load property suggestions:', error);
        if (!isCancelled) {
          setPropertySuggestions([]);
        }
      } finally {
        if (!isCancelled) {
          setLoadingProperties(false);
        }
      }
    };

    loadSuggestions();

    return () => {
      isCancelled = true;
    };
  }, [resourceType, arrayPath, projectBundle]);

  // Build value suggestions when property and basePath are available
  const valueSuggestions = useMemo(() => {
    if (!condition.property || !basePath) {
      return [];
    }
    return buildSuggestedValueGroups(projectBundle, hlSample, basePath, condition.property);
  }, [projectBundle, hlSample, basePath, condition.property]);

  const handlePropertyChange = (value: string) => {
    onChange({
      ...condition,
      property: value,
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
        <PropertySuggestionCombobox
          value={condition.property}
          onChange={handlePropertyChange}
          suggestions={propertySuggestions}
          loading={loadingProperties}
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
          Single condition only. No AND/OR support.
        </p>
        {propertySuggestions.length > 0 && (
          <p className="text-xs text-gray-500 mt-1">
            💡 Property suggestions loaded from FHIR schema
          </p>
        )}
      </div>
    </div>
  );
};

export default FilterRefinementBuilder;
