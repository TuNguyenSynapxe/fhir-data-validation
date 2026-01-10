/**
 * Phase 7.4 Backend DTOs mapped to TypeScript
 */

export interface ProjectDetailsDto {
  projectId: string;
  name: string;
  isPublicEnabled: boolean;
  createdAt: string;
  counts: ProjectCountsDto;
}

export interface ProjectCountsDto {
  artifactCount: number;
  bundleCount: number;
  ruleCount: number;
}

export const BundleSource = {
  ImportedExample: 'ImportedExample',
  Uploaded: 'Uploaded',
  AdHoc: 'AdHoc',
} as const;

export type BundleSource = typeof BundleSource[keyof typeof BundleSource];

export interface ProjectBundleDto {
  bundleId: string;
  name: string;
  source: BundleSource;
  createdAt: string;
}

export const RuleScope = {
  Project: 'Project',
  Bundle: 'Bundle',
} as const;

export type RuleScope = typeof RuleScope[keyof typeof RuleScope];

export const RuleType = {
  ProfileDerived: 'ProfileDerived',
  FhirPathCustom: 'FhirPathCustom',
  Other: 'Other',
} as const;

export type RuleType = typeof RuleType[keyof typeof RuleType];

export interface ProjectArtifactDto {
  artifactId: string;
  type: string; // 'StructureDefinition', 'ValueSet', 'CodeSystem', etc.
  name: string;
  canonicalUrl?: string;
  resourceType?: string; // For SDs: 'Patient', 'Observation', etc.
}

export const RuleProvenance = {
  ImportedGenerated: 'ImportedGenerated',
  ManualCustom: 'ManualCustom',
} as const;

export type RuleProvenance = typeof RuleProvenance[keyof typeof RuleProvenance];

export interface ProjectRuleDto {
  ruleId: string;
  scope: RuleScope;
  bundleId?: string;
  ruleType: RuleType;
  provenance: RuleProvenance;
  title: string;
  isEnabled: boolean;
}
