/**
 * Slicing Discriminator Recommender — EPIC 2 Context-Aware
 * 
 * Deterministic, metadata-driven recommendations for slicing discriminators.
 * No AI. No network. No Firely SDK. Pure rule-based logic.
 * 
 * Rules applied in priority order:
 * 1. CodeableConcept with binding → pattern discriminator
 * 2. Coding with binding → value discriminator
 * 3. value[x] polymorphic → type discriminator
 * 4. Extension → value on url
 * 5. Dedup and stable sort
 */

export type DiscriminatorType = 'Value' | 'Pattern' | 'Exists' | 'Type' | 'Profile';

export interface RecommendedDiscriminator {
  type: DiscriminatorType;
  path: string;
  reason: string;
  confidence: 'high' | 'medium';
}

export interface ChildElementMetadata {
  path: string;              // Full child path (e.g., "Observation.component.code")
  typeCodes: string[];       // FHIR types
  hasBinding: boolean;       // True if binding exists
  bindingValueSetUrl?: string;
}

export interface RecommenderParams {
  elementPath: string;        // Container path (e.g., "Observation.component")
  elementTypeCodes: string[]; // Container types
  children: ChildElementMetadata[];
}

/**
 * Recommend discriminators based on element and its children.
 * Returns recommendations in priority order (highest confidence first).
 */
export function recommendDiscriminators(params: RecommenderParams): RecommendedDiscriminator[] {
  const { elementPath, elementTypeCodes, children } = params;
  const recommendations: RecommendedDiscriminator[] = [];

  // Hard-coded rule: Observation.component → ONLY pattern on code (FHIR best practice)
  // This is the ONLY valid primary discriminator per HL7 examples and IG practice
  if (elementPath === 'Observation.component') {
    const codeChild = children.find((c) => c.path.endsWith('.code'));
    if (codeChild) {
      return [
        {
          type: 'Pattern',
          path: 'code',
          reason: 'CodeableConcept with binding (FHIR best practice)',
          confidence: 'high',
        },
      ];
    }
    // If no code child found, return empty (no recommendations)
    return [];
  }

  // Extract relative path (child path relative to container)
  const getRelativePath = (childPath: string): string => {
    if (childPath.startsWith(elementPath + '.')) {
      return childPath.substring(elementPath.length + 1);
    }
    return childPath;
  };

  // Rule 1: CodeableConcept with binding → pattern discriminator (HIGH priority)
  for (const child of children) {
    const hasCodeableConcept = child.typeCodes.includes('CodeableConcept');
    if (hasCodeableConcept && child.hasBinding) {
      const relativePath = getRelativePath(child.path);
      recommendations.push({
        type: 'Pattern',
        path: relativePath,
        reason: 'CodeableConcept with binding (best discriminator)',
        confidence: 'high',
      });

      // Also recommend value on coding.code as alternative
      recommendations.push({
        type: 'Value',
        path: `${relativePath}.coding.code`,
        reason: 'Alternative: code value within CodeableConcept',
        confidence: 'medium',
      });
    }
  }

  // Rule 2: Coding with binding → value discriminator (HIGH priority)
  for (const child of children) {
    const hasCoding = child.typeCodes.includes('Coding');
    if (hasCoding && child.hasBinding) {
      const relativePath = getRelativePath(child.path);
      recommendations.push({
        type: 'Value',
        path: `${relativePath}.code`,
        reason: 'Coding discriminator on code element',
        confidence: 'high',
      });
    }
  }

  // Rule 3: value[x] polymorphic → type discriminator (MEDIUM priority)
  for (const child of children) {
    const isPolymorphic = child.path.includes('value[x]') || 
                          child.path.match(/value[A-Z]/); // valueString, valueQuantity, etc.
    if (isPolymorphic) {
      const relativePath = getRelativePath(child.path);
      recommendations.push({
        type: 'Type',
        path: relativePath,
        reason: 'Polymorphic value[x] often sliced by type',
        confidence: 'medium',
      });
    }
  }

  // Rule 4: Extension → value on url (MEDIUM priority)
  // Check if parent element is an Extension (e.g., Patient.extension)
  if (elementTypeCodes.includes('Extension') || elementPath.endsWith('.extension')) {
    const urlChild = children.find((c) => c.path.endsWith('.url'));
    if (urlChild) {
      recommendations.push({
        type: 'Value',
        path: 'url', // Extensions are sliced by url
        reason: 'Extensions often sliced by url',
        confidence: 'medium',
      });
    }
  }

  // Rule 5: Dedup (same type + path)
  const seen = new Set<string>();
  const dedupedRecommendations = recommendations.filter((rec) => {
    const key = `${rec.type}|${rec.path}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Rule 6: Stable ordering (confidence first, then path lexicographic)
  dedupedRecommendations.sort((a, b) => {
    // Sort by confidence (high first)
    if (a.confidence !== b.confidence) {
      return a.confidence === 'high' ? -1 : 1;
    }
    // Then by path (lexicographic)
    return a.path.localeCompare(b.path);
  });

  return dedupedRecommendations;
}

/**
 * Extract child element metadata from tree nodes.
 * Used to prepare input for recommendDiscriminators().
 */
export function extractChildrenMetadata(
  parentPath: string,
  allElements: Array<{
    path: string;
    typeCodes: string[];
    baseBinding: { valueSetUrl: string } | null;
    overrideBinding: { valueSetUrl: string } | null;
  }>
): ChildElementMetadata[] {
  const children: ChildElementMetadata[] = [];

  for (const element of allElements) {
    // Check if this is a direct child of parent
    if (element.path.startsWith(parentPath + '.')) {
      const pathParts = element.path.substring(parentPath.length + 1).split('.');
      // Only direct children (no grandchildren)
      if (pathParts.length === 1) {
        const binding = element.overrideBinding || element.baseBinding;
        children.push({
          path: element.path,
          typeCodes: element.typeCodes,
          hasBinding: !!binding,
          bindingValueSetUrl: binding?.valueSetUrl,
        });
      }
    }
  }

  return children;
}
