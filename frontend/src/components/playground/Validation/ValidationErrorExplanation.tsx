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
import { explainError, type ValidationError } from '../../../validation';

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
 * Renders title + description from the canonical explanation registry.
 * Gracefully handles null/undefined/malformed errors via fallback.
 */
export const ValidationErrorExplanation: React.FC<ValidationErrorExplanationProps> = ({
  error,
  className = '',
  showTitle = true,
  showDescription = true,
}) => {
  // Get canonical explanation (never throws, always returns valid content)
  const { title, description } = explainError(error);

  return (
    <div className={`validation-error-explanation ${className}`}>
      {showTitle && (
        <div className="validation-error-explanation__title font-medium text-gray-900 mb-1">
          {title}
        </div>
      )}
      {showDescription && (
        <div className="validation-error-explanation__description text-sm text-gray-700">
          {description}
        </div>
      )}
    </div>
  );
};

/**
 * Inline variant for rendering just the description text
 */
export const ValidationErrorDescription: React.FC<{ error: ValidationError; className?: string }> = ({
  error,
  className = '',
}) => {
  const { description } = explainError(error);
  return <span className={className}>{description}</span>;
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
