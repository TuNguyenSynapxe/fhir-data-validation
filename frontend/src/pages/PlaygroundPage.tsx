import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2, AlertCircle, Download } from 'lucide-react';
import dayjs from 'dayjs';
import {
  useProject,
  useSaveBundle,
  useSaveRules,
  useSaveCodeMaster,
  useSaveValidationSettings,
} from '../hooks/usePlayground';
import type { ValidationSettings } from '../types/validationSettings';
import { DEFAULT_VALIDATION_SETTINGS } from '../types/validationSettings';
import PlaygroundLayout from '../layouts/PlaygroundLayout';
import { BundleTabs } from '../components/playground/Bundle/BundleTabs';
import { RightPanelContainer } from '../components/common/RightPanelContainer';
import { RightPanelMode } from '../types/rightPanel';
import { useValidationState } from '../hooks/useValidationState';
import { ValidationState } from '../types/validationState';
import { useProjectValidation } from '../contexts/project-validation/useProjectValidation';
import { ProjectValidationProvider } from '../contexts/project-validation/ProjectValidationContext';

import type { FhirSampleMetadata } from '../types/fhirSample';

interface Rule {
  id: string;
  type: string;
  resourceType: string;
  path: string;
  severity: string;
  message: string;
  params?: Record<string, any>;
}

