import React from 'react';
import { RightPanelMode } from '../../types/rightPanel';
import { RulesPanel } from '../playground/Rules/RulesPanel';
import { ValidationPanel } from '../playground/Validation/ValidationPanel';
import { CodeMasterEditor } from '../playground/CodeMaster/CodeMasterEditor';
import { RuleSetMetadata } from '../playground/Metadata/RuleSetMetadata';
import { ValidationSettingsEditor } from '../playground/Settings/ValidationSettingsEditor';
import { ExperimentalFeaturesSettings } from '../playground/Settings/ExperimentalFeaturesSettings';
import { OverviewPanel } from '../playground/Overview/OverviewPanel';
import { DEFAULT_VALIDATION_SETTINGS } from '../../types/validationSettings';

interface Rule {
  id: string;
  type: string;
  resourceType: string;
  path: string;
  severity: string;
  message: string;
  params?: Record<string, any>;
}

interface RightPanelProps {
  // Mode control
  currentMode: RightPanelMode;
  
  // Rules mode props
  activeTab?: 'overview' | 'rules' | 'codemaster' | 'metadata' | 'settings';
  onTabChange?: (tab: 'overview' | 'rules' | 'codemaster' | 'metadata' | 'settings') => void;
  validationResult?: any;
  onModeChange?: (mode: RightPanelMode) => void;
  ruleAlignmentStats?: {
    observed: number;
    notObserved: number;
    total: number;
  };
  validationMetadata?: {
    errorCount?: number;
    warningCount?: number;
  };
  rules?: Rule[];
  onRulesChange?: (rules: Rule[]) => void;
  onSaveRules?: () => void;
  hasRulesChanges?: boolean;
  projectBundle?: object;
  hl7Samples?: any[];
  ruleSuggestions?: any[];
  projectFeatures?: {
    treeRuleAuthoring?: boolean;
  };
  onFeaturesUpdated?: (features: { treeRuleAuthoring?: boolean }) => void;
  isAdmin?: boolean;
  
  // Validation Settings props
  validationSettings?: any;
  onValidationSettingsChange?: (settings: any) => void;
  onSaveValidationSettings?: () => void;
  hasValidationSettingsChanges?: boolean;
  isSavingValidationSettings?: boolean;
  
  // CodeMaster mode props
  codeMasterJson?: string;
  onCodeMasterChange?: (value: string) => void;
  onSaveCodeMaster?: () => void;
  hasCodeMasterChanges?: boolean;
  isSavingCodeMaster?: boolean;
  
  // Metadata mode props
  projectName?: string;
  
  // Validation mode props
  projectId?: string;
  onSelectError?: (error: any) => void;
  onSuggestionsReceived?: (suggestions: any[]) => void;
  onValidationStart?: () => void;
  onValidationComplete?: (result: any) => void;
  triggerValidation?: number; // Timestamp to trigger validation externally
  bundleJson?: string; // For ValidationState derivation
  bundleChanged?: boolean; // For ValidationState derivation
  rulesChanged?: boolean; // For ValidationState derivation
  validationState?: string; // Current ValidationState
  
  // Navigation
  onNavigateToPath?: (path: string) => void;
  
  // Context dimming
  isDimmed?: boolean;
  onClearFocus?: () => void;
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
  currentMode,
  activeTab = 'overview',
  onTabChange,
  onModeChange,
  validationResult,
  validationMetadata,
  ruleAlignmentStats,
  rules = [],
  onRulesChange,
  onSaveRules,
  hasRulesChanges = false,
  projectBundle,
  hl7Samples = [],
  ruleSuggestions = [],
  codeMasterJson = '',
  onCodeMasterChange,
  onSaveCodeMaster,
  hasCodeMasterChanges = false,
  isSavingCodeMaster = false,
  projectName = '',
  validationSettings,
  onValidationSettingsChange,
  onSaveValidationSettings,
  hasValidationSettingsChanges = false,
  isSavingValidationSettings = false,
  projectId,
  onSelectError,
  onSuggestionsReceived,
  onValidationStart,
  onValidationComplete,
  triggerValidation,
  onNavigateToPath,
  bundleJson,
  bundleChanged,
  rulesChanged,
  validationState,
  isDimmed = false,
  onClearFocus,
  projectFeatures,
  onFeaturesUpdated,
  isAdmin = true, // Default to true for now (no auth system)
}) => {
  // Render Rules mode (with tabs)
  const renderRulesMode = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <OverviewPanel
            validationState={validationState}
            validationMetadata={validationMetadata}
            validationResult={validationResult}
            rules={rules}
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
            rules={rules}
            onRulesChange={onRulesChange || (() => {})}
            onSave={onSaveRules || (() => {})}
            hasChanges={hasRulesChanges}
            projectBundle={projectBundle}
            hl7Samples={hl7Samples}
            onNavigateToPath={onNavigateToPath}
            suggestions={ruleSuggestions}
            projectId={projectId}
            features={projectFeatures}
            validationState={validationState}
          />
        );
      case 'codemaster':
        return (
          <CodeMasterEditor
            value={codeMasterJson}
            onChange={onCodeMasterChange || (() => {})}
            onSave={onSaveCodeMaster || (() => {})}
            hasChanges={hasCodeMasterChanges}
            isSaving={isSavingCodeMaster}
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
            onSave={onSaveRules || (() => {})}
            hasChanges={false}
          />
        );
      case 'settings':
        return (
          <div className="flex flex-col h-full overflow-y-auto">
            <ValidationSettingsEditor
              settings={validationSettings || DEFAULT_VALIDATION_SETTINGS}
              onSettingsChange={onValidationSettingsChange || (() => {})}
              onSave={onSaveValidationSettings || (() => {})}
              hasChanges={hasValidationSettingsChanges}
              isSaving={isSavingValidationSettings}
            />
            {/* Experimental Features Section - Admin Only */}
            {isAdmin && projectId && onFeaturesUpdated && (
              <div className="border-t border-gray-200">
                <ExperimentalFeaturesSettings
                  projectId={projectId}
                  features={projectFeatures || {}}
                  onFeaturesUpdated={onFeaturesUpdated}
                />
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  // Render Validation mode
  const renderValidationMode = () => {
    if (!projectId) return null;
    
    return (
      <ValidationPanel
        projectId={projectId}
        onSelectError={onSelectError}
        onNavigateToPath={onNavigateToPath}
        onSuggestionsReceived={onSuggestionsReceived}
        onValidationStart={onValidationStart}
        onValidationComplete={onValidationComplete}
        triggerValidation={triggerValidation}
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
