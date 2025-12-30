/**
 * PHASE 3: No-Prose Enforcement Components
 * 
 * Shared components for ErrorCode-first rule authoring.
 * These replace MessageEditor with structured, controlled inputs.
 */

export { ErrorCodeSelector } from './ErrorCodeSelector';
export { UserHintInput } from './UserHintInput';
export { RuleErrorPreview } from './RuleErrorPreview';

/**
 * UNIFIED RULE FORM ARCHITECTURE
 * 
 * Shared form section components used by ALL rule types.
 * Enforces consistent UX across create and edit flows.
 */

export { ResourceSelector, ALL_RESOURCE_TYPES } from './ResourceSelector';
export { RuleScopeSelector } from './RuleScopeSelector';
export { SeveritySelector } from './SeveritySelector';
export { RulePreviewPanel } from './RulePreviewPanel';

// Re-export instance scope types for convenience
export type { InstanceScope } from './InstanceScope.types';
export { InstanceScopeDrawer } from './InstanceScopeDrawer';
export { InstanceScopePreview } from './InstanceScopePreview';

// @deprecated Use InstanceScopePreview component instead of formatting manually
export { getInstanceScopeSummary } from './InstanceScope.utils';
