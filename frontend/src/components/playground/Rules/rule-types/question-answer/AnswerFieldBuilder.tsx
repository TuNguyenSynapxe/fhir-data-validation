import React, { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';

interface AnswerFieldBuilderProps {
  value: string;
  onChange: (path: string) => void;
  isAdvancedMode: boolean;
  error?: string;
}

type AnswerFieldType = 
  | 'quantity' 
  | 'codeableConcept' 
  | 'boolean' 
  | 'string' 
  | 'integer' 
  | 'decimal'
  | 'custom';

/**
 * UI-ONLY COMPONENT
 * Provides an assisted builder for common answer field patterns (value[x] types).
 * Does NOT change backend contracts or validation logic.
 */
export const AnswerFieldBuilder: React.FC<AnswerFieldBuilderProps> = ({
  value,
  onChange,
  isAdvancedMode,
  error,
}) => {
  const [selectedType, setSelectedType] = useState<AnswerFieldType>('quantity');
  const [customPath, setCustomPath] = useState<string>('');

  // UI-ONLY: Hydrate from existing value
  useEffect(() => {
    if (!value) {
      // Default to quantity (common for Observation)
      setSelectedType('quantity');
      setCustomPath('');
      return;
    }

    // Parse existing value to determine type
    const lowerValue = value.toLowerCase();
    
    if (lowerValue.includes('valuequantity')) {
      setSelectedType('quantity');
    } else if (lowerValue.includes('valuecodeableconcept')) {
      setSelectedType('codeableConcept');
    } else if (lowerValue.includes('valueboolean')) {
      setSelectedType('boolean');
    } else if (lowerValue.includes('valuestring')) {
      setSelectedType('string');
    } else if (lowerValue.includes('valueinteger')) {
      setSelectedType('integer');
    } else if (lowerValue.includes('valuedecimal')) {
      setSelectedType('decimal');
    } else if (value === 'value[x]') {
      setSelectedType('quantity'); // Default polymorphic
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
      case 'quantity':
        newPath = 'valueQuantity';
        break;
      case 'codeableConcept':
        newPath = 'valueCodeableConcept';
        break;
      case 'boolean':
        newPath = 'valueBoolean';
        break;
      case 'string':
        newPath = 'valueString';
        break;
      case 'integer':
        newPath = 'valueInteger';
        break;
      case 'decimal':
        newPath = 'valueDecimal';
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
        placeholder="e.g., value[x]"
        className={`w-full px-3 py-2 border rounded-md font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          error ? 'border-red-300 bg-red-50' : 'border-gray-300'
        }`}
      />
    );
  }

  // Assisted mode: show dropdown
  return (
    <div className="space-y-3">
      <select
        value={selectedType}
        onChange={(e) => setSelectedType(e.target.value as AnswerFieldType)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="quantity">Quantity (valueQuantity)</option>
        <option value="codeableConcept">CodeableConcept (valueCodeableConcept)</option>
        <option value="boolean">Boolean (valueBoolean)</option>
        <option value="string">String (valueString)</option>
        <option value="integer">Integer (valueInteger)</option>
        <option value="decimal">Decimal (valueDecimal)</option>
        <option value="custom">Custom path...</option>
      </select>

      {/* Show custom input when custom is selected */}
      {selectedType === 'custom' && (
        <input
          type="text"
          value={customPath}
          onChange={(e) => setCustomPath(e.target.value)}
          placeholder="e.g., answer[0].value[x]"
          className={`w-full px-3 py-2 border rounded-md font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            error ? 'border-red-300 bg-red-50' : 'border-gray-300'
          }`}
        />
      )}

      {/* Type hints */}
      {selectedType !== 'custom' && (
        <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded border border-gray-200">
          <strong>Type:</strong> {getTypeDescription(selectedType)}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-1 text-xs text-red-600">
          <AlertCircle size={12} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

// UI-ONLY: Helper function for type descriptions
function getTypeDescription(type: AnswerFieldType): string {
  switch (type) {
    case 'quantity':
      return 'Numeric value with unit (e.g., "5 mg/dL")';
    case 'codeableConcept':
      return 'Coded value from terminology (e.g., LOINC, SNOMED)';
    case 'boolean':
      return 'True/false value';
    case 'string':
      return 'Text value';
    case 'integer':
      return 'Whole number';
    case 'decimal':
      return 'Decimal number';
    default:
      return '';
  }
}
