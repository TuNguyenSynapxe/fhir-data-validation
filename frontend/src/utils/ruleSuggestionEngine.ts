/**
 * Rule Suggestion Engine - Deterministic rule suggestion logic
 * 
 * Phase 1: Pattern-based analysis (NO AI)
 * 
 * CONSTRAINTS:
 * - Deterministic logic only
 * - No AI/ML
 * - No auto-creation
 * - No bundle mutation
 * - No persistence
 * - Explainable suggestions
 */

import {
  type RuleSuggestion,
  type RuleSuggestionContext,
  RULE_TEMPLATES,
} from '../types/ruleTemplate';

/**
 * Suggest rules based on bundle/sample analysis
 * 
 * PURE FUNCTION:
 * - No side effects
 * - No mutation
 * - No API calls
 * - Deterministic output
 * 
 * @param context - Analysis context (bundle, sample, existing rules)
 * @returns Array of rule suggestions with confidence and reasoning
 */
export function suggestRules(context: RuleSuggestionContext): RuleSuggestion[] {
  const suggestions: RuleSuggestion[] = [];

  // Analyze project bundle (highest priority)
  if (context.projectBundle) {
    suggestions.push(...analyzeBundle(context.projectBundle, context.resourceType, context.existingRules));
  }

  // Analyze selected sample (secondary)
  if (context.selectedSample) {
    suggestions.push(...analyzeSample(context.selectedSample, context.resourceType, context.existingRules));
  }

  // Deduplicate and sort by confidence
  return deduplicateSuggestions(suggestions).sort((a, b) => {
    const confidenceOrder = { high: 3, medium: 2, low: 1 };
    return confidenceOrder[b.confidence] - confidenceOrder[a.confidence];
  });
}

/**
 * Analyze bundle for rule suggestions
 */
function analyzeBundle(
  bundle: any,
  resourceType: string,
  existingRules: any[] = []
): RuleSuggestion[] {
  const suggestions: RuleSuggestion[] = [];

  try {
    const data = typeof bundle === 'string' ? JSON.parse(bundle) : bundle;
    const resources = extractResourcesByType(data, resourceType);

    if (resources.length === 0) {
      return suggestions;
    }

    // Analyze field patterns across all resources
    const fieldAnalysis = analyzeFieldPatterns(resources);

    // Generate suggestions from patterns
    suggestions.push(...generateRequiredFieldSuggestions(fieldAnalysis, resourceType, existingRules));
    suggestions.push(...generateFixedValueSuggestions(fieldAnalysis, resourceType, existingRules));
    suggestions.push(...generateCodeSystemSuggestions(fieldAnalysis, resourceType, existingRules));
    suggestions.push(...generateArrayLengthSuggestions(fieldAnalysis, resourceType, existingRules));
    suggestions.push(...generateReferenceSuggestions(fieldAnalysis, resourceType, existingRules));
  } catch (error) {
    // Silent failure - suggestions are optional
    console.warn('Bundle analysis failed:', error);
  }

  return suggestions;
}

/**
 * Analyze sample for rule suggestions
 */
function analyzeSample(
  sample: any,
  resourceType: string,
  existingRules: any[] = []
): RuleSuggestion[] {
  const suggestions: RuleSuggestion[] = [];

  try {
    const data = typeof sample === 'string' ? JSON.parse(sample) : sample;
    
    // Treat single sample as array for analysis
    const resources = [data];
    const fieldAnalysis = analyzeFieldPatterns(resources);

    // Generate suggestions (lower confidence than bundle analysis)
    suggestions.push(...generateRequiredFieldSuggestions(fieldAnalysis, resourceType, existingRules, 'sample'));
    suggestions.push(...generateCodeSystemSuggestions(fieldAnalysis, resourceType, existingRules, 'sample'));
  } catch (error) {
    console.warn('Sample analysis failed:', error);
  }

  return suggestions;
}

/**
 * Extract resources of specific type from bundle
 */
function extractResourcesByType(data: any, resourceType: string): any[] {
  const resources: any[] = [];

  if (data.resourceType === 'Bundle' && Array.isArray(data.entry)) {
    for (const entry of data.entry) {
      if (entry.resource?.resourceType === resourceType) {
        resources.push(entry.resource);
      }
    }
  } else if (data.resourceType === resourceType) {
    resources.push(data);
  }

  return resources;
}

/**
 * Analyze field patterns across resources
 */
interface FieldPattern {
  path: string;
  occurrences: number;
  totalResources: number;
  values: Set<any>;
  types: Set<string>;
  isArray: boolean;
  arrayLengths: number[];
}

