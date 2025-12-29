import React, { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';

interface QuestionFieldBuilderProps {
  value: string;
  onChange: (path: string) => void;
  isAdvancedMode: boolean;
  error?: string;
}

type QuestionFieldType = 'coding' | 'identifier' | 'linkId' | 'custom';

/**
 * UI-ONLY COMPONENT
 * Provides an assisted builder for common question field patterns.
 * Does NOT change backend contracts or validation logic.
 */
export const QuestionFieldBuilder: React.FC<QuestionFieldBuilderProps> = ({
  value,
  onChange,
  isAdvancedMode,
  error,
}) => {
  const [selectedType, setSelectedType] = useState<QuestionFieldType>('coding');
  const [customPath, setCustomPath] = useState<string>('');

  // UI-ONLY: Hydrate from existing value
  useEffect(() => {
    if (!value) {
      // Default to coding
      setSelectedType('coding');
      setCustomPath('');
      return;
    }

    // Parse existing value to determine type
    if (value === 'code.coding' || value === 'code.coding[0]') {
      setSelectedType('coding');
    } else if (value === 'identifier') {
      setSelectedType('identifier');
    } else if (value === 'linkId') {
      setSelectedType('linkId');
    } else {
      setSelectedType('custom');
      setCustomPath(value);
    }
  }, [value]);

  // UI-ONLY: Update parent when selection changes
  useEffect(() => {
    if (isAdvancedMode) return; // Don't auto-update in advanced mode

    let newPath = '';
    switch (selectedType) {
      case 'coding':
        newPath = 'code.coding';
        break;
      case 'identifier':
        newPath = 'identifier';
        break;
      case 'linkId':
        newPath = 'linkId';
        break;
      case 'custom':
        newPath = customPath;
        break;
    }

    // Only call onChange if value actually changed (prevents infinite loop)
    if (newPath !== value) {
      onChange(newPath);
    }
  }, [selectedType, customPath, value, isAdvancedMode]);

  if (isAdvancedMode) {
    // Advanced mode: show raw input
    return (
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g., code.coding"
        className={`w-full px-3 py-2 border rounded-md font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          error ? 'border-red-300 bg-red-50' : 'border-gray-300'
        }`}
      />
    );
  }

  // Assisted mode: show radio options
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {/* Coding */}
        <label className="flex items-start gap-3 p-3 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50 transition-colors">
          <input
            type="radio"
            name="questionType"
            value="coding"
            checked={selectedType === 'coding'}
            onChange={() => setSelectedType('coding')}
            className="mt-0.5"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900">Coding</span>
              <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">
                code.coding
              </code>
            </div>
            <p className="text-xs text-gray-600 mt-0.5">
              Standard FHIR CodeableConcept pattern
            </p>
          </div>
        </label>

        {/* Identifier */}
        <label className="flex items-start gap-3 p-3 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50 transition-colors">
          <input
            type="radio"
            name="questionType"
            value="identifier"
            checked={selectedType === 'identifier'}
            onChange={() => setSelectedType('identifier')}
            className="mt-0.5"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900">Identifier</span>
              <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">
                identifier
              </code>
            </div>
            <p className="text-xs text-gray-600 mt-0.5">
              Question identified by business identifier
            </p>
          </div>
        </label>

        {/* LinkId */}
        <label className="flex items-start gap-3 p-3 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50 transition-colors">
          <input
            type="radio"
            name="questionType"
            value="linkId"
            checked={selectedType === 'linkId'}
            onChange={() => setSelectedType('linkId')}
            className="mt-0.5"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900">Link ID</span>
              <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">
                linkId
              </code>
            </div>
            <p className="text-xs text-gray-600 mt-0.5">
              Question identified by link identifier (Questionnaire pattern)
            </p>
          </div>
        </label>

        {/* Custom Path */}
        <label className="flex items-start gap-3 p-3 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50 transition-colors">
          <input
            type="radio"
            name="questionType"
            value="custom"
            checked={selectedType === 'custom'}
            onChange={() => setSelectedType('custom')}
            className="mt-0.5"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900">Custom Path</span>
            </div>
            <p className="text-xs text-gray-600 mt-0.5 mb-2">
              Enter a custom relative FHIRPath expression
            </p>
            {selectedType === 'custom' && (
              <input
                type="text"
                value={customPath}
                onChange={(e) => setCustomPath(e.target.value)}
                placeholder="e.g., code.coding[0].code"
                className={`w-full px-2.5 py-1.5 border rounded text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  error ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                onClick={(e) => e.stopPropagation()}
              />
            )}
          </div>
        </label>
      </div>

      {error && (
        <div className="flex items-center gap-1 text-xs text-red-600">
          <AlertCircle size={12} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
