import { useState } from 'react';
import { Loader2, Check, X } from 'lucide-react';
import { useSetBundleProfile } from '../../hooks/useBundleProfile';
import type { BundleProfileStateDto } from '../../types/bundleProfile';
import type { ProjectArtifactDto } from '../../types/projectImport';

interface BundleProfileSelectorProps {
  projectId: string;
  bundleId: string;
  currentState: BundleProfileStateDto;
  bundleStructureDefinitions: ProjectArtifactDto[];
  onUpdate?: () => void;
  disabled?: boolean;
}

/**
 * Phase 9.6: Admin-only dropdown to manually set Bundle profile
 * 
 * Features:
 * - Dropdown with all Bundle-type SDs
 * - "No profile (FHIR only)" option
 * - Shows current auto-resolved SD (disabled)
 * - Manual selection overrides auto
 * - Confirmation before clearing
 * 
 * NO heuristics, NO guessing
 */
export default function BundleProfileSelector({
  projectId,
  bundleId,
  currentState,
  bundleStructureDefinitions,
  onUpdate,
  disabled = false,
}: BundleProfileSelectorProps) {
  const [selectedSdId, setSelectedSdId] = useState<string>(
    currentState.structureDefinitionId || ''
  );
  const [showConfirm, setShowConfirm] = useState(false);

  const setProfile = useSetBundleProfile(projectId, bundleId);

  const handleChange = (newSdId: string) => {
    setSelectedSdId(newSdId);

    // If clearing profile, show confirmation
    if (newSdId === '' && currentState.structureDefinitionId) {
      setShowConfirm(true);
      return;
    }

    // Otherwise apply immediately
    applySelection(newSdId);
  };

  const applySelection = (sdId: string) => {
    setProfile.mutate(
      {
        structureDefinitionId: sdId || null, // empty string → null
      },
      {
        onSuccess: () => {
          setShowConfirm(false);
          onUpdate?.();
        },
      }
    );
  };

  const cancelClear = () => {
    setSelectedSdId(currentState.structureDefinitionId || '');
    setShowConfirm(false);
  };

  return (
    <div className="space-y-3">
      {/* Dropdown */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-700">
          Bundle Profile:
        </label>
        <select
          value={selectedSdId}
          onChange={(e) => handleChange(e.target.value)}
          disabled={disabled || setProfile.isPending}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          {/* Current auto-resolved (if exists and source=auto) */}
          {currentState.state === 'resolved' && currentState.source === 'auto' && (
            <option value={currentState.structureDefinitionId!} disabled>
              {currentState.name} (auto-resolved, read-only)
            </option>
          )}

          {/* Manual options */}
          <option value="">No profile (FHIR only)</option>
          <optgroup label="Available Bundle Profiles">
            {bundleStructureDefinitions.map((sd) => (
              <option key={sd.artifactId} value={sd.artifactId}>
                {sd.name}
              </option>
            ))}
          </optgroup>
        </select>

        {setProfile.isPending && (
          <Loader2 size={20} className="animate-spin text-gray-400" />
        )}
      </div>

      {/* Confirmation dialog for clearing */}
      {showConfirm && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-900 mb-3">
            Clearing the Bundle profile will mark this bundle as <strong>unprofiled</strong>.
            Project rules will not be applied during validation.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => applySelection('')}
              disabled={setProfile.isPending}
              className="flex items-center gap-2 px-3 py-1.5 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 disabled:opacity-50"
            >
              <Check size={16} />
              Confirm
            </button>
            <button
              onClick={cancelClear}
              disabled={setProfile.isPending}
              className="flex items-center gap-2 px-3 py-1.5 bg-white text-gray-700 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <X size={16} />
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Error message */}
      {setProfile.isError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">
            Failed to update Bundle profile. Please try again.
          </p>
        </div>
      )}

      {/* Helper text */}
      <p className="text-xs text-gray-500">
        Manual selection overrides auto-resolution. Setting "No profile" explicitly marks the bundle as unprofiled.
      </p>
    </div>
  );
}
