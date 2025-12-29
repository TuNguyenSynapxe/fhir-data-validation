/**
 * FHIRPath Selection Mode Types
 * 
 * Semantic control for FHIRPath selection based on rule requirements:
 * - 'free': Full tree selection (Required, Pattern, FixedValue, ArrayLength)
 * - 'suggested': Show common paths, allow custom (Resource filters)
 * - 'restricted': Only allow whitelisted semantic paths (Terminology, QuestionAnswer)
 */

export type FhirPathSelectionMode =
  | 'free'        // Existing behavior: tree-based, any node
  | 'suggested'   // Suggest valid paths, allow custom FHIRPath
  | 'restricted'; // Only allow whitelisted semantic paths

/**
 * FHIRPath option for suggested/restricted modes
 */
export interface FhirPathOption {
  label: string;              // Display name (e.g., "Language Code")
  fhirPath: string;           // Actual FHIRPath (e.g., "communication.language.coding")
  description?: string;       // Optional help text
  semanticType?: 'Coding' | 'CodeableConcept' | 'Identifier' | 'string' | 'other';
  usageCount?: number;        // For suggested mode: how many resources have this path
  isExtension?: boolean;      // True if this is an extension path
  extensionUrl?: string;      // The extension URL (for where() clause)
  badge?: string;             // Visual badge text (e.g., "Extension", "Coding")
}
