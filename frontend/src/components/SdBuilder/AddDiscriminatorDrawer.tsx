import React, { useState, useMemo } from 'react';
import type { ElementDesign } from '../../api/sdBuilderApi';
import { Key, Info } from 'lucide-react';

interface AddDiscriminatorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  element: ElementDesign;
  allElements: ElementDesign[]; // Needed to extract child paths
  existingDiscriminators: Array<{ type: string; path: string }>;
  onAdd: (type: string, path: string) => void;
}

type DiscriminatorType = 'value' | 'pattern' | 'type' | 'profile' | 'exists';

/**
 * Drawer for adding discriminators using tree-based path selection.
 * No free text - user selects from valid child paths only.
 * 
 * FHIR Semantics:
 * - Discriminators are element-level, shared across all slices
 * - Path must be a valid child of the current element
 * - Type is constrained by the selected path's FHIR type
 */
export function AddDiscriminatorDrawer({
  isOpen,
  onClose,
  element,
  allElements,
  existingDiscriminators,
  onAdd,
}: AddDiscriminatorDrawerProps) {
  const [selectedPath, setSelectedPath] = useState<string>('');
  const [selectedType, setSelectedType] = useState<DiscriminatorType>('pattern');

  // Get valid child paths from all elements
  const validPaths = useMemo(() => {
    const paths: Array<{ path: string; type: string; displayName: string }> = [];
    const parentPath = element.path;
    
    // Find all child elements of this element
    allElements.forEach((el) => {
      if (el.path.startsWith(parentPath + '.') && !el.path.includes('[x]')) {
        const relativePath = el.path.replace(parentPath + '.', '');
        
        // Only include direct children (not nested grandchildren)
        if (!relativePath.includes('.') || relativePath.split('.').length <= 2) {
          paths.push({
            path: relativePath,
            type: el.typeCodes[0] || 'unknown',
            displayName: relativePath,
          });
        }
      }
    });
    
    return paths;
  }, [element.path, allElements]);

  // Determine allowed discriminator types based on selected path type
  const allowedTypes = useMemo((): DiscriminatorType[] => {
    if (!selectedPath) return ['pattern', 'value', 'type', 'profile', 'exists'];
    
    const pathInfo = validPaths.find(p => p.path === selectedPath);
    if (!pathInfo) return ['exists'];
    
    const fhirType = pathInfo.type.toLowerCase();
    
    // CodeableConcept and Coding typically use pattern
    if (fhirType.includes('codeableconcept') || fhirType.includes('coding')) {
      return ['pattern', 'value', 'exists'];
    }
    
    // Reference types can use profile or type
    if (fhirType === 'reference') {
      return ['profile', 'type', 'exists'];
    }
    
    // Primitive types typically use value
    if (['string', 'boolean', 'integer', 'decimal', 'code', 'uri', 'url'].includes(fhirType)) {
      return ['value', 'exists'];
    }
    
    // Complex types default to pattern
    return ['pattern', 'value', 'exists'];
  }, [selectedPath, validPaths]);

  const handleApply = () => {
    if (!selectedPath || !selectedType) return;
    
    // Check for duplicates
    const isDuplicate = existingDiscriminators.some(
      d => d.path === selectedPath && d.type === selectedType
    );
    
    if (isDuplicate) {
      alert('This discriminator already exists');
      return;
    }
    
    onAdd(selectedType, selectedPath);
    setSelectedPath('');
    setSelectedType('pattern');
    onClose();
  };

  const handleCancel = () => {
    setSelectedPath('');
    setSelectedType('pattern');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleCancel}
      />

      {/* Drawer */}
      <div className="absolute right-0 top-0 h-full w-[600px] bg-white shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2"><Key className="w-5 h-5" /> Add Discriminator</h2>
            <p className="text-sm text-gray-600 mt-1 flex items-start gap-2">
              <Info className="w-4 h-4 mt-0.5 flex-shrink-0" /> Select an element path used to distinguish slices.
            </p>
          </div>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* Element Context */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded">
            <div className="text-xs font-medium text-blue-900 mb-1">Parent Element</div>
            <div className="font-mono text-sm text-blue-800">{element.path}</div>
            <div className="text-xs text-blue-700 mt-2">
              Discriminators help distinguish repeated elements using their child properties
            </div>
          </div>

          {/* Path Selection (Tree-based) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Discriminator Path
            </label>
            <p className="text-xs text-gray-600 mb-3">
              Select a child element to use for distinguishing slices
            </p>
            
            {validPaths.length > 0 ? (
              <div className="space-y-1 max-h-[400px] overflow-y-auto border border-gray-300 rounded p-2">
                {validPaths.map((pathInfo) => (
                  <button
                    key={pathInfo.path}
                    onClick={() => {
                      setSelectedPath(pathInfo.path);
                      // Auto-select first allowed type
                      const allowed = allowedTypes;
                      if (!allowed.includes(selectedType)) {
                        setSelectedType(allowed[0]);
                      }
                    }}
                    className={`w-full text-left px-3 py-2 rounded transition-colors ${
                      selectedPath === pathInfo.path
                        ? 'bg-blue-100 border-2 border-blue-500'
                        : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm">{pathInfo.displayName}</span>
                      <span className="text-xs text-gray-500 px-2 py-0.5 bg-white rounded">
                        {pathInfo.type}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded text-sm text-amber-800">
                ⚠️ This element has no child elements available for discrimination
              </div>
            )}
          </div>

          {/* Type Selection (Constrained by path) */}
          {selectedPath && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Discriminator Type
              </label>
              <p className="text-xs text-gray-600 mb-3">
                Type is constrained based on the selected path's FHIR type
              </p>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as DiscriminatorType)}
                className="w-full px-3 py-2 border border-gray-300 rounded bg-white"
              >
                {allowedTypes.map((type) => (
                  <option key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>
              
              {/* Type explanation */}
              <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-700">
                {selectedType === 'pattern' && '✓ Pattern: Match by partial structure (recommended for CodeableConcept)'}
                {selectedType === 'value' && '✓ Value: Match by exact value'}
                {selectedType === 'type' && '✓ Type: Match by FHIR type'}
                {selectedType === 'profile' && '✓ Profile: Match by profile URL'}
                {selectedType === 'exists' && '✓ Exists: Match by presence/absence'}
              </div>
            </div>
          )}

          {/* Preview */}
          {selectedPath && (
            <div className="p-3 bg-green-50 border border-green-200 rounded">
              <div className="text-xs font-medium text-green-900 mb-2">Preview</div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded font-medium">
                  {selectedType}
                </span>
                <span className="font-mono text-sm text-green-800">{selectedPath}</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={handleCancel}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={!selectedPath || !selectedType}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Add Discriminator
          </button>
        </div>
      </div>
    </div>
  );
}
