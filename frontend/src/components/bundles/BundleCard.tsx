import { FileText, PlayCircle } from 'lucide-react';
import BundleProfileStateIndicator from './BundleProfileStateIndicator';
import type { BundleProfileStateDto } from '../../types/bundleProfile';
import type { ProjectBundleDto } from '../../types/projectImport';

interface BundleCardProps {
  bundle: ProjectBundleDto;
  profileState?: BundleProfileStateDto;
  onValidate: (bundleId: string) => void;
  readonly?: boolean;
}

/**
 * Phase 9.6: Bundle card with profile state indicator
 * 
 * Shows:
 * - Bundle name and metadata
 * - Profile state indicator
 * - Validate button
 */
export default function BundleCard({
  bundle,
  profileState,
  onValidate,
  readonly = false,
}: BundleCardProps) {
  return (
    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <FileText size={20} className="text-gray-600 flex-shrink-0 mt-1" />
        <div className="flex-1 min-w-0 space-y-2">
          <div>
            <p className="font-medium text-gray-900 truncate">{bundle.name}</p>
            <p className="text-xs text-gray-500">
              Created {new Date(bundle.createdAt).toLocaleDateString()}
            </p>
          </div>
          
          {profileState && (
            <BundleProfileStateIndicator
              state={profileState.state}
              source={profileState.source}
              structureDefinitionName={profileState.name}
              readonly={readonly}
            />
          )}
        </div>
      </div>

      <button
        onClick={() => onValidate(bundle.bundleId)}
        className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors flex-shrink-0"
      >
        <PlayCircle size={16} />
        Validate
      </button>
    </div>
  );
}
