import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileCode, Loader2, AlertCircle, FileText, CheckCircle2, Plus, Upload, Trash2, Star, PlayCircle, Info, XCircle, Link, Layers, Scissors, Lock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import AppLayout from '../../components/layout/AppLayout';
import BundleCard from '../../components/bundles/BundleCard';
import { RuleManagementSection } from '../../components/admin/RuleManagementSection';
import { SampleBundlesTab } from '../../components/admin/SampleBundlesTab';
import { useProjectDetails, useProjectBundles, useProjectRules, useSampleBundles } from '../../hooks/useProjectQuery';
import { useProjectStructureDefinitions } from '../../hooks/useProjectArtifacts';
import { useBundleProfiles } from '../../hooks/useBundleProfile';
import { getArtifactContent } from '../../api/projectQueryApi';
import { extractConstraints } from '../../utils/sdConstraintExtractor';
import type { ProjectRuleDto } from '../../types/projectImport';

/**
 * Phase 12: SD-Centric Detail Page
 * Phase 3: Bundle CRUD + Rule Management Integration
 * 
 * Composition of existing components:
 * 1. SD metadata
 * 2. Sample bundles (CRUD)
 * 3. Add-on rules (manage/create/edit using existing rule UX)
 * 4. Validate action (reuse validation UI)
 * 
 * CRITICAL CONSTRAINT (DO NOT VIOLATE):
 * - Custom rules REQUIRE a concrete bundle instance for:
 *   - JSON path picking
 *   - Instance context
 *   - Rule preview
 * - Rule authoring is DISABLED if no bundle exists
 * - SD validation (via Firely) can run with any bundle
 * 
 * Rules are project-level, scoped via structureDefinitionCanonicalUrl field
 */