function analyzeFieldPatterns(resources: any[]): Map<string, FieldPattern> {
  const patterns = new Map<string, FieldPattern>();

  for (const resource of resources) {
    analyzeResourceFields(resource, '', patterns, resources.length);
  }

  return patterns;
}

/**
 * Recursively analyze fields in a resource
 */
function analyzeResourceFields(
  obj: any,
  parentPath: string,
  patterns: Map<string, FieldPattern>,
  totalResources: number,
  depth: number = 0
): void {
  if (depth > 5 || !obj || typeof obj !== 'object') {
    return;
  }

  for (const key in obj) {
    const value = obj[key];
    const path = parentPath ? `${parentPath}.${key}` : key;

    // Initialize or update pattern
    if (!patterns.has(path)) {
      patterns.set(path, {
        path,
        occurrences: 0,
        totalResources,
        values: new Set(),
        types: new Set(),
        isArray: false,
        arrayLengths: [],
      });
    }

    const pattern = patterns.get(path)!;
    pattern.occurrences++;

    // Analyze value
    if (value === null || value === undefined) {
      pattern.types.add('null');
    } else if (Array.isArray(value)) {
      pattern.isArray = true;
      pattern.arrayLengths.push(value.length);
      pattern.types.add('array');

      // Analyze array elements
      for (const item of value) {
        if (item && typeof item === 'object') {
          analyzeResourceFields(item, path, patterns, totalResources, depth + 1);
        }
      }
    } else if (typeof value === 'object') {
      pattern.types.add('object');
      analyzeResourceFields(value, path, patterns, totalResources, depth + 1);
    } else {
      // Primitive value
      pattern.types.add(typeof value);
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        pattern.values.add(value);
      }
    }
  }
}

/**
 * Generate "Required Field" suggestions
 */
function generateRequiredFieldSuggestions(
  patterns: Map<string, FieldPattern>,
  resourceType: string,
  existingRules: any[],
  source: 'bundle' | 'sample' = 'bundle'
): RuleSuggestion[] {
  const suggestions: RuleSuggestion[] = [];

  for (const [path, pattern] of patterns) {
    // Skip if already has required rule
    if (hasExistingRule(existingRules, path, 'exists')) {
      continue;
    }

    // Suggest if field appears in all resources
    const presenceRate = pattern.occurrences / pattern.totalResources;
    
    if (presenceRate === 1.0) {
      const template = RULE_TEMPLATES.required;
      suggestions.push({
        id: `required-${path}-${Date.now()}`,
        templateId: template.id,
        templateName: template.name,
        confidence: source === 'bundle' && pattern.totalResources > 1 ? 'high' : 'medium',
        reason: `Field '${path}' is present in all ${pattern.totalResources} ${resourceType} resource(s)`,
        suggestedInputs: {
          fieldPath: path,
          message: `${path} is required`,
        },
        preview: template.generateRule({ fieldPath: path }),
        context: {
          resourceType,
          fieldPath: path,
          occurrences: pattern.occurrences,
        },
      });
    }
  }

  return suggestions;
}

/**
 * Generate "Fixed Value" suggestions
 */
function generateFixedValueSuggestions(
  patterns: Map<string, FieldPattern>,
  resourceType: string,
  existingRules: any[],
  source: 'bundle' | 'sample' = 'bundle'
): RuleSuggestion[] {
  const suggestions: RuleSuggestion[] = [];

  for (const [path, pattern] of patterns) {
    // Skip if already has fixed value rule
    if (hasExistingRule(existingRules, path, 'equals')) {
      continue;
    }

    // Suggest if field has only one unique value across all resources
    if (pattern.values.size === 1 && pattern.occurrences === pattern.totalResources) {
      const fixedValue = Array.from(pattern.values)[0];
      const template = RULE_TEMPLATES.fixedValue;

      suggestions.push({
        id: `fixed-${path}-${Date.now()}`,
        templateId: template.id,
        templateName: template.name,
        confidence: source === 'bundle' && pattern.totalResources > 1 ? 'high' : 'medium',
        reason: `Field '${path}' has the same value ('${fixedValue}') in all ${pattern.totalResources} resource(s)`,
        suggestedInputs: {
          fieldPath: path,
          expectedValue: String(fixedValue),
        },
        preview: template.generateRule({ fieldPath: path, expectedValue: fixedValue }),
        context: {
          resourceType,
          fieldPath: path,
          sampleValue: fixedValue,
          occurrences: pattern.occurrences,
        },
      });
    }
  }

  return suggestions;
}

/**
 * Generate "Code System" suggestions
 */
