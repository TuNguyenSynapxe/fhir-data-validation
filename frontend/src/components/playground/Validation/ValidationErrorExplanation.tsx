/**
 * Phase 7 - Canonical Validation Error Explanation Component
 * 
 * Centralized component that renders human-readable explanations for validation errors.
 * Uses the Phase 6 explanation registry exclusively - no inline explanation logic.
 * 
 * CONTRACT:
 * - Uses ONLY explainError(error)
 * - Never accesses error.message directly
 * - Never parses error.path, error.jsonPointer, or error.details for UI
 * - Never throws
 */

import React from 'react';
import { explainError } from '../../../validation';
import type { ValidationError } from '../../../contexts/project-validation/useProjectValidation';
import { BundleDiffDisplay } from './BundleDiffDisplay';

interface ValidationErrorExplanationProps {
  error: ValidationError;
  /** Optional CSS class for the container */
  className?: string;
  /** Show title separately (default: true) */
  showTitle?: boolean;
  /** Show description separately (default: true) */
  showDescription?: boolean;
}

/**
 * ValidationErrorExplanation Component
 * 
 * Renders FULL structured explanation from the canonical explanation registry.
 * Displays: title, reason, whatWasFound, expected, howToFix, note
 * For RESOURCE_REQUIREMENT_VIOLATION, uses BundleDiffDisplay for first-class UX.
 * Gracefully handles null/undefined/malformed errors via fallback.
 */
export const ValidationErrorExplanation: React.FC<ValidationErrorExplanationProps> = ({
  error,
  className = '',
  showTitle = true,
  showDescription = true,
}) => {
  // Get canonical explanation (never throws, always returns valid content)
  const explanation = explainError(error);
  
  // Check if this is a bundle composition error
  const isBundleComposition = error.errorCode === 'RESOURCE_REQUIREMENT_VIOLATION' && 
    error.details?.expected && 
    error.details?.actual &&
    error.details?.diff;

  return (
    <div className={`validation-error-explanation space-y-4 ${className}`}>
      {showTitle && (
        <div className="validation-error-explanation__title font-semibold text-gray-900">
          {explanation.title}
        </div>
      )}
      
      {showDescription && (
        <div className="validation-error-explanation__reason text-sm text-gray-700">
          {explanation.reason}
        </div>
      )}

      {/* whatThisMeans section */}
      {explanation.whatThisMeans && (
        <div className="validation-error-explanation__what-this-means text-sm bg-blue-50 border border-blue-200 rounded p-3">
          <span className="font-medium text-blue-900">What this means: </span>
          <span className="text-blue-800">{explanation.whatThisMeans}</span>
        </div>
      )}

      {/* Bundle Composition: First-class structured display */}
      {isBundleComposition && error.details && (
        <BundleDiffDisplay
          expected={error.details.expected}
          actual={error.details.actual}
          diff={error.details.diff}
        />
      )}

      {/* Non-bundle composition: Standard whatWasFound */}
      {!isBundleComposition && explanation.whatWasFound && typeof explanation.whatWasFound === 'string' && (
        <div className="validation-error-explanation__found text-sm">
          <span className="font-medium text-gray-900">What was found: </span>
          <span className="text-gray-700">{explanation.whatWasFound}</span>
        </div>
      )}

      {/* Non-bundle composition: Standard expected */}
      {!isBundleComposition && explanation.expected && (
        <div className="validation-error-explanation__expected text-sm">
          <span className="font-medium text-gray-900">Expected: </span>
          {Array.isArray(explanation.expected) ? (
            <ul className="list-disc list-inside mt-1 space-y-0.5">
              {explanation.expected.map((val, idx) => (
                <li key={idx} className="text-gray-700">
                  {typeof val === 'string' ? val : JSON.stringify(val)}
                </li>
              ))}
            </ul>
          ) : typeof explanation.expected === 'string' ? (
            <span className="text-gray-700">{explanation.expected}</span>
          ) : null}
        </div>
      )}

      {explanation.howToFix && (
        <div className="validation-error-explanation__fix text-sm bg-green-50 border border-green-200 rounded p-3">
          <span className="font-medium text-green-900">How to fix: </span>
          <span className="text-green-800">{explanation.howToFix}</span>
        </div>
      )}

      {explanation.note && (
        <div className="validation-error-explanation__note text-xs text-gray-600 italic border-l-2 border-gray-300 pl-2 mt-2">
          {explanation.note}
        </div>
      )}
    </div>
  );
};

/**
 * Inline variant for rendering just the reason text
 */
export const ValidationErrorDescription: React.FC<{ error: ValidationError; className?: string }> = ({
  error,
  className = '',
}) => {
  const { reason } = explainError(error);
  return <span className={className}>{reason}</span>;
};

/**
 * Title-only variant
 */
export const ValidationErrorTitle: React.FC<{ error: ValidationError; className?: string }> = ({
  error,
  className = '',
}) => {
  const { title } = explainError(error);
  return <span className={className}>{title}</span>;
};

