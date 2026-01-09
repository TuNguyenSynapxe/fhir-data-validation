import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react';
import {
  useProjectDetails,
  useProjectBundles,
} from '../../hooks/useProjectQuery';
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
import type { ProjectBundleDto } from '../../types/projectImport';

/**
 * Phase 9.3: Admin Validation Playground
 * 
 * UI composition ONLY - reuses Phase 5 validation components with Phase 8.2 execution API.
 * 
 * FORBIDDEN:
 * - Editing bundle JSON
 * - Inline fixes
 * - Severity overrides
 * - Custom result rendering
 * 
 * Admin sees the SAME validation output as public users.
 */
export function AdminValidationPlaygroundPage() {
  const { projectId, bundleId } = useParams<{ projectId: string; bundleId: string }>();
  const navigate = useNavigate();

  const [selectedIssue, setSelectedIssue] = useState<ValidationIssue | null>(null);

  // Load project metadata
  const { data: project, isLoading: projectLoading, error: projectError } = useProjectDetails(projectId!);

  // Load bundle metadata
  const { data: bundles, isLoading: bundlesLoading, error: bundlesError } = useProjectBundles(projectId!);

  // Execute validation
  const {
    mutate: executeValidation,
    data: validationResponse,
    isPending: validationPending,
    error: validationError,
  } = useExecuteValidation();

  // Find the specific bundle
  const bundle: ProjectBundleDto | undefined = bundles?.find(b => b.bundleId === bundleId);

  // Execute validation on mount
  useEffect(() => {
    if (projectId && bundleId && !validationResponse && !validationPending) {
      executeValidation({ projectId, bundleId });
    }
  }, [projectId, bundleId, executeValidation, validationResponse, validationPending]);

  // Handle re-run validation
  const handleRerunValidation = () => {
    if (projectId && bundleId) {
      setSelectedIssue(null); // Clear selected issue
      executeValidation({ projectId, bundleId });
    }
  };

  // Handle back navigation
  const handleBack = () => {
    navigate(`/admin/projects/${projectId}`);
  };

  // Loading state
  const isLoading = projectLoading || bundlesLoading || validationPending;
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600">Loading validation playground...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  const error = projectError || bundlesError || validationError;
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-6 w-6 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <h2 className="text-lg font-semibold text-red-900 mb-2">
                  Unable to Load Validation Playground
                </h2>
                <p className="text-red-700 mb-4">
                  {error instanceof Error ? error.message : 'An unknown error occurred'}
                </p>
                <button
                  onClick={handleBack}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Project Overview
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Bundle not found
  if (!bundle) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-6 w-6 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div>
                <h2 className="text-lg font-semibold text-yellow-900 mb-2">Bundle Not Found</h2>
                <p className="text-yellow-700 mb-4">
                  The requested bundle could not be found in this project.
                </p>
                <button
                  onClick={handleBack}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Project Overview
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Convert ExecuteValidationResponse to ValidationResult format
  const validationResult: ValidationResult | null = validationResponse
    ? {
        issues: validationResponse.issues,
        summary: {
          totalErrors: validationResponse.summary.totalErrors,
          totalWarnings: validationResponse.summary.totalWarnings,
          totalInfo: validationResponse.summary.totalInfo,
          hasAmbiguity: validationResponse.summary.hasAmbiguity,
          policyMode: validationResponse.summary.policyMode === 'Strict' ? 'strict' : 'permissive',
        },
      }
    : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBack}
                className="inline-flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <div className="border-l border-gray-300 h-8"></div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Validation Playground</h1>
                <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                  <span>Project: <span className="font-medium text-gray-900">{project?.name}</span></span>
                  <span>•</span>
                  <span>Bundle: <span className="font-medium text-gray-900">{bundle.name}</span></span>
                  {validationResult && (
                    <>
                      <span>•</span>
                      <span>
                        Policy Mode:{' '}
                        <span className={`font-medium ${
                          validationResult.summary.policyMode === 'strict' ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {validationResult.summary.policyMode === 'strict' ? 'Strict' : 'Permissive'}
                        </span>
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={handleRerunValidation}
              disabled={validationPending}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${validationPending ? 'animate-spin' : ''}`} />
              Re-run Validation
            </button>
          </div>
        </div>
      </div>

      {/* Validation Results */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {validationResult ? (
          <div className="space-y-6">
            {/* Ambiguity Banner */}
            <AmbiguityBanner
              issues={validationResult.issues}
              policyMode={validationResult.summary.policyMode}
            />

            {/* Summary */}
            <div className="bg-white rounded-lg shadow">
              <ValidationSummary result={validationResult} />
            </div>

            {/* Issues List */}
            <div className="bg-white rounded-lg shadow">
              <div className="border-b border-gray-200 px-6 py-4">
                <h2 className="text-lg font-semibold text-gray-900">Validation Issues</h2>
              </div>
              <div className="p-6">
                {validationResult.issues.length === 0 ? (
                  <p className="text-gray-600 text-center py-8">
                    No validation issues to display. This bundle is valid.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {validationResult.issues.map((issue, index) => (
                      <ValidationIssueRow
                        key={`${issue.path}-${issue.errorCode}-${index}`}
                        issue={issue}
                        onSelect={setSelectedIssue}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Issue Details Panel */}
            {selectedIssue && (
              <div className="fixed inset-y-0 right-0 w-1/2 bg-white shadow-2xl border-l border-gray-200 overflow-y-auto z-50">
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Issue Details</h2>
                  <button
                    onClick={() => setSelectedIssue(null)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label="Close details"
                  >
                    <span className="text-2xl">×</span>
                  </button>
                </div>
                <div className="p-6">
                  <ValidationIssueDetails issue={selectedIssue} />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600">No validation results available.</p>
          </div>
        )}
      </div>
    </div>
  );
}
