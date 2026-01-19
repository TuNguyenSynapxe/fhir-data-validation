/**
 * ValueSet Drawer Component — EPIC 2 Context-Aware Selection
 * 
 * Drawer for selecting ValueSets with intelligent grouping and previewability-aware UI:
 * - Recommended: Base binding (if exists)
 * - Related: Same CodeSystem as base binding
 * - All: All HL7 ValueSets
 * - Auto-load preview based on previewability
 * - External: Show explanation panel (no preview button)
 * - Unsupported: Show warning panel
 * 
 * NO FIRELY SDK. NO AI SUGGESTIONS. METADATA-DRIVEN ONLY.
 */

import React, { useState, useEffect } from 'react';
import { X, Search, ExternalLink, AlertTriangle, CheckCircle } from 'lucide-react';
import {
  searchValueSets,
  previewValueSetCodes,
  getPreviewability,
  type ValueSetSummaryDto,
  type ValueSetCodeDto,
  type ValueSetPreviewability,
} from '../api/terminologyApi';
import { getBindingExplanation, isPreviewable, type Previewability } from '../constants/bindingExplanations';

// ============================================================================
// Props
// ============================================================================

interface ValueSetDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (valueSetUrl: string, strength: 'Required' | 'Extensible' | 'Preferred' | 'Example') => void;
  currentBindingUrl?: string; // Base binding for "Recommended" grouping
  title?: string;
}

// ============================================================================
// Types
// ============================================================================

interface GroupedValueSets {
  recommended: ValueSetSummaryDto[];
  related: ValueSetSummaryDto[];
  all: ValueSetSummaryDto[];
}

// ============================================================================
// Main Component
// ============================================================================

