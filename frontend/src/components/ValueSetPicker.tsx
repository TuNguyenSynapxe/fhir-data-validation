import React, { useState, useEffect, useRef } from 'react';
import { searchValueSets, type ValueSetSummaryDto, type ValueSetSearchParams } from '../api/sdBuilderApi';

interface ValueSetPickerProps {
  value?: string;
  onSelect: (url: string) => void;
  resourceType?: string;
  elementPath?: string;
  disabled?: boolean;
}

/**
 * ValueSet Picker Component
 * 
 * Search and select ValueSets with debounced search.
 * No FHIR logic - treats backend results as opaque.
 */
export function ValueSetPicker({
  value,
  onSelect,
  resourceType,
  elementPath,
  disabled = false,
}: ValueSetPickerProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ValueSetSummaryDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounced search
  useEffect(() => {
    if (!isOpen) return;

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Debounce 300ms
    debounceTimerRef.current = window.setTimeout(async () => {
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsLoading(true);
      try {
        const params: ValueSetSearchParams = {
          query: query || undefined,
          resourceType,
          elementPath,
          limit: 20,
        };
        const data = await searchValueSets(params, controller.signal);
        if (!controller.signal.aborted) {
          setResults(data);
          setSelectedIndex(-1);
        }
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error('ValueSet search failed:', error);
          setResults([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [query, isOpen, resourceType, elementPath]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleSelect = (url: string) => {
    onSelect(url);
    setIsOpen(false);
    setQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          handleSelect(results[selectedIndex].url);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
    }
  };

  const copyToClipboard = () => {
    if (value) {
      navigator.clipboard.writeText(value);
    }
  };

  return (
    <div ref={dropdownRef} className="relative">
      {/* Current value chip */}
      {value && (
        <div className="mb-2 flex items-center gap-2 rounded bg-gray-100 px-3 py-2 text-sm">
          <span className="flex-1 truncate font-mono text-gray-700">{value}</span>
          <button
            type="button"
            onClick={copyToClipboard}
            className="text-gray-500 hover:text-gray-700"
            title="Copy to clipboard"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        </div>
      )}

      {/* Search button/input */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search ValueSets..."
          disabled={disabled}
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
        />
        {isLoading && (
          <div className="absolute right-3 top-2.5">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
          </div>
        )}
      </div>

      {/* Dropdown list */}
      {isOpen && (
        <div className="absolute z-50 mt-1 max-h-80 w-full overflow-auto rounded border border-gray-300 bg-white shadow-lg">
          {results.length === 0 && !isLoading && (
            <div className="px-4 py-3 text-sm text-gray-500">
              {query ? 'No ValueSets found' : 'Start typing to search...'}
            </div>
          )}
          {results.map((vs, index) => (
            <button
              key={vs.url}
              type="button"
              onClick={() => handleSelect(vs.url)}
              className={`w-full px-4 py-3 text-left hover:bg-gray-50 ${
                index === selectedIndex ? 'bg-blue-50' : ''
              }`}
            >
              <div className="font-medium text-gray-900">{vs.name}</div>
              {vs.publisher && (
                <div className="text-xs text-gray-500">{vs.publisher}</div>
              )}
              {vs.description && (
                <div className="mt-1 text-sm text-gray-600 line-clamp-2">{vs.description}</div>
              )}
              <div className="mt-1 truncate font-mono text-xs text-gray-400">{vs.url}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
