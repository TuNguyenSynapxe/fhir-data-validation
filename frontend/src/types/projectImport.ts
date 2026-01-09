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

export enum BundleSource {
  ImportedExample = 'ImportedExample',
  Uploaded = 'Uploaded',
  AdHoc = 'AdHoc',
}

export interface ProjectBundleDto {
  bundleId: string;
  name: string;
  source: BundleSource;
  createdAt: string;
}

export enum RuleScope {
  Project = 'Project',
  Bundle = 'Bundle',
}

export enum RuleType {
  ProfileDerived = 'ProfileDerived',
  FhirPathCustom = 'FhirPathCustom',
  Other = 'Other',
}

export enum RuleProvenance {
  ImportedGenerated = 'ImportedGenerated',
  ManualCustom = 'ManualCustom',
}

export interface ProjectRuleDto {
  ruleId: string;
  scope: RuleScope;
  bundleId?: string;
  ruleType: RuleType;
  provenance: RuleProvenance;
  title: string;
  isEnabled: boolean;
}
