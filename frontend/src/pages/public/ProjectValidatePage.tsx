import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { BundleEditor } from '../../components/public/BundleEditor';
import { ValidationResultPanel } from '../../components/public/ValidationResultPanel';
import {
  getPublishedProject,
  validateWithProject,
} from '../../api/publicValidationApi';
import type { ValidateResponse } from '../../types/public-validation';
import { Loader2, ArrowLeft, FileJson, FolderOpen } from 'lucide-react';

const EXAMPLE_BUNDLE = `{
  "resourceType": "Bundle",
  "type": "collection",
  "entry": [
    {
      "resource": {
        "resourceType": "Patient",
        "id": "example",
        "identifier": [
          {
            "system": "http://example.org/mrn",
            "value": "12345"
          }
        ],
        "name": [
          {
            "family": "Doe",
            "given": ["John"]
          }
        ]
      }
    }
  ]
}`;

export function ProjectValidatePage() {
  const { slug } = useParams<{ slug: string }>();

  // Fetch project details
  const { data: project, isLoading: isLoadingProject } = useQuery({
    queryKey: ['project', slug],
    queryFn: () => getPublishedProject(slug!),
    enabled: !!slug,
  });

  const [bundleJson, setBundleJson] = useState('');
  const [fhirVersion, setFhirVersion] = useState('R4');
  const [validationMode, setValidationMode] = useState<'standard' | 'full'>(
    'standard'
  );
  const [isValidJson, setIsValidJson] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [result, setResult] = useState<ValidateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleValidate = async () => {
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
        validationMode,
      });
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Validation failed');
    } finally {
      setIsValidating(false);
    }
  };

  const handleLoadExample = () => {
    setBundleJson(EXAMPLE_BUNDLE);
  };

  if (isLoadingProject) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <Link
          to="/projects"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Projects
        </Link>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="text-red-800 font-medium">Project not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Back Link */}
      <Link
        to={`/projects/${slug}`}
        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Project Details
      </Link>

      {/* Header with Project Info */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-2">
          <FolderOpen className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">
            Validate with {project.name}
          </h1>
        </div>
        <p className="text-gray-700 mb-3">{project.description}</p>
        <div className="flex gap-4 text-sm">
          <div>
            <span className="font-semibold text-gray-700">Rules:</span>
            <span className="ml-2 text-gray-900">
              {project.rulesetMetadata.ruleCount}
            </span>
          </div>
          <div>
            <span className="font-semibold text-gray-700">FHIR Version:</span>
            <span className="ml-2 text-gray-900">
              {project.rulesetMetadata.fhirVersion}
            </span>
          </div>
        </div>
      </div>

      {/* Input Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">FHIR Bundle</h2>
          <button
            onClick={handleLoadExample}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
          >
            <FileJson className="w-4 h-4" />
            Load Example
          </button>
        </div>

        <BundleEditor
          value={bundleJson}
          onChange={setBundleJson}
          onValidJson={setIsValidJson}
        />

        {/* Configuration */}
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              FHIR Version
            </label>
            <select
              value={fhirVersion}
              onChange={(e) => setFhirVersion(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="R4">R4</option>
              <option value="R4B">R4B</option>
              <option value="R5">R5</option>
            </select>
          </div>

          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Validation Mode
            </label>
            <select
              value={validationMode}
              onChange={(e) =>
                setValidationMode(e.target.value as 'standard' | 'full')
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="standard">Standard (Runtime)</option>
              <option value="full">Full (with SpecHints)</option>
            </select>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            This validation will apply <strong>{project.name}</strong>'s{' '}
            <strong>{project.rulesetMetadata.ruleCount}</strong> business rules
            in addition to structural validation.
          </p>
        </div>

        {/* Validate Button */}
        <button
          onClick={handleValidate}
          disabled={!isValidJson || !bundleJson.trim() || isValidating}
          className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isValidating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Validating...
            </>
          ) : (
            'Validate Bundle'
          )}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-medium">Error</p>
          <p className="text-red-600 text-sm mt-1">{error}</p>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Validation Results</h2>
          <ValidationResultPanel result={result.engineResponse} />
        </div>
      )}
    </div>
  );
}
