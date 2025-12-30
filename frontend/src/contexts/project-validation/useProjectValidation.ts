/**
 * useProjectValidation Hook
 * 
 * Centralized validation lifecycle management for Project Validation context.
 * Owns validation state, trigger mechanism, and API calls.
 * 
 * CONTEXT: Project-scoped validation with state machine (NoBundle → NotValidated → Validated/Failed)
 * 
 * This hook:
 * - Manages validationResult state (single source of truth)
 * - Handles validation API calls
 * - Tracks validation trigger timestamps
 * - Provides validation lifecycle controls
 * 
 * IMPORTANT: This is for PROJECT validation only, NOT for:
 * - Public validation (stateless bundle lint)
 * - Admin rule preview (authoring context)
 */

import { useState, useCallback } from 'react';
import { message } from 'antd';

export interface ValidationIssueExplanation {
  what: string;
  how?: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface ValidationError {
  source: string; // FHIR, Business, CodeMaster, Reference, Lint, SpecHint
  severity: string; // error, warning, info
  resourceType?: string;
  path?: string;
  jsonPointer?: string;
  errorCode?: string;
  message: string;
  details?: Record<string, any>;
  navigation?: {
    jsonPointer?: string;
    breadcrumb?: string;
    resourceIndex?: number;
  };
  explanation?: ValidationIssueExplanation;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  timestamp: string;
  executionTimeMs: number;
  summary: {
    total: number;
    errors: number;
    warnings: number;
    information: number;
    bySource: {
      firely: number;
      businessRules: number;
      codeMaster: number;
      reference: number;
      lint: number;
      specHint: number;
    };
  };
}

export interface ProjectValidationState {
  // State
  result: ValidationResult | null;
  isValidating: boolean;
  error: string | null;
  trigger: number; // Timestamp for triggering validation
  
  // Actions
  runValidation: (mode?: 'standard' | 'full') => Promise<void>;
  setResult: (result: ValidationResult | null) => void;
  clearError: () => void;
  triggerValidation: () => void; // Programmatic trigger (sets timestamp)
}

/**
 * Hook for managing project validation lifecycle.
 * 
 * @param projectId - The project ID to validate
 * @returns ProjectValidationState with result, actions, and loading states
 */
export function useProjectValidation(projectId: string): ProjectValidationState {
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trigger, setTrigger] = useState<number>(0);

  /**
   * Run validation via backend API.
   * This is the ONLY place validation API calls should happen for project validation.
   * Defaults to 'standard' mode for API calls (UI overrides to 'full')
   */
  const runValidation = useCallback(async (mode: 'standard' | 'full' = 'standard') => {
    setIsValidating(true);
    setError(null);

    const startTime = Date.now();

    try {
      const response = await fetch(`/api/projects/${projectId}/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          validationMode: mode,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Validation failed' }));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      const executionTimeMs = Date.now() - startTime;
      
      // Transform API response to ValidationResult format
      const errors = data.errors || [];
      const validationResult: ValidationResult = {
        isValid: errors.length === 0,
        errors: errors,
        timestamp: data.metadata?.timestamp || new Date().toISOString(),
        executionTimeMs: data.metadata?.processingTimeMs || executionTimeMs,
        summary: {
          total: data.summary?.totalErrors || errors.length,
          errors: data.summary?.errorCount || errors.filter((e: ValidationError) => e.severity === 'error').length,
          warnings: data.summary?.warningCount || errors.filter((e: ValidationError) => e.severity === 'warning').length,
          information: data.summary?.infoCount || errors.filter((e: ValidationError) => e.severity === 'info' || e.severity === 'information').length,
          bySource: {
            firely: data.summary?.fhirErrorCount || errors.filter((e: ValidationError) => 
              e.source?.toLowerCase() === 'fhir' || e.source?.toLowerCase() === 'firely').length,
            businessRules: data.summary?.businessErrorCount || errors.filter((e: ValidationError) => 
              e.source?.toLowerCase() === 'business' || e.source?.toLowerCase() === 'businessrules').length,
            codeMaster: data.summary?.codeMasterErrorCount || errors.filter((e: ValidationError) => 
              e.source?.toLowerCase() === 'codemaster').length,
            reference: data.summary?.referenceErrorCount || errors.filter((e: ValidationError) => 
              e.source?.toLowerCase() === 'reference').length,
            lint: data.summary?.lintErrorCount || errors.filter((e: ValidationError) => 
              e.source?.toLowerCase() === 'lint').length,
            specHint: errors.filter((e: ValidationError) => 
              e.source?.toLowerCase() === 'spec_hint' || e.source?.toLowerCase() === 'spechint').length,
          },
        },
      };

      setResult(validationResult);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      setResult(null);
      
      // Show user-visible error notification
      message.error({
        content: `Validation failed: ${errorMessage}`,
        duration: 6,
      });
    } finally {
      setIsValidating(false);
    }
  }, [projectId]);

  /**
   * Programmatically trigger validation (sets timestamp for external observers).
   */
  const triggerValidation = useCallback(() => {
    setTrigger(Date.now());
  }, []);

  /**
   * Clear error state.
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    result,
    isValidating,
    error,
    trigger,
    runValidation,
    setResult,
    clearError,
    triggerValidation,
  };
}
