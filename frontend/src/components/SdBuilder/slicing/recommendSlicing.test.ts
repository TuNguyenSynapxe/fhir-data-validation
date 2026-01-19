/**
 * Unit tests for recommendSlicing — EPIC 2
 * 
 * Tests deterministic discriminator recommendation logic.
 */

import { describe, it, expect } from 'vitest';
import {
  recommendDiscriminators,
  extractChildrenMetadata,
  type RecommenderParams,
  type ChildElementMetadata,
} from './recommendSlicing';

describe('recommendDiscriminators', () => {
  it('should recommend ONLY Pattern on code for Observation.component (hard-coded rule)', () => {
    const params: RecommenderParams = {
      elementPath: 'Observation.component',
      elementTypeCodes: ['BackboneElement'],
      children: [
        {
          path: 'Observation.component.code',
          typeCodes: ['CodeableConcept'],
          hasBinding: true,
          bindingValueSetUrl: 'http://loinc.org/vs/example',
        },
        {
          path: 'Observation.component.value[x]',
          typeCodes: ['Quantity', 'string'],
          hasBinding: false,
        },
        {
          path: 'Observation.component.dataAbsentReason',
          typeCodes: ['CodeableConcept'],
          hasBinding: true,
        },
      ],
    };

    const recommendations = recommendDiscriminators(params);

    // Should return ONLY one recommendation: Pattern on code
    expect(recommendations.length).toBe(1);
    expect(recommendations[0]).toMatchObject({
      type: 'Pattern',
      path: 'code',
      confidence: 'high',
      reason: 'CodeableConcept with binding (FHIR best practice)',
    });
  });

  it('should return empty for Observation.component if no code child found', () => {
    const params: RecommenderParams = {
      elementPath: 'Observation.component',
      elementTypeCodes: ['BackboneElement'],
      children: [
        {
          path: 'Observation.component.value[x]',
          typeCodes: ['Quantity'],
          hasBinding: false,
        },
      ],
    };

    const recommendations = recommendDiscriminators(params);

    expect(recommendations.length).toBe(0);
  });

  it('should recommend Value discriminator for Coding with binding (non-Observation.component)', () => {
    const params: RecommenderParams = {
      elementPath: 'Patient.contact',
      elementTypeCodes: ['BackboneElement'],
      children: [
        {
          path: 'Patient.contact.relationship',
          typeCodes: ['Coding'],
          hasBinding: true,
          bindingValueSetUrl: 'http://example.org/vs/interp',
        },
      ],
    };

    const recommendations = recommendDiscriminators(params);

    const valueDis = recommendations.find((r) => r.type === 'Value' && r.path.includes('relationship'));
    expect(valueDis).toBeDefined();
    expect(valueDis?.confidence).toBe('high');
  });

  it('should recommend Type discriminator for value[x] polymorphic (non-Observation.component)', () => {
    const params: RecommenderParams = {
      elementPath: 'Extension',
      elementTypeCodes: [],
      children: [
        {
          path: 'Extension.value[x]',
          typeCodes: ['Quantity', 'string', 'CodeableConcept'],
          hasBinding: false,
        },
      ],
    };

    const recommendations = recommendDiscriminators(params);

    const typeDis = recommendations.find((r) => r.type === 'Type');
    expect(typeDis).toBeDefined();
    expect(typeDis?.path).toBe('value[x]');
    expect(typeDis?.confidence).toBe('medium');
  });

  it('should recommend Value on url for Extension', () => {
    const params: RecommenderParams = {
      elementPath: 'Patient.extension',
      elementTypeCodes: ['Extension'],
      children: [
        {
          path: 'Patient.extension.url',
          typeCodes: ['uri'],
          hasBinding: false,
        },
      ],
    };

    const recommendations = recommendDiscriminators(params);

    const urlDis = recommendations.find((r) => r.path.includes('url'));
    expect(urlDis).toBeDefined();
    expect(urlDis?.type).toBe('Value');
  });

  it('should deduplicate same type+path recommendations (non-Observation.component)', () => {
    const params: RecommenderParams = {
      elementPath: 'Patient.contact',
      elementTypeCodes: ['BackboneElement'],
      children: [
        {
          path: 'Patient.contact.relationship',
          typeCodes: ['CodeableConcept'],
          hasBinding: true,
          bindingValueSetUrl: 'http://example.org/vs',
        },
        {
          path: 'Patient.contact.relationship',
          typeCodes: ['CodeableConcept'],
          hasBinding: true,
          bindingValueSetUrl: 'http://example.org/vs',
        },
      ],
    };

    const recommendations = recommendDiscriminators(params);

    // Should not have duplicates
    const paths = recommendations.map((r) => `${r.type}|${r.path}`);
    const uniquePaths = new Set(paths);
    expect(paths.length).toBe(uniquePaths.size);
  });

  it('should return stable ordering (confidence then path) (non-Observation.component)', () => {
    const params: RecommenderParams = {
      elementPath: 'Patient.contact',
      elementTypeCodes: ['BackboneElement'],
      children: [
        {
          path: 'Patient.contact.address',
          typeCodes: ['Address'],
          hasBinding: false,
        },
        {
          path: 'Patient.contact.relationship',
          typeCodes: ['CodeableConcept'],
          hasBinding: true,
          bindingValueSetUrl: 'http://example.org/vs',
        },
      ],
    };

    const recommendations = recommendDiscriminators(params);

    // High confidence should come first
    expect(recommendations[0].confidence).toBe('high');

    // Multiple high confidence should be sorted by path
    const highConfRecs = recommendations.filter((r) => r.confidence === 'high');
    for (let i = 1; i < highConfRecs.length; i++) {
      expect(highConfRecs[i].path.localeCompare(highConfRecs[i - 1].path)).toBeGreaterThanOrEqual(0);
    }
  });

  it('should return empty array when no recommendations', () => {
    const params: RecommenderParams = {
      elementPath: 'Patient.name',
      elementTypeCodes: ['HumanName'],
      children: [
        {
          path: 'Patient.name.family',
          typeCodes: ['string'],
          hasBinding: false,
        },
      ],
    };

    const recommendations = recommendDiscriminators(params);

    expect(recommendations).toEqual([]);
  });
});

