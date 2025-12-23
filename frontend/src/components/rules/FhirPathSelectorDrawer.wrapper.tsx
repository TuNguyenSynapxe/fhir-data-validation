/**
 * FhirPathSelectorDrawer - Backward Compatibility Wrapper
 * 
 * This is a compatibility wrapper around the new FhirPathPicker component.
 * Maintains the original API while using the refactored component underneath.
 * 
 * DEPRECATION NOTICE: This wrapper is maintained for backward compatibility.
 * New code should use FhirPathPicker directly with the appropriate mode.
 * 
 * Migration Guide:
 * 
 * OLD (FhirPathSelectorDrawer):
 * ```tsx
 * <FhirPathSelectorDrawer
 *   isOpen={isOpen}
 *   onClose={onClose}
 *   onSelect={(path) => setFormData({ ...formData, path })}
 *   resourceType="Observation"
 *   projectBundle={bundle}
 *   hl7Samples={samples}
 * />
 * ```
 * 
 * NEW (FhirPathPicker - field mode):
 * ```tsx
 * <FhirPathPicker
 *   mode="field"
 *   isOpen={isOpen}
 *   bundle={bundle}
 *   resourceType="Observation"
 *   allowAbsolute={true}
 *   onSelect={(result) => {
 *     if (result.kind === 'field') {
 *       setFormData({ ...formData, path: result.absolutePath });
 *     }
 *   }}
 *   onCancel={onClose}
 *   hl7Samples={samples}
 * />
 * ```
 */

import React from 'react';
import { FhirPathPicker } from '../common/FhirPathPicker';
import type { FhirPathPickerResult } from '../common/FhirPathPicker';
import type { FhirSampleMetadata } from '../../types/fhirSample';

interface FhirPathSelectorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (path: string) => void; // Returns FHIRPath string ONLY
  resourceType: string;
  projectBundle?: object; // Read-only project bundle
  hl7Samples?: FhirSampleMetadata[]; // Read-only HL7 samples
}

/**
 * Backward compatibility wrapper for FhirPathSelectorDrawer
 * 
 * @deprecated Use FhirPathPicker directly with mode="field"
 */
const FhirPathSelectorDrawer: React.FC<FhirPathSelectorDrawerProps> = ({
  isOpen,
  onClose,
  onSelect,
  resourceType,
  projectBundle,
  hl7Samples,
}) => {
  const handleSelect = (result: FhirPathPickerResult) => {
    // Extract string path based on result kind
    let pathString: string;

    switch (result.kind) {
      case 'node':
        pathString = result.path;
        break;
      case 'filter':
        pathString = result.composedPath;
        break;
      case 'field':
        pathString = result.absolutePath;
        break;
      default:
        pathString = '';
    }

    onSelect(pathString);
    onClose();
  };

  // Use field mode as default (most common use case)
  return (
    <FhirPathPicker
      mode="field"
      isOpen={isOpen}
      bundle={projectBundle || {}}
      resourceType={resourceType}
      allowAbsolute={true}
      onSelect={handleSelect}
      onCancel={onClose}
      hl7Samples={hl7Samples}
    />
  );
};

export default FhirPathSelectorDrawer;
