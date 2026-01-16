/**
 * Binding Explanation Registry
 * 
 * Single source of truth for author-facing explanations of ValueSet previewability.
 * Used across tree tooltips, details panel, and terminology drawer.
 */

export type Previewability =
  | "Explicit"
  | "Computed"
  | "External"
  | "Unsupported";

export interface BindingExplanationData {
  label: string;
  tone: "info" | "warning" | "neutral";
  description: string;
  authorGuidance: string;
}

export const BindingExplanation: Record<Previewability, BindingExplanationData> = {
  Explicit: {
    label: "Enumerated",
    tone: "info",
    description: "Codes are explicitly listed in this ValueSet.",
    authorGuidance: "Safe to preview and constrain."
  },
  Computed: {
    label: "Computed",
    tone: "info",
    description: "Codes are derived from an HL7 CodeSystem.",
    authorGuidance: "Subset constraints are allowed."
  },
  External: {
    label: "External Standard",
    tone: "neutral",
    description: "Codes are defined by an external authority (e.g. BCP-47, ISO, IANA).",
    authorGuidance: "Codes are not enumerated offline."
  },
  Unsupported: {
    label: "Complex",
    tone: "warning",
    description: "This ValueSet uses advanced FHIR logic (filters/excludes).",
    authorGuidance: "Offline expansion is not supported."
  }
};

/**
 * Get explanation data for a given previewability type
 */
export function getBindingExplanation(previewability: Previewability): BindingExplanationData {
  return BindingExplanation[previewability];
}

/**
 * Check if a ValueSet is previewable (has offline enumeration)
 */
export function isPreviewable(previewability: Previewability): boolean {
  return previewability === "Explicit" || previewability === "Computed";
}
