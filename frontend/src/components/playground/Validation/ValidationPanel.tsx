import React from 'react';
import { ValidationWorkspace } from '../../shared/ValidationWorkspace';
import { useProjectValidationContext } from '../../../contexts/project-validation/ProjectValidationContext';
import type { SystemRuleSuggestion } from '../../../api/projects';
import type { ValidationError } from '../../../contexts/project-validation/useProjectValidation';

interface ValidationPanelProps {
  projectId: string;
  onSelectError?: (error: ValidationError) => void;
  onNavigateToPath?: (jsonPointer: string) => void;
  onSuggestionsReceived?: (suggestions: SystemRuleSuggestion[]) => void;
  
  // Inputs for ValidationState derivation
  bundleJson?: string; // Current bundle content
  bundleChanged?: boolean; // Whether bundle has changed since last validation
  rulesChanged?: boolean; // Whether rules have changed since last validation
  
  // Bundle drawer control (Phase 16: Contextual Bundle)
  isBundleOpen?: boolean;
  onBundleToggle?: () => void;
}

/**
 * ValidationPanel Component (Authoring)
 * 
 * Thin wrapper around ValidationWorkspace that:
 * 1. Consumes ProjectValidationContext
 * 2. Passes context values as props to ValidationWorkspace
 * 3. Provides projectId for filter persistence
 * 4. Tracks draft state (bundleChanged, rulesChanged)
 * 
 * This preserves the existing authoring UX exactly while enabling
 * the same validation UI to be reused in public validation pages.
 */
export const ValidationPanel: React.FC<ValidationPanelProps> = (props) => {
  // Consume context (authoring lifecycle)
  const {
    validationResult,
    isValidating,
    validationError,
    runValidation,
    clearValidationError,
  } = useProjectValidationContext();
  
  // Pass context values as props to ValidationWorkspace
  return (
    <ValidationWorkspace
      validationResult={validationResult}
      isValidating={isValidating}
      validationError={validationError}
      onValidate={runValidation}
      onReset={clearValidationError}
      projectId={props.projectId}
      bundleJson={props.bundleJson}
      bundleChanged={props.bundleChanged}
      rulesChanged={props.rulesChanged}
      onSelectError={props.onSelectError}
      onNavigateToPath={props.onNavigateToPath}
      onSuggestionsReceived={props.onSuggestionsReceived}
      defaultOpen={false}
      showExplanations={false}
    />
  );
};
