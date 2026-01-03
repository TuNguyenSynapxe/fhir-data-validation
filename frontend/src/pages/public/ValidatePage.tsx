import { useState } from 'react';
import { BundleEditor } from '../../components/public/BundleEditor';
import { ValidationResultPanel } from '../../components/public/ValidationResultPanel';
import { validateBundle } from '../../api/publicValidationApi';
import type { ValidateResponse } from '../../types/public-validation';
import { Loader2, FileJson } from 'lucide-react';

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

export function ValidatePage() {
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

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Anonymous FHIR Validation
        </h1>
        <p className="text-gray-600">
          Validate your FHIR bundles without project-specific rules.
          This performs structural validation only.
        </p>
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
