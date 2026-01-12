import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileCode, ChevronDown, ChevronRight, AlertCircle, ExternalLink } from 'lucide-react';
import BundleCard from '../bundles/BundleCard';
import type { ProjectArtifactDto, ProjectBundleDto, ProjectRuleDto } from '../../types/projectImport';
import type { BundleProfileStateDto } from '../../types/bundleProfile';

interface StructureDefinitionCardProps {
  projectId: string;
  structureDefinition: ProjectArtifactDto;
  bundles: ProjectBundleDto[];
  bundleProfiles: Map<string, BundleProfileStateDto>;
  rules: ProjectRuleDto[];
  onValidateBundle: (bundleId: string) => void;
  readonly?: boolean;
}

/**
 * Phase 9.6: SD-first card with nested bundles
 * Phase 12: SD-centric refactor - highlight missing sample bundles, link to SD detail page
 * 
 * Layout:
 * - SD metadata (name, canonical, resource type)
 * - Warning badge if no sample bundles
 * - Rules count (imported + custom)
 * - Nested bundles with profile states
 * - Collapsible
 * - Link to SD detail page
 */
export default function StructureDefinitionCard({
  projectId,
  structureDefinition,
  bundles,
  bundleProfiles,
  rules,
  onValidateBundle,
  readonly = false,
}: StructureDefinitionCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const navigate = useNavigate();

  // Highlight: SD missing sample bundles
  const hasSampleBundles = bundles.length > 0;

  // Filter rules for this SD (rules don't have SD FK, so we can't filter precisely)
  // For now, show all project rules - this is a known limitation
  const importedRules = rules.filter(r => r.provenance === 'ImportedGenerated');
  const customRules = rules.filter(r => r.provenance === 'ManualCustom');

  const handleNavigateToSD = () => {
    navigate(`/admin/projects/${projectId}/structure-definitions/${structureDefinition.artifactId}`);
  };

  return (
    <div className={`bg-white border rounded-lg overflow-hidden ${!hasSampleBundles ? 'border-amber-300 shadow-amber-100 shadow-md' : 'border-gray-200'}`}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors ${!hasSampleBundles ? 'bg-amber-50' : ''}`}
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${!hasSampleBundles ? 'bg-amber-100' : 'bg-purple-100'}`}>
            {!hasSampleBundles ? (
              <AlertCircle size={20} className="text-amber-600" />
            ) : (
              <FileCode size={20} className="text-purple-600" />
            )}
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-gray-900">
                {structureDefinition.name}
              </h3>
              {!hasSampleBundles && (
                <span className="px-2 py-0.5 bg-amber-200 text-amber-900 text-xs font-medium rounded">
                  No sample bundles
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-600 mt-1">
              {structureDefinition.resourceType && (
                <span>Resource type: {structureDefinition.resourceType}</span>
              )}
              {structureDefinition.canonicalUrl && (
                <>
                  <span>•</span>
                  <span className="truncate max-w-md">
                    {structureDefinition.canonicalUrl}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>{bundles.length} bundle{bundles.length !== 1 ? 's' : ''}</span>
            <span>{rules.length} rule{rules.length !== 1 ? 's' : ''}</span>
          </div>
          {isExpanded ? (
            <ChevronDown size={20} className="text-gray-400" />
          ) : (
            <ChevronRight size={20} className="text-gray-400" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-6 pb-6 space-y-6">
          {/* Rules Section */}
          {rules.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">
                Validation Rules ({rules.length})
              </h4>
              <div className="space-y-2">
                {importedRules.length > 0 && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                    <span className="text-sm text-blue-900">
                      <strong>{importedRules.length}</strong> imported from StructureDefinition (read-only)
                    </span>
                  </div>
                )}
                {customRules.length > 0 && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                    <span className="text-sm text-green-900">
                      <strong>{customRules.length}</strong> custom rules added by admin
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Bundles Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-gray-900">
                Sample Bundles ({bundles.length})
              </h4>
              {!readonly && (
                <button
                  onClick={handleNavigateToSD}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  Manage SD
                  <ExternalLink size={14} />
                </button>
              )}
            </div>
            {bundles.length === 0 ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-900 font-medium mb-1">
                  No sample bundles for this StructureDefinition
                </p>
                <p className="text-xs text-amber-700">
                  Add sample bundles to enable validation testing and rule authoring for this SD.
                </p>
                {!readonly && (
                  <button
                    onClick={handleNavigateToSD}
                    className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-amber-900 bg-amber-200 rounded-lg hover:bg-amber-300 transition-colors"
                  >
                    Add Sample Bundle
                    <ExternalLink size={14} />
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {bundles.map((bundle) => (
                  <BundleCard
                    key={bundle.bundleId}
                    bundle={bundle}
                    profileState={bundleProfiles.get(bundle.bundleId)}
                    onValidate={onValidateBundle}
                    readonly={readonly}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
