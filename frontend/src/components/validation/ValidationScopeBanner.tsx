import { Info, Check, X } from 'lucide-react';
import type { ValidationScope } from '../../types/bundleProfile';

interface ValidationScopeBannerProps {
  validationScope: ValidationScope;
  structureDefinitionName?: string;
}

/**
 * Phase 9.6: Explicit banner showing which validation ran
 * 
 * THREE STATES:
 * - RESOLVED: Base FHIR + Project rules applied
 * - UNRESOLVED: Base FHIR only (no profile selected)
 * - UNPROFILED: Base FHIR only (explicitly no profile)
 * 
 * MUST appear above ValidationSummary
 * NO success/failure language - factual only
 */
export default function ValidationScopeBanner({
  validationScope,
  structureDefinitionName,
}: ValidationScopeBannerProps) {
  const state = validationScope.bundleProfileState.toLowerCase();
  const appliedRules = validationScope.appliedProjectRules;

  // RESOLVED - Both base FHIR and project rules applied
  if (state === 'resolved' && appliedRules) {
    return (
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-3">
          <Info size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">
              Validation Applied:
            </h3>
            <ul className="space-y-1 text-sm text-blue-800">
              <li className="flex items-center gap-2">
                <Check size={16} className="flex-shrink-0" />
                <span>Base FHIR validation</span>
              </li>
              <li className="flex items-center gap-2">
                <Check size={16} className="flex-shrink-0" />
                <span>
                  Project rules ({structureDefinitionName || 'unknown profile'})
                </span>
              </li>
            </ul>
            <p className="mt-2 text-xs text-blue-700">
              Bundle profile: {structureDefinitionName || 'Unknown'} 
              {validationScope.source && ` (${validationScope.source})`}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // UNRESOLVED - Base FHIR only, no profile selected
  if (state === 'unresolved' || !appliedRules) {
    return (
      <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <div className="flex items-start gap-3">
          <Info size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-amber-900 mb-2">
              Validation Applied:
            </h3>
            <ul className="space-y-1 text-sm text-amber-800">
              <li className="flex items-center gap-2">
                <Check size={16} className="flex-shrink-0" />
                <span>Base FHIR validation</span>
              </li>
              <li className="flex items-center gap-2">
                <X size={16} className="flex-shrink-0" />
                <span>Project rules (no Bundle profile selected)</span>
              </li>
            </ul>
            <p className="mt-2 text-xs text-amber-700">
              To apply project rules, select a Bundle profile in the project overview.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // UNPROFILED - Base FHIR only, explicitly marked
  if (state === 'unprofiled') {
    return (
      <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="flex items-start gap-3">
          <Info size={20} className="text-gray-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              Validation Applied:
            </h3>
            <ul className="space-y-1 text-sm text-gray-800">
              <li className="flex items-center gap-2">
                <Check size={16} className="flex-shrink-0" />
                <span>Base FHIR validation</span>
              </li>
              <li className="flex items-center gap-2">
                <X size={16} className="flex-shrink-0" />
                <span>Project rules (explicitly no profile)</span>
              </li>
            </ul>
            <p className="mt-2 text-xs text-gray-600">
              Bundle marked as unprofiled by admin.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Fallback (should never happen)
  return null;
}