function generateCodeSystemSuggestions(
  patterns: Map<string, FieldPattern>,
  resourceType: string,
  existingRules: any[],
  source: 'bundle' | 'sample' = 'bundle'
): RuleSuggestion[] {
  const suggestions: RuleSuggestion[] = [];

  for (const [path, pattern] of patterns) {
    // Look for fields that might be code system URLs
    if (path.includes('system') && pattern.values.size > 0) {
      const urls = Array.from(pattern.values).filter(v => 
        typeof v === 'string' && (v.startsWith('http://') || v.startsWith('https://'))
      );

      if (urls.length === 1) {
        const codeSystemUrl = urls[0];
        const template = RULE_TEMPLATES.codeSystem;

        if (!hasExistingRule(existingRules, path, 'equals', codeSystemUrl)) {
          suggestions.push({
            id: `codesystem-${path}-${Date.now()}`,
            templateId: template.id,
            templateName: template.name,
            confidence: source === 'bundle' ? 'medium' : 'low',
            reason: `Field '${path}' uses code system '${codeSystemUrl}' in ${pattern.occurrences} resource(s)`,
            suggestedInputs: {
              fieldPath: path,
              codeSystemUrl,
            },
            preview: template.generateRule({ fieldPath: path, codeSystemUrl }),
            context: {
              resourceType,
              fieldPath: path,
              sampleValue: codeSystemUrl,
              occurrences: pattern.occurrences,
            },
          });
        }
      }
    }
  }

  return suggestions;
}

/**
 * Generate "Array Length" suggestions
 */
function generateArrayLengthSuggestions(
  patterns: Map<string, FieldPattern>,
  resourceType: string,
  existingRules: any[]
): RuleSuggestion[] {
  const suggestions: RuleSuggestion[] = [];

  for (const [path, pattern] of patterns) {
    if (pattern.isArray && pattern.arrayLengths.length > 0) {
      const minLength = Math.min(...pattern.arrayLengths);
      
      // Suggest minimum length if > 0
      if (minLength > 0 && !hasExistingRule(existingRules, `${path}.count()`, 'greaterThanOrEqual')) {
        const template = RULE_TEMPLATES.arrayLength;
        
        suggestions.push({
          id: `arraylen-${path}-${Date.now()}`,
          templateId: template.id,
          templateName: template.name,
          confidence: 'medium',
          reason: `Array '${path}' has at least ${minLength} element(s) in all resources`,
          suggestedInputs: {
            fieldPath: path,
            constraint: 'min',
            count: minLength,
          },
          preview: template.generateRule({ fieldPath: path, constraint: 'min', count: minLength }),
          context: {
            resourceType,
            fieldPath: path,
            occurrences: pattern.occurrences,
          },
        });
      }
    }
  }

  return suggestions;
}

/**
 * Generate "Reference Exists" suggestions
 */
function generateReferenceSuggestions(
  patterns: Map<string, FieldPattern>,
  resourceType: string,
  existingRules: any[]
): RuleSuggestion[] {
  const suggestions: RuleSuggestion[] = [];

  for (const [path, pattern] of patterns) {
    // Look for reference fields
    if (path.includes('reference') && pattern.occurrences === pattern.totalResources) {
      if (!hasExistingRule(existingRules, path, 'exists')) {
        const template = RULE_TEMPLATES.referenceExists;

        suggestions.push({
          id: `ref-${path}-${Date.now()}`,
          templateId: template.id,
          templateName: template.name,
          confidence: 'low',
          reason: `Reference field '${path}' is present in all resources`,
          suggestedInputs: {
            fieldPath: path,
          },
          preview: template.generateRule({ fieldPath: path }),
          context: {
            resourceType,
            fieldPath: path,
            occurrences: pattern.occurrences,
          },
        });
      }
    }
  }

  return suggestions;
}

/**
 * Check if a rule already exists for the given path/operator
 */
function hasExistingRule(
  existingRules: any[],
  path: string,
  operator: string,
  value?: any
): boolean {
  if (!existingRules || existingRules.length === 0) {
    return false;
  }

  return existingRules.some(rule => 
    rule.fhirPath === path && 
    rule.operator === operator &&
    (value === undefined || rule.value === value)
  );
}

/**
 * Deduplicate suggestions by path + template
 */
function deduplicateSuggestions(suggestions: RuleSuggestion[]): RuleSuggestion[] {
  const seen = new Set<string>();
  const unique: RuleSuggestion[] = [];

  for (const suggestion of suggestions) {
    const key = `${suggestion.templateId}-${suggestion.context.fieldPath}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(suggestion);
    }
  }

  return unique;
}
