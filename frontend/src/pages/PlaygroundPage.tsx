import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
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
import { useProjectValidation } from '../contexts/project-validation/useProjectValidation';
import { ProjectValidationProvider } from '../contexts/project-validation/ProjectValidationContext';
import { resolveNavigationTarget } from '../utils/navigationFallback'; // Phase 8: Navigation Fallback
import { GovernanceModal } from '../components/governance';
import type { RuleReviewFinding, RuleReviewStatus } from '../types/governance';
import type { Rule } from '../types/rightPanelProps';

import type { FhirSampleMetadata } from '../types/fhirSample';

export default function PlaygroundPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
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
  const [activeTab, setActiveTab] = useState<'overview' | 'rules' | 'codemaster' | 'codesystems' | 'questionsets' | 'metadata' | 'settings' | 'run' | 'results' | 'bundle'>('overview');
  const [bundleView, setBundleView] = useState<'tree' | 'json'>('tree'); // Bundle tab view (Tree View or JSON Editor)
  const [hl7Samples, setHl7Samples] = useState<FhirSampleMetadata[]>([]);
  const [ruleSuggestions, setRuleSuggestions] = useState<any[]>([]);
  
  // Right Panel Mode (default: Rules)
  const [rightPanelMode, setRightPanelMode] = useState<RightPanelMode>(RightPanelMode.Rules);
  
  // Bundle drawer state (collapsed by default on mobile, visible on desktop)
  const [isBundleOpen, setIsBundleOpen] = useState(false);
  
  // Bundle collapse state (desktop split mode only)
  const [isBundleCollapsed, setIsBundleCollapsed] = useState(false);
  
  // Track original values for change detection
  const [originalBundleJson, setOriginalBundleJson] = useState('');
  const [originalCodeMasterJson, setOriginalCodeMasterJson] = useState('');
  const [originalValidationSettings, setOriginalValidationSettings] = useState<ValidationSettings>(DEFAULT_VALIDATION_SETTINGS);
  const [originalRulesJson, setOriginalRulesJson] = useState('');
  
  // Phase 8: Governance modal state
  const [governanceModalOpen, setGovernanceModalOpen] = useState(false);
  const [governanceStatus, setGovernanceStatus] = useState<RuleReviewStatus>('OK');
  const [governanceFindings, setGovernanceFindings] = useState<RuleReviewFinding[]>([]);
  
  // Track if we're syncing from URL to prevent circular updates
  const isSyncingFromURL = useRef(false);
  
  // Sync URL params with tab state (runs on mount and URL changes)
  useEffect(() => {
    isSyncingFromURL.current = true;
    
    // Parse the current pathname to extract tab info
    // Format: /projects/:projectId/[l1]/[l2]
    const pathParts = location.pathname.split('/').filter(Boolean);
    // pathParts = ['projects', projectId, l1, l2]
    
    // Redirect to overview if no tab specified
    if (pathParts.length < 3) {
      navigate(`/projects/${projectId}/overview`, { replace: true });
      isSyncingFromURL.current = false;
      return;
    }
    
    const l1 = pathParts[2]; // First tab level (after 'projects' and projectId)
    const l2 = pathParts[3]; // Second tab level (optional)
    
    // L1: Bundle
    if (l1 === 'bundle') {
      setActiveTab('bundle');
      if (l2 === 'tree' || l2 === 'json') {
        setBundleView(l2);
      } else {
        // Default to tree if no view specified
        navigate(`/projects/${projectId}/bundle/tree`, { replace: true });
      }
    }
    // L1: Rules
    else if (l1 === 'rules') {
      if (l2 === 'list') {
        setActiveTab('rules');
      } else if (l2 === 'terminology') {
        // Check for L3 sub-tab: codesystems or questionsets
        const l3 = pathParts[4];
        if (l3 === 'questionsets') {
          setActiveTab('questionsets');
        } else if (l3 === 'codesystems') {
          setActiveTab('codesystems');
        } else {
          // Default to codesystems if terminology selected without sub-tab
          setActiveTab('codesystems');
          navigate(`/projects/${projectId}/rules/terminology/codesystems`, { replace: true });
        }
      } else if (l2 === 'metadata') {
        setActiveTab('metadata');
      } else {
        // Default to list if no sub-tab specified
        navigate(`/projects/${projectId}/rules/list`, { replace: true });
      }
    }
    // L1: Validation
    else if (l1 === 'validation') {
      if (l2 === 'run') {
        setActiveTab('run');
        setRightPanelMode(RightPanelMode.Validation);
      } else if (l2 === 'settings') {
        setActiveTab('settings');
        setRightPanelMode(RightPanelMode.Validation);
      } else {
        // Default to run if no sub-tab specified
        navigate(`/projects/${projectId}/validation/run`, { replace: true });
      }
    }
    // L1: Overview
    else if (l1 === 'overview') {
      setActiveTab('overview');
      setRightPanelMode(RightPanelMode.Rules);
    } else {
      // Invalid tab, redirect to overview
      navigate(`/projects/${projectId}/overview`, { replace: true });
    }
    
    // Small delay to ensure state updates complete before allowing navigation
    setTimeout(() => {
      isSyncingFromURL.current = false;
    }, 100);
  }, [location.pathname, navigate, projectId]);
  
  // Navigation state for Smart Path
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_navigationFeedback, setNavigationFeedback] = useState<string | null>(null);
  const bundleTabsRef = useRef<{ switchToTreeView: () => void; navigateToPath: (path: string, expectedChildKey?: string) => void }>(null); // Phase 7.1: Updated signature
  
  // TreeView focus state for context dimming
  const [treeViewFocused, setTreeViewFocused] = useState(false);
  const focusTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

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
  
  // Navigation helpers for tab changes
  const handleTabChange = useCallback((tab: string) => {
    // Prevent navigation during URL sync
    if (isSyncingFromURL.current) return;
    
    setActiveTab(tab as any);
    
    // Map internal tab names to URL paths
    const tabToPath: Record<string, string> = {
      'overview': 'overview',
      'bundle': 'bundle/tree',
      'rules': 'rules/list',
      'codemaster': 'rules/terminology/codesystems', // Legacy support
      'codesystems': 'rules/terminology/codesystems',
      'questionsets': 'rules/terminology/questionsets',
      'metadata': 'rules/metadata',
      'run': 'validation/run',
      'settings': 'validation/settings',
    };
    
    const path = tabToPath[tab] || 'overview';
    navigate(`/projects/${projectId}/${path}`, { replace: true });
  }, [projectId, navigate]);
  
  const handleBundleViewChange = useCallback((view: 'tree' | 'json') => {
    // Prevent navigation during URL sync
    if (isSyncingFromURL.current) return;
    
    setBundleView(view);
    navigate(`/projects/${projectId}/bundle/${view}`, { replace: true });
  }, [projectId, navigate]);

  /**
   * Check Bundle structural sanity
   * Used to gate rule authoring workflow
   */
  const checkBundleSanity = useCallback((json: string): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    // 1. Check JSON parses
    let parsed: any;
    try {
      parsed = JSON.parse(json);
    } catch (e) {
      errors.push('JSON does not parse successfully');
      return { isValid: false, errors };
    }

    // 2. Check root resourceType
    if (parsed.resourceType !== 'Bundle') {
      errors.push('Root resourceType must be "Bundle"');
    }

    // 3. Check entry exists and is array
    if (!parsed.entry) {
      errors.push('Bundle must have an "entry" property');
    } else if (!Array.isArray(parsed.entry)) {
      errors.push('Bundle entry must be an array');
    } else {
      // 4. Check entry.length > 0
      if (parsed.entry.length === 0) {
        errors.push('Bundle entry array must contain at least one entry');
      } else {
        // 5. Check each entry has resource.resourceType
        parsed.entry.forEach((entry: any, index: number) => {
          if (!entry.resource) {
            errors.push(`Entry[${index}] is missing "resource" property`);
          } else if (!entry.resource.resourceType) {
            errors.push(`Entry[${index}].resource is missing "resourceType" property`);
          }
        });
      }
    }

    return { isValid: errors.length === 0, errors };
  }, []);

  // Compute bundle sanity state from SAVED bundle (not current edited value)
  // This gates rule authoring workflow
  const bundleSanityState = useMemo(() => {
    return checkBundleSanity(originalBundleJson);
  }, [originalBundleJson, checkBundleSanity]);

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
      // Normalize bundle JSON by parsing and re-stringifying to fix any double-escaped characters
      let bundle = project.sampleBundleJson || '{}';
      try {
        // Parse and re-stringify to normalize escape sequences
        const parsed = JSON.parse(bundle);
        bundle = JSON.stringify(parsed, null, 2);
      } catch {
        // If parsing fails, use as-is
      }
      
      const codeMaster = project.codeMasterJson || '{}';
      
      setBundleJson(bundle);
      setOriginalBundleJson(bundle);
      
      setCodeMasterJson(codeMaster);
      setOriginalCodeMasterJson(codeMaster);

      // Parse rules JSON to get rules array
      try {
        const parsed = JSON.parse(project.rulesJson || '{}');
        const loadedRules = parsed.rules || [];
        
        // MIGRATION: Add default errorCode to rules that don't have one (backward compatibility)
        const migratedRules = loadedRules.map((rule: Rule) => ({
          ...rule,
          errorCode: rule.errorCode || rule.message || 'LEGACY_RULE', // Use message or generic code
        }));
        
        console.log('[PlaygroundPage:Init] Loaded rules from project:', migratedRules.length, 'rules');
        console.log('[PlaygroundPage:Init] Rules:', migratedRules.map((r: any) => ({ id: r.id, path: r.path, type: r.type })));
        setRules(migratedRules);
        setOriginalRulesJson(project.rulesJson || '{}');
      } catch (error) {
        console.error('[PlaygroundPage:Init] Failed to parse rules JSON:', error);
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
      // MIGRATION: Ensure all rules have errorCode before saving
      const migratedRules = rules.map(rule => ({
        ...rule,
        errorCode: rule.errorCode || rule.message || 'LEGACY_RULE',
      }));
      
      // Reconstruct the full rules JSON with metadata
      const rulesObject = {
        version: '1.0',
        fhirVersion: 'R4',
        rules: migratedRules,
      };
      const rulesJsonString = JSON.stringify(rulesObject, null, 2);
      
      // Phase 8: Call backend with governance enforcement
      const response = await saveRulesMutation.mutateAsync(rulesJsonString);
      
      // Handle governance response
      if (response.status === 'BLOCKED') {
        // BLOCKED: Cannot save, show modal with no confirmation option
        setGovernanceStatus('BLOCKED');
        setGovernanceFindings(response.findings);
        setGovernanceModalOpen(true);
        return; // Do not update originalRulesJson
      } else if (response.status === 'WARNING') {
        // WARNING: Saved successfully, show modal with findings
        setGovernanceStatus('WARNING');
        setGovernanceFindings(response.findings);
        setGovernanceModalOpen(true);
      }
      // OK or WARNING: Save succeeded
      setOriginalRulesJson(rulesJsonString);
    } catch (error: any) {
      // Handle BLOCKED error from backend (400 response)
      if (error.response?.status === 400 && error.response?.data?.status === 'BLOCKED') {
        setGovernanceStatus('BLOCKED');
        setGovernanceFindings(error.response.data.findings || []);
        setGovernanceModalOpen(true);
      } else {
        console.error('Failed to save rules:', error);
      }
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
    console.log('[PlaygroundPage:handleRulesChange] Rules updated, count:', updatedRules.length);
    console.log('[PlaygroundPage:handleRulesChange] Rules:', updatedRules.map(r => ({ 
      id: r.id, 
      path: r.path, 
      type: r.type,
      saveState: r.saveState 
    })));
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
   * Phase 8: Handle Smart Path navigation from validation errors with fallback support
   * Supports ghost nodes for missing fields and parent highlighting.
   * 
   * @param jsonPointerOrError - JSON Pointer string OR ValidationError object
   * @param fhirPath - Optional FHIRPath for fallback (if jsonPointer is null)
   */
  const handleNavigateToPath = (jsonPointerOrError: string | { jsonPointer?: string; path?: string }, fhirPath?: string) => {
    // Auto-open bundle and ensure it's not collapsed
    setIsBundleOpen(true);
    setIsBundleCollapsed(false);
    
    try {
      // Extract jsonPointer and fhirPath from error object or use direct string
      const jsonPointer = typeof jsonPointerOrError === 'string' 
        ? jsonPointerOrError 
        : (jsonPointerOrError.jsonPointer || null);
      
      const errorFhirPath = typeof jsonPointerOrError === 'object' 
        ? jsonPointerOrError.path 
        : fhirPath;
      
      // Phase 8: Use navigation fallback resolver
      const navTarget = resolveNavigationTarget(bundleJson, errorFhirPath || '', jsonPointer);
      
      if (!navTarget || navTarget.targetPointer === null) {
        setNavigationFeedback('No navigation path available for this error');
        setTimeout(() => setNavigationFeedback(null), 5000);
        return;
      }

      // Get missing segments for ghost node rendering
      const missingSegments = navTarget.missingSegments;
      const targetPointer = navTarget.targetPointer;
      
      // Switch to tree view and navigate
      setBundleView('tree');
      bundleTabsRef.current?.switchToTreeView();
      
      if (missingSegments.length > 0) {
        // Navigate to parent + show first missing segment as ghost child
        bundleTabsRef.current?.navigateToPath(
          targetPointer,
          missingSegments[0] // Show first missing segment as expected child
        );
        
        setNavigationFeedback(
          navTarget.fallbackReason || 
          `Field '${missingSegments[0]}' is missing. Showing parent node.`
        );
      } else {
        // Navigate directly to exact target
        bundleTabsRef.current?.navigateToPath(targetPointer);
      }
      
      setTimeout(() => setNavigationFeedback(null), 3000);
      
      // Activate TreeView focus mode with highlight
      setTreeViewFocused(true);
      
      // Clear any previous timeout
      if (focusTimeoutRef.current) {
        clearTimeout(focusTimeoutRef.current);
      }
      
      // Auto-clear focus after 0.5 seconds
      focusTimeoutRef.current = setTimeout(() => {
        setTreeViewFocused(false);
      }, 500);
      
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
          isBundleOpen={isBundleOpen}
          onBundleToggle={() => setIsBundleOpen(!isBundleOpen)}
          isBundleCollapsed={isBundleCollapsed}
          onBundleCollapse={() => setIsBundleCollapsed(!isBundleCollapsed)}
          currentMode={rightPanelMode}
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
                hideUploadButton={rightPanelMode === RightPanelMode.Validation}
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
                  onTabChange: handleTabChange,
                }}
                rules={{
                  rules: rules,
                  onRulesChange: handleRulesChange,
                  onSaveRules: handleSaveRules,
                  hasRulesChanges: saveRulesMutation.isPending,
                  ruleAlignmentStats: ruleAlignmentStats,
                  ruleSuggestions: ruleSuggestions,
                  bundleSanityState: bundleSanityState,
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
                    // Phase 8: Always attempt navigation if path exists (fallback resolver handles missing jsonPointer)
                    if (error.path || error.jsonPointer) {
                      handleNavigateToPath(error, error.path);
                    }
                  },
                  onSuggestionsReceived: setRuleSuggestions,
                  isBundleOpen,
                  onBundleToggle: () => setIsBundleOpen(!isBundleOpen),
                  onOpenBundleTab: () => handleTabChange('bundle'),
                  bundleTabsContent: (
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
                        activeTab={bundleView}
                        onTabChange={handleBundleViewChange}
                        hideUploadButton={rightPanelMode === RightPanelMode.Validation}
                      />
                    </div>
                  ),
                  bundleView,
                  onBundleViewChange: handleBundleViewChange,
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
        
        {/* Phase 8: Governance enforcement modal */}
        <GovernanceModal
          isOpen={governanceModalOpen}
          status={governanceStatus}
          findings={governanceFindings}
          onClose={() => setGovernanceModalOpen(false)}
        />
      </div>
    </div>
  );
}
