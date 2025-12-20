/**
 * Unit Tests for Nested Array Refinement
 * 
 * Run with: npm test src/utils/__tests__/nestedArrayRefinement.test.ts
 */

import { describe, it, expect } from 'vitest';
import {
  detectArrayLayers,
  hasNestedArrays,
  hasAnyArrayInPath,
  getArrayNestingDepth,
  exceedsMaxNestingDepth,
} from '../arrayPathDetection';
import {
  buildNestedArrayRefinedPath,
  generateNestedArrayIntent,
  type NestedArrayRefinementConfig,
} from '../../types/fhirPathRefinement';

describe('Array Path Detection', () => {
  it('should detect single array layer', () => {
    const layers = detectArrayLayers('address');
    expect(layers).toHaveLength(1);
    expect(layers[0].segment).toBe('address');
  });

  it('should detect nested array layers', () => {
    const layers = detectArrayLayers('address.line');
    expect(layers).toHaveLength(2);
    expect(layers[0].segment).toBe('address');
    expect(layers[1].segment).toBe('line');
  });

  it('should detect deeply nested arrays', () => {
    const layers = detectArrayLayers('address.line.extension');
    expect(layers).toHaveLength(3);
    expect(layers[0].segment).toBe('address');
    expect(layers[1].segment).toBe('line');
    expect(layers[2].segment).toBe('extension');
  });

  it('should handle paths without arrays', () => {
    const layers = detectArrayLayers('birthDate');
    expect(layers).toHaveLength(0);
  });

  it('should identify nested arrays', () => {
    expect(hasNestedArrays('address.line')).toBe(true);
    expect(hasNestedArrays('address')).toBe(false);
    expect(hasNestedArrays('birthDate')).toBe(false);
  });

  it('should check if any arrays exist in path', () => {
    expect(hasAnyArrayInPath('address')).toBe(true);
    expect(hasAnyArrayInPath('address.line')).toBe(true);
    expect(hasAnyArrayInPath('identifier.value')).toBe(true);
    expect(hasAnyArrayInPath('birthDate')).toBe(false);
    expect(hasAnyArrayInPath('gender')).toBe(false);
    expect(hasAnyArrayInPath('meta.versionId')).toBe(false);
  });

  it('should calculate nesting depth', () => {
    expect(getArrayNestingDepth('address')).toBe(1);
    expect(getArrayNestingDepth('address.line')).toBe(2);
    expect(getArrayNestingDepth('address.line.extension')).toBe(3);
    expect(getArrayNestingDepth('birthDate')).toBe(0);
  });

  it('should detect depth limit exceeded', () => {
    expect(exceedsMaxNestingDepth('address')).toBe(false);
    expect(exceedsMaxNestingDepth('address.line')).toBe(false);
    expect(exceedsMaxNestingDepth('address.line.extension')).toBe(true);
  });
});

