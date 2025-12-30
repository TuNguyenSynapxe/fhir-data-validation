import React, { useState } from 'react';
import { Info, Copy, Check } from 'lucide-react';

interface PathInfoTooltipProps {
  fhirPath: string;
  jsonPath: string;
  className?: string;
}

/**
 * PathInfoTooltip Component
 * 
 * Displays an info icon that opens a tooltip showing:
 * - FHIRPath (canonical representation)
 * - JSONPath (derived assistive representation)
 * Both with copy-to-clipboard functionality
 */
export const PathInfoTooltip: React.FC<PathInfoTooltipProps> = ({
  fhirPath,
  jsonPath,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copiedFhir, setCopiedFhir] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);

  // Remove duplicate resource type prefix if present
  // e.g., "Patient.Patient[*].gender" → "Patient[*].gender"
  const cleanedFhirPath = React.useMemo(() => {
    if (!fhirPath) return fhirPath;
    
    // Match pattern: ResourceType.ResourceType[...].rest
    const duplicateMatch = fhirPath.match(/^([A-Z][a-zA-Z]+)\.(\1(?:\[|$).*)/);
    if (duplicateMatch) {
      return duplicateMatch[2]; // Return the deduplicated path
    }
    
    return fhirPath;
  }, [fhirPath]);

  const handleCopy = async (text: string, type: 'fhir' | 'json') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'fhir') {
        setCopiedFhir(true);
        setTimeout(() => setCopiedFhir(false), 2000);
      } else {
        setCopiedJson(true);
        setTimeout(() => setCopiedJson(false), 2000);
      }
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        onBlur={() => setTimeout(() => setIsOpen(false), 200)}
        className="p-1 rounded hover:bg-gray-100 transition-colors"
        title="Show path information"
      >
        <Info className="w-4 h-4 text-gray-500 opacity-0 group-hover/row:opacity-100 transition-opacity" />
      </button>

      {isOpen && (
        <div
          className="absolute z-50 right-0 mt-1 w-96 bg-white border border-gray-300 rounded-lg shadow-lg p-4"
          onClick={(e) => e.stopPropagation()}
        >
          {/* FHIRPath Section */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-gray-900">FHIRPath</h4>
              <span className="text-xs text-gray-500">(canonical)</span>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded p-2 mb-2">
              <code className="text-xs font-mono text-gray-800 break-all">
                {cleanedFhirPath}
              </code>
            </div>
            <button
              onClick={() => handleCopy(cleanedFhirPath, 'fhir')}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 rounded transition-colors"
            >
              {copiedFhir ? (
                <>
                  <Check className="w-3 h-3" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  Copy FHIRPath
                </>
              )}
            </button>
          </div>

          {/* JSONPath Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-gray-900">JSONPath</h4>
              <span className="text-xs text-gray-500">(derived, assistive)</span>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded p-2 mb-2">
              <code className="text-xs font-mono text-gray-800 break-all">
                {jsonPath}
              </code>
            </div>
            <button
              onClick={() => handleCopy(jsonPath, 'json')}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-amber-50 hover:bg-amber-100 text-amber-700 rounded transition-colors"
            >
              {copiedJson ? (
                <>
                  <Check className="w-3 h-3" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  Copy JSONPath
                </>
              )}
            </button>
          </div>

          {/* Informational note */}
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-xs text-gray-600 leading-relaxed">
              FHIRPath is the authoritative representation. JSONPath is derived from the specific instance location in the Bundle JSON.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
