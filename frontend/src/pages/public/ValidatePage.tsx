import { useState } from 'react';
import { ValidationSplitLayout } from '../../components/shared/ValidationSplitLayout';
import { BundleWorkspace } from '../../components/shared/BundleWorkspace';
import { ValidationWorkspace } from '../../components/shared/ValidationWorkspace';
import { validateBundle } from '../../api/publicValidationApi';
import type { ValidateResponse } from '../../types/public-validation';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export function ValidatePage() {
  const [bundleJson, setBundleJson] = useState('');
  const [fhirVersion] = useState('R4');
  const [validationMode, setValidationMode] = useState<'standard' | 'full'>('standard');
  const [isValidJson, setIsValidJson] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [result, setResult] = useState<ValidateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedJsonPointer, setSelectedJsonPointer] = useState<string | null>(null);

  const handleValidate = async (mode?: 'standard' | 'full') => {
    if (!bundleJson.trim() || !isValidJson) {
      setError('Please enter valid JSON');
      return;
    }

    setIsValidating(true);
    setError(null);
    setResult(null);

    try {
      const response = await validateBundle({
        bundleJson,
        fhirVersion,
        validationMode: mode ?? validationMode,
      });
      console.log('Validation response:', response);
      setResult(response);
    } catch (err) {
      console.error('Validation error:', err);
      setError(err instanceof Error ? err.message : 'Validation failed');
    } finally {
      setIsValidating(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
  };

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
            <h1 className="text-2xl font-bold text-gray-900">
              Anonymous FHIR Validation
            </h1>
          </div>
          <p className="text-sm text-gray-600">
            Structural validation without project-specific rules
          </p>
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
