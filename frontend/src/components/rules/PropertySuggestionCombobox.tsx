import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  InformationCircleIcon 
} from '@heroicons/react/24/outline';
import type { PropertySuggestion } from '../../utils/schemaPropertyExtractor';

/**
 * PropertySuggestionCombobox - Smart property selector with schema-based suggestions
 * 
 * Features:
 * - Typeahead search
 * - Schema-based property suggestions
 * - Observed properties from project data
 * - Visual indicators for property sources
 * - Non-blocking advisory for unknown properties
 * - Keyboard navigable
 * 
 * UX:
 * - Green check icon for schema properties
 * - Blue info icon for project-data properties
 * - Yellow warning for unknown/custom properties
 * - Never blocks manual input
 */
interface PropertySuggestionComboboxProps {
  value: string;
  onChange: (value: string) => void;
  suggestions: PropertySuggestion[];
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
}

const PropertySuggestionCombobox: React.FC<PropertySuggestionComboboxProps> = ({
  value,
  onChange,
  suggestions,
  placeholder = 'Type to search or enter property name',
  disabled = false,
  loading = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const [searchQuery, setSearchQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter suggestions based on search query
  const filteredSuggestions = useMemo(() => {
    if (!searchQuery.trim()) {
      return suggestions;
    }
    const query = searchQuery.toLowerCase();
    return suggestions.filter(
      s => s.path.toLowerCase().includes(query) || 
           s.name.toLowerCase().includes(query) ||
           s.description?.toLowerCase().includes(query)
    );
  }, [suggestions, searchQuery]);

  // Group suggestions by source
  const groupedSuggestions = useMemo(() => {
    const schema = filteredSuggestions.filter(s => s.source === 'schema');
    const projectData = filteredSuggestions.filter(s => s.source === 'project-data');
    
    return {
      schema,
      projectData,
      all: filteredSuggestions,
    };
  }, [filteredSuggestions]);

  const hasSuggestions = filteredSuggestions.length > 0;

  // Check if current value is known
  const isKnownProperty = suggestions.some(s => s.path === value);
  const matchedSuggestion = suggestions.find(s => s.path === value);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync search query with value when input is focused
  useEffect(() => {
    if (isOpen) {
      setSearchQuery(value);
    }
  }, [isOpen, value]);

  const handleInputFocus = () => {
    setIsOpen(true);
    setSearchQuery(value);
    setFocusedIndex(-1);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchQuery(newValue);
    onChange(newValue);
    if (!isOpen) {
      setIsOpen(true);
    }
  };

  const handleSelectProperty = (property: PropertySuggestion) => {
    onChange(property.path);
    setSearchQuery(property.path);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (hasSuggestions) {
          setFocusedIndex(prev => 
            prev < filteredSuggestions.length - 1 ? prev + 1 : prev
          );
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < filteredSuggestions.length) {
          handleSelectProperty(filteredSuggestions[focusedIndex]);
        } else {
          setIsOpen(false);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setFocusedIndex(-1);
        break;
    }
  };

  // Get icon for property source
  const getSourceIcon = (source: 'schema' | 'project-data') => {
    if (source === 'schema') {
      return <CheckCircleIcon className="w-4 h-4 text-green-600" />;
    }
    return <InformationCircleIcon className="w-4 h-4 text-blue-600" />;
  };

  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={isOpen ? searchQuery : value}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          disabled={disabled || loading}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-8"
          placeholder={placeholder}
        />
        {loading ? (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            disabled={disabled}
          >
            <svg
              className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}
      </div>

      {/* Property status indicator */}
      {value && !isOpen && (
        <div className="mt-1">
          {isKnownProperty ? (
            <div className="flex items-center gap-1.5 text-xs text-green-700">
              {getSourceIcon(matchedSuggestion!.source)}
              <span>
                {matchedSuggestion!.source === 'schema' 
                  ? 'Valid schema property' 
                  : 'From project data'}
              </span>
            </div>
          ) : (
            <div className="flex items-start gap-1.5 p-2 bg-amber-50 border border-amber-200 rounded-md">
              <ExclamationTriangleIcon className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-amber-800 font-medium">
                  Unknown property for this type
                </p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Rule may not behave as expected. Check spelling or select from suggestions.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-72 overflow-y-auto"
        >
          {loading ? (
            <div className="p-4 text-center text-sm text-gray-500">
              Loading property suggestions...
            </div>
          ) : !hasSuggestions ? (
            <div className="p-4 text-center">
              <p className="text-sm text-gray-600">
                {searchQuery ? 'No matching properties found' : 'No properties available'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                You can still type a custom property name
              </p>
            </div>
          ) : (
            <div className="py-1">
              {/* Schema properties */}
              {groupedSuggestions.schema.length > 0 && (
                <div>
                  <div className="px-3 py-2 text-xs font-semibold text-gray-700 bg-gray-50 border-b border-gray-200 flex items-center gap-1.5">
                    <CheckCircleIcon className="w-3.5 h-3.5 text-green-600" />
                    <span>Schema Properties</span>
                  </div>
                  {groupedSuggestions.schema.map((property, index) => {
                    const globalIndex = index;
                    const isFocused = focusedIndex === globalIndex;
                    
                    return (
                      <button
                        key={`schema-${index}`}
                        type="button"
                        onClick={() => handleSelectProperty(property)}
                        className={`w-full text-left px-3 py-2 hover:bg-green-50 transition-colors ${
                          isFocused ? 'bg-green-100' : ''
                        } ${value === property.path ? 'bg-green-50 font-medium' : ''}`}
                      >
                        <div className="flex items-start gap-2">
                          <CheckCircleIcon className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-2">
                              <span className="text-sm font-medium text-gray-900">{property.path}</span>
                              <span className="text-xs text-gray-500">{property.type}</span>
                            </div>
                            {property.description && (
                              <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">
                                {property.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Project data properties */}
              {groupedSuggestions.projectData.length > 0 && (
                <div>
                  <div className="px-3 py-2 text-xs font-semibold text-gray-700 bg-gray-50 border-b border-gray-200 flex items-center gap-1.5">
                    <InformationCircleIcon className="w-3.5 h-3.5 text-blue-600" />
                    <span>From Project Data</span>
                  </div>
                  {groupedSuggestions.projectData.map((property, index) => {
                    const globalIndex = groupedSuggestions.schema.length + index;
                    const isFocused = focusedIndex === globalIndex;
                    
                    return (
                      <button
                        key={`project-${index}`}
                        type="button"
                        onClick={() => handleSelectProperty(property)}
                        className={`w-full text-left px-3 py-2 hover:bg-blue-50 transition-colors ${
                          isFocused ? 'bg-blue-100' : ''
                        } ${value === property.path ? 'bg-blue-50 font-medium' : ''}`}
                      >
                        <div className="flex items-start gap-2">
                          <InformationCircleIcon className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium text-gray-900">{property.path}</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PropertySuggestionCombobox;
