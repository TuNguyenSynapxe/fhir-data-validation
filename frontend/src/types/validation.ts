export interface UnifiedError {
  errorCode: string;
  path: string;
  message: string;
  severity?: string;
  breadcrumbs?: string[];
  missingParents?: number;
}

export interface ValidationSummary {
  isValid: boolean;
  totalErrors: number;
  firelyErrors: number;
  ruleErrors: number;
  codeMasterErrors: number;
  referenceErrors: number;
  processingTimeMs: number;
}

export interface ValidationResult {
  errors: UnifiedError[];
  summary: ValidationSummary;
}
