/**
 * Bundle Analysis for Instance Scope Filtering
 * 
 * Analyzes sample FHIR bundles to detect common filter patterns
 * and suggest filter options to users.
 */

import type { DetectedFilterOption } from './InstanceScope.types';

/**
 * Analyze bundle and detect filter options for a resource type
 */
export function detectFilterOptions(
  bundle: any,
  resourceType: string
): DetectedFilterOption[] {
  if (!bundle?.entry || !Array.isArray(bundle.entry)) {
    return [];
  }

  // Extract resources of the specified type
  const resources = bundle.entry
    .filter((entry: any) => entry.resource?.resourceType === resourceType)
    .map((entry: any) => entry.resource);

  if (resources.length === 0) {
    return [];
  }

  const options: DetectedFilterOption[] = [];

  // Detect code.coding.code patterns
  const codeCounts = detectCodePatterns(resources);
  codeCounts.forEach(({ code, count }) => {
    options.push({
      id: `code-${code}`,
      label: `Code = "${code}"`,
      description: `Filter by code.coding.code (${count} instance${count > 1 ? 's' : ''})`,
      filterSpec: { type: 'code', code },
      count,
    });
  });

  // Detect code.coding.system + code patterns
  const systemCodeCounts = detectSystemCodePatterns(resources);
  systemCodeCounts.forEach(({ system, code, count }) => {
    options.push({
      id: `systemcode-${system}-${code}`,
      label: `${system}#${code}`,
      description: `Filter by system + code (${count} instance${count > 1 ? 's' : ''})`,
      filterSpec: { type: 'systemCode', system, code },
      count,
    });
  });

  // Detect identifier.system + value patterns
  const identifierCounts = detectIdentifierPatterns(resources);
  identifierCounts.forEach(({ system, value, count }) => {
    options.push({
      id: `identifier-${system}-${value}`,
      label: `Identifier: ${system}|${value}`,
      description: `Filter by identifier (${count} instance${count > 1 ? 's' : ''})`,
      filterSpec: { type: 'identifier', system, value },
      count,
    });
  });

  // Sort by count (most common first)
  return options.sort((a, b) => (b.count || 0) - (a.count || 0));
}

/**
 * Detect code.coding.code patterns
 */
function detectCodePatterns(resources: any[]): Array<{ code: string; count: number }> {
  const codeMap = new Map<string, number>();

  resources.forEach((resource) => {
    const codes = extractCodes(resource);
    codes.forEach((code) => {
      codeMap.set(code, (codeMap.get(code) || 0) + 1);
    });
  });

  return Array.from(codeMap.entries()).map(([code, count]) => ({ code, count }));
}

/**
 * Detect code.coding.system + code patterns
 */
function detectSystemCodePatterns(
  resources: any[]
): Array<{ system: string; code: string; count: number }> {
  const systemCodeMap = new Map<string, number>();

  resources.forEach((resource) => {
    const systemCodes = extractSystemCodes(resource);
    systemCodes.forEach(({ system, code }) => {
      const key = `${system}|${code}`;
      systemCodeMap.set(key, (systemCodeMap.get(key) || 0) + 1);
    });
  });

  return Array.from(systemCodeMap.entries()).map(([key, count]) => {
    const [system, code] = key.split('|');
    return { system, code, count };
  });
}

/**
 * Detect identifier.system + value patterns
 */
function detectIdentifierPatterns(
  resources: any[]
): Array<{ system: string; value: string; count: number }> {
  const identifierMap = new Map<string, number>();

  resources.forEach((resource) => {
    const identifiers = extractIdentifiers(resource);
    identifiers.forEach(({ system, value }) => {
      const key = `${system}|${value}`;
      identifierMap.set(key, (identifierMap.get(key) || 0) + 1);
    });
  });

  return Array.from(identifierMap.entries()).map(([key, count]) => {
    const [system, value] = key.split('|');
    return { system, value, count };
  });
}

/**
 * Extract codes from resource
 */
function extractCodes(resource: any): string[] {
  const codes: string[] = [];

  if (resource.code?.coding && Array.isArray(resource.code.coding)) {
    resource.code.coding.forEach((coding: any) => {
      if (coding.code) {
        codes.push(coding.code);
      }
    });
  }

  return codes;
}

/**
 * Extract system + code pairs from resource
 */
function extractSystemCodes(resource: any): Array<{ system: string; code: string }> {
  const systemCodes: Array<{ system: string; code: string }> = [];

  if (resource.code?.coding && Array.isArray(resource.code.coding)) {
    resource.code.coding.forEach((coding: any) => {
      if (coding.system && coding.code) {
        systemCodes.push({ system: coding.system, code: coding.code });
      }
    });
  }

  return systemCodes;
}

/**
 * Extract identifiers from resource
 */
function extractIdentifiers(resource: any): Array<{ system: string; value: string }> {
  const identifiers: Array<{ system: string; value: string }> = [];

  if (resource.identifier && Array.isArray(resource.identifier)) {
    resource.identifier.forEach((identifier: any) => {
      if (identifier.system && identifier.value) {
        identifiers.push({ system: identifier.system, value: identifier.value });
      }
    });
  }

  return identifiers;
}

/**
 * Get a sample resource for preview
 */
export function getSampleResource(bundle: any, resourceType: string): any | null {
  if (!bundle?.entry || !Array.isArray(bundle.entry)) {
    return null;
  }

  const entry = bundle.entry.find(
    (e: any) => e.resource?.resourceType === resourceType
  );

  return entry?.resource || null;
}
