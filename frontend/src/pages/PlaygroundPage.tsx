import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import dayjs from 'dayjs';
import {
  useProject,
  useSaveBundle,
  useSaveRules,
  useSaveCodeMaster,
  useValidateProject,
} from '../hooks/usePlayground';
import AppLayout from '../components/layout/AppLayout';
import PlaygroundLayout from '../components/playground/PlaygroundLayout';
import BundleEditor from '../components/playground/BundleEditor';
import RulesEditor from '../components/playground/RulesEditor';
import CodeMasterEditor from '../components/playground/CodeMasterEditor';
import ValidationRunBar from '../components/playground/ValidationRunBar';
import ValidationResultPanel from '../components/playground/ValidationResultPanel';
import JsonViewerWithJump from '../components/playground/JsonViewerWithJump';
import SmartPathPanel from '../components/playground/SmartPathPanel';
import type { ValidationResult, UnifiedError } from '../types/validation';

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
  const [validationResult, setValidationResult] = useState<ValidationResult | undefined>(undefined);
  const [lastRunTime, setLastRunTime] = useState<string>();
  const [selectedPath, setSelectedPath] = useState<string | undefined>(undefined);
  const [selectedError, setSelectedError] = useState<UnifiedError | undefined>(undefined);
  const [showEditor, setShowEditor] = useState(true);

  useEffect(() => {
    if (project) {
      setBundleJson(project.sampleBundleJson || '{}');
      setRulesJson(project.rulesJson || '{}');
      setCodeMasterJson(project.codeMasterJson || '{}');
    }
  }, [project]);

  const handleSaveBundle = async (value: string) => {
    try {
      await saveBundleMutation.mutateAsync(value);
    } catch (error) {
      console.error('Failed to save bundle:', error);
    }
  };

  const handleSaveRules = async (value: string) => {
    try {
      await saveRulesMutation.mutateAsync(value);
    } catch (error) {
      console.error('Failed to save rules:', error);
    }
  };

  const handleSaveCodeMaster = async (value: string) => {
    try {
      await saveCodeMasterMutation.mutateAsync(value);
    } catch (error) {
      console.error('Failed to save code master:', error);
    }
  };

  const handleRunValidation = async () => {
    try {
      const result = await validateMutation.mutateAsync();
      setValidationResult(result);
      setLastRunTime(dayjs().format('HH:mm:ss'));
      setShowEditor(false); // Switch to viewer mode after validation
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handleSelectError = (error: UnifiedError) => {
    setSelectedPath(error.path);
    setSelectedError(error);
    setShowEditor(false); // Ensure we're in viewer mode
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <div className="flex items-center gap-3 text-gray-600">
            <Loader2 size={24} className="animate-spin" />
            <span>Loading project...</span>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error || !project) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
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
      </AppLayout>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* App Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm flex-shrink-0">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 className="text-lg font-bold text-gray-900">{project.name}</h1>
                {project.description && (
                  <p className="text-sm text-gray-600">{project.description}</p>
                )}
              </div>
            </div>
            <div className="text-sm text-gray-500">
              {project.createdAt && `Created ${dayjs(project.createdAt).format('MMM D, YYYY')}`}
            </div>
          </div>
        </div>
      </header>

      {/* Playground Layout */}
      <div className="flex-1 overflow-hidden">
        <PlaygroundLayout
          validationRunBar={
            <div className="flex items-center justify-between">
              <ValidationRunBar
                onRunValidation={handleRunValidation}
                isValidating={validateMutation.isPending}
                lastRunTime={lastRunTime}
                summary={validationResult?.summary}
              />
              <button
                onClick={() => setShowEditor(!showEditor)}
                className="mr-4 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                {showEditor ? 'View Mode' : 'Edit Mode'}
              </button>
            </div>
          }
          bundleViewer={
            showEditor ? (
              <BundleEditor
                value={bundleJson}
                onChange={setBundleJson}
                onSave={handleSaveBundle}
                isSaving={saveBundleMutation.isPending}
              />
            ) : (
              <JsonViewerWithJump
                json={bundleJson}
                selectedPath={selectedPath}
                title="Bundle (FHIR)"
              />
            )
          }
          rulesEditor={
            <RulesEditor
              value={rulesJson}
              onChange={setRulesJson}
              onSave={handleSaveRules}
              isSaving={saveRulesMutation.isPending}
            />
          }
          codeMasterEditor={
            <CodeMasterEditor
              value={codeMasterJson}
              onChange={setCodeMasterJson}
              onSave={handleSaveCodeMaster}
              isSaving={saveCodeMasterMutation.isPending}
            />
          }
          validationResults={
            <ValidationResultPanel 
              result={validationResult}
              onSelectError={handleSelectError}
            />
          }
          smartPathPanel={
            <SmartPathPanel error={selectedError} />
          }
        />
      </div>
    </div>
  );
}
