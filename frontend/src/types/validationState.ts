/**
 * ValidationState Values
 * 
 * Represents the lifecycle state of validation readiness.
 * This is the single authoritative source for validation status.
 * 
 * State Transitions:
 * NoBundle -> NotValidated (when bundle is loaded)
 * NotValidated -> Validated (when validation passes)
 * NotValidated -> Failed (when validation fails)
 * Validated -> NotValidated (when bundle/rules change)
 * Failed -> NotValidated (when bundle/rules change)
 */
export const ValidationState = {
  /**
   * No bundle data is present
   * User has not loaded or created a bundle yet
   */
  NoBundle: 'NoBundle',

  /**
   * Bundle exists but validation has not been run,
   * or bundle/rules have changed since last validation
   */
  NotValidated: 'NotValidated',

  /**
   * Validation has completed successfully
   * Lint and Firely validation passed (or only advisory issues)
   */
  Validated: 'Validated',

  /**
   * Validation has run and found blocking errors
   * Either lint or Firely validation failed
   */
  Failed: 'Failed',
} as const;

export type ValidationState = typeof ValidationState[keyof typeof ValidationState];

/**
 * Metadata about the validation state
 */
export interface ValidationStateMetadata {
  state: ValidationState;
  
  /** When validation was last run (if ever) */
  lastValidatedAt?: string;
  
  /** Total error count from last validation */
  errorCount?: number;
  
  /** Total warning count from last validation */
  warningCount?: number;
  
  /** Breakdown by severity and source */
  breakdown?: {
    firely: { errors: number; warnings: number };
    lint: { errors: number; warnings: number };
    business: { errors: number; warnings: number };
    codeMaster: { errors: number; warnings: number };
    reference: { errors: number; warnings: number };
    specHint: { errors: number; warnings: number };
  };
  
  /** Whether the bundle has changed since last validation */
  bundleChanged?: boolean;
  
  /** Whether the rules have changed since last validation */
  rulesChanged?: boolean;
}
