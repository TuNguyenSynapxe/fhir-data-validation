import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle, ArrowLeft, FileArchive, FileText, CheckCircle2 } from 'lucide-react';
import AppLayout from '../../components/layout/AppLayout';
import StructureDefinitionList from '../../components/projects/StructureDefinitionList';
import {
  useProjectDetails,
  useProjectBundles,
  useProjectRules,
} from '../../hooks/useProjectQuery';
import { useProjectStructureDefinitions } from '../../hooks/useProjectArtifacts';
import { useBundleProfiles } from '../../hooks/useBundleProfile';

/**
 * Phase 9.6: SD-Centric Admin Project Overview
 * 
 * Refactored from bundle-first to StructureDefinition-first layout.
 * Shows SDs with nested bundles grouped by profile state.
 */
export default function AdminProjectOverviewPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const { data: project, isLoading: loadingProject, error: projectError } = useProjectDetails(projectId!);
  const { data: bundles, isLoading: loadingBundles } = useProjectBundles(projectId!);
  const { data: rules, isLoading: loadingRules } = useProjectRules(projectId!);
  const { data: structureDefinitions, isLoading: loadingSDs } = useProjectStructureDefinitions(projectId!);
  
  // Fetch all bundle profile states
  const bundleIds = bundles?.map(b => b.bundleId) || [];
  const { data: bundleProfiles, isLoading: loadingProfiles } = useBundleProfiles(projectId!, bundleIds);

  const isLoading = loadingProject || loadingBundles || loadingRules || loadingSDs || loadingProfiles;

  const handleValidateBundle = (bundleId: string) => {
    navigate(`/admin/projects/${projectId}/bundles/${bundleId}/validate`);
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
              <p className="text-xs text-gray-500">Sample bundles grouped by profile</p>
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

        {/* SD-Centric Layout */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900">StructureDefinitions & Sample Bundles</h3>
            <p className="text-sm text-gray-600 mt-1">
              Bundles are organized by their resolved StructureDefinition profile.
              Rules are defined at the SD level and applied when profile is resolved.
            </p>
          </div>

          {isLoading && (
            <div className="flex items-center gap-3 text-gray-600 py-8">
              <Loader2 size={20} className="animate-spin" />
              <span>Loading StructureDefinitions and bundles...</span>
            </div>
          )}

          {!isLoading && structureDefinitions && bundles && bundleProfiles && rules && (
            <StructureDefinitionList
              projectId={projectId!}
              structureDefinitions={structureDefinitions}
              bundles={bundles}
              bundleProfiles={bundleProfiles}
              rules={rules}
              onValidateBundle={handleValidateBundle}
              readonly={false}
            />
          )}
        </div>
      </div>
    </AppLayout>
  );
}
