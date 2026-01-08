import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { ValidationSplitLayout } from '../../components/shared/ValidationSplitLayout';
import { BundleWorkspace } from '../../components/shared/BundleWorkspace';
import { ValidationWorkspace } from '../../components/shared/ValidationWorkspace';
import {
  getPublishedProject,
  validateWithProject,
} from '../../api/publicValidationApi';
import type { ValidateResponse } from '../../types/public-validation';
import { Loader2, ArrowLeft, FolderOpen } from 'lucide-react';

export function ProjectValidatePage() {
  const { slug } = useParams<{ slug: string }>();

  // Fetch project details
  const { data: project, isLoading: isLoadingProject } = useQuery({
    queryKey: ['project', slug],
    queryFn: () => getPublishedProject(slug!),
    enabled: !!slug,
  });

  const [bundleJson, setBundleJson] = useState('');
  const [fhirVersion] = useState('R5');
  const [validationMode, setValidationMode] = useState<'standard' | 'full'>('standard');
  const [isValidJson, setIsValidJson] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [result, setResult] = useState<ValidateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedJsonPointer, setSelectedJsonPointer] = useState<string | null>(null);

  const handleValidate = async (mode?: 'standard' | 'full') => {
    if (!bundleJson.trim() || !isValidJson || !slug) {
      setError('Please enter valid JSON');
      return;
    }

    setIsValidating(true);
    setError(null);
    setResult(null);

    try {
      const response = await validateWithProject(slug, {
        bundleJson,
        fhirVersion,
        validationMode: mode ?? validationMode,
      });
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Validation failed');
    } finally {
      setIsValidating(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
  };

  if (isLoadingProject) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="h-screen flex flex-col bg-gray-50">
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="max-w-7xl mx-auto">
            <Link
              to="/projects"
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Projects
            </Link>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <p className="text-red-800 font-medium">Project not found</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-2">
            <Link
              to="/projects"
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-3">
              <FolderOpen className="w-6 h-6 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">
                {project.name}
              </h1>
            </div>
          </div>
          {project.description && (
            <p className="text-sm text-gray-600 ml-9">{project.description}</p>
          )}
          {project.rulesetMetadata && (
            <div className="flex gap-4 text-sm ml-9 mt-2">
              <span className="text-gray-600">
                <span className="font-semibold">{project.rulesetMetadata.ruleCount}</span> rules
              </span>
              <span className="text-gray-600">
                FHIR <span className="font-semibold">{project.rulesetMetadata.fhirVersion}</span>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden p-6">
        <div className="h-full max-w-7xl mx-auto">
          <ValidationSplitLayout
            left={
              <BundleWorkspace
                bundleJson={bundleJson}
                onChange={setBundleJson}
                onJsonValidChange={setIsValidJson}
                selectedPath={selectedJsonPointer}
                onPathSelect={setSelectedJsonPointer}
              />
            }
            right={
              <ValidationWorkspace
                bundleJson={bundleJson}
                validationResult={result?.engineResponse ?? null}
                isValidating={isValidating}
                validationError={error}
                onValidate={handleValidate}
                onReset={handleReset}
                onNavigateToPath={setSelectedJsonPointer}
                defaultOpen={false}
                showExplanations={false}
              />
            }
          />
        </div>
      </div>
    </div>
  );
}
