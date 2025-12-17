/**
 * Validation Settings Types
 * 
 * Runtime validation behavior configuration (NOT part of rule definitions)
 */

export type ReferenceResolutionPolicy = 'InBundleOnly' | 'AllowExternal' | 'RequireResolution';

export interface ValidationSettings {
  /** Reference resolution policy for validation runtime */
  referenceResolutionPolicy: ReferenceResolutionPolicy;
}

export const DEFAULT_VALIDATION_SETTINGS: ValidationSettings = {
  referenceResolutionPolicy: 'AllowExternal',
};

/**
 * Policy descriptions for UI display
 */
export const REFERENCE_POLICY_DESCRIPTIONS: Record<ReferenceResolutionPolicy, { 
  label: string; 
  description: string;
  technical: string;
}> = {
  InBundleOnly: {
    label: 'In-bundle only (strict)',
    description: 'All references must resolve within the current Bundle.',
    technical: 'Unresolved references are treated as blocking errors.',
  },
  AllowExternal: {
    label: 'Allow external references (recommended)',
    description: 'Validate in-bundle references, but allow unresolved external references.',
    technical: 'Unresolved references are downgraded to warnings.',
  },
  RequireResolution: {
    label: 'Require resolution (advanced)',
    description: 'All references must be resolvable at validation time.',
    technical: 'Intended for server-connected validation scenarios.',
  },
};
