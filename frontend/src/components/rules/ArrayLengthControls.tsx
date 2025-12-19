import React, { useState, useEffect, useRef } from 'react';
import { ChevronRight } from 'lucide-react';
import type { ArrayLengthParams, RuleIntent } from '../../types/ruleIntent';

interface ArrayLengthControlsProps {
  path: string;
  elementType?: string; // 'string' for nonEmpty checkbox
  existingIntent?: RuleIntent;
  onIntentChange: (intent: RuleIntent | null) => void;
  onRemove?: () => void; // Explicit remove action
  isExpanded?: boolean; // Collapsed/expanded state
  onToggleExpand?: () => void; // Toggle handler
}

/**
 * ArrayLengthControls - Inline inputs for array length constraints
 * 
 * Core Principles:
 * - User declares constraints on data (not in forms)
 * - Editing creates/updates RuleIntent (does NOT create rule)
 * - Clearing removes RuleIntent
 * - No Apply button here - uses shared action bar
 * 
 * Behavior:
 * - Min/Max inputs update intent on change
 * - Non-empty checkbox (string arrays only)
 * - Clearing all inputs removes intent
 * - Invalid state shows warning (but doesn't block input)
 */
export default function ArrayLengthControls({
  path,
  elementType,
  existingIntent,
  onIntentChange,
  onRemove,
  isExpanded = true,
  onToggleExpand,
}: ArrayLengthControlsProps) {
  // Type guard for ArrayLengthParams
  const arrayParams = existingIntent?.params && 'min' in existingIntent.params 
    ? existingIntent.params as ArrayLengthParams
    : undefined;

  const [min, setMin] = useState<number | undefined>(arrayParams?.min);
  const [max, setMax] = useState<number | undefined>(arrayParams?.max);
  const [nonEmpty, setNonEmpty] = useState<boolean>(arrayParams?.nonEmpty ?? false);
  
  // Track if we're updating from external intent to prevent feedback loops
  const isUpdatingFromIntent = useRef(false);

  // Sync with existing intent when it changes externally (only update if different)
  useEffect(() => {
    const params = existingIntent?.params && 'min' in existingIntent.params 
      ? existingIntent.params as ArrayLengthParams 
      : undefined;
    
    isUpdatingFromIntent.current = true;
    
    if (params) {
      // Only update if values are different to prevent loops
      if (params.min !== min) setMin(params.min);
      if (params.max !== max) setMax(params.max);
      if ((params.nonEmpty ?? false) !== nonEmpty) setNonEmpty(params.nonEmpty ?? false);
    } else {
      // Intent was removed externally - only clear if we have values
      if (min !== undefined || max !== undefined || nonEmpty) {
        setMin(undefined);
        setMax(undefined);
        setNonEmpty(false);
      }
    }
    
    // Reset flag after a tick to allow next update
    setTimeout(() => {
      isUpdatingFromIntent.current = false;
    }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingIntent]);

  // Validation
  const hasAnyConstraint = min !== undefined || max !== undefined || nonEmpty;
  const isMinValid = min === undefined || min >= 0;
  const isMaxValid = max === undefined || max >= 0;
  const isRangeValid = min === undefined || max === undefined || max >= min;
  const isValid = isMinValid && isMaxValid && isRangeValid && hasAnyConstraint;

  // Update intent whenever values change (but not when syncing from external intent)
  useEffect(() => {
    // Skip if we're updating from external intent to prevent feedback loop
    if (isUpdatingFromIntent.current) {
      return;
    }
    
    if (!hasAnyConstraint) {
      // All inputs cleared - remove intent
      onIntentChange(null);
      return;
    }

    // Create or update intent
    const params: ArrayLengthParams = {};
    if (min !== undefined) params.min = min;
    if (max !== undefined) params.max = max;
    if (nonEmpty) params.nonEmpty = true;

    const intent: RuleIntent = {
      type: 'ARRAY_LENGTH',
      path,
      params,
    };

    onIntentChange(intent);
  }, [min, max, nonEmpty, path, hasAnyConstraint, onIntentChange]);

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMin(value === '' ? undefined : parseInt(value, 10));
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMax(value === '' ? undefined : parseInt(value, 10));
  };

  const showNonEmptyCheckbox = elementType === 'string';

  // Keyboard interaction handler
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onToggleExpand?.();
    }
  };

  // Phase 1 & 2: Always show editor container with collapsible header
  return (
    <div className="mt-2 p-3 bg-blue-50/40 rounded border border-blue-200 space-y-3">
      {/* Collapsible Header */}
      <div className="flex items-center justify-between">
        <button
          className="flex items-center gap-2 text-xs font-semibold text-gray-700 uppercase tracking-wide hover:text-gray-900 transition-colors cursor-pointer"
          onClick={onToggleExpand}
          onKeyDown={handleKeyDown}
          aria-expanded={isExpanded}
          tabIndex={0}
        >
          <ChevronRight 
            className={`w-4 h-4 transition-transform ${
              isExpanded ? 'rotate-90' : ''
            }`}
          />
          <span>Length Constraint</span>
        </button>
        <div className="flex items-center gap-2">
          {!hasAnyConstraint && (
            <span className="text-[10px] text-gray-500 italic">
              (not configured)
            </span>
          )}
          <span className="px-2 py-0.5 text-[10px] font-medium text-blue-700 bg-blue-100 rounded uppercase tracking-wide">
            Draft
          </span>
        </div>
      </div>

      {/* Collapsed state helper text */}
      {!isExpanded && !hasAnyConstraint && (
        <div className="text-[11px] text-gray-500 italic">
          Click to expand and set min / max values
        </div>
      )}

      {/* Editor content - Only visible when expanded */}
      {isExpanded && (
        <>
          {/* Min/Max Inputs */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="block text-xs text-gray-600 mb-1">Min</label>
              <input
                type="number"
                min="0"
                value={min ?? ''}
                onChange={handleMinChange}
                placeholder="No min"
                className={`w-full px-2 py-1 text-sm border rounded ${
                  !isMinValid ? 'border-red-500' : 'border-gray-300'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
            </div>

            <div className="flex-1">
              <label className="block text-xs text-gray-600 mb-1">Max</label>
              <input
                type="number"
                min="0"
                value={max ?? ''}
                onChange={handleMaxChange}
                placeholder="No max"
                className={`w-full px-2 py-1 text-sm border rounded ${
                  !isMaxValid || !isRangeValid ? 'border-red-500' : 'border-gray-300'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
            </div>
          </div>

          {/* Non-empty checkbox (string arrays only) */}
          {showNonEmptyCheckbox && (
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={nonEmpty}
                onChange={(e) => setNonEmpty(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span>All items must be non-empty</span>
            </label>
          )}

          {/* Validation warnings */}
          {!isValid && hasAnyConstraint && (
            <div className="text-xs text-red-600 space-y-1">
              {!isMinValid && <div>• Min must be ≥ 0</div>}
              {!isMaxValid && <div>• Max must be ≥ 0</div>}
              {!isRangeValid && <div>• Max must be ≥ Min</div>}
            </div>
          )}

          {/* Draft state feedback - reactive micro-copy */}
          {isValid && hasAnyConstraint && (
            <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 px-2 py-1.5 rounded">
              <span className="text-green-600">✓</span>
              <span>Length constraint ready (will be applied on review)</span>
            </div>
          )}

          {/* Remove constraint action */}
          {onRemove && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="w-full mt-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 py-1.5 rounded transition-colors"
            >
              Remove length constraint
            </button>
          )}
        </>
      )}
    </div>
  );
}