describe('extractChildrenMetadata', () => {
  it('should extract direct children only', () => {
    const allElements = [
      {
        path: 'Observation.component',
        typeCodes: ['BackboneElement'],
        baseBinding: null,
        overrideBinding: null,
      },
      {
        path: 'Observation.component.code',
        typeCodes: ['CodeableConcept'],
        baseBinding: { valueSetUrl: 'http://example.org/vs' },
        overrideBinding: null,
      },
      {
        path: 'Observation.component.code.coding',
        typeCodes: ['Coding'],
        baseBinding: null,
        overrideBinding: null,
      },
      {
        path: 'Observation.component.value[x]',
        typeCodes: ['Quantity', 'string'],
        baseBinding: null,
        overrideBinding: null,
      },
    ];

    const children = extractChildrenMetadata('Observation.component', allElements);

    expect(children.length).toBe(2); // Only code and value[x], not code.coding
    expect(children.map((c) => c.path)).toContain('Observation.component.code');
    expect(children.map((c) => c.path)).toContain('Observation.component.value[x]');
    expect(children.map((c) => c.path)).not.toContain('Observation.component.code.coding');
  });

  it('should detect bindings from baseBinding or overrideBinding', () => {
    const allElements = [
      {
        path: 'Observation.component.code',
        typeCodes: ['CodeableConcept'],
        baseBinding: { valueSetUrl: 'http://example.org/vs' },
        overrideBinding: null,
      },
      {
        path: 'Observation.component.interpretation',
        typeCodes: ['CodeableConcept'],
        baseBinding: null,
        overrideBinding: { valueSetUrl: 'http://example.org/vs2' },
      },
    ];

    const children = extractChildrenMetadata('Observation.component', allElements);

    expect(children[0].hasBinding).toBe(true);
    expect(children[0].bindingValueSetUrl).toBe('http://example.org/vs');
    expect(children[1].hasBinding).toBe(true);
    expect(children[1].bindingValueSetUrl).toBe('http://example.org/vs2');
  });
});
