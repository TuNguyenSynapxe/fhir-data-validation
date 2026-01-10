/**
 * Phase 8.3 Bundle Profile Resolution Types
 * Maps to backend BundleProfileDto from BundleProfileController
 */

export type BundleProfileState = 'resolved' | 'unresolved' | 'unprofiled';
export type BundleProfileSource = 'auto' | 'manual';

export interface BundleProfileStateDto {
  state: BundleProfileState;
  structureDefinitionId: string | null;
  source: BundleProfileSource | null;
  canonicalUrl: string | null;
  name: string | null;
}

export interface SetBundleProfileRequest {
  structureDefinitionId: string | null; // null = explicitly unprofiled
}

/**
 * Phase 8.4 Validation Scope Metadata
 * Included in ValidationResponse.metadata.validationScope
 */
export interface ValidationScope {
  bundleProfileState: string;
  appliedProjectRules: boolean;
  structureDefinitionId: string | null;
  source: string | null;
}
