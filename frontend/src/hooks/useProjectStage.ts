/**
 * useProjectStage Hook
 * 
 * Computes advisory project stage for context and guidance.
 * NEVER returns blocking conditions.
 * Rule authoring is always enabled regardless of stage.
 */

import { useMemo } from 'react';
import { deriveProjectStage, type ProjectStageMetadata } from '../types/projectStage';
import type { ValidationResult } from '../contexts/project-validation/useProjectValidation';

export function useProjectStage(
  bundleJson: string | undefined,
  validationResult: ValidationResult | null,
  bundleChanged: boolean,
  rulesChanged: boolean
): ProjectStageMetadata {
  return useMemo(
    () => deriveProjectStage(bundleJson, validationResult, bundleChanged, rulesChanged),
    [bundleJson, validationResult, bundleChanged, rulesChanged]
  );
}
