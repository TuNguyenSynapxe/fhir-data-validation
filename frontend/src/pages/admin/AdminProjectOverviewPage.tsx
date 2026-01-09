import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle, ArrowLeft, FileArchive, FileText, CheckCircle2, PlayCircle } from 'lucide-react';
import AppLayout from '../../components/layout/AppLayout';
import {
  useProjectDetails,
  useProjectBundles,
  useProjectRules,
} from '../../hooks/useProjectQuery';
import { BundleSource, RuleProvenance } from '../../types/projectImport';

export default function AdminProjectOverviewPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const { data: project, isLoading: loadingProject, error: projectError } = useProjectDetails(projectId!);
  const { data: bundles, isLoading: loadingBundles } = useProjectBundles(projectId!);
  const { data: rules, isLoading: loadingRules } = useProjectRules(projectId!);

  const isLoading = loadingProject || loadingBundles || loadingRules;

  // Calculate rule statistics
  const importedRules = rules?.filter(r => r.provenance === RuleProvenance.ImportedGenerated) || [];
  const manualRules = rules?.filter(r => r.provenance === RuleProvenance.ManualCustom) || [];

  // Bundle source labels
  const getBundleSourceLabel = (source: BundleSource): string => {
    switch (source) {
      case BundleSource.ImportedExample:
        return 'Imported Example';
      case BundleSource.Uploaded:
        return 'Uploaded';
      case BundleSource.AdHoc:
        return 'Ad-hoc';
      default:
        return 'Unknown';
    }
  };

  const getBundleSourceBadgeClass = (source: BundleSource): string => {
    switch (source) {
      case BundleSource.ImportedExample:
        return 'bg-blue-100 text-blue-800';
      case BundleSource.Uploaded:
        return 'bg-green-100 text-green-800';
      case BundleSource.AdHoc:
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (projectError) {
    return (
      <AppLayout>
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <AlertCircle size={24} className="text-red-600 flex-shrink-0" />
              <div>
                <h3 className="text-red-900 font-semibold mb-1">Error Loading Project</h3>
                <p className="text-red-800 text-sm">
                  {projectError instanceof Error ? projectError.message : 'Failed to load project details'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft size={20} />
            <span>Back to Projects</span>
          </button>

          {isLoading && (
            <div className="flex items-center gap-3 text-gray-600">
              <Loader2 size={24} className="animate-spin" />
              <span>Loading project...</span>
            </div>
          )}

          {project && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{project.name}</h2>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span>Project ID: {project.projectId}</span>
                <span>•</span>
                <span>Created: {new Date(project.createdAt).toLocaleDateString()}</span>
                {project.isPublicEnabled && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-green-600 font-medium">
                      <CheckCircle2 size={16} />
                      Public Access Enabled
                    </span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Summary Cards */}
        {project && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <FileArchive size={20} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{project.counts.artifactCount}</p>
                  <p className="text-sm text-gray-600">Artifacts</p>
                </div>
              </div>
              <p className="text-xs text-gray-500">Structure Definitions and resources</p>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <FileText size={20} className="text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{project.counts.bundleCount}</p>
                  <p className="text-sm text-gray-600">Bundles</p>
                </div>
              </div>
              <p className="text-xs text-gray-500">Test bundles for validation</p>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <CheckCircle2 size={20} className="text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{project.counts.ruleCount}</p>
                  <p className="text-sm text-gray-600">Rules</p>
                </div>
              </div>
              <p className="text-xs text-gray-500">Validation rules (imported + custom)</p>
            </div>
          </div>
        )}

        {/* Bundles Section */}
        <div className="bg-white rounded-lg border border-gray-200 mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Bundles</h3>
            <p className="text-sm text-gray-600 mt-1">Test bundles imported from the package</p>
          </div>
          <div className="p-6">
            {loadingBundles && (
              <div className="flex items-center gap-3 text-gray-600 py-4">
                <Loader2 size={20} className="animate-spin" />
                <span>Loading bundles...</span>
              </div>
            )}

            {!loadingBundles && bundles && bundles.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <FileText size={48} className="mx-auto mb-3 opacity-30" />
                <p>No bundles found in this project</p>
              </div>
            )}

            {!loadingBundles && bundles && bundles.length > 0 && (
              <div className="space-y-3">
                {bundles.map((bundle) => (
                  <div
                    key={bundle.bundleId}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <FileText size={20} className="text-gray-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{bundle.name}</p>
                        <p className="text-xs text-gray-500">
                          Created {new Date(bundle.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${getBundleSourceBadgeClass(
                          bundle.source
                        )}`}
                      >
                        {getBundleSourceLabel(bundle.source)}
                      </span>
                      <button
                        onClick={() => navigate(`/admin/projects/${projectId}/bundles/${bundle.bundleId}/validate`)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <PlayCircle size={16} />
                        Validate
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Rules Section */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Validation Rules</h3>
            <p className="text-sm text-gray-600 mt-1">Rules applied during validation</p>
          </div>
          <div className="p-6">
            {loadingRules && (
              <div className="flex items-center gap-3 text-gray-600 py-4">
                <Loader2 size={20} className="animate-spin" />
                <span>Loading rules...</span>
              </div>
            )}

            {!loadingRules && rules && rules.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle2 size={48} className="mx-auto mb-3 opacity-30" />
                <p>No rules found in this project</p>
              </div>
            )}

            {!loadingRules && rules && rules.length > 0 && (
              <div className="space-y-6">
                {/* Imported Rules */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <h4 className="font-medium text-gray-900">
                      Derived from StructureDefinitions (read-only)
                    </h4>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                      {importedRules.length} rules
                    </span>
                  </div>
                  {importedRules.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">No imported rules</p>
                  ) : (
                    <div className="space-y-2">
                      {importedRules.slice(0, 5).map((rule) => (
                        <div
                          key={rule.ruleId}
                          className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg"
                        >
                          <CheckCircle2 size={16} className="text-blue-600 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{rule.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-gray-600">
                                {rule.scope} • {rule.ruleType}
                              </span>
                              {!rule.isEnabled && (
                                <span className="px-1.5 py-0.5 bg-gray-200 text-gray-700 text-xs rounded">
                                  Disabled
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      {importedRules.length > 5 && (
                        <p className="text-xs text-gray-500 italic px-3 py-2">
                          ... and {importedRules.length - 5} more imported rules
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Manual Rules */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <h4 className="font-medium text-gray-900">Custom rules added by admin</h4>
                    <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded">
                      {manualRules.length} rules
                    </span>
                  </div>
                  {manualRules.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">No custom rules added</p>
                  ) : (
                    <div className="space-y-2">
                      {manualRules.slice(0, 5).map((rule) => (
                        <div
                          key={rule.ruleId}
                          className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg"
                        >
                          <CheckCircle2 size={16} className="text-green-600 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{rule.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-gray-600">
                                {rule.scope} • {rule.ruleType}
                              </span>
                              {!rule.isEnabled && (
                                <span className="px-1.5 py-0.5 bg-gray-200 text-gray-700 text-xs rounded">
                                  Disabled
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      {manualRules.length > 5 && (
                        <p className="text-xs text-gray-500 italic px-3 py-2">
                          ... and {manualRules.length - 5} more custom rules
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
