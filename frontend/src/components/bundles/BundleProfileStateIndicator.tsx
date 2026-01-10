import { CheckCircle2, AlertCircle, Info } from 'lucide-react';
import type { BundleProfileState, BundleProfileSource } from '../../types/bundleProfile';

interface BundleProfileStateIndicatorProps {
  state: BundleProfileState;
  source?: BundleProfileSource | null;
  structureDefinitionName?: string | null;
  readonly?: boolean;
}

/**
 * Phase 9.6: Visual indicator for Bundle profile resolution state
 * 
 * Shows one of three states:
 * - RESOLVED: ✅ Profile linked (blue)
 * - UNRESOLVED: ⚠️ No profile selected (amber)
 * - UNPROFILED: ℹ️ Explicitly no profile (gray)
 * 
 * NO success/failure language - factual only
 */
export default function BundleProfileStateIndicator({
  state,
  source,
  structureDefinitionName,
  readonly = false,
}: BundleProfileStateIndicatorProps) {
  
  // RESOLVED state - Bundle linked to SD
  if (state === 'resolved') {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg">
        <CheckCircle2 size={16} className="text-blue-600 flex-shrink-0" />
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-medium text-blue-900">
            Profile linked: {structureDefinitionName || 'Unknown'}
          </span>
          {source && (
            <span className="text-xs text-blue-700">
              {source === 'auto' ? 'Auto-resolved' : 'Manually set'}
            </span>
          )}
        </div>
      </div>
    );
  }

  // UNRESOLVED state - No confident match found
  if (state === 'unresolved') {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg">
        <AlertCircle size={16} className="text-amber-600 flex-shrink-0" />
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-medium text-amber-900">
            No profile selected
          </span>
          {!readonly && (
            <span className="text-xs text-amber-700">
              Project rules will not be applied
            </span>
          )}
        </div>
      </div>
    );
  }

  // UNPROFILED state - Explicitly marked as no profile
  if (state === 'unprofiled') {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg">
        <Info size={16} className="text-gray-600 flex-shrink-0" />
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-medium text-gray-900">
            Explicitly no profile
          </span>
          {source === 'manual' && (
            <span className="text-xs text-gray-600">
              Manually marked as unprofiled
            </span>
          )}
        </div>
      </div>
    );
  }

  return null;
}
