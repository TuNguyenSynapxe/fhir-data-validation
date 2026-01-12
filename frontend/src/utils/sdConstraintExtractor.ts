/**
 * SD Constraint Extractor
 * 
 * Extracts human-readable constraint explanations from StructureDefinition JSON.
 * These are READ-ONLY, EXPLAIN-ONLY artifacts - NOT executable validation logic.
 * 
 * Firely validator enforces SD constraints during validation.
 * This utility only extracts human-readable descriptions for display purposes.
 */

export interface ImportedRule {
  id: string;
  category: 'Cardinality' | 'Fixed Value' | 'Profile Conformance' | 'Required Binding' | 'Forbidden' | 'Invariant' | 'Reference' | 'Slice Existence' | 'Slice Discriminator' | 'Slicing Closed';
  path: string;
  title: string;
  explanation: string;
  fhirPath?: string;
  slicingMetadata?: {
    sliceName?: string;
    discriminatorType?: string;
    discriminatorPath?: string;
    expectedValue?: any;
  };
}

/**
 * Extract all constraints from a StructureDefinition JSON
 */
export function extractConstraints(sdJson: any): ImportedRule[] {
  if (!sdJson || sdJson.resourceType !== 'StructureDefinition') {
    return [];
  }

  const rules: ImportedRule[] = [];
  // FIX #1: Read from differential first, fallback to snapshot
  const elements = sdJson.differential?.element ?? sdJson.snapshot?.element ?? [];

  for (const element of elements) {
    // Extract cardinality rules
    rules.push(...extractCardinalityRules(element, sdJson.name));

    // Extract fixed value rules
    rules.push(...extractFixedValueRules(element, sdJson.name));

    // Extract profile conformance rules
    rules.push(...extractProfileRules(element, sdJson.name));

    // Extract required binding rules
    rules.push(...extractRequiredBindingRules(element, sdJson.name));

    // FIX #3: Extract invariant constraints
    rules.push(...extractInvariantRules(element, sdJson.name));

    // FIX #4: Extract reference target profile rules
    rules.push(...extractReferenceRules(element, sdJson.name));

    // Extract slicing rules (Phase 3.1 enhancement)
    rules.push(...extractSlicingRules(element, sdJson.name));
  }

  return rules;
}

/**
 * Extract cardinality rules (min/max)
 */
function extractCardinalityRules(element: any, sdName: string): ImportedRule[] {
  const rules: ImportedRule[] = [];
  const path = element.path;
  const min = element.min;
  const max = element.max;

  // Skip if no meaningful cardinality constraint
  if (min === undefined && max === undefined) {
    return rules;
  }

  // Skip root element (e.g., "Bundle")
  if (!path.includes('.')) {
    return rules;
  }

  // FIX #2: Extract max=0 as Forbidden rules
  if (max === '0') {
    rules.push({
      id: `forbidden-${path}`,
      category: 'Forbidden',
      path: path,
      title: `${path} is not allowed`,
      explanation: `This element must not be present (max = 0)`,
    });
    return rules;
  }

  // Skip if default cardinality (0..*)
  if (min === 0 && max === '*') {
    return rules;
  }

  // Generate human-readable explanation
  let explanation = '';
  if (min !== undefined && max !== undefined) {
    if (min === max) {
      explanation = `Must contain exactly ${min} item(s)`;
    } else if (max === '*') {
      explanation = `Must contain at least ${min} item(s)`;
    } else {
      explanation = `Must contain ${min}–${max} item(s)`;
    }
  } else if (min !== undefined) {
    explanation = `Must contain at least ${min} item(s)`;
  } else if (max !== undefined && max !== '*') {
    explanation = `Must contain at most ${max} item(s)`;
  }

  if (explanation) {
    rules.push({
      id: `cardinality-${path}`,
      category: 'Cardinality',
      path: path,
      title: `${path} cardinality: ${min}..${max}`,
      explanation: explanation,
    });
  }

  return rules;
}

/**
 * Extract fixed value rules (fixed[x])
 */
function extractFixedValueRules(element: any, sdName: string): ImportedRule[] {
  const rules: ImportedRule[] = [];
  const path = element.path;

  // Check for fixed[x] properties
  const fixedKeys = Object.keys(element).filter(key => key.startsWith('fixed'));
  
  for (const fixedKey of fixedKeys) {
    const fixedValue = element[fixedKey];
    let displayValue = '';

    // Format fixed value based on type
    if (typeof fixedValue === 'string') {
      displayValue = `"${fixedValue}"`;
    } else if (typeof fixedValue === 'boolean') {
      displayValue = fixedValue.toString();
    } else if (typeof fixedValue === 'object' && fixedValue !== null) {
      displayValue = JSON.stringify(fixedValue);
    } else {
      displayValue = String(fixedValue);
    }

    const valueType = fixedKey.replace('fixed', '');

    rules.push({
      id: `fixed-${path}-${fixedKey}`,
      category: 'Fixed Value',
      path: path,
      title: `${path} must be ${displayValue}`,
      explanation: `This element has a fixed value of ${displayValue} (type: ${valueType})`,
      fhirPath: `${path} = ${displayValue}`,
    });
  }

  return rules;
}

/**
 * Extract profile conformance rules (type.profile[])
 */
function extractProfileRules(element: any, sdName: string): ImportedRule[] {
  const rules: ImportedRule[] = [];
  const path = element.path;
  const types = element.type || [];

  for (const type of types) {
    // FIX #4: Handle both profile and targetProfile (for References)
    const profiles = type.profile || [];
    
    for (const profileUrl of profiles) {
      const profileName = profileUrl.split('/').pop() || profileUrl;
      
      rules.push({
        id: `profile-${path}-${profileName}`,
        category: 'Profile Conformance',
        path: path,
        title: `${path} must conform to ${profileName}`,
        explanation: `This element must conform to the profile: ${profileUrl}`,
      });
    }
  }

  return rules;
}

