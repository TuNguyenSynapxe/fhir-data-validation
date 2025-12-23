import React from 'react';
import { RightPanelMode } from '../../types/rightPanel';
import { RulesPanel } from '../playground/Rules/RulesPanel';
import { ValidationPanel } from '../playground/Validation/ValidationPanel';
import { CodeMasterEditor } from '../playground/CodeMaster/CodeMasterEditor';
import { RuleSetMetadata } from '../playground/Metadata/RuleSetMetadata';
import { ValidationSettingsEditor } from '../playground/Settings/ValidationSettingsEditor';
import { OverviewPanel } from '../playground/Overview/OverviewPanel';
import { DEFAULT_VALIDATION_SETTINGS } from '../../types/validationSettings';
import type {
  ModeControlProps,
  RulesProps,
  CodeMasterProps,
  ValidationSettingsProps,
  MetadataProps,
  BundleProps,
  NavigationProps,
  UIStateProps,
  FeatureFlagsProps,
} from '../../types/rightPanelProps';

/**
 * Right Panel Props (Grouped)
 * 
 * Props are grouped semantically to reduce prop explosion.
 * This component forwards grouped props to child panels.
 * 
 * NOTE: Validation props removed in Phase-3 (provided via ProjectValidationContext)
 */
interface RightPanelProps {
  mode: ModeControlProps;
  rules: RulesProps;
  codemaster: CodeMasterProps;
  settings: ValidationSettingsProps;
  metadata: MetadataProps;
  bundle: BundleProps;
  navigation: NavigationProps;
  ui: UIStateProps;
  features: FeatureFlagsProps;
  
  // Derived validation state for OverviewPanel (computed in PlaygroundPage)
  validationState?: string;
}

/**
 * Mode-based Right Panel Container
 * 
 * Switches between different modes without unmounting components unnecessarily.
 * This preserves component state when switching between modes.
 * 
 * Modes:
 * - Rules: Shows Rules/CodeMaster/Metadata tabs
 * - Validation: Shows validation results
 * - Observations: Placeholder for future implementation
 */
export const RightPanel: React.FC<RightPanelProps> = ({
  mode,
  rules,
  codemaster: _codemaster, // Unused after Phase A migration
  settings,
  metadata,
  bundle,
  navigation,
  ui,
  features,
  validationState,
}) => {
  // Destructure mode props
  const { currentMode, activeTab = 'overview', onTabChange, onModeChange } = mode;
  
  // Destructure rules props
  const {
    rules: rulesData = [],
    onRulesChange,
    onSaveRules,
    ruleAlignmentStats,
    ruleSuggestions = [],
  } = rules;
  
  // Codemaster props no longer needed after Phase A migration
  // CodeMasterEditor now manages own state via API calls
  
  // Destructure settings props
  const {
    validationSettings,
    onValidationSettingsChange,
    onSaveValidationSettings,
    hasValidationSettingsChanges = false,
    isSavingValidationSettings = false,
  } = settings;
  
  // Destructure metadata props
  const { projectName = '' } = metadata;
  
  // Destructure bundle props
  const {
    projectBundle,
    bundleJson,
    bundleChanged,
    rulesChanged,
    hl7Samples = [],
  } = bundle;
  
  // Destructure navigation props
  const { projectId, onNavigateToPath, onSelectError, onSuggestionsReceived } = navigation;
  
  // Destructure ui props
  const { isDimmed = false, onClearFocus } = ui;
  
  // Destructure features props
  const { projectFeatures } = features;
  // Render Rules mode (with tabs)
  const renderRulesMode = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <OverviewPanel
            validationState={validationState}
            rules={rulesData}
            bundleJson={bundleJson}
            ruleAlignmentStats={ruleAlignmentStats}
            onNavigateToValidation={() => onModeChange?.(RightPanelMode.Validation)}
            onNavigateToRules={() => onTabChange?.('rules')}
            onTabChange={onTabChange}
          />
        );
      case 'rules':
        return (
          <RulesPanel
            rules={rulesData}
            onRulesChange={onRulesChange || (() => {})}
            onSave={onSaveRules}
            projectBundle={projectBundle}
            hl7Samples={hl7Samples}
            onNavigateToPath={onNavigateToPath}
            suggestions={ruleSuggestions}
            projectId={projectId!}
            features={projectFeatures}
            validationState={validationState}
          />
        );
      case 'codemaster':
        return (
          <CodeMasterEditor
            projectId={projectId!}
          />
        );
      case 'metadata':
        return (
          <RuleSetMetadata
            version="1.0"
            project={projectName}
            fhirVersion="R4"
            onVersionChange={() => {}}
            onProjectChange={() => {}}
            onFhirVersionChange={() => {}}
            onSave={() => {}}
            hasChanges={false}
          />
        );
      case 'settings':
        // Settings moved to Validation mode
        return null;
      default:
        return null;
    }
  };

  // Render Validation mode (L2 tabs: Run | Results | Settings)
  const renderValidationMode = () => {
    if (!projectId) return null;
    
    // Handle Settings tab under Validation mode
    if (activeTab === 'settings') {
      return (
        <div className="flex flex-col h-full overflow-y-auto">
          <ValidationSettingsEditor
            settings={validationSettings || DEFAULT_VALIDATION_SETTINGS}
            onSettingsChange={onValidationSettingsChange || (() => {})}
            onSave={onSaveValidationSettings || (() => {})}
            hasChanges={hasValidationSettingsChanges}
            isSaving={isSavingValidationSettings}
          />
          {/* Experimental Features Section - Hidden per requirements */}
        </div>
      );
    }
    
    // Run and Results tabs show ValidationPanel (it handles both)
    return (
      <ValidationPanel
        projectId={projectId}
        onSelectError={onSelectError}
        onNavigateToPath={onNavigateToPath}
        onSuggestionsReceived={onSuggestionsReceived}
        bundleJson={bundleJson}
        bundleChanged={bundleChanged}
        rulesChanged={rulesChanged}
      />
    );
  };

  // Render Observations mode (placeholder)
  const renderObservationsMode = () => {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Observations Mode</h3>
          <p className="text-sm text-gray-600">Coming soon...</p>
        </div>
      </div>
    );
  };

  /**
   * Render all panels simultaneously but hide inactive ones.
   * This preserves component state (filters, search, scroll) when switching modes.
   */
  return (
    <div
      className={`flex flex-col h-full transition-all duration-200 ${
        isDimmed ? 'opacity-40 pointer-events-none' : ''
      }`}
      onClick={onClearFocus}
    >
      {/* Rules Mode - Keep mounted to preserve filters and state */}
      <div
        className={`flex flex-col h-full ${
          currentMode === RightPanelMode.Rules ? '' : 'hidden'
        }`}
      >
        {renderRulesMode()}
      </div>

      {/* Validation Mode - Keep mounted to preserve validation results and filters */}
      <div
        className={`flex flex-col h-full ${
          currentMode === RightPanelMode.Validation ? '' : 'hidden'
        }`}
      >
        {renderValidationMode()}
      </div>

      {/* Observations Mode - Keep mounted when implemented */}
      <div
        className={`flex flex-col h-full ${
          currentMode === RightPanelMode.Observations ? '' : 'hidden'
        }`}
      >
        {renderObservationsMode()}
      </div>
    </div>
  );
};
