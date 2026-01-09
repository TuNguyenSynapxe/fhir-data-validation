import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AlertCircle, RefreshCw, AlertTriangle } from 'lucide-react';
import { useExecuteValidation } from '../../hooks/useExecuteValidation';
import {
  AmbiguityBanner,
  ValidationSummary,
  ValidationIssueRow,
  ValidationIssueDetails,
} from '../../validation/components';
import type { ValidationIssue } from '../../validation/model/ValidationIssue';
import type { ValidationResult } from '../../validation/model/ValidationResult';
import type { ExecuteValidationResponse, PolicyMode } from '../../api/validationExecutionApi';

/**
 * Phase 9.5: Public Anonymous Validation Playground
 * 
 * Read-only validation via public link (/p/{publicId}).
 * 
 * REUSES:
 * - Phase 8.2 validation execution API
 * - Phase 5 validation components (same as admin playground)
 * 
 * RESTRICTIONS:
 * - NO rule editing
 * - NO policy override
 * - NO bundle upload
 * - NO visibility into custom rule definitions
 * 
 * MANDATORY LABELING:
 * - "Public Validation Playground"
 * - "Results are informational only"
 * - "Passing validation does NOT imply clinical correctness"
 */
export function PublicValidationPlaygroundPage() {
  const { publicId } = useParams<{ publicId: string }>();

  const [selectedBundleId, setSelectedBundleId] = useState<string | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<ValidationIssue | null>(null);

  // Fetch project via public link
  // TODO: This will be implemented when backend endpoint is added
  // For now, use mock data or display loading state
  const projectData = {
    projectId: 'mock-project-id',
    projectName: 'Public Validation Project',
    bundles: [
      { bundleId: 'bundle-1', bundleName: 'Sample Bundle 1' },
      { bundleId: 'bundle-2', bundleName: 'Sample Bundle 2' },
    ],
  };

  // Execute validation
  const {
    mutate: executeValidation,
    data: validationResponse,
    isPending: validationPending,
    error: validationError,
  } = useExecuteValidation();

  // Auto-select first bundle on mount
  useEffect(() => {
    if (projectData.bundles.length > 0 && !selectedBundleId) {
      const firstBundle = projectData.bundles[0];
      setSelectedBundleId(firstBundle.bundleId);
      // Auto-execute validation for first bundle
      executeValidation({
        projectId: projectData.projectId,
        bundleId: firstBundle.bundleId,
      });
    }
  }, [projectData, selectedBundleId, executeValidation]);

  // Handle bundle selection
  const handleBundleSelect = (bundleId: string) => {
    setSelectedBundleId(bundleId);
    setSelectedIssue(null);
    executeValidation({
      projectId: projectData.projectId,
      bundleId,
    });
  };

  // Handle re-run validation
  const handleRerunValidation = () => {
    if (selectedBundleId) {
      setSelectedIssue(null);
      executeValidation({
        projectId: projectData.projectId,
        bundleId: selectedBundleId,
      });
    }
  };

  // Convert ExecuteValidationResponse to ValidationResult format for Phase 5 components
  const validationResult: ValidationResult | null = validationResponse
    ? {
        issues: validationResponse.issues,
        summary: {
          totalErrors: validationResponse.summary.totalErrors,
          totalWarnings: validationResponse.summary.totalWarnings,
          totalInfo: validationResponse.summary.totalInfo,
          hasAmbiguity: validationResponse.summary.hasAmbiguity,
          policyMode:
            validationResponse.summary.policyMode === 'Strict'
              ? 'strict'
              : 'permissive',
        },
      }
    : null;

  const selectedBundle = projectData.bundles.find(
    (b) => b.bundleId === selectedBundleId
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mandatory Warning Banner */}
      <div className="bg-yellow-50 border-b border-yellow-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h2 className="font-semibold text-yellow-900 mb-1">
                Public Validation Playground
              </h2>
              <div className="text-sm text-yellow-800 space-y-1">
                <p>
                  <strong>Results are informational only</strong> - This playground provides
                  read-only access to validation results.
                </p>
                <p>
                  <strong>Validation ≠ Clinical Correctness:</strong> Passing validation only confirms technical conformance to FHIR standards. It does NOT verify clinical appropriateness, safety, or data accuracy.
                </p>
                <p>
                  <strong>Ambiguity ≠ Pass:</strong> When ambiguity is present, some constraints could not be verified. Absence of errors does NOT mean the bundle is fully validated.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {projectData.projectName}
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Public validation playground - read-only access
              </p>
            </div>
            {selectedBundleId && (
              <button
                onClick={handleRerunValidation}
                disabled={validationPending}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <RefreshCw
                  className={`w-4 h-4 ${validationPending ? 'animate-spin' : ''}`}
                />
                {validationPending ? 'Validating...' : 'Re-run Validation'}
              </button>
            )}
          </div>

          {/* Bundle Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Bundle to Validate
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {projectData.bundles.map((bundle) => (
                <button
                  key={bundle.bundleId}
                  onClick={() => handleBundleSelect(bundle.bundleId)}
                  disabled={validationPending}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    selectedBundleId === bundle.bundleId
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <div className="font-medium text-gray-900">{bundle.bundleName}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {selectedBundleId === bundle.bundleId && 'Currently selected'}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Validation Error State */}
        {validationError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-900">Validation Failed</h3>
                <p className="text-sm text-red-700 mt-1">
                  {validationError instanceof Error
                    ? validationError.message
                    : 'An unexpected error occurred during validation'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Validation Loading State */}
        {validationPending && !validationResult && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600">
              Executing validation for {selectedBundle?.bundleName}...
            </p>
          </div>
        )}

        {/* Validation Results */}
        {validationResult && selectedBundle && (
          <div className="space-y-6">
            {/* Ambiguity Banner (Phase 5 component) */}
            {validationResult.summary.hasAmbiguity && (
              <AmbiguityBanner policyMode={validationResult.summary.policyMode} issues={validationResult.issues || []} />
            )}

            {/* Validation Summary (Phase 5 component) */}
            <ValidationSummary result={validationResult} />

            {/* Issues List (Phase 5 component) */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  Validation Issues
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {validationResult.issues.length === 0
                    ? 'No issues found - bundle passed validation'
                    : `${validationResult.issues.length} issue(s) found`}
                </p>
              </div>

              {validationResult.issues.length > 0 ? (
                <div className="divide-y divide-gray-200">
                  {validationResult.issues.map((issue, index) => (
                    <button
                      key={`${issue.errorCode}-${issue.path}-${index}`}
                      onClick={() => setSelectedIssue(issue)}
                      className="w-full text-left hover:bg-gray-50 transition-colors"
                    >
                      <div className="p-4">
                        <ValidationIssueRow issue={issue} />
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <p className="text-gray-900 font-medium mb-2">
                    No validation issues detected in this execution
                  </p>
                  <p className="text-sm text-gray-600">
                    This indicates technical conformance only. {validationResult.summary.hasAmbiguity && 'Ambiguity was present during validation.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* No Bundle Selected State */}
        {!selectedBundleId && !validationPending && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600">
              Select a bundle above to begin validation
            </p>
          </div>
        )}
      </div>

      {/* Issue Details Panel (Phase 5 component) */}
      {selectedIssue && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-1/2 bg-white shadow-xl overflow-y-auto z-50">
          <div className="relative">
            <button
              onClick={() => setSelectedIssue(null)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <ValidationIssueDetails issue={selectedIssue} />
          </div>
        </div>
      )}
    </div>
  );
}
