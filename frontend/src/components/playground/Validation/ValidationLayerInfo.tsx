import React from 'react';
import { HelpCircle, XCircle, CheckCircle } from 'lucide-react';
import { ValidationIcon } from '../../../ui/icons/ValidationIcons';

/**
 * ValidationLayerInfo Component
 * 
 * Displays a comprehensive tooltip explaining all validation layers,
 * their purpose, and blocking status.
 */
export const ValidationLayerInfo: React.FC = () => {
  return (
    <div className="inline-flex items-center">
      <div className="relative group">
        <button
          type="button"
          className="inline-flex items-center justify-center w-5 h-5 rounded-full hover:bg-gray-100 transition-colors"
          aria-label="Validation layer information"
        >
          <HelpCircle className="w-4 h-4 text-gray-500" />
        </button>
        
        {/* Tooltip */}
        <div className="absolute left-0 top-full mt-2 w-96 bg-white border border-gray-200 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            Understanding Validation Layers
          </h3>

          {/* Phase 1 STRUCTURE vs SPEC_HINT explanation */}
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
            <p className="text-xs text-gray-700 leading-relaxed mb-2">
              <span className="font-semibold">STRUCTURE</span> errors prevent HL7 FHIR compliance and <span className="font-semibold text-red-700">must be fixed</span>.
            </p>
            <p className="text-xs text-gray-700 leading-relaxed">
              <span className="font-semibold">SPEC_HINT</span> findings are <span className="font-semibold text-blue-700">advisory recommendations</span> that do not block validation.
            </p>
          </div>
          
          <div className="space-y-3 text-xs">
            {/* FHIR Structure */}
            <div className="border-l-2 border-red-500 pl-3">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <ValidationIcon source="STRUCTURE" severity="error" className="w-4 h-4" />
                  <span className="font-semibold text-gray-900">FHIR Structure</span>
                </div>
                <div className="flex items-center gap-1 text-red-700">
                  <XCircle className="w-3 h-3" />
                  <span className="text-xs font-semibold">Must fix</span>
                </div>
              </div>
              <p className="text-gray-600 leading-relaxed">
                Must be fixed to produce valid HL7 FHIR. Violates the HL7 FHIR specification.
              </p>
            </div>

            {/* HL7 Spec */}
            <div className="border-l-2 border-red-500 pl-3">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <ValidationIcon source="Firely" severity="error" className="w-4 h-4" />
                  <span className="font-semibold text-gray-900">HL7 Spec</span>
                </div>
                <div className="flex items-center gap-1 text-red-700">
                  <XCircle className="w-3 h-3" />
                  <span className="text-xs font-semibold">Must fix</span>
                </div>
              </div>
              <p className="text-gray-600 leading-relaxed">
                Must be fixed to produce valid HL7 FHIR. Violates the HL7 FHIR specification.
              </p>
            </div>
            
            {/* Project Rules */}
            <div className="border-l-2 border-purple-500 pl-3">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <ValidationIcon source="ProjectRule" severity="error" className="w-4 h-4" />
                  <span className="font-semibold text-gray-900">Project Rule</span>
                </div>
                <div className="flex items-center gap-1 text-red-700">
                  <XCircle className="w-3 h-3" />
                  <span className="text-xs font-semibold">Must fix</span>
                </div>
              </div>
              <p className="text-gray-600 leading-relaxed">
                Must be fixed to satisfy project policy. Violates project-specific rules.
              </p>
            </div>

            {/* Reference Validation */}
            <div className="border-l-2 border-rose-500 pl-3">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-gray-900">Reference Validation</span>
                <div className="flex items-center gap-1 text-red-700">
                  <XCircle className="w-3 h-3" />
                  <span className="text-xs font-semibold">Must fix</span>
                </div>
              </div>
              <p className="text-gray-600 leading-relaxed">
                Ensures referenced resources exist within the bundle.
              </p>
            </div>
            
            {/* Best Practice */}
            <div className="border-l-2 border-amber-400 pl-3">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <ValidationIcon source="Lint" severity="warning" className="w-4 h-4" />
                  <span className="font-semibold text-gray-900">Best Practice</span>
                </div>
                <div className="flex items-center gap-1 text-blue-700">
                  <CheckCircle className="w-3 h-3" />
                  <span className="text-xs">Recommended</span>
                </div>
              </div>
              <p className="text-gray-600 leading-relaxed">
                Recommended improvement; does not invalidate FHIR. May improve interoperability.
              </p>
            </div>

            {/* HL7 Advisory */}
            <div className="border-l-2 border-blue-400 pl-3">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <ValidationIcon source="HL7Advisory" severity="info" className="w-4 h-4" />
                  <span className="font-semibold text-gray-900">HL7 Advisory</span>
                </div>
                <div className="flex items-center gap-1 text-blue-700">
                  <CheckCircle className="w-3 h-3" />
                  <span className="text-xs">Recommended</span>
                </div>
              </div>
              <p className="text-gray-600 leading-relaxed">
                Recommended improvement; does not invalidate FHIR. Guidance from HL7 specification.
              </p>
            </div>
          </div>
          
          <div className="mt-3 pt-3 border-t border-gray-200 space-y-1">
            <p className="text-xs text-gray-700 leading-relaxed">
              <span className="font-medium">Correctness issues must be fixed to produce valid HL7 FHIR.</span>
            </p>
            <p className="text-xs text-gray-600 leading-relaxed">
              Recommendations improve quality but do not affect validity.
            </p>
            <p className="text-xs text-blue-600 leading-relaxed mt-2">
              <a 
                href="/docs/STRUCTURE_VALIDATION_COVERAGE_PHASE_1.md" 
                target="_blank" 
                rel="noopener noreferrer"
                className="underline hover:text-blue-800"
              >
                Learn more about STRUCTURE validation →
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
