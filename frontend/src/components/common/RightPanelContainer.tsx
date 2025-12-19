import React from 'react';
import { RightPanelMode } from '../../types/rightPanel';
import { RightPanel } from './RightPanel';
import { ValidationContextBar } from './ValidationContextBar';
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
 * Right Panel Container Props (Grouped)
 * 
 * Props are grouped semantically to reduce prop explosion:
 * - mode: Mode/tab navigation
 * - rules: Rules management
 * - codemaster: CodeMaster editor
 * - settings: Validation settings
 * - metadata: Project metadata
 * - bundle: FHIR bundle data
 * - navigation: Navigation callbacks
 * - ui: UI state (dimming, focus)
 * - features: Feature flags
 * 
 * NOTE: Core validation props removed in Phase-3 (provided via ProjectValidationContext).
 * Only derived validation state props remain for ValidationContextBar.
 */
interface RightPanelContainerProps {
  mode: ModeControlProps;
  rules: RulesProps;
  codemaster: CodeMasterProps;
  settings: ValidationSettingsProps;
  metadata: MetadataProps;
  bundle: BundleProps;
  navigation: NavigationProps;
  ui: UIStateProps;
  features: FeatureFlagsProps;
  
  // Derived validation state for ValidationContextBar (computed in PlaygroundPage)
  validationState?: string;
  validationMetadata?: {
    errorCount?: number;
    warningCount?: number;
  };
}

/**
 * Right Panel Container with Mode and Tab Navigation
 * 
 * Shows mode tabs (Rules/Validation/Observations) at the top when showModeTabs is true.
 * Shows sub-tabs (rules/codemaster/metadata) when in Rules mode.
 */
export const RightPanelContainer: React.FC<RightPanelContainerProps> = ({
  mode,
  rules,
  codemaster,
  settings,
  metadata,
  bundle,
  navigation,
  ui,
  features,
  validationState,
  validationMetadata,
}) => {
  const { currentMode, onModeChange, showModeTabs = false, activeTab = 'overview', onTabChange } = mode;
  const showSubTabs = currentMode === RightPanelMode.Rules;

  return (
    <div className="flex flex-col h-full">
      {/* L1 Tabs - Top level navigation: Overview | Rules | Validation | Observations */}
      {showModeTabs && (
        <div className="flex border-b bg-gray-100 flex-shrink-0">
          <button
            onClick={() => {
              onModeChange?.(RightPanelMode.Rules);
              onTabChange?.('overview');
            }}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              currentMode === RightPanelMode.Rules && activeTab === 'overview'
                ? 'border-blue-600 text-blue-600 bg-white'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            📊 Overview
          </button>
          <button
            onClick={() => {
              onModeChange?.(RightPanelMode.Rules);
              onTabChange?.('rules');
            }}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              currentMode === RightPanelMode.Rules && activeTab !== 'overview'
                ? 'border-blue-600 text-blue-600 bg-white'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            📋 Rules
          </button>
          <button
            onClick={() => {
              onModeChange?.(RightPanelMode.Validation);
              onTabChange?.('run');
            }}
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

      {/* L2 Tabs - Rules mode: Rules | CodeMaster | Metadata */}
      {showSubTabs && activeTab !== 'overview' && (
        <div className="flex border-b bg-gray-50 flex-shrink-0">
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
        </div>
      )}

      {/* L2 Tabs - Validation mode: Run | Results | Settings */}
      {currentMode === RightPanelMode.Validation && (
        <div className="flex border-b bg-gray-50 flex-shrink-0">
          <button
            onClick={() => onTabChange?.('run')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'run' || !activeTab
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Run
          </button>
          <button
            onClick={() => onTabChange?.('results')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'results'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Results
          </button>
          <button
            onClick={() => onTabChange?.('settings')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'settings'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Settings
          </button>
        </div>
      )}

      {/* Validation Context Bar - Sticky status strip */}
      {validationState && (
        <ValidationContextBar
          fhirVersion="R4"
          bundleSource="Current"
          validationState={validationState}
          errorCount={validationMetadata?.errorCount}
          warningCount={validationMetadata?.warningCount}
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
          mode={mode}
          rules={rules}
          codemaster={codemaster}
          settings={settings}
          metadata={metadata}
          bundle={bundle}
          navigation={navigation}
          ui={ui}
          features={features}
          validationState={validationState}
          validationMetadata={validationMetadata}
        />
      </div>
    </div>
  );
};
