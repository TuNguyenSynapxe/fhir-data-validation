/**
 * Validation Layer Metadata
 * 
 * Defines authoritative information about each validation layer including:
 * - Display names
 * - Blocking status
 * - Standard explanations
 * - Visual styling
 */

export type ValidationSource = 'LINT' | 'SPEC_HINT' | 'FHIR' | 'PROJECT' | 'Firely' | 'Business' | 'BusinessRules' | 'CodeMaster' | 'Reference';

export interface ValidationLayerMetadata {
  /** Display name for badges */
  displayName: string;
  /** Full name for tooltips */
  fullName: string;
  /** Whether this layer blocks submission */
  isBlocking: boolean;
  /** Standard explanation text */
  explanation: string;
  /** Badge color classes */
  badgeColor: string;
  /** Border color for cards */
  borderColor: string;
  /** Background color for severity */
  bgColor: string;
  /** Text color */
  textColor: string;
}

/**
 * Normalize source string to canonical form
 */
export const normalizeSource = (source: string): ValidationSource => {
  const normalized = source.toLowerCase().replace(/[_\s-]/g, '');
  
  if (normalized === 'lint') return 'LINT';
  if (normalized === 'spechint' || normalized === 'spec_hint') return 'SPEC_HINT';
  if (normalized === 'fhir' || normalized === 'firely') return 'FHIR';
  if (normalized === 'business' || normalized === 'businessrules' || normalized === 'project') return 'PROJECT';
  if (normalized === 'codemaster') return 'CodeMaster';
  if (normalized === 'reference') return 'Reference';
  
  return source as ValidationSource;
};

/**
 * Get metadata for a validation layer
 */
export const getLayerMetadata = (source: string): ValidationLayerMetadata => {
  const normalized = normalizeSource(source);
  
  switch (normalized) {
    case 'LINT':
      return {
        displayName: 'Lint (Best-effort)',
        fullName: 'Lint - Best-effort Portability Check',
        isBlocking: false,
        explanation: 'Best-effort portability check. Some FHIR engines may accept this, others may reject it.',
        badgeColor: 'bg-yellow-100 text-yellow-800 border-yellow-300',
        borderColor: 'border-l-yellow-400',
        bgColor: 'bg-yellow-50',
        textColor: 'text-yellow-800',
      };
      
    case 'SPEC_HINT':
      return {
        displayName: 'HL7 Advisory',
        fullName: 'HL7 Advisory - Guidance from FHIR Specification',
        isBlocking: false,
        explanation: 'Guidance from the HL7 FHIR specification. Advisory only and does not block validation.',
        badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
        borderColor: 'border-l-blue-400',
        bgColor: 'bg-blue-50',
        textColor: 'text-blue-800',
      };
      
    case 'FHIR':
    case 'Firely':
      return {
        displayName: 'FHIR Structural Validation',
        fullName: 'FHIR Structural Validation by Firely Engine',
        isBlocking: true,
        explanation: 'FHIR structural validation performed by the Firely engine.',
        badgeColor: 'bg-red-100 text-red-800 border-red-300',
        borderColor: 'border-l-red-500',
        bgColor: 'bg-red-50',
        textColor: 'text-red-800',
      };
      
    case 'PROJECT':
    case 'Business':
    case 'BusinessRules':
      return {
        displayName: 'Project Rule',
        fullName: 'Project Rule - Defined by Your Configuration',
        isBlocking: true,
        explanation: 'Rule defined by your project configuration.',
        badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
        borderColor: 'border-l-purple-500',
        bgColor: 'bg-purple-50',
        textColor: 'text-purple-800',
      };
      
    case 'CodeMaster':
      return {
        displayName: 'Code System Validation',
        fullName: 'Code System Validation',
        isBlocking: true,
        explanation: 'Code system validation performed by the system.',
        badgeColor: 'bg-orange-100 text-orange-800 border-orange-300',
        borderColor: 'border-l-orange-500',
        bgColor: 'bg-orange-50',
        textColor: 'text-orange-800',
      };
      
    case 'Reference':
      return {
        displayName: 'Reference Validation',
        fullName: 'Reference Validation - Bundle Integrity Check',
        isBlocking: true,
        explanation: 'Ensures referenced resources exist within the bundle. This is not a rule.',
        badgeColor: 'bg-rose-100 text-rose-800 border-rose-300',
        borderColor: 'border-l-rose-500',
        bgColor: 'bg-rose-50',
        textColor: 'text-rose-800',
      };
      
    default:
      return {
        displayName: source,
        fullName: source,
        isBlocking: false,
        explanation: 'Additional validation check.',
        badgeColor: 'bg-gray-100 text-gray-800 border-gray-300',
        borderColor: 'border-l-gray-400',
        bgColor: 'bg-gray-50',
        textColor: 'text-gray-800',
      };
  }
};

/**
 * Validation layer ordering for display
 */
export const LAYER_ORDER: ValidationSource[] = [
  'LINT',
  'SPEC_HINT',
  'FHIR',
  'PROJECT',
];

/**
 * Get sort priority for a validation layer (lower = higher priority)
 */
export const getLayerSortPriority = (source: string): number => {
  const normalized = normalizeSource(source);
  const index = LAYER_ORDER.indexOf(normalized);
  return index === -1 ? 999 : index;
};
