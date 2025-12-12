import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, AlertCircle, Download } from 'lucide-react';
import dayjs from 'dayjs';
import {
  useProject,
  useSaveBundle,
  useSaveRules,
  useSaveCodeMaster,
  useValidateProject,
} from '../hooks/usePlayground';
import PlaygroundLayout from '../layouts/PlaygroundLayout';
import { BundleTabs } from '../components/playground/Bundle/BundleTabs';
import { RuleBuilder } from '../components/playground/Rules/RuleBuilder';
import { CodeMasterEditor } from '../components/playground/CodeMaster/CodeMasterEditor';
import { RuleSetMetadata } from '../components/playground/Metadata/RuleSetMetadata';
import { ValidationPanel } from '../components/playground/Validation/ValidationPanel';
import type { ValidationResult } from '../types/validation';
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
  const validateMutation = useValidateProject(projectId);

  const [bundleJson, setBundleJson] = useState('');
  const [rulesJson, setRulesJson] = useState('');
  const [codeMasterJson, setCodeMasterJson] = useState('');
  const [rules, setRules] = useState<Rule[]>([]);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [activeTab, setActiveTab] = useState<'rules' | 'codemaster' | 'metadata'>('rules');
  const [hl7Samples, setHl7Samples] = useState<FhirSampleMetadata[]>([]);

  // Load HL7 samples once on mount (read-only for drawer)
  useEffect(() => {
    const loadHl7Samples = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const response = await fetch(`${apiUrl}/api/fhir/samples?version=R4`);
        if (response.ok) {
          const samples: FhirSampleMetadata[] = await response.json();
          setHl7Samples(samples);
        }
      } catch (error) {
        console.error('Failed to load HL7 samples:', error);
      }
    };
    loadHl7Samples();
  }, []);

  // Parse rules JSON to extract rules array
  useEffect(() => {
    if (project) {
      setBundleJson(project.sampleBundleJson || '{}');
      setRulesJson(project.rulesJson || '{}');
      setCodeMasterJson(project.codeMasterJson || '{}');

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
    } catch (error) {
      console.error('Failed to save bundle:', error);
    }
  };

  const handleSaveRules = async () => {
    try {
      // Reconstruct the full rules JSON with metadata
      const rulesObject = {
        version: '1.0',
        fhirVersion: project?.fhirVersion || 'R4',
        rules: rules,
      };
      const rulesJsonString = JSON.stringify(rulesObject, null, 2);
      await saveRulesMutation.mutateAsync(rulesJsonString);
      setRulesJson(rulesJsonString);
    } catch (error) {
      console.error('Failed to save rules:', error);
    }
  };

  const handleSaveCodeMaster = async () => {
    try {
      await saveCodeMasterMutation.mutateAsync(codeMasterJson);
    } catch (error) {
      console.error('Failed to save code master:', error);
    }
  };

  const handleRunValidation = async () => {
    try {
      const result = await validateMutation.mutateAsync();
      setValidationResult(result);
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handleRulesChange = (updatedRules: Rule[]) => {
    setRules(updatedRules);
  };

  const handleExportRules = () => {
    const rulesObject = {
      version: '1.0',
      fhirVersion: project?.fhirVersion || 'R4',
      rules: rules,
    };
    const blob = new Blob([JSON.stringify(rulesObject, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project?.name || 'rules'}-export.json`;
    a.click();
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

  const renderRightPanel = () => {
    // Parse project bundle for drawer (read-only)
    let projectBundle: object | undefined;
    try {
      projectBundle = bundleJson ? JSON.parse(bundleJson) : undefined;
    } catch {
      projectBundle = undefined;
    }

    switch (activeTab) {
      case 'rules':
        return (
          <RuleBuilder
            rules={rules}
            onRulesChange={handleRulesChange}
            onSave={handleSaveRules}
            hasChanges={saveRulesMutation.isPending}
            projectBundle={projectBundle}
            hl7Samples={hl7Samples}
          />
        );
      case 'codemaster':
        return (
          <CodeMasterEditor
            value={codeMasterJson}
            onChange={setCodeMasterJson}
            onSave={handleSaveCodeMaster}
            hasChanges={false}
            isSaving={saveCodeMasterMutation.isPending}
          />
        );
      case 'metadata':
        return (
          <RuleSetMetadata
            version="1.0"
            project={project.name}
            fhirVersion={project.fhirVersion}
            onVersionChange={() => {}}
            onProjectChange={() => {}}
            onFhirVersionChange={() => {}}
            onSave={handleSaveRules}
            hasChanges={false}
          />
        );
    }
  };

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
            <BundleTabs
              bundleJson={bundleJson}
              onBundleChange={setBundleJson}
              onSave={handleSaveBundle}
              hasChanges={false}
              isSaving={saveBundleMutation.isPending}
            />
          }
          rulesContent={
            <div className="flex flex-col h-full">
              {/* Tab Navigation */}
              <div className="flex border-b bg-gray-50">
                <button
                  onClick={() => setActiveTab('rules')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'rules'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Rules
                </button>
                <button
                  onClick={() => setActiveTab('codemaster')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'codemaster'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  CodeMaster
                </button>
                <button
                  onClick={() => setActiveTab('metadata')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'metadata'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Metadata
                </button>
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-hidden">{renderRightPanel()}</div>
            </div>
          }
          validationContent={
            <ValidationPanel
              projectId={projectId}
              onSelectError={(error) => {
                console.log('Error selected:', error);
                // TODO: Navigate to error location in bundle
              }}
            />
          }
        />
      </div>
    </div>
  );
}
