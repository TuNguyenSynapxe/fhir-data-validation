import React from 'react';
import { RightPanelMode } from '../../types/rightPanel';
import { RightPanel } from './RightPanel';
import { ValidationContextBar } from './ValidationContextBar';

interface Rule {
  id: string;
  type: string;
  resourceType: string;
  path: string;
  severity: string;
  message: string;
  params?: Record<string, any>;
}

interface RightPanelContainerProps {
  // Mode control
  currentMode: RightPanelMode;
  onModeChange?: (mode: RightPanelMode) => void;
  showModeTabs?: boolean; // Control whether to show mode tabs
  
  // Rules mode props
  activeTab?: 'overview' | 'rules' | 'codemaster' | 'metadata' | 'settings';
  onTabChange?: (tab: 'overview' | 'rules' | 'codemaster' | 'metadata' | 'settings') => void;
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
  onTriggerValidation?: () => void; // Callback to request validation trigger
  bundleJson?: string; // For ValidationState derivation
  bundleChanged?: boolean; // For ValidationState derivation
  rulesChanged?: boolean; // For ValidationState derivation
  validationState?: string; // Current ValidationState
  validationMetadata?: {
    errorCount?: number;
    warningCount?: number;
  };
  validationResult?: any; // Full validation result
  ruleAlignmentStats?: {
    observed: number;
    notObserved: number;
    total: number;
  };
  
  // Navigation
  onNavigateToPath?: (path: string) => void;
  
  // Context dimming
  isDimmed?: boolean;
  onClearFocus?: () => void;
}

/**
 * Right Panel Container with Mode and Tab Navigation
 * 
 * Shows mode tabs (Rules/Validation/Observations) at the top when showModeTabs is true.
 * Shows sub-tabs (rules/codemaster/metadata) when in Rules mode.
 */
export const RightPanelContainer: React.FC<RightPanelContainerProps> = ({
  currentMode,
  onModeChange,
  showModeTabs = false,
  activeTab = 'overview',
  onTabChange,
  ...rightPanelProps
}) => {
  const showSubTabs = currentMode === RightPanelMode.Rules;

  return (
    <div className="flex flex-col h-full">
      {/* Mode Tabs - Top level navigation between Rules/Validation/Observations */}
      {showModeTabs && (
        <div className="flex border-b bg-gray-100 flex-shrink-0">
          <button
            onClick={() => onModeChange?.(RightPanelMode.Rules)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              currentMode === RightPanelMode.Rules
                ? 'border-blue-600 text-blue-600 bg-white'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            📋 Rules
          </button>
          <button
            onClick={() => onModeChange?.(RightPanelMode.Validation)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              currentMode === RightPanelMode.Validation
                ? 'border-blue-600 text-blue-600 bg-white'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            ✓ Validation
          </button>
          <button
            disabled
            className="px-4 py-2.5 text-sm font-medium border-b-2 border-transparent text-gray-400 cursor-not-allowed"
            title="Coming Soon"
          >
            👁 Observations <span className="text-xs">(Soon)</span>
          </button>
        </div>
      )}

      {/* Sub-Tabs - Only visible in Rules mode */}
      {showSubTabs && (
        <div className="flex border-b bg-gray-50 flex-shrink-0">
          <button
            onClick={() => onTabChange?.('overview')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => onTabChange?.('rules')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'rules'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Rules
          </button>
          <button
            onClick={() => onTabChange?.('codemaster')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'codemaster'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            CodeMaster
          </button>
          <button
            onClick={() => onTabChange?.('metadata')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'metadata'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Metadata
          </button>
          <button
            onClick={() => onTabChange?.('settings')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'settings'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Validation Settings
          </button>
        </div>
      )}

      {/* Validation Context Bar - Sticky status strip */}
      {rightPanelProps.validationState && (
        <ValidationContextBar
          fhirVersion="R4"
          bundleSource="Current"
          validationState={rightPanelProps.validationState}
          errorCount={rightPanelProps.validationMetadata?.errorCount}
          warningCount={rightPanelProps.validationMetadata?.warningCount}
          onRunValidation={() => {
            // Switch to Validation mode and trigger validation
            if (currentMode !== RightPanelMode.Validation) {
              onModeChange?.(RightPanelMode.Validation);
            }
            // Trigger validation through callback
            rightPanelProps.onTriggerValidation?.();
          }}
          onViewErrors={() => {
            // Switch to Validation mode to view errors
            if (currentMode !== RightPanelMode.Validation) {
              onModeChange?.(RightPanelMode.Validation);
            }
          }}
        />
      )}

      {/* Panel Content */}
      <div className="flex-1 overflow-hidden">
        <RightPanel
          currentMode={currentMode}
          activeTab={activeTab}
          onTabChange={onTabChange}
          onModeChange={onModeChange}
          {...rightPanelProps}
        />
      </div>
    </div>
  );
};
