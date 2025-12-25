/**
 * Grouped Props for Right Panel Hierarchy
 * 
 * These interfaces group related props semantically to reduce prop explosion
 * across the RightPanelContainer → RightPanel → Child Panels hierarchy.
 * 
 * ⚠️ STRUCTURAL REFACTOR ONLY - Zero behavior change
 */

import { RightPanelMode } from './rightPanel';

export interface Rule {
  id: string;
  type: string;
  resourceType: string;
  path: string;
  severity: string;
  message: string;
  params?: Record<string, any>;
}

/**
 * Validation Lifecycle Props
 * 
 * Encapsulates all validation-related state and callbacks.
 * Used by ValidationPanel and ValidationContextBar.
 * 
 * NOTE: Phase-3 - Core validation state now provided via ProjectValidationContext.
 * This interface kept for reference but no longer used for prop drilling.
 * 
 * @deprecated Use ProjectValidationContext instead of prop drilling
 */
export interface ValidationProps {
  // Validation results (controlled from parent via useProjectValidation hook)
  validationResult: any | null;
  isValidating: boolean;
  validationError: string | null;
  
  // Validation state machine (derived from bundle/rules/result)
  validationState: string;
  
  // Validation metadata (error/warning counts)
  validationMetadata?: {
    errorCount?: number;
    warningCount?: number;
  };
  
  // Callbacks
  onRunValidation?: (mode: 'fast' | 'debug') => Promise<void>;
  onClearValidationError?: () => void;
}

/**
 * Rules Management Props
 * 
 * Encapsulates all rules-related state and callbacks.
 * Used by RulesPanel and OverviewPanel.
 */
export interface RulesProps {
  rules: Rule[];
  onRulesChange?: (rules: Rule[]) => void;
  onSaveRules?: () => void;
  hasRulesChanges: boolean;
  
  // Rules alignment with bundle (for OverviewPanel)
  ruleAlignmentStats?: {
    observed: number;
    notObserved: number;
    total: number;
  };
  
  // Rule suggestions from validation
  ruleSuggestions?: any[];
  
  // Bundle structural sanity state (gates rule authoring)
  bundleSanityState?: {
    isValid: boolean;
    errors: string[];
  };
}

/**
 * CodeMaster Editor Props
 * 
 * Encapsulates CodeMaster JSON editor state and callbacks.
 * Used by CodeMasterEditor.
 */
export interface CodeMasterProps {
  codeMasterJson: string;
  onCodeMasterChange?: (value: string) => void;
  onSaveCodeMaster?: () => void;
  hasCodeMasterChanges: boolean;
  isSavingCodeMaster: boolean;
}

/**
 * Validation Settings Props
 * 
 * Encapsulates validation settings editor state and callbacks.
 * Used by ValidationSettingsEditor.
 */
export interface ValidationSettingsProps {
  validationSettings: any;
  onValidationSettingsChange?: (settings: any) => void;
  onSaveValidationSettings?: () => void;
  hasValidationSettingsChanges: boolean;
  isSavingValidationSettings: boolean;
}

/**
 * Project Metadata Props
 * 
 * Encapsulates project-level metadata.
 * Used by RuleSetMetadata.
 */
export interface MetadataProps {
  projectName: string;
}

/**
 * Bundle Data Props
 * 
 * Encapsulates FHIR bundle and related data.
 * Used by RulesPanel and ValidationPanel for state derivation.
 */
export interface BundleProps {
  projectBundle?: object;
  bundleJson?: string; // Serialized bundle for ValidationState derivation
  bundleChanged?: boolean; // For ValidationState derivation
  rulesChanged?: boolean; // For ValidationState derivation
  hl7Samples?: any[];
}

/**
 * Navigation Props
 * 
 * Encapsulates navigation callbacks and error selection.
 * Used by ValidationPanel and error handling.
 */
export interface NavigationProps {
  projectId: string;
  onNavigateToPath?: (path: string) => void;
  onSelectError?: (error: any) => void;
  onSuggestionsReceived?: (suggestions: any[]) => void;
  
  // Bundle drawer control (Phase 16: Contextual Bundle)
  isBundleOpen?: boolean;
  onBundleToggle?: () => void;
  
  // Bundle tab content (Phase 18+: Bundle Tab)
  bundleTabsContent?: React.ReactNode;
  bundleView?: 'tree' | 'json';
  onBundleViewChange?: (view: 'tree' | 'json') => void;
  onOpenBundleTab?: () => void; // Navigate to Bundle tab
}

/**
 * UI State Props
 * 
 * Encapsulates UI-only state (focus, dimming, etc.).
 * Used by RightPanel for visual effects.
 */
export interface UIStateProps {
  isDimmed?: boolean;
  onClearFocus?: () => void;
}

/**
 * Feature Flags Props
 * 
 * Encapsulates experimental feature flags.
 * Used by ExperimentalFeaturesSettings and RulesPanel.
 */
export interface FeatureFlagsProps {
  projectFeatures?: {
    treeRuleAuthoring?: boolean;
  };
  onFeaturesUpdated?: (features: { treeRuleAuthoring?: boolean }) => void;
  isAdmin?: boolean;
}

/**
 * Mode Control Props
 * 
 * Encapsulates mode/tab navigation state.
 * Used by RightPanelContainer for mode switching.
 */
export interface ModeControlProps {
  currentMode: RightPanelMode;
  onModeChange?: (mode: RightPanelMode) => void;
  showModeTabs?: boolean;
  activeTab?: 'overview' | 'rules' | 'codemaster' | 'metadata' | 'settings' | 'run' | 'results' | 'bundle';
  onTabChange?: (tab: 'overview' | 'rules' | 'codemaster' | 'metadata' | 'settings' | 'run' | 'results' | 'bundle') => void;
}
