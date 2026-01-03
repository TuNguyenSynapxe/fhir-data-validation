/**
 * Public Validation API Types
 * Matches backend DTOs from Pss.FhirProcessor.Playground.Api
 */

// ============================================
// Request DTOs
// ============================================

export interface ValidateRequest {
  bundleJson: string;
  fhirVersion?: string; // Default: "R4"
  validationMode?: 'standard' | 'full'; // Default: "standard"
}

// ============================================
// Response DTOs
// ============================================

export interface ValidateResponse {
  isValid: boolean;
  engineResponse: ValidationResponse;
}

export interface ValidationResponse {
  summary: ValidationSummary;
  byPhase: PhaseResults;
}

export interface ValidationSummary {
  totalErrors: number;
  totalWarnings: number;
  byEnforcement: {
    mustFix: number;
    recommended: number;
  };
  byPhase: Record<string, PhaseCount>;
}

export interface PhaseCount {
  errors: number;
  warnings: number;
}

export interface PhaseResults {
  lint?: ValidationIssue[];
  structure?: ValidationIssue[];
  specHint?: ValidationIssue[];
  firely?: ValidationIssue[];
  rules?: ValidationIssue[];
  codeMaster?: ValidationIssue[];
  references?: ValidationIssue[];
}

export interface ValidationIssue {
  phase: string;
  enforcement: 'MUST_FIX' | 'RECOMMENDED';
  severity: 'error' | 'warning';
  path?: string;
  jsonPointer?: string;
  message: string;
  explanation?: string;
  errorCode?: string;
  ruleId?: string;
}

// ============================================
// Project DTOs
// ============================================

export interface ProjectSummaryDto {
  id: string;
  slug: string;
  name: string;
  description?: string;
  status: string;
  publishedAt?: string;
}

export interface ProjectDetailDto extends ProjectSummaryDto {
  createdAt: string;
  rulesetMetadata: ProjectRulesetMetadata;
}

export interface ProjectRulesetMetadata {
  ruleCount: number;
  codeSystemCount: number;
  fhirVersion: string;
}

// ============================================
// Rule Display Types (for RuleList component)
// ============================================

export interface RuleDefinition {
  id: string;
  enforcement: 'MUST_FIX' | 'RECOMMENDED';
  appliesToResourceType?: string;
  appliesTo?: string; // FHIRPath expression
  ruleType: string;
  parameters?: Record<string, any>;
  hint?: string;
  message?: string;
}

export interface CodeSystem {
  id: string;
  name: string;
  url?: string;
  valueSetUrl?: string;
  codes: CodeSystemCode[];
}

export interface CodeSystemCode {
  code: string;
  display: string;
}
