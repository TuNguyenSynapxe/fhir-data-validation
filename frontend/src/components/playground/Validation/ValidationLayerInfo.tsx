import React from 'react';
import { HelpCircle, XCircle, CheckCircle } from 'lucide-react';

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
          
          <div className="space-y-3 text-xs">
            {/* LINT */}
            <div className="border-l-2 border-yellow-400 pl-3">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-gray-900">Lint (Best-effort)</span>
                <div className="flex items-center gap-1 text-green-700">
                  <CheckCircle className="w-3 h-3" />
                  <span className="text-xs">Non-blocking</span>
                </div>
              </div>
              <p className="text-gray-600 leading-relaxed">
                Best-effort portability check. Some FHIR engines may accept this, others may reject it.
              </p>
            </div>
            
            {/* SPEC_HINT */}
            <div className="border-l-2 border-blue-400 pl-3">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-gray-900">HL7 Advisory</span>
                <div className="flex items-center gap-1 text-green-700">
                  <CheckCircle className="w-3 h-3" />
                  <span className="text-xs">Non-blocking</span>
                </div>
              </div>
              <p className="text-gray-600 leading-relaxed">
                Guidance from the HL7 FHIR specification. Advisory only and does not block validation.
              </p>
            </div>
            
            {/* FHIR Validation */}
            <div className="border-l-2 border-red-500 pl-3">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-gray-900">FHIR Structural Validation</span>
                <div className="flex items-center gap-1 text-red-700">
                  <XCircle className="w-3 h-3" />
                  <span className="text-xs font-semibold">Blocking</span>
                </div>
              </div>
              <p className="text-gray-600 leading-relaxed">
                FHIR structural validation performed by the Firely engine.
              </p>
            </div>
            
            {/* Reference Validation */}
            <div className="border-l-2 border-rose-500 pl-3">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-gray-900">Reference Validation</span>
                <div className="flex items-center gap-1 text-red-700">
                  <XCircle className="w-3 h-3" />
                  <span className="text-xs font-semibold">Blocking</span>
                </div>
              </div>
              <p className="text-gray-600 leading-relaxed">
                Ensures referenced resources exist within the bundle. This is not a rule.
              </p>
            </div>
            
            {/* Project Rules */}
            <div className="border-l-2 border-purple-500 pl-3">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-gray-900">Project Rule</span>
                <div className="flex items-center gap-1 text-purple-700">
                  <XCircle className="w-3 h-3" />
                  <span className="text-xs font-semibold">Blocking</span>
                </div>
              </div>
              <p className="text-gray-600 leading-relaxed">
                Rule defined by your project configuration.
              </p>
            </div>
          </div>
          
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              <span className="font-medium">Blocking</span> errors must be fixed for the bundle to be valid.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