export default function PlaygroundPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: project, isLoading, error } = useProject(projectId!);
  const saveBundleMutation = useSaveBundle(projectId!);
  const saveRulesMutation = useSaveRules(projectId!);
  const saveCodeMasterMutation = useSaveCodeMaster(projectId!);
  const saveValidationSettingsMutation = useSaveValidationSettings(projectId!);

  // Project validation state (centralized)
  const projectValidation = useProjectValidation(projectId!);

  const [bundleJson, setBundleJson] = useState('');
  const [codeMasterJson, setCodeMasterJson] = useState('');
  const [validationSettings, setValidationSettings] = useState<ValidationSettings>(DEFAULT_VALIDATION_SETTINGS);
  const [rules, setRules] = useState<Rule[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'rules' | 'codemaster' | 'metadata' | 'settings' | 'run' | 'results'>('overview');
  const [hl7Samples, setHl7Samples] = useState<FhirSampleMetadata[]>([]);
  const [ruleSuggestions, setRuleSuggestions] = useState<any[]>([]);
  
  // Right Panel Mode (default: Rules)
  const [rightPanelMode, setRightPanelMode] = useState<RightPanelMode>(RightPanelMode.Rules);
  
  // Track original values for change detection
  const [originalBundleJson, setOriginalBundleJson] = useState('');
  const [originalCodeMasterJson, setOriginalCodeMasterJson] = useState('');
  const [originalValidationSettings, setOriginalValidationSettings] = useState<ValidationSettings>(DEFAULT_VALIDATION_SETTINGS);
  const [originalRulesJson, setOriginalRulesJson] = useState('');
  
  // Navigation state for Smart Path
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_navigationFeedback, setNavigationFeedback] = useState<string | null>(null);
  const bundleTabsRef = useRef<{ switchToTreeView: () => void; navigateToPath: (path: string) => void }>(null);
  
  // TreeView focus state for context dimming
  const [treeViewFocused, setTreeViewFocused] = useState(false);
  const focusTimeoutRef = useRef<number | undefined>(undefined);
  
  // Track if we've already auto-focused on validation failure
  const hasAutoFocusedRef = useRef(false);

  // Calculate rule alignment stats for Overview (simplified version without bundle analysis)
  // Full analysis happens in RulesPanel, this is just for Overview summary
  const ruleAlignmentStats = useMemo(() => {
    // This is a placeholder - actual calculation would require bundle analysis
    // For now, just return counts
    return {
      observed: 0,
      notObserved: 0,
      total: rules.length
    };
  }, [rules]);

  // Compute current rules JSON for change detection
  const currentRulesJson = useMemo(() => JSON.stringify({
    version: '1.0',
    fhirVersion: 'R4',
    rules: rules,
  }, null, 2), [rules]);
  
  // Change detection for ValidationState
  const bundleChanged = bundleJson !== originalBundleJson;
  const rulesChanged = currentRulesJson !== originalRulesJson;
  
  // Compute validation state (must be called unconditionally)
  // Uses centralized validation result from projectValidation hook
  const { state: validationState, metadata: validationMetadata } = useValidationState(
    bundleJson,
    projectValidation.result,
    bundleChanged,
    rulesChanged
  );

  // Auto-focus Validation mode when validation fails (only once per failure)
  useEffect(() => {
    if (validationState === ValidationState.Failed) {
      // Only auto-focus if we haven't already done so for this failure
      if (!hasAutoFocusedRef.current && rightPanelMode !== RightPanelMode.Validation) {
        setRightPanelMode(RightPanelMode.Validation);
        hasAutoFocusedRef.current = true;
      }
    } else {
      // Reset the flag when validation state changes away from Failed
      hasAutoFocusedRef.current = false;
    }
  }, [validationState, rightPanelMode]);

  // Load HL7 samples once on mount (read-only for drawer)
  useEffect(() => {
    const loadHl7Samples = async () => {
      try {
        const response = await fetch(`/api/fhir/samples?version=R4`);
        if (response.ok) {
          const samples: FhirSampleMetadata[] = await response.json();
          setHl7Samples(samples);
        }
      } catch (error) {
        console.error('Failed to load HL7 samples:', error);
      }
    };
    loadHl7Samples();
    
    // Cleanup focus timeout on unmount
    return () => {
      if (focusTimeoutRef.current) {
        clearTimeout(focusTimeoutRef.current);
      }
    };
  }, []);

  // Parse rules JSON to extract rules array and load settings
  useEffect(() => {
    if (project) {
      const bundle = project.sampleBundleJson || '{}';
      const codeMaster = project.codeMasterJson || '{}';
      
      setBundleJson(bundle);
      setOriginalBundleJson(bundle);
      
      setCodeMasterJson(codeMaster);
      setOriginalCodeMasterJson(codeMaster);

      // Parse rules JSON to get rules array
      try {
        const parsed = JSON.parse(project.rulesJson || '{}');
        setRules(parsed.rules || []);
        setOriginalRulesJson(project.rulesJson || '{}');
      } catch {
        setRules([]);
        setOriginalRulesJson('{}');
      }
      
      // Parse validation settings JSON
      try {
        const settingsJson = (project as any).validationSettingsJson;
        if (settingsJson) {
          const parsed = JSON.parse(settingsJson);
          setValidationSettings(parsed);
          setOriginalValidationSettings(parsed);
        } else {
          setValidationSettings(DEFAULT_VALIDATION_SETTINGS);
          setOriginalValidationSettings(DEFAULT_VALIDATION_SETTINGS);
        }
      } catch {
        setValidationSettings(DEFAULT_VALIDATION_SETTINGS);
        setOriginalValidationSettings(DEFAULT_VALIDATION_SETTINGS);
      }
    }
  }, [project]);

  const handleSaveBundle = async () => {
    try {
      await saveBundleMutation.mutateAsync(bundleJson);
      setOriginalBundleJson(bundleJson);
    } catch (error) {
      console.error('Failed to save bundle:', error);
    }
  };

  const handleSaveRules = async () => {
    try {
      // Reconstruct the full rules JSON with metadata
      const rulesObject = {
        version: '1.0',
        fhirVersion: 'R4',
        rules: rules,
      };
      const rulesJsonString = JSON.stringify(rulesObject, null, 2);
      await saveRulesMutation.mutateAsync(rulesJsonString);
      setOriginalRulesJson(rulesJsonString);
    } catch (error) {
      console.error('Failed to save rules:', error);
    }
  };
  const handleSaveCodeMaster = async () => {
    try {
      await saveCodeMasterMutation.mutateAsync(codeMasterJson);
      setOriginalCodeMasterJson(codeMasterJson);
    } catch (error) {
      console.error('Failed to save code master:', error);
    }
  };
  
  const handleSaveValidationSettings = async () => {
    try {
      const settingsJson = JSON.stringify(validationSettings, null, 2);
      await saveValidationSettingsMutation.mutateAsync(settingsJson);
      setOriginalValidationSettings(validationSettings);
    } catch (error) {
      console.error('Failed to save validation settings:', error);
    }
  };

  const handleRulesChange = (updatedRules: Rule[]) => {
    setRules(updatedRules);
  };
  
  /**
   * Handle click on dimmed panels to clear focus mode
   */
  const handleClearFocus = () => {
    if (treeViewFocused) {
      setTreeViewFocused(false);
      if (focusTimeoutRef.current) {
        clearTimeout(focusTimeoutRef.current);
      }
    }
  };

  /**
   * Handle Smart Path navigation from validation errors
   * @param jsonPointer - JSON Pointer path like "/entry/0/resource/extension/0/valueCodeableConcept"
   */
  const handleNavigateToPath = (jsonPointer: string) => {
    try {
      if (!jsonPointer) {
        setNavigationFeedback('No navigation path available for this error');
        setTimeout(() => setNavigationFeedback(null), 5000);
        return;
      }

      // Switch to tree view and navigate directly using the jsonPointer
      bundleTabsRef.current?.switchToTreeView();
      bundleTabsRef.current?.navigateToPath(jsonPointer);
      
      // Activate TreeView focus mode
      setTreeViewFocused(true);
      
      // Clear any previous timeout
      if (focusTimeoutRef.current) {
        clearTimeout(focusTimeoutRef.current);
      }
      
      // Auto-clear focus after 0.5 seconds
      focusTimeoutRef.current = setTimeout(() => {
        setTreeViewFocused(false);
      }, 500);
      
      // Clear any previous feedback
      setNavigationFeedback(null);
    } catch (error) {
      console.error('Navigation error:', error);
      setNavigationFeedback('Failed to navigate to field');
      setTimeout(() => setNavigationFeedback(null), 5000);
    }
  };

  const handleExportRules = () => {
    const rulesObject = {
      version: '1.0',
      fhirVersion: 'R4',
      rules: rules,
    };
    const blob = new Blob([JSON.stringify(rulesObject, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project?.name || 'rules'}_rules.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFeaturesUpdated = (features: { treeRuleAuthoring?: boolean }) => {
    // Update the React Query cache with the new features
    queryClient.setQueryData(['project', projectId], (oldProject: any) => {
      if (!oldProject) return oldProject;
      return {
        ...oldProject,
        features: features,
      };
    });
  };

  // Parse project bundle for drawer (read-only)
  let projectBundle: object | undefined;
  try {
    projectBundle = bundleJson ? JSON.parse(bundleJson) : undefined;
  } catch {
    projectBundle = undefined;
  }

  // Early return checks after all hooks
  if (!projectId) {
    navigate('/');
    return null;
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-sm text-gray-600">Loading project...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !project) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3 text-center">
          <AlertCircle className="w-12 h-12 text-red-500" />
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Failed to load project</h2>
            <p className="text-sm text-gray-600 mt-1">
              {error ? String(error) : 'Project not found'}
            </p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Back to Projects
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Project Header */}
      <header className="bg-white border-b shadow-sm flex-shrink-0">
        <div className="px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="text-gray-600 hover:text-gray-900 transition-colors"
              title="Back to Projects"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">{project.name}</h1>
              <p className="text-xs text-gray-500">
                Created {dayjs(project.createdAt).format('MMM D, YYYY')}
              </p>
            </div>
          </div>
          <button
            onClick={handleExportRules}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors"
          >
            <Download className="w-4 h-4" />
            Export Rules
          </button>
        </div>
      </header>

      {/* IDE-Style Playground Layout */}
      <div className="flex-1 overflow-hidden">
        <PlaygroundLayout
          bundleContent={
            <div className={`h-full transition-all duration-200 ${
              treeViewFocused ? 'ring-2 ring-blue-400 ring-opacity-50 shadow-lg' : ''
            }`}>
              <BundleTabs
                ref={bundleTabsRef}
                bundleJson={bundleJson}
                onBundleChange={setBundleJson}
                onSave={handleSaveBundle}
                hasChanges={bundleJson !== originalBundleJson}
                isSaving={saveBundleMutation.isPending}
              />
            </div>
          }
          rulesContent={
            <ProjectValidationProvider
              validationResult={projectValidation.result}
              isValidating={projectValidation.isValidating}
              validationError={projectValidation.error}
              runValidation={projectValidation.runValidation}
              clearValidationError={projectValidation.clearError}
            >
              <RightPanelContainer
                mode={{
                  currentMode: rightPanelMode,
                  onModeChange: setRightPanelMode,
                  showModeTabs: true,
                  activeTab: activeTab,
                  onTabChange: setActiveTab,
                }}
                rules={{
                  rules: rules,
                  onRulesChange: handleRulesChange,
                  onSaveRules: handleSaveRules,
                  hasRulesChanges: saveRulesMutation.isPending,
                  ruleAlignmentStats: ruleAlignmentStats,
                  ruleSuggestions: ruleSuggestions,
                }}
                codemaster={{
                  codeMasterJson: codeMasterJson,
                  onCodeMasterChange: setCodeMasterJson,
                  onSaveCodeMaster: handleSaveCodeMaster,
                  hasCodeMasterChanges: codeMasterJson !== originalCodeMasterJson,
                  isSavingCodeMaster: saveCodeMasterMutation.isPending,
                }}
                settings={{
                  validationSettings: validationSettings,
                  onValidationSettingsChange: setValidationSettings,
                  onSaveValidationSettings: handleSaveValidationSettings,
                  hasValidationSettingsChanges: JSON.stringify(validationSettings) !== JSON.stringify(originalValidationSettings),
                  isSavingValidationSettings: saveValidationSettingsMutation.isPending,
                }}
                metadata={{
                  projectName: project.name,
                }}
                bundle={{
                  projectBundle: projectBundle,
                  bundleJson: bundleJson,
                  bundleChanged: bundleChanged,
                  rulesChanged: rulesChanged,
                  hl7Samples: hl7Samples,
                }}
                navigation={{
                  projectId: projectId!,
                  onNavigateToPath: handleNavigateToPath,
                  onSelectError: (error) => {
                    const jsonPointer = error.jsonPointer || error.navigation?.jsonPointer;
                    if (jsonPointer) {
                      handleNavigateToPath(jsonPointer);
                    }
                  },
                  onSuggestionsReceived: setRuleSuggestions,
                }}
                ui={{
                  isDimmed: treeViewFocused,
                  onClearFocus: handleClearFocus,
                }}
                features={{
                  projectFeatures: project.features,
                  onFeaturesUpdated: handleFeaturesUpdated,
                  isAdmin: true,
                }}
                validationState={validationState}
                validationMetadata={validationMetadata}
              />
            </ProjectValidationProvider>
          }
        />
      </div>
    </div>
  );
}