export default function AdminSDDetailPage() {
  const { projectId, artifactId } = useParams<{ projectId: string; artifactId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'bundles' | 'imported-rules' | 'custom-rules'>('bundles');
  
  // Track default authoring bundle for rule management
  // CRITICAL: This bundle provides the concrete instance for rule authoring
  const [defaultAuthoringBundleId, setDefaultAuthoringBundleId] = useState<string | null>(null);

  const { data: project, isLoading: loadingProject } = useProjectDetails(projectId!);
  const { data: allSDs, isLoading: loadingSDs } = useProjectStructureDefinitions(projectId!);
  const { data: allBundles, isLoading: loadingBundles } = useProjectBundles(projectId!);
  const { data: allRules, isLoading: loadingRules } = useProjectRules(projectId!);
  
  // Find the specific SD
  const structureDefinition = allSDs?.find(sd => sd.artifactId === artifactId);
  
  // Phase 3: Query SD-scoped sample bundles
  const { data: sampleBundles = [], isLoading: loadingSampleBundles } = useSampleBundles(
    projectId!,
    structureDefinition?.canonicalUrl
  );

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

  // CRITICAL: Filter ONLY custom rules (ManualCustom provenance)
  // REMOVED: ImportedGenerated filtering (those are obsolete database records)
  const customRules = sdRules.filter(r => r.provenance === 'ManualCustom');

  // Phase 3.1: Fetch SD JSON and extract constraints at runtime
  const { data: sdContent, isLoading: loadingSdContent } = useQuery({
    queryKey: ['artifact-content', projectId, artifactId],
    queryFn: () => getArtifactContent(projectId!, artifactId!),
    enabled: !!projectId && !!artifactId,
  });

  // Phase 3.1: Extract imported rules from SD JSON (runtime-derived, read-only)
  const importedRules = useMemo(() => {
    if (!sdContent?.content) return [];
    return extractConstraints(sdContent.content);
  }, [sdContent]);

  const isLoading = loadingProject || loadingSDs || loadingBundles || loadingRules || loadingProfiles || loadingSdContent || loadingSampleBundles;

  // Auto-select first bundle as default authoring bundle if not set
  // CRITICAL: This provides the concrete instance required for rule authoring
  if (!defaultAuthoringBundleId && sampleBundles.length > 0) {
    setDefaultAuthoringBundleId(sampleBundles[0].id);
  }

  const handleBack = () => {
    navigate(`/admin/projects/${projectId}`);
  };

  const handleValidateBundle = (bundleId: string) => {
    navigate(`/admin/projects/${projectId}/bundles/${bundleId}/validate`);
  };
  
  const handleSetDefaultAuthoringBundle = (bundleId: string) => {
    setDefaultAuthoringBundleId(bundleId);
  };
  
  const handleDeleteBundle = async (bundleId: string) => {
    // TODO: Implement bundle deletion API
    // If deleted bundle was default authoring bundle, clear it
    if (bundleId === defaultAuthoringBundleId) {
      setDefaultAuthoringBundleId(null);
    }
    alert('Bundle deletion not yet implemented');
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
                <p className="text-2xl font-bold text-gray-900">{sampleBundles.length}</p>
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
                Sample Bundles ({sampleBundles.length})
              </button>
              <button
                onClick={() => setActiveTab('imported-rules')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'imported-rules'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Imported Rules ({importedRules.length})
              </button>
              <button
                onClick={() => setActiveTab('custom-rules')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'custom-rules'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Custom Rules ({customRules.length})
              </button>
            </nav>
          </div>

          <div className="p-6">
            {/* Sample Bundles Tab - Phase 3: Full CRUD */}
            {activeTab === 'bundles' && structureDefinition && (
              <SampleBundlesTab
                projectId={projectId!}
                sdCanonicalUrl={structureDefinition.canonicalUrl}
                bundles={sampleBundles}
                selectedBundleId={defaultAuthoringBundleId}
                onBundleSelect={(bundleId) => setDefaultAuthoringBundleId(bundleId)}
              />
            )}

            {/* Imported Rules Tab - Phase 3.1: Runtime-extracted from SD JSON */}
            {activeTab === 'imported-rules' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Imported Rules</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      These rules are derived from the StructureDefinition JSON at runtime.
                      They are read-only explanations of constraints enforced by the Firely validator.
                    </p>
                  </div>
                </div>

                {/* Informational banner */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 text-sm text-blue-900">
                      <p className="font-medium mb-1">Derived from StructureDefinition</p>
                      <p className="text-blue-800">
                        These constraints are extracted from the SD's <code className="bg-blue-100 px-1 rounded text-xs">snapshot.element</code> at runtime.
                        They are NOT stored in the database, NOT executable, and provide human-readable explanations only.
                        The Firely validator enforces these constraints during validation.
                      </p>
                    </div>
                  </div>
                </div>

                {importedRules.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <FileCode size={48} className="mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      No Imported Rules Extracted
                    </h3>
                    <p className="text-sm text-gray-600">
                      This StructureDefinition does not contain extractable constraints
                      (cardinality, fixed values, profile references, or required bindings).
                    </p>
                  </div>
                ) : (
                  <div>
                    {/* Group by category */}
                    {['Cardinality', 'Fixed Value', 'Profile Conformance', 'Required Binding', 'Forbidden', 'Invariant', 'Reference', 'Slice Existence', 'Slice Discriminator', 'Slicing Closed'].map((category) => {
                      const categoryRules = importedRules.filter(r => r.category === category);
                      if (categoryRules.length === 0) return null;

                      return (
                        <div key={category} className="mb-6">
                          <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            {category === 'Cardinality' && <CheckCircle2 size={16} className="text-green-600" />}
                            {category === 'Fixed Value' && <FileText size={16} className="text-purple-600" />}
                            {category === 'Profile Conformance' && <FileCode size={16} className="text-blue-600" />}
                            {category === 'Required Binding' && <Plus size={16} className="text-orange-600" />}
                            {category === 'Forbidden' && <XCircle size={16} className="text-red-600" />}
                            {category === 'Invariant' && <AlertCircle size={16} className="text-yellow-600" />}
                            {category === 'Reference' && <Link size={16} className="text-indigo-600" />}
                            {category === 'Slice Existence' && <Layers size={16} className="text-teal-600" />}
                            {category === 'Slice Discriminator' && <Scissors size={16} className="text-cyan-600" />}
                            {category === 'Slicing Closed' && <Lock size={16} className="text-gray-600" />}
                            {category === 'Required Binding' && <Plus size={16} className="text-orange-600" />}
                            {category === 'Forbidden' && <XCircle size={16} className="text-red-600" />}
                            {category === 'Invariant' && <AlertCircle size={16} className="text-yellow-600" />}
                            {category === 'Reference' && <Link size={16} className="text-indigo-600" />}
                            {category} ({categoryRules.length})
                          </h4>
                          <div className="space-y-2">
                            {categoryRules.map((rule) => (
                              <div
                                key={rule.id}
                                className="p-4 bg-gray-50 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                              >
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex-1">
                                    <h5 className="font-medium text-gray-900 mb-1">{rule.title}</h5>
                                    <p className="text-sm text-gray-600 mb-2">{rule.explanation}</p>
                                    {rule.fhirPath && (
                                      <code className="text-xs bg-gray-200 px-2 py-1 rounded text-gray-800 font-mono">
                                        {rule.fhirPath}
                                      </code>
                                    )}
                                  </div>
                                  <span className="ml-4 px-2 py-0.5 bg-blue-100 text-blue-900 text-xs font-medium rounded flex-shrink-0">
                                    Read-only
                                  </span>
                                </div>
                                <div className="text-xs text-gray-500 mt-2">
                                  Path: <code className="bg-gray-200 px-1 rounded">{rule.path}</code>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Custom Rules Tab */}
            {activeTab === 'custom-rules' && (
              <div className="space-y-4">
                {/* CRITICAL: Bundle requirement gate for rule authoring */}
                {!defaultAuthoringBundleId || sampleBundles.length === 0 ? (
                  /* Case 1: No bundle exists - DISABLE rule authoring (STRICT CONSTRAINT) */
                  <div className="py-12">
                    <div className="max-w-2xl mx-auto">
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
                        <div className="flex items-start gap-4">
                          <div className="p-3 bg-amber-100 rounded-lg flex-shrink-0">
                            <AlertCircle className="w-6 h-6 text-amber-700" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-amber-900 mb-2">
                              Custom Rules Require a Sample Bundle
                            </h3>
                            <p className="text-sm text-amber-800 mb-4 leading-relaxed">
                              Custom rule authoring requires a concrete bundle instance to provide:
                            </p>
                            <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside mb-4">
                              <li><strong>JSON path picking:</strong> Navigate resource structure</li>
                              <li><strong>Instance context:</strong> Select specific elements</li>
                              <li><strong>Rule preview:</strong> Test rules against real data</li>
                            </ul>
                            <p className="text-sm text-amber-800 mb-4">
                              Upload a sample bundle in the "Sample Bundles" tab to enable rule authoring.
                            </p>
                            <button
                              onClick={() => setActiveTab('bundles')}
                              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-amber-900 bg-amber-200 rounded-lg hover:bg-amber-300 transition-colors"
                            >
                              <Upload className="w-4 h-4" />
                              Go to Sample Bundles
                            </button>
                          </div>
                        </div>
                      </div>
                      
                    </div>
                  </div>
                ) : (
                  /* Case 2: Bundle exists - ENABLE rule authoring (reuse existing component) */
                  <div>
                    {/* Informational banner explaining SD-scoped rules */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                      <div className="flex items-start gap-3">
                        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 text-sm text-blue-900">
                          <p className="font-medium mb-1">Rule Authoring Enabled</p>
                          <p className="text-blue-800">
                            Using <strong>{sampleBundles.find(b => b.id === defaultAuthoringBundleId)?.name || 'default bundle'}</strong> for 
                            JSON path context. Rules created here will be scoped to this StructureDefinition via the{' '}
                            <code className="bg-blue-100 px-1 rounded text-xs">structureDefinitionCanonicalUrl</code> field.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* CRITICAL: Reuse existing RuleManagementSection WITHOUT modifications */}
                    {/* This component EXPECTS a bundle context and provides the full rule authoring UX */}
                    <RuleManagementSection
                      projectId={projectId!}
                      bundleId={defaultAuthoringBundleId}
                      onValidationRerun={() => {
                        // Optional: Trigger validation refresh
                        console.log('Rule modified - validation may need rerun');
                      }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
