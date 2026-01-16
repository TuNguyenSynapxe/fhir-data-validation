/**
 * Tests for terminology API utilities
 */

import { describe, it, expect } from 'vitest';
import { getPreviewability, type ValueSetSummaryDto } from '../terminologyApi';

describe('getPreviewability', () => {
  it('returns previewability when field is present', () => {
    const vs: ValueSetSummaryDto = {
      url: 'http://example.org/vs',
      name: 'Test',
      layer: 'Hl7',
      previewability: 'Explicit',
    };
    
    expect(getPreviewability(vs)).toBe('Explicit');
  });

  it('falls back to Computed when capability is Previewable', () => {
    const vs: ValueSetSummaryDto = {
      url: 'http://example.org/vs',
      name: 'Test',
      layer: 'Hl7',
      capability: 'Previewable',
    };
    
    expect(getPreviewability(vs)).toBe('Computed');
  });

  it('returns Unsupported when neither field is present', () => {
    const vs: ValueSetSummaryDto = {
      url: 'http://example.org/vs',
      name: 'Test',
      layer: 'Hl7',
    };
    
    expect(getPreviewability(vs)).toBe('Unsupported');
  });

  it('prefers previewability over capability when both present', () => {
    const vs: ValueSetSummaryDto = {
      url: 'http://example.org/vs',
      name: 'Test',
      layer: 'Hl7',
      capability: 'Previewable',
      previewability: 'External',
    };
    
    expect(getPreviewability(vs)).toBe('External');
  });

  it('handles all previewability values', () => {
    const testCases: Array<['Explicit' | 'Computed' | 'External' | 'Unsupported']> = [
      ['Explicit'],
      ['Computed'],
      ['External'],
      ['Unsupported'],
    ];

    testCases.forEach(([value]) => {
      const vs: ValueSetSummaryDto = {
        url: 'http://example.org/vs',
        name: 'Test',
        layer: 'Hl7',
        previewability: value,
      };
      
      expect(getPreviewability(vs)).toBe(value);
    });
  });
});
