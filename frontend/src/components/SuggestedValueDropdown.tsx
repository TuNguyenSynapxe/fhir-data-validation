import React, { useState, useRef, useEffect } from 'react';
import type { SuggestedValueGroup } from '../utils/fhirPathValueExtractor';

/**
 * SuggestedValueDropdown - Non-intrusive value suggestion dropdown
 * 
 * BEHAVIOR:
 * - Shows suggestions when available
 * - Never blocks manual input
 * - Never forces selection
 * - Keyboard navigable
 * - Grouped by source
 * 
 * Phase 1: Basic dropdown with focus/blur behavior
 */
interface SuggestedValueDropdownProps {
  value: string;
  onChange: (value: string) => void;
  suggestions: SuggestedValueGroup[];
  placeholder?: string;
  disabled?: boolean;
}

const SuggestedValueDropdown: React.FC<SuggestedValueDropdownProps> = ({
  value,
  onChange,
  suggestions,
  placeholder = 'Enter value or select from suggestions',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Flatten suggestions for keyboard navigation
  const flatValues = suggestions.flatMap(group => group.values);
  const hasSuggestions = flatValues.length > 0;

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

  const handleInputFocus = () => {
    if (hasSuggestions) {
      setIsOpen(true);
      setFocusedIndex(-1);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    if (hasSuggestions && !isOpen) {
      setIsOpen(true);
    }
  };

  const handleSelectValue = (selectedValue: string) => {
    onChange(selectedValue);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || !hasSuggestions) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => (prev < flatValues.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < flatValues.length) {
          handleSelectValue(flatValues[focusedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setFocusedIndex(-1);
        break;
    }
  };

  // Check if current value is custom (not in suggestions)
  const isCustomValue = value && !flatValues.includes(value);

  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-8"
          placeholder={placeholder}
        />
        {hasSuggestions && (
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

      {/* Custom value helper text */}
      {isCustomValue && (
        <p className="mt-1 text-xs text-amber-600">
          Custom value (not found in sample)
        </p>
      )}

      {/* Dropdown */}
      {isOpen && hasSuggestions && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-64 overflow-y-auto"
        >
          <div className="py-1">
            <div className="px-3 py-2 text-xs font-semibold text-gray-500 bg-gray-50 border-b border-gray-200">
              Suggested Values
            </div>
            
            {suggestions.map((group, groupIndex) => (
              <div key={groupIndex} className="py-1">
                <div className="px-3 py-1 text-xs font-medium text-gray-600">
                  {group.label}
                </div>
                {group.values.map((suggestedValue, valueIndex) => {
                  const globalIndex = suggestions
                    .slice(0, groupIndex)
                    .reduce((acc, g) => acc + g.values.length, 0) + valueIndex;
                  const isFocused = focusedIndex === globalIndex;
                  
                  return (
                    <button
                      key={valueIndex}
                      type="button"
                      onClick={() => handleSelectValue(suggestedValue)}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors ${
                        isFocused ? 'bg-blue-100' : ''
                      } ${value === suggestedValue ? 'bg-blue-50 font-medium' : ''}`}
                    >
                      <div className="flex items-start">
                        <span className="text-gray-400 mr-2">•</span>
                        <span className="flex-1 break-all">{suggestedValue}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SuggestedValueDropdown;