export const ValueSetDrawer: React.FC<ValueSetDrawerProps> = ({
  isOpen,
  onClose,
  onSelect,
  currentBindingUrl,
  title = 'Select ValueSet',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [grouped, setGrouped] = useState<GroupedValueSets>({
    recommended: [],
    related: [],
    all: [],
  });

  // Preview state
  const [selectedVs, setSelectedVs] = useState<ValueSetSummaryDto | null>(null);
  const [previewCodes, setPreviewCodes] = useState<ValueSetCodeDto[]>([]);
  const [previewability, setPreviewability] = useState<Previewability>('Unsupported');
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Binding strength selector
  const [strength, setStrength] = useState<'Required' | 'Extensible' | 'Preferred' | 'Example'>('Required');

  // EPIC 2: Load and group ValueSets on mount
  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);

    searchValueSets(searchQuery || '')
      .then((results) => {
        const recommended: ValueSetSummaryDto[] = [];
        const related: ValueSetSummaryDto[] = [];
        const all: ValueSetSummaryDto[] = [];

        // Extract CodeSystem from current binding (if exists)
        const currentCodeSystem = currentBindingUrl
          ? extractCodeSystem(currentBindingUrl)
          : null;

        results.forEach((vs) => {
          // Recommended: exact match to current binding
          if (currentBindingUrl && vs.url === currentBindingUrl) {
            recommended.push(vs);
          }

          // Related: same CodeSystem
          else if (currentCodeSystem && vs.url.includes(currentCodeSystem)) {
            related.push(vs);
          }

          // All: everything from HL7 layer
          if (vs.layer === 'Hl7') {
            all.push(vs);
          }
        });

        setGrouped({ recommended, related, all });
      })
      .catch((err) => {
        console.error('Failed to search ValueSets:', err);
      })
      .finally(() => setLoading(false));
  }, [isOpen, searchQuery, currentBindingUrl]);

  // EPIC 2: Auto-load preview when ValueSet is selected
  useEffect(() => {
    if (!selectedVs) {
      setPreviewCodes([]);
      setPreviewability('Unsupported');
      return;
    }

    setLoadingPreview(true);

    previewValueSetCodes(selectedVs.url, 50)
      .then((preview) => {
        const capability = getPreviewability(preview);
        setPreviewability(capability);

        if (capability === 'Explicit' || capability === 'Computed') {
          setPreviewCodes(preview.codes);
        } else {
          setPreviewCodes([]);
        }
      })
      .catch(() => {
        setPreviewability('Unsupported');
        setPreviewCodes([]);
      })
      .finally(() => setLoadingPreview(false));
  }, [selectedVs]);

  // ========================================================================
  // Handlers
  // ========================================================================

  const handleSelect = () => {
    if (!selectedVs) return;
    onSelect(selectedVs.url, strength);
    onClose();
  };

  const handleClose = () => {
    setSelectedVs(null);
    setSearchQuery('');
    onClose();
  };

  // ========================================================================
  // Render
  // ========================================================================

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-end z-50">
      <div className="bg-white w-full md:w-2/3 lg:w-1/2 h-full shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold">{title}</h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search ValueSets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded"
            />
          </div>
        </div>

        {/* Content: Split View (List + Preview) */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: ValueSet List */}
          <div className="w-1/2 border-r border-gray-200 overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center text-gray-500">Loading...</div>
            ) : (
              <div className="p-4 space-y-6">
                {/* EPIC 2: Recommended Group */}
                {grouped.recommended.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2 uppercase">
                      ✓ Recommended
                    </h3>
                    <div className="space-y-1">
                      {grouped.recommended.map((vs) => (
                        <ValueSetItem
                          key={vs.url}
                          valueset={vs}
                          isSelected={selectedVs?.url === vs.url}
                          onClick={() => setSelectedVs(vs)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* EPIC 2: Related Group */}
                {grouped.related.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2 uppercase">
                      Related (Same CodeSystem)
                    </h3>
                    <div className="space-y-1">
                      {grouped.related.map((vs) => (
                        <ValueSetItem
                          key={vs.url}
                          valueset={vs}
                          isSelected={selectedVs?.url === vs.url}
                          onClick={() => setSelectedVs(vs)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* EPIC 2: All HL7 Group */}
                {grouped.all.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2 uppercase">
                      All HL7 ValueSets
                    </h3>
                    <div className="space-y-1">
                      {grouped.all.slice(0, 50).map((vs) => (
                        <ValueSetItem
                          key={vs.url}
                          valueset={vs}
                          isSelected={selectedVs?.url === vs.url}
                          onClick={() => setSelectedVs(vs)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* No Results */}
                {grouped.recommended.length === 0 &&
                  grouped.related.length === 0 &&
                  grouped.all.length === 0 && (
                    <div className="text-center text-gray-500 py-8">
                      No ValueSets found
                    </div>
                  )}
              </div>
            )}
          </div>

          {/* Right: Preview Panel (Previewability-Aware) */}
          <div className="w-1/2 bg-gray-50 overflow-y-auto">
            {!selectedVs ? (
              <div className="flex items-center justify-center h-full text-gray-500">
                Select a ValueSet to preview
              </div>
            ) : (
              <div className="p-6 space-y-4">
                {/* ValueSet Info */}
                <div>
                  <h3 className="font-semibold text-lg">{selectedVs.name}</h3>
                  <div className="text-sm text-gray-600 font-mono break-all">
                    {selectedVs.url}
                  </div>
                  {selectedVs.description && (
                    <div className="text-sm text-gray-700 mt-2">
                      {selectedVs.description}
                    </div>
                  )}
                  {selectedVs.publisher && (
                    <div className="text-xs text-gray-500 mt-1">
                      Publisher: {selectedVs.publisher}
                    </div>
                  )}
                </div>

                {/* EPIC 2: Previewability Badge */}
                <PreviewabilityBadge previewability={previewability} />

                {/* EPIC 2: Preview Content (based on previewability) */}
                {loadingPreview ? (
                  <div className="text-sm text-gray-500 italic">
                    Loading preview...
                  </div>
                ) : previewability === 'Explicit' || previewability === 'Computed' ? (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">
                      Code Preview ({previewCodes.length} codes shown)
                    </h4>
                    <div className="space-y-1 max-h-64 overflow-y-auto">
                      {previewCodes.map((code, idx) => (
                        <div
                          key={idx}
                          className="px-3 py-2 bg-white rounded text-sm border border-gray-200"
                        >
                          <div className="font-mono text-blue-600">{code.code}</div>
                          {code.display && (
                            <div className="text-gray-700">{code.display}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : previewability === 'External' ? (
                  <ExternalExplanationPanel />
                ) : (
                  <UnsupportedWarningPanel />
                )}

                {/* Binding Strength Selector */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Binding Strength
                  </label>
                  <select
                    value={strength}
                    onChange={(e) =>
                      setStrength(
                        e.target.value as 'Required' | 'Extensible' | 'Preferred' | 'Example'
                      )
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                  >
                    <option value="Required">Required</option>
                    <option value="Extensible">Extensible</option>
                    <option value="Preferred">Preferred</option>
                    <option value="Example">Example</option>
                  </select>
                </div>

                {/* Select Button */}
                <button
                  onClick={handleSelect}
                  className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Use This ValueSet
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Sub-Components
// ============================================================================

interface ValueSetItemProps {
  valueset: ValueSetSummaryDto;
  isSelected: boolean;
  onClick: () => void;
}

const ValueSetItem: React.FC<ValueSetItemProps> = ({
  valueset,
  isSelected,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={`px-3 py-2 rounded cursor-pointer transition ${
        isSelected
          ? 'bg-blue-100 border border-blue-300'
          : 'bg-white border border-gray-200 hover:bg-gray-50'
      }`}
    >
      <div className="text-sm font-medium">{valueset.name}</div>
      <div className="text-xs text-gray-500 font-mono truncate">
        {valueset.url}
      </div>
    </div>
  );
};

/**
 * EPIC 2: Previewability Badge (replaces generic "Preview" label)
 */
interface PreviewabilityBadgeProps {
  previewability: Previewability;
}

const PreviewabilityBadge: React.FC<PreviewabilityBadgeProps> = ({
  previewability,
}) => {
  const explanation = getBindingExplanation(previewability);

  const colorMap: Record<Previewability, string> = {
    Explicit: 'bg-green-100 text-green-800 border-green-300',
    Computed: 'bg-blue-100 text-blue-800 border-blue-300',
    External: 'bg-gray-100 text-gray-800 border-gray-300',
    Unsupported: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  };

  return (
    <div className={`px-3 py-2 rounded border ${colorMap[previewability]}`}>
      <div className="text-sm font-semibold">{explanation.label}</div>
      <div className="text-xs">{explanation.description}</div>
    </div>
  );
};

/**
 * EPIC 2: External Explanation Panel (no preview button)
 */
const ExternalExplanationPanel: React.FC = () => {
  return (
    <div className="p-4 bg-gray-100 border border-gray-300 rounded">
      <div className="flex items-start gap-2">
        <ExternalLink size={20} className="text-gray-600 mt-0.5" />
        <div>
          <div className="text-sm font-semibold text-gray-800 mb-1">
            External Standard
          </div>
          <div className="text-xs text-gray-700">
            This ValueSet references codes from an external authority (e.g., BCP-47, ISO, IANA).
            Codes are not enumerated offline. Refer to the external standard for valid codes.
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * EPIC 2: Unsupported Warning Panel
 */
const UnsupportedWarningPanel: React.FC = () => {
  return (
    <div className="p-4 bg-yellow-50 border border-yellow-300 rounded">
      <div className="flex items-start gap-2">
        <AlertTriangle size={20} className="text-yellow-600 mt-0.5" />
        <div>
          <div className="text-sm font-semibold text-yellow-800 mb-1">
            Complex ValueSet
          </div>
          <div className="text-xs text-yellow-700">
            This ValueSet uses advanced FHIR logic (filters, excludes, etc.).
            Offline expansion is not supported. Use with caution.
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract CodeSystem name from ValueSet URL
 * Example: "http://hl7.org/fhir/ValueSet/administrative-gender" → "administrative-gender"
 */
function extractCodeSystem(url: string): string | null {
  const match = url.match(/\/([^/]+)$/);
  return match ? match[1] : null;
}
