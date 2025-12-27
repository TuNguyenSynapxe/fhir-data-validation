import React, { useState, useEffect } from 'react';
import { AlertCircle, Info } from 'lucide-react';

/**
 * USER HINT INPUT
 * 
 * Phase 3: No-Prose Enforcement Component
 * Allows rule authors to provide a short contextual hint (NOT a sentence)
 * 
 * Rules:
 * - Max 60 characters (hard limit)
 * - No sentence punctuation (. ! ?)
 * - Optional field
 * - Label-style only (not prose)
 * 
 * Examples of VALID hints:
 * ✅ "Vitals observation"
 * ✅ "Blood pressure component"
 * ✅ "Screening questionnaire"
 * ✅ "Pre-admission form"
 * 
 * Examples of INVALID hints:
 * ❌ "This field is required." (sentence)
 * ❌ "Please provide a valid blood pressure reading!" (sentence + punctuation)
 * ❌ "The system expects this value to be between 0 and 200." (too long + prose)
 */

interface UserHintInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const MAX_LENGTH = 60;
const PROHIBITED_PUNCTUATION = /[.!?]/;

export const UserHintInput: React.FC<UserHintInputProps> = ({
  value,
  onChange,
  className = ''
}) => {
  const [localValue, setLocalValue] = useState(value);
  const [validationError, setValidationError] = useState<string>('');

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const validateAndUpdate = (newValue: string) => {
    // Hard stop at 60 characters
    if (newValue.length > MAX_LENGTH) {
      return; // Don't allow typing beyond limit
    }

    setLocalValue(newValue);

    // Check for prohibited punctuation
    if (PROHIBITED_PUNCTUATION.test(newValue)) {
      setValidationError('No sentence punctuation allowed (. ! ?)');
      return;
    }

    // Clear validation error if valid
    setValidationError('');
    onChange(newValue);
  };

  const handleBlur = () => {
    // Final validation on blur
    if (PROHIBITED_PUNCTUATION.test(localValue)) {
      // Remove prohibited punctuation automatically
      const cleaned = localValue.replace(PROHIBITED_PUNCTUATION, '');
      setLocalValue(cleaned);
      onChange(cleaned);
      setValidationError('');
    }
  };

  const charCount = localValue.length;
  const isNearLimit = charCount >= 50;
  const isAtLimit = charCount >= MAX_LENGTH;
  const hasPunctuation = PROHIBITED_PUNCTUATION.test(localValue);

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        User Hint <span className="text-gray-500 text-xs">(optional)</span>
      </label>
      
      <div className="relative">
        <input
          type="text"
          value={localValue}
          onChange={(e) => validateAndUpdate(e.target.value)}
          onBlur={handleBlur}
          placeholder="e.g., Vitals observation"
          maxLength={MAX_LENGTH}
          className={`
            w-full px-3 py-2 pr-16 border rounded-md shadow-sm
            focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            ${hasPunctuation ? 'border-red-300 bg-red-50' : 'border-gray-300'}
          `}
        />
        
        {/* Character counter */}
        <div className={`
          absolute right-3 top-2.5 text-xs font-mono
          ${isAtLimit ? 'text-red-600 font-semibold' : isNearLimit ? 'text-amber-600' : 'text-gray-400'}
        `}>
          {charCount} / {MAX_LENGTH}
        </div>
      </div>

      {/* Validation error */}
      {validationError && (
        <div className="mt-1 flex items-center gap-1 text-xs text-red-600">
          <AlertCircle size={12} />
          <span>{validationError}</span>
        </div>
      )}

      {/* Help text */}
      {!validationError && (
        <div className="mt-1 flex items-start gap-1 text-xs text-gray-500">
          <Info size={12} className="mt-0.5 flex-shrink-0" />
          <div>
            <div className="font-medium mb-0.5">Short label only (not a sentence)</div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-1">
                <span className="text-green-600">✓</span>
                <span>"Blood pressure component"</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-red-600">✗</span>
                <span>"This field is required."</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
