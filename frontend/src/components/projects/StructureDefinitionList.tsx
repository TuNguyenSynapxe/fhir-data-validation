import { FileText } from 'lucide-react';
import StructureDefinitionCard from './StructureDefinitionCard';
import BundleCard from '../bundles/BundleCard';
import type { ProjectArtifactDto, ProjectBundleDto, ProjectRuleDto } from '../../types/projectImport';
import type { BundleProfileStateDto } from '../../types/bundleProfile';

interface StructureDefinitionListProps {
  structureDefinitions: ProjectArtifactDto[];
  bundles: ProjectBundleDto[];
  bundleProfiles: Map<string, BundleProfileStateDto>;
  rules: ProjectRuleDto[];
  onValidateBundle: (bundleId: string) => void;
  readonly?: boolean;
}

/**
 * Phase 9.6: SD-centric project layout
 * 
 * Features:
 * - Lists all SDs (even if no bundles)
 * - Groups bundles under matching SD
 * - Shows unassigned bundles separately
 * - Collapsible sections
 */
export default function StructureDefinitionList({
  structureDefinitions,
  bundles,
  bundleProfiles,
  rules,
  onValidateBundle,
  readonly = false,
}: StructureDefinitionListProps) {
  
  // Group bundles by resolved SD
  const bundlesBySd = new Map<string, ProjectBundleDto[]>();
  const unassignedBundles: ProjectBundleDto[] = [];

  bundles.forEach((bundle) => {
    const profileState = bundleProfiles.get(bundle.bundleId);
    
    if (profileState?.state === 'resolved' && profileState.structureDefinitionId) {
      const sdId = profileState.structureDefinitionId;
      if (!bundlesBySd.has(sdId)) {
        bundlesBySd.set(sdId, []);
      }
      bundlesBySd.get(sdId)!.push(bundle);
    } else {
      unassignedBundles.push(bundle);
    }
  });

  return (
    <div className="space-y-6">
      {/* StructureDefinitions with bundles */}
      {structureDefinitions.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <FileText size={48} className="mx-auto mb-3 opacity-30" />
          <p>No StructureDefinitions found in this project</p>
        </div>
      ) : (
        <>
          {structureDefinitions.map((sd) => {
            const sdBundles = bundlesBySd.get(sd.artifactId) || [];
            
            return (
              <StructureDefinitionCard
                key={sd.artifactId}
                structureDefinition={sd}
                bundles={sdBundles}
                bundleProfiles={bundleProfiles}
                rules={rules}
                onValidateBundle={onValidateBundle}
                readonly={readonly}
              />
            );
          })}
        </>
      )}

      {/* Unassigned Bundles Section */}
      {unassignedBundles.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-amber-900 mb-4">
            Bundles Without Resolved Profile ({unassignedBundles.length})
          </h3>
          <p className="text-sm text-amber-800 mb-4">
            These bundles are either unresolved (no confident match) or explicitly marked as unprofiled.
            Project rules will not be applied during validation.
          </p>
          <div className="space-y-2">
            {unassignedBundles.map((bundle) => (
              <BundleCard
                key={bundle.bundleId}
                bundle={bundle}
                profileState={bundleProfiles.get(bundle.bundleId)}
                onValidate={onValidateBundle}
                readonly={readonly}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
