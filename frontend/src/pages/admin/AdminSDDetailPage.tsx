import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileCode, Loader2, AlertCircle, FileText, CheckCircle2, Plus } from 'lucide-react';
import AppLayout from '../../components/layout/AppLayout';
import BundleCard from '../../components/bundles/BundleCard';
import { useProjectDetails, useProjectBundles, useProjectRules } from '../../hooks/useProjectQuery';
import { useProjectStructureDefinitions } from '../../hooks/useProjectArtifacts';
import { useBundleProfiles } from '../../hooks/useBundleProfile';
import type { ProjectRuleDto } from '../../types/projectImport';

/**
 * Phase 12: SD-Centric Detail Page
 * 
 * Composition of existing components:
 * 1. SD metadata
 * 2. Sample bundles (CRUD)
 * 3. Add-on rules (manage/create/edit using existing rule UX)
 * 4. Validate action (reuse validation UI)
 * 
 * Rules are project-level, scoped via structureDefinitionCanonicalUrl field
 */
export default function AdminSDDetailPage() {
  const { projectId, artifactId } = useParams<{ projectId: string; artifactId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'bundles' | 'rules'>('bundles');

  const { data: project, isLoading: loadingProject } = useProjectDetails(projectId!);
  const { data: allSDs, isLoading: loadingSDs } = useProjectStructureDefinitions(projectId!);
  const { data: allBundles, isLoading: loadingBundles } = useProjectBundles(projectId!);
  const { data: allRules, isLoading: loadingRules } = useProjectRules(projectId!);

  // Find the specific SD
  const structureDefinition = allSDs?.find(sd => sd.artifactId === artifactId);

  // Get bundles that resolve to this SD
  const bundleIds = allBundles?.map(b => b.bundleId) || [];
  const { data: bundleProfiles, isLoading: loadingProfiles } = useBundleProfiles(projectId!, bundleIds);

  // Filter bundles for this SD
  const sdBundles = allBundles?.filter(bundle => {
    const profileState = bundleProfiles?.get(bundle.bundleId);
    return profileState?.state === 'resolved' && profileState.structureDefinitionId === artifactId;
  }) || [];

  // Filter rules for this SD (project-level rules scoped via structureDefinitionCanonicalUrl)
  const sdRules = allRules?.filter(rule => {
    // Match by structureDefinitionCanonicalUrl (primary), fallback to targetProfileUrl or artifactId
    if ('structureDefinitionCanonicalUrl' in rule && rule.structureDefinitionCanonicalUrl === structureDefinition?.canonicalUrl) {
      return true;
    }
    if ('targetProfileUrl' in rule && rule.targetProfileUrl === structureDefinition?.canonicalUrl) {
      return true;
    }
    // Note: structureDefinitionArtifactId not available in ProjectRuleDto
    return false;
  }) || [];

  const importedRules = sdRules.filter(r => r.provenance === 'ImportedGenerated');
  const customRules = sdRules.filter(r => r.provenance === 'ManualCustom');

  const isLoading = loadingProject || loadingSDs || loadingBundles || loadingRules || loadingProfiles;

  const handleBack = () => {
    navigate(`/admin/projects/${projectId}`);
  };

  const handleValidateBundle = (bundleId: string) => {
    navigate(`/admin/projects/${projectId}/bundles/${bundleId}/validate`);
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 text-gray-600 py-8">
            <Loader2 size={24} className="animate-spin" />
            <span>Loading StructureDefinition...</span>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!structureDefinition) {
    return (
      <AppLayout>
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <AlertCircle size={24} className="text-red-600 flex-shrink-0" />
              <div>
                <h3 className="text-red-900 font-semibold mb-1">StructureDefinition Not Found</h3>
                <p className="text-red-800 text-sm">
                  The requested StructureDefinition does not exist in this project.
                </p>
                <button
                  onClick={handleBack}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Project
                </button>
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
            onClick={handleBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft size={20} />
            <span>Back to Project</span>
          </button>

          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
              <FileCode size={24} className="text-purple-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {structureDefinition.name}
              </h2>
              <div className="flex flex-col gap-2 text-sm text-gray-600">
                {structureDefinition.resourceType && (
                  <div>
                    <span className="font-medium">Resource Type:</span> {structureDefinition.resourceType}
                  </div>
                )}
                {structureDefinition.canonicalUrl && (
                  <div>
                    <span className="font-medium">Canonical URL:</span>{' '}
                    <span className="font-mono text-xs">{structureDefinition.canonicalUrl}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <FileText size={20} className="text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{sdBundles.length}</p>
                <p className="text-sm text-gray-600">Sample Bundles</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <CheckCircle2 size={20} className="text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{importedRules.length}</p>
                <p className="text-sm text-gray-600">Imported Rules</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                <Plus size={20} className="text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{customRules.length}</p>
                <p className="text-sm text-gray-600">Custom Rules</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('bundles')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'bundles'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Sample Bundles ({sdBundles.length})
              </button>
              <button
                onClick={() => setActiveTab('rules')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'rules'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Add-on Rules ({customRules.length})
              </button>
            </nav>
          </div>

          <div className="p-6">
            {/* Sample Bundles Tab */}
            {activeTab === 'bundles' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Sample Bundles</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Sample bundles that resolve to this StructureDefinition profile.
                      Use these for validation testing and rule authoring.
                    </p>
                  </div>
                  {/* TODO: Add bundle upload/create functionality */}
                </div>

                {sdBundles.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <FileText size={48} className="mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      No Sample Bundles
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Add sample bundles to enable validation testing for this StructureDefinition.
                    </p>
                    {/* TODO: Add CTA button for bundle upload */}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sdBundles.map((bundle) => (
                      <BundleCard
                        key={bundle.bundleId}
                        bundle={bundle}
                        profileState={bundleProfiles?.get(bundle.bundleId)}
                        onValidate={handleValidateBundle}
                        readonly={false}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Add-on Rules Tab */}
            {activeTab === 'rules' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Add-on Rules</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Custom validation rules scoped to this StructureDefinition.
                      Imported rules from the SD are read-only.
                    </p>
                  </div>
                </div>

                {/* Imported Rules (Read-Only) */}
                {importedRules.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">
                      Imported Rules ({importedRules.length})
                    </h4>
                    <div className="space-y-2">
                      {importedRules.map((rule) => (
                        <div
                          key={rule.ruleId}
                          className="p-4 bg-blue-50 border border-blue-200 rounded-lg"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h5 className="font-medium text-gray-900">{rule.title}</h5>
                                <span className="px-2 py-0.5 bg-blue-200 text-blue-900 text-xs font-medium rounded">
                                  Read-only
                                </span>
                              </div>
                              {rule.description && (
                                <p className="text-sm text-gray-700 mb-2">{rule.description}</p>
                              )}
                              <code className="text-xs text-gray-600 font-mono block bg-white px-2 py-1 rounded border">
                                {rule.fhirPathExpression}
                              </code>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Custom Rules Section */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">
                    Custom Rules ({customRules.length})
                  </h4>

                  {customRules.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                      <CheckCircle2 size={48} className="mx-auto text-gray-400 mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        No Custom Rules
                      </h3>
                      <p className="text-sm text-gray-600 mb-4">
                        Custom rules will be scoped to this StructureDefinition profile.
                      </p>
                      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-4 py-2 inline-block">
                        Note: Rule CRUD UI to be implemented (reuse existing RuleManagementSection)
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {customRules.map((rule) => (
                        <div
                          key={rule.ruleId}
                          className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h5 className="font-medium text-gray-900">{rule.title}</h5>
                                <span className="px-2 py-0.5 bg-green-100 text-green-900 text-xs font-medium rounded">
                                  Custom
                                </span>
                                {!rule.isEnabled && (
                                  <span className="px-2 py-0.5 bg-gray-200 text-gray-700 text-xs font-medium rounded">
                                    Disabled
                                  </span>
                                )}
                              </div>
                              {rule.description && (
                                <p className="text-sm text-gray-700 mb-2">{rule.description}</p>
                              )}
                              <code className="text-xs text-gray-600 font-mono block bg-gray-50 px-2 py-1 rounded border">
                                {rule.fhirPathExpression}
                              </code>
                            </div>
                          </div>
                        </div>
                      ))}
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
