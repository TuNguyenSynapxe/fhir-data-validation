import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, AlertCircle, Download } from 'lucide-react';
import dayjs from 'dayjs';
import {
  useProject,
  useSaveBundle,
  useSaveRules,
  useSaveCodeMaster,
} from '../hooks/usePlayground';
import PlaygroundLayout from '../layouts/PlaygroundLayout';
import { BundleTabs } from '../components/playground/Bundle/BundleTabs';
import { RightPanelContainer } from '../components/common/RightPanelContainer';
import { RightPanelMode } from '../types/rightPanel';

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

  if (!projectId) {
    navigate('/');
    return null;
  }

  const { data: project, isLoading, error } = useProject(projectId);
  const saveBundleMutation = useSaveBundle(projectId);
  const saveRulesMutation = useSaveRules(projectId);
  const saveCodeMasterMutation = useSaveCodeMaster(projectId);


  const [bundleJson, setBundleJson] = useState('');
  const [codeMasterJson, setCodeMasterJson] = useState('');
  const [rules, setRules] = useState<Rule[]>([]);
  const [activeTab, setActiveTab] = useState<'rules' | 'codemaster' | 'metadata'>('rules');
  const [hl7Samples, setHl7Samples] = useState<FhirSampleMetadata[]>([]);
  const [ruleSuggestions, setRuleSuggestions] = useState<any[]>([]);
  
  // Right Panel Mode (default: Rules)
  const [rightPanelMode, setRightPanelMode] = useState<RightPanelMode>(RightPanelMode.Rules);
  
  // Track original values for change detection
  const [originalBundleJson, setOriginalBundleJson] = useState('');
  const [originalCodeMasterJson, setOriginalCodeMasterJson] = useState('');
  
  // Navigation state for Smart Path
  const [navigationFeedback, setNavigationFeedback] = useState<string | null>(null);
  const bundleTabsRef = useRef<{ switchToTreeView: () => void; navigateToPath: (path: string) => void }>(null);
  
  // TreeView focus state for context dimming
  const [treeViewFocused, setTreeViewFocused] = useState(false);
  const focusTimeoutRef = useRef<number | undefined>(undefined);

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

  // Parse rules JSON to extract rules array
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
      } catch {
        setRules([]);
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

  const handleRulesChange = (updatedRules: Rule[]) => {
    setRules(updatedRules);
  };
  
  /**
   * Handle validation start - switch to Validation mode
   */
  const handleValidationStart = () => {
    setRightPanelMode(RightPanelMode.Validation);
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex items-center gap-3 text-gray-600">
          <Loader2 size={24} className="animate-spin" />
          <span>Loading project...</span>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-red-800 font-medium mb-1">Error Loading Project</h3>
              <p className="text-red-700 text-sm">
                {error instanceof Error ? error.message : 'Failed to load project. Please try again.'}
              </p>
              <button
                onClick={() => navigate('/')}
                className="mt-4 inline-flex items-center gap-2 text-sm text-red-700 hover:text-red-900"
              >
                <ArrowLeft size={14} />
                Back to Projects
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Parse project bundle for drawer (read-only)
  let projectBundle: object | undefined;
  try {
    projectBundle = bundleJson ? JSON.parse(bundleJson) : undefined;
  } catch {
    projectBundle = undefined;
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
            <RightPanelContainer
              currentMode={rightPanelMode}
              onModeChange={setRightPanelMode}
              showModeTabs={true}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              rules={rules}
              onRulesChange={handleRulesChange}
              onSaveRules={handleSaveRules}
              hasRulesChanges={saveRulesMutation.isPending}
              projectBundle={projectBundle}
              hl7Samples={hl7Samples}
              ruleSuggestions={ruleSuggestions}
              codeMasterJson={codeMasterJson}
              onCodeMasterChange={setCodeMasterJson}
              onSaveCodeMaster={handleSaveCodeMaster}
              hasCodeMasterChanges={codeMasterJson !== originalCodeMasterJson}
              isSavingCodeMaster={saveCodeMasterMutation.isPending}
              projectName={project.name}
              projectId={projectId}
              onSelectError={(error) => {
                const jsonPointer = error.jsonPointer || error.navigation?.jsonPointer;
                if (jsonPointer) {
                  handleNavigateToPath(jsonPointer);
                }
              }}
              onSuggestionsReceived={setRuleSuggestions}
              onValidationStart={handleValidationStart}
              onNavigateToPath={handleNavigateToPath}
              isDimmed={treeViewFocused}
              onClearFocus={handleClearFocus}
            />
          }
        />
      </div>
    </div>
  );
}
