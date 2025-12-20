/**
 * Project Stage (Advisory Only)
 * 
 * Stages describe project readiness, NOT permissions.
 * Stages NEVER block rule authoring or other actions.
 * They provide context and guidance, not restrictions.
 * 
 * Key Principle:
 * - Rules can ALWAYS be created, edited, and saved at any stage
 * - Stages are informational, not restrictive
 * - UI shows helpful context based on stage, but never disables features
 */

export const ProjectStage = {
  /**
   * Project created, no bundle loaded yet
   * Advisory: "Upload a bundle to begin validation"
   */
  ProjectCreated: 'ProjectCreated',

  /**
   * Bundle present but not validated
   * Advisory: "Run validation to check structural integrity"
   */
  BundleLoaded: 'BundleLoaded',

  /**
   * Firely/Lint validation passed (structure is valid)
   * Advisory: "Bundle structure is valid. Rules will execute against this baseline."
   */
  StructuralValid: 'StructuralValid',

  /**
   * Rules have been executed (may have business rule errors)
   * Advisory: "Validation complete. Review results."
   */
  RuleExecuted: 'RuleExecuted',
} as const;

export type ProjectStage = typeof ProjectStage[keyof typeof ProjectStage];

/**
 * Advisory metadata for current project stage
 */
export interface ProjectStageMetadata {
  stage: ProjectStage;
  
  /** Human-readable description of current stage */
  description: string;
  
  /** Suggested next action (advisory, not required) */
  suggestedAction?: string;
  
  /** Whether bundle structure is known to be valid */
  structurallyValid: boolean;
  
  /** Whether rules have been executed at least once */
  rulesExecuted: boolean;
  
  /** Informational warnings (never blocking) */
  advisories?: {
    type: 'info' | 'warning';
    message: string;
  }[];
}

/**
 * Derive project stage from current state
 * 
 * This function computes advisory stage only.
 * It NEVER returns blocking conditions.
 */
export function deriveProjectStage(
  bundleJson: string | undefined,
  validationResult: any | null,
  bundleChanged: boolean,
  rulesChanged: boolean
): ProjectStageMetadata {
  const hasBundle = !!bundleJson && bundleJson.trim().length > 0;
  const hasValidationResult = !!validationResult;
  const contentChanged = bundleChanged || rulesChanged;

  // Stage 1: No bundle
  if (!hasBundle) {
    return {
      stage: ProjectStage.ProjectCreated,
      description: 'No bundle loaded',
      suggestedAction: 'Upload a FHIR bundle to begin validation',
      structurallyValid: false,
      rulesExecuted: false,
      advisories: [
        {
          type: 'info',
          message: 'You can create rules now. They will be validated once a bundle is loaded.',
        },
      ],
    };
  }

  // Stage 2: Bundle loaded, not validated (or stale)
  if (!hasValidationResult || contentChanged) {
    return {
      stage: ProjectStage.BundleLoaded,
      description: contentChanged ? 'Bundle or rules changed' : 'Bundle loaded, not validated',
      suggestedAction: 'Run validation to check structural integrity',
      structurallyValid: false,
      rulesExecuted: false,
      advisories: [
        {
          type: 'info',
          message: contentChanged
            ? 'Bundle or rules have changed. Re-run validation to see updated results.'
            : 'Bundle loaded. Run validation to check FHIR structural integrity.',
        },
      ],
    };
  }

  // Analyze validation result
  const errors = validationResult.errors || [];
  const structuralErrors = errors.filter((e: any) =>
    ['FHIR', 'LINT', 'Firely'].includes(e.source)
  );
  const hasStructuralErrors = structuralErrors.length > 0;
  const hasRuleErrors = errors.some((e: any) =>
    ['Business', 'PROJECT'].includes(e.source)
  );

  // Stage 3: Validated with structural issues
  if (hasStructuralErrors) {
    return {
      stage: ProjectStage.BundleLoaded,
      description: 'Structural validation issues found',
      suggestedAction: 'Fix structural errors for more reliable rule execution',
      structurallyValid: false,
      rulesExecuted: true,
      advisories: [
        {
          type: 'warning',
          message: `${structuralErrors.length} structural issue(s) found. Business rules may not execute correctly on invalid FHIR structures.`,
        },
      ],
    };
  }

  // Stage 4: Structurally valid, rules executed
  if (hasRuleErrors) {
    return {
      stage: ProjectStage.RuleExecuted,
      description: 'Validation complete with business rule issues',
      suggestedAction: 'Review and fix business rule violations',
      structurallyValid: true,
      rulesExecuted: true,
      advisories: [
        {
          type: 'info',
          message: 'Bundle structure is valid. Business rules have been evaluated.',
        },
      ],
    };
  }

  // Stage 4: Structurally valid, no rule errors
  return {
    stage: ProjectStage.RuleExecuted,
    description: 'Validation passed',
    suggestedAction: undefined,
    structurallyValid: true,
    rulesExecuted: true,
    advisories: [
      {
        type: 'info',
        message: 'All validation checks passed. Bundle is compliant.',
      },
    ],
  };
}