describe('Nested Array FHIRPath Building', () => {
  it('should build path with all elements on both layers', () => {
    const config: NestedArrayRefinementConfig = {
      layers: [
        { segment: 'address', mode: 'all' },
        { segment: 'line', mode: 'all' },
      ],
    };
    const result = buildNestedArrayRefinedPath('address.line', config);
    expect(result).toBe('address[*].line[*]');
  });

  it('should build path with index on parent, all on child', () => {
    const config: NestedArrayRefinementConfig = {
      layers: [
        { segment: 'address', mode: 'index', indexValue: 0 },
        { segment: 'line', mode: 'all' },
      ],
    };
    const result = buildNestedArrayRefinedPath('address.line', config);
    expect(result).toBe('address[0].line[*]');
  });

  it('should build path with filter on parent, index on child', () => {
    const config: NestedArrayRefinementConfig = {
      layers: [
        { 
          segment: 'address', 
          mode: 'filter',
          filterCondition: { property: 'use', operator: 'equals', value: 'home' }
        },
        { segment: 'line', mode: 'index', indexValue: 1 },
      ],
    };
    const result = buildNestedArrayRefinedPath('address.line', config);
    expect(result).toBe('address.where(use = \'home\').line[1]');
  });

  it('should build path with filter using contains operator', () => {
    const config: NestedArrayRefinementConfig = {
      layers: [
        { segment: 'address', mode: 'all' },
        { 
          segment: 'line', 
          mode: 'filter',
          filterCondition: { property: 'text', operator: 'contains', value: 'Street' }
        },
      ],
    };
    const result = buildNestedArrayRefinedPath('address.line', config);
    expect(result).toBe('address[*].line.where(text.contains(\'Street\'))');
  });

  it('should build path with first mode (no modification)', () => {
    const config: NestedArrayRefinementConfig = {
      layers: [
        { segment: 'address', mode: 'first' },
        { segment: 'line', mode: 'all' },
      ],
    };
    const result = buildNestedArrayRefinedPath('address.line', config);
    expect(result).toBe('address.line[*]');
  });

  it('should handle path with additional segments after arrays', () => {
    const config: NestedArrayRefinementConfig = {
      layers: [
        { segment: 'address', mode: 'all' },
        { segment: 'line', mode: 'index', indexValue: 0 },
      ],
    };
    const result = buildNestedArrayRefinedPath('address.line.extension', config);
    expect(result).toBe('address[*].line[0].extension');
  });
});

describe('Human-Readable Intent Generation', () => {
  it('should generate intent for all-all pattern', () => {
    const config: NestedArrayRefinementConfig = {
      layers: [
        { segment: 'address', mode: 'all' },
        { segment: 'line', mode: 'all' },
      ],
    };
    const intent = generateNestedArrayIntent(config);
    expect(intent).toContain('all line');
    expect(intent).toContain('all address');
  });

  it('should generate intent for index-based selection', () => {
    const config: NestedArrayRefinementConfig = {
      layers: [
        { segment: 'address', mode: 'index', indexValue: 0 },
        { segment: 'line', mode: 'index', indexValue: 1 },
      ],
    };
    const intent = generateNestedArrayIntent(config);
    expect(intent).toContain('1st line');
    expect(intent).toContain('0th address');
  });

  it('should generate intent for filter conditions', () => {
    const config: NestedArrayRefinementConfig = {
      layers: [
        { 
          segment: 'address', 
          mode: 'filter',
          filterCondition: { property: 'use', operator: 'equals', value: 'home' }
        },
        { segment: 'line', mode: 'all' },
      ],
    };
    const intent = generateNestedArrayIntent(config);
    expect(intent).toContain('all line');
    expect(intent).toContain("use='home'");
  });

  it('should generate intent for mixed modes', () => {
    const config: NestedArrayRefinementConfig = {
      layers: [
        { segment: 'address', mode: 'all' },
        { 
          segment: 'line', 
          mode: 'filter',
          filterCondition: { property: 'text', operator: 'contains', value: 'Street' }
        },
      ],
    };
    const intent = generateNestedArrayIntent(config);
    expect(intent).toContain("text contains 'Street'");
    expect(intent).toContain('all address');
  });

  it('should handle empty config', () => {
    const config: NestedArrayRefinementConfig = {
      layers: [],
    };
    const intent = generateNestedArrayIntent(config);
    expect(intent).toBe('No refinement applied');
  });
});

describe('Edge Cases', () => {
  it('should handle empty path', () => {
    const layers = detectArrayLayers('');
    expect(layers).toHaveLength(0);
  });

  it('should handle path with existing indices', () => {
    const layers = detectArrayLayers('address[0].line[1]');
    expect(layers).toHaveLength(2);
  });

  it('should handle path with where clauses', () => {
    const layers = detectArrayLayers("address.where(use='home').line");
    expect(layers).toHaveLength(2);
  });

  it('should build path when segment not found', () => {
    const config: NestedArrayRefinementConfig = {
      layers: [
        { segment: 'notfound', mode: 'all' },
      ],
    };
    const result = buildNestedArrayRefinedPath('address.line', config);
    // Should return original path if segment not found
    expect(result).toBe('address.line');
  });
});
