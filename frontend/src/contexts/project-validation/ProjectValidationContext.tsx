/**
 * ProjectValidationContext
 * 
 * React Context for validation lifecycle state and actions.
 * 
 * ⚠️ PHASE-3 REFACTOR: Safe structural refactor only
 * ⚠️ Zero behavior change - Context wraps existing useProjectValidation hook
 * 
 * Purpose:
 * - Eliminate validation prop drilling across component hierarchy
 * - Provide validation state/actions via useProjectValidationContext() hook
 * - Maintain single source of truth (useProjectValidation remains core logic)
 * 
 * Scope:
 * - ONLY validation concerns (result, isValidating, error, actions)
 * - Does NOT include rules, bundle, navigation, or UI state
 * - Provider wraps validation subtree only (not app-wide)
 * 
 * Usage:
 * ```tsx
 * <ProjectValidationProvider projectId={projectId}>
 *   <ValidationPanel />
 * </ProjectValidationProvider>
 * ```
 * 
 * Inside children:
 * ```tsx
 * const validation = useProjectValidationContext();
 * ```
 */

import React, { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { ValidationResult } from './useProjectValidation';

/**
 * Validation Context Value
 * 
 * Contains all validation lifecycle state and actions.
 * This is a subset of ProjectValidationState (excludes internal trigger timestamp).
 */
export interface ProjectValidationContextValue {
  // State
  validationResult: ValidationResult | null;
  isValidating: boolean;
  validationError: string | null;
  
  // Actions
  runValidation: (mode?: 'fast' | 'debug') => Promise<void>;
  clearValidationError: () => void;
}

/**
 * Validation Context (internal)
 */
const ProjectValidationContext = createContext<ProjectValidationContextValue | undefined>(undefined);

/**
 * Provider Props
 * 
 * NOTE: Provider receives validation state from parent (PlaygroundPage)
 * instead of internally calling useProjectValidation. This allows parent
 * to use validationResult for derived state (ValidationState) before
 * passing to children via Context.
 */
interface ProjectValidationProviderProps {
  validationResult: ValidationResult | null;
  isValidating: boolean;
  validationError: string | null;
  runValidation: (mode?: 'fast' | 'debug') => Promise<void>;
  clearValidationError: () => void;
  children: ReactNode;
}

/**
 * ProjectValidationProvider
 * 
 * Wraps validation subtree and provides validation state/actions via Context.
 * Receives validation state from parent (PlaygroundPage's useProjectValidation hook).
 * 
 * ⚠️ IMPORTANT: Provider does NOT add new state or behavior.
 * It only exposes parent's validation state via Context to eliminate prop drilling.
 * 
 * @param validationResult - Current validation result
 * @param isValidating - Whether validation is in progress
 * @param validationError - Validation error message
 * @param runValidation - Function to trigger validation
 * @param clearValidationError - Function to clear error
 * @param children - Validation subtree (ValidationPanel, OverviewPanel, etc.)
 */
export const ProjectValidationProvider: React.FC<ProjectValidationProviderProps> = ({
  validationResult,
  isValidating,
  validationError,
  runValidation,
  clearValidationError,
  children,
}) => {
  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo<ProjectValidationContextValue>(
    () => ({
      validationResult,
      isValidating,
      validationError,
      runValidation,
      clearValidationError,
    }),
    [
      validationResult,
      isValidating,
      validationError,
      runValidation,
      clearValidationError,
    ]
  );

  return (
    <ProjectValidationContext.Provider value={value}>
      {children}
    </ProjectValidationContext.Provider>
  );
};

/**
 * useProjectValidationContext Hook
 * 
 * Access validation state and actions from Context.
 * Must be used inside ProjectValidationProvider.
 * 
 * @returns ProjectValidationContextValue with validation state and actions
 * @throws Error if used outside ProjectValidationProvider
 * 
 * @example
 * ```tsx
 * const validation = useProjectValidationContext();
 * 
 * // Access state
 * const { validationResult, isValidating, validationError } = validation;
 * 
 * // Call actions
 * await validation.runValidation('fast');
 * validation.clearValidationError();
 * ```
 */
export function useProjectValidationContext(): ProjectValidationContextValue {
  const context = useContext(ProjectValidationContext);
  
  if (context === undefined) {
    throw new Error(
      'useProjectValidationContext must be used within ProjectValidationProvider. ' +
      'Ensure the component is wrapped by <ProjectValidationProvider>.'
    );
  }
  
  return context;
}
