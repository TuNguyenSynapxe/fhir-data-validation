import { useState } from 'react';
import { FileCode, ChevronDown, ChevronRight } from 'lucide-react';
import BundleCard from '../bundles/BundleCard';
import type { ProjectArtifactDto, ProjectBundleDto, ProjectRuleDto } from '../../types/projectImport';
import type { BundleProfileStateDto } from '../../types/bundleProfile';

interface StructureDefinitionCardProps {
  structureDefinition: ProjectArtifactDto;
  bundles: ProjectBundleDto[];
  bundleProfiles: Map<string, BundleProfileStateDto>;
  rules: ProjectRuleDto[];
  onValidateBundle: (bundleId: string) => void;
  readonly?: boolean;
}

/**
 * Phase 9.6: SD-first card with nested bundles
 * 
 * Layout:
 * - SD metadata (name, canonical, resource type)
 * - Rules count (imported + custom)
 * - Nested bundles with profile states
 * - Collapsible
 */
export default function StructureDefinitionCard({
  structureDefinition,
  bundles,
  bundleProfiles,
  rules,
  onValidateBundle,
  readonly = false,
}: StructureDefinitionCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Filter rules for this SD (rules don't have SD FK, so we can't filter precisely)
  // For now, show all project rules - this is a known limitation
  const importedRules = rules.filter(r => r.provenance === 'ImportedGenerated');
  const customRules = rules.filter(r => r.provenance === 'ManualCustom');

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
            <FileCode size={20} className="text-purple-600" />
          </div>
          <div className="text-left">
            <h3 className="text-lg font-semibold text-gray-900">
              {structureDefinition.name}
            </h3>
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
            <h4 className="text-sm font-semibold text-gray-900 mb-3">
              Sample Bundles ({bundles.length})
            </h4>
            {bundles.length === 0 ? (
              <p className="text-sm text-gray-500 italic">
                No sample bundles for this StructureDefinition
              </p>
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