/**
 * FIX #4: Extract reference target profile rules (type.targetProfile[])
 */
function extractReferenceRules(element: any, sdName: string): ImportedRule[] {
  const rules: ImportedRule[] = [];
  const path = element.path;
  const types = element.type || [];

  for (const type of types) {
    if (type.code === 'Reference' && type.targetProfile) {
      const targetProfiles = type.targetProfile || [];
      
      for (const targetProfileUrl of targetProfiles) {
        const resourceType = targetProfileUrl.split('/').pop() || targetProfileUrl;
        
        rules.push({
          id: `reference-${path}-${resourceType}`,
          category: 'Reference',
          path: path,
          title: `${path} must reference ${resourceType}`,
          explanation: `This reference must target a resource of type: ${resourceType}`,
        });
      }
    }
  }

  return rules;
}

/**
 * Extract required binding rules (binding with strength="required")
 */
function extractRequiredBindingRules(element: any, sdName: string): ImportedRule[] {
  const rules: ImportedRule[] = [];
  const path = element.path;
  const binding = element.binding;

  if (!binding || binding.strength !== 'required') {
    return rules;
  }

  const valueSetUrl = binding.valueSet || 'unknown';
  const valueSetName = valueSetUrl.split('/').pop() || valueSetUrl;

  rules.push({
    id: `binding-${path}`,
    category: 'Required Binding',
    path: path,
    title: `${path} must use ${valueSetName}`,
    explanation: `This element must use a code from the required ValueSet: ${valueSetUrl}`,
  });

  return rules;
}

/**
 * FIX #3: Extract invariant constraint rules (constraint[])
 */
function extractInvariantRules(element: any, sdName: string): ImportedRule[] {
  const rules: ImportedRule[] = [];
  const path = element.path;
  const constraints = element.constraint || [];

  for (const constraint of constraints) {
    // Only extract error-level constraints with human-readable text
    if (constraint.severity === 'error' && constraint.human) {
      rules.push({
        id: `invariant-${path}-${constraint.key}`,
        category: 'Invariant',
        path: path,
        title: constraint.human,
        explanation: `FHIRPath constraint: ${constraint.expression || 'N/A'}`,
        fhirPath: constraint.expression,
      });
    }
  }

  return rules;
}

/**
 * Extract slicing rules (Phase 3.1 enhancement)
 * 
 * STRICT RULES:
 * - Do NOT implement validation logic
 * - Do NOT evaluate slicing
 * - Firely remains the validator
 * - Extract human-readable explanations only
 * 
 * Extracts:
 * 1. Slice existence rules (sliceName, min/max)
 * 2. Slice discriminator intent (pattern/value/type discriminators only)
 * 3. Closed slicing metadata
 */
function extractSlicingRules(element: any, sdName: string): ImportedRule[] {
  const rules: ImportedRule[] = [];
  const path = element.path;

  // Extract slice existence rules (elements with sliceName)
  if (element.sliceName) {
    const min = element.min ?? 0;
    const max = element.max ?? '*';
    const sliceName = element.sliceName;

    rules.push({
      id: `slice-existence-${path}-${sliceName}`,
      category: 'Slice Existence',
      path: path,
      title: `Slice "${sliceName}" at ${path}`,
      explanation: `This slice must occur ${min}..${max} times`,
      slicingMetadata: {
        sliceName: sliceName,
      },
    });

    // Extract slice-level fixed[x] or pattern[x] constraints
    const fixedKeys = Object.keys(element).filter(k => k.startsWith('fixed') || k.startsWith('pattern'));
    for (const key of fixedKeys) {
      const fieldName = key.replace(/^(fixed|pattern)/, '');
      const value = element[key];
      rules.push({
        id: `slice-constraint-${path}-${sliceName}-${fieldName}`,
        category: 'Slice Discriminator',
        path: path,
        title: `Slice "${sliceName}" ${fieldName} constraint`,
        explanation: `This slice requires ${fieldName} = ${JSON.stringify(value)}`,
        slicingMetadata: {
          sliceName: sliceName,
          discriminatorType: key.startsWith('fixed') ? 'fixed' : 'pattern',
          discriminatorPath: fieldName,
          expectedValue: value,
        },
      });
    }
  }

  // Extract slicing discriminator rules (base element with slicing definition)
  if (element.slicing) {
    const slicing = element.slicing;

    // Extract discriminator intent (only pattern/value/type)
    if (slicing.discriminator && Array.isArray(slicing.discriminator)) {
      for (const discriminator of slicing.discriminator) {
        const type = discriminator.type;
        const discPath = discriminator.path;

        // Only extract safe discriminator types (NOT profile, exists, etc.)
        if (type === 'pattern' || type === 'value' || type === 'type') {
          rules.push({
            id: `slice-discriminator-${path}-${discPath}`,
            category: 'Slice Discriminator',
            path: path,
            title: `Slicing discriminator at ${path}`,
            explanation: `Slices are distinguished by ${type} discriminator on "${discPath}"`,
            slicingMetadata: {
              discriminatorType: type,
              discriminatorPath: discPath,
            },
          });
        }
      }
    }

    // Extract closed slicing metadata
    if (slicing.rules === 'closed') {
      rules.push({
        id: `slicing-closed-${path}`,
        category: 'Slicing Closed',
        path: path,
        title: `Closed slicing at ${path}`,
        explanation: `Only explicitly defined slices are allowed (no additional slices permitted)`,
      });
    }
  }

  return rules;
}
