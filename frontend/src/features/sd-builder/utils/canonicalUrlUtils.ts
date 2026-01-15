/**
 * Utility functions for parsing and comparing canonical FHIR URLs.
 * Handles versioned canonical URLs (e.g., "http://example.com/ValueSet/foo|1.0.0")
 */

export interface ParsedCanonicalUrl {
  baseUrl: string;
  version?: string;
}

/**
 * Parses a canonical URL into base URL and optional version.
 * @param canonicalUrl - Full canonical URL (may include '|version' suffix)
 * @returns Object with baseUrl and optional version
 * @example
 * parseCanonicalUrl("http://hl7.org/fhir/ValueSet/administrative-gender|5.0.0")
 * // Returns: { baseUrl: "http://hl7.org/fhir/ValueSet/administrative-gender", version: "5.0.0" }
 */
export function parseCanonicalUrl(canonicalUrl: string): ParsedCanonicalUrl {
  if (!canonicalUrl) {
    return { baseUrl: '' };
  }

  const pipeIndex = canonicalUrl.indexOf('|');
  if (pipeIndex === -1) {
    return { baseUrl: canonicalUrl };
  }

  return {
    baseUrl: canonicalUrl.substring(0, pipeIndex),
    version: canonicalUrl.substring(pipeIndex + 1)
  };
}

/**
 * Compares two canonical URLs ignoring version suffixes.
 * @param url1 - First canonical URL
 * @param url2 - Second canonical URL
 * @returns true if base URLs match (versions ignored)
 * @example
 * isSameCanonical("http://example.com/ValueSet/foo|1.0.0", "http://example.com/ValueSet/foo|2.0.0")
 * // Returns: true
 */
export function isSameCanonical(url1: string, url2: string): boolean {
  const parsed1 = parseCanonicalUrl(url1);
  const parsed2 = parseCanonicalUrl(url2);
  return parsed1.baseUrl === parsed2.baseUrl;
}

/**
 * Formats FHIR version for display.
 * @param version - Version string (e.g., "5.0.0")
 * @returns Formatted version string (e.g., "FHIR R5" or "FHIR 5.0.0")
 */
export function formatFhirVersion(version: string): string {
  if (!version) return '';
  
  // Convert major versions to R notation (5.x.x -> R5, 4.x.x -> R4)
  const majorVersion = version.split('.')[0];
  if (majorVersion === '5') return 'FHIR R5';
  if (majorVersion === '4') return 'FHIR R4';
  if (majorVersion === '3') return 'FHIR R3';
  
  return `FHIR ${version}`;
}
