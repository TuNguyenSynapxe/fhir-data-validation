/**
 * Unit Tests for sdConstraintExtractor.ts - Slicing Extraction
 * 
 * CRITICAL CONSTRAINTS:
 * - Do NOT assert runtime validation behavior
 * - Do NOT simulate Firely validation
 * - Do NOT evaluate FHIRPath
 * - Only test extracted ImportedRule objects
 * - Tests must be deterministic and isolated
 * - Firely remains the sole validator
 */

import { describe, it, expect } from 'vitest';
import { extractConstraints } from '../sdConstraintExtractor';
import type { ImportedRule } from '../sdConstraintExtractor';

describe('sdConstraintExtractor - Slicing Extraction', () => {
  
  // ========================================
  // 1️⃣ Slice Existence Extraction
  // ========================================
  describe('Slice Existence Extraction', () => {
    it('should extract slice existence rule with cardinality', () => {
      const sd = {
        resourceType: 'StructureDefinition',
        name: 'TestObservation',
        differential: {
          element: [
            {
              path: 'Observation.component',
              sliceName: 'systolic',
              min: 1,
              max: '1'
            }
          ]
        }
      };

      const rules = extractConstraints(sd);
      const sliceExistenceRules = rules.filter(r => r.category === 'Slice Existence');

      // ASSERT: Exactly one slice existence rule
      expect(sliceExistenceRules).toHaveLength(1);

      const rule = sliceExistenceRules[0];
      
      // ASSERT: Rule structure
      expect(rule.category).toBe('Slice Existence');
      expect(rule.path).toBe('Observation.component');
      expect(rule.title).toContain('systolic');
      expect(rule.explanation).toContain('1..1');
      
      // ASSERT: Slicing metadata
      expect(rule.slicingMetadata).toBeDefined();
      expect(rule.slicingMetadata?.sliceName).toBe('systolic');
    });

    it('should extract multiple slice existence rules from multiple slices', () => {
      const sd = {
        resourceType: 'StructureDefinition',
        name: 'TestObservationBP',
        differential: {
          element: [
            {
              path: 'Observation.component',
              sliceName: 'systolic',
              min: 1,
              max: '1'
            },
            {
              path: 'Observation.component',
              sliceName: 'diastolic',
              min: 1,
              max: '1'
            }
          ]
        }
      };

      const rules = extractConstraints(sd);
      const sliceExistenceRules = rules.filter(r => r.category === 'Slice Existence');

      // ASSERT: Two slice existence rules
      expect(sliceExistenceRules).toHaveLength(2);
      
      const sliceNames = sliceExistenceRules.map(r => r.slicingMetadata?.sliceName);
      expect(sliceNames).toContain('systolic');
      expect(sliceNames).toContain('diastolic');
    });

    it('should handle optional slices with min=0', () => {
      const sd = {
        resourceType: 'StructureDefinition',
        name: 'TestBundle',
        differential: {
          element: [
            {
              path: 'Bundle.entry',
              sliceName: 'optionalEntry',
              min: 0,
              max: '*'
            }
          ]
        }
      };

      const rules = extractConstraints(sd);
      const sliceExistenceRules = rules.filter(r => r.category === 'Slice Existence');

      expect(sliceExistenceRules).toHaveLength(1);
      expect(sliceExistenceRules[0].explanation).toContain('0..*');
    });

    it('should NOT emit other rule types for slice existence only', () => {
      const sd = {
        resourceType: 'StructureDefinition',
        name: 'TestObservation',
        differential: {
          element: [
            {
              path: 'Observation.component',
              sliceName: 'bloodPressure',
              min: 1,
              max: '1'
            }
          ]
        }
      };

      const rules = extractConstraints(sd);
      
      // ASSERT: Only slice existence and cardinality (min=1, max=1)
      const categories = new Set(rules.map(r => r.category));
      expect(categories.has('Slice Existence')).toBe(true);
      
      // Should NOT have validation logic categories
      expect(categories.has('Fixed Value')).toBe(false);
      expect(categories.has('Profile Conformance')).toBe(false);
    });
  });

  // ========================================
  // 2️⃣ Slice Discriminator Extraction (pattern)
  // ========================================
  describe('Slice Discriminator Extraction (pattern)', () => {
    it('should extract pattern discriminator from slicing definition', () => {
      const sd = {
        resourceType: 'StructureDefinition',
        name: 'TestObservation',
        differential: {
          element: [
            {
              path: 'Observation.component',
              slicing: {
                discriminator: [
                  {
                    type: 'pattern',
                    path: 'code.coding'
                  }
                ],
                rules: 'open'
              }
            }
          ]
        }
      };

      const rules = extractConstraints(sd);
      const discriminatorRules = rules.filter(r => r.category === 'Slice Discriminator');

      expect(discriminatorRules).toHaveLength(1);

      const rule = discriminatorRules[0];
      expect(rule.path).toBe('Observation.component');
      expect(rule.explanation).toContain('pattern');
      expect(rule.explanation).toContain('code.coding');
      
      expect(rule.slicingMetadata?.discriminatorType).toBe('pattern');
      expect(rule.slicingMetadata?.discriminatorPath).toBe('code.coding');
    });

    it('should extract slice-level pattern constraint with expected value', () => {
      const sd = {
        resourceType: 'StructureDefinition',
        name: 'TestObservation',
        differential: {
          element: [
            {
              path: 'Observation.component',
              sliceName: 'systolic',
              min: 1,
              max: '1',
              patternCodeableConcept: {
                coding: [
                  {
                    system: 'http://loinc.org',
                    code: '8480-6'
                  }
                ]
              }
            }
          ]
        }
      };

      const rules = extractConstraints(sd);
      const discriminatorRules = rules.filter(r => 
        r.category === 'Slice Discriminator' && 
        r.slicingMetadata?.sliceName === 'systolic'
      );

      expect(discriminatorRules.length).toBeGreaterThan(0);

      const patternRule = discriminatorRules.find(r => 
        r.slicingMetadata?.discriminatorType === 'pattern'
      );
      
      expect(patternRule).toBeDefined();
      expect(patternRule?.slicingMetadata?.expectedValue).toBeDefined();
      expect(patternRule?.slicingMetadata?.expectedValue.coding).toBeDefined();
      
      // ASSERT: Value is copied verbatim (no interpretation)
      const expectedCoding = patternRule?.slicingMetadata?.expectedValue.coding[0];
      expect(expectedCoding.system).toBe('http://loinc.org');
      expect(expectedCoding.code).toBe('8480-6');
    });

    it('should extract fixed constraint with expected value', () => {
      const sd = {
        resourceType: 'StructureDefinition',
        name: 'TestBundle',
        differential: {
          element: [
            {
              path: 'Bundle.type',
              sliceName: 'transactionBundle',
              fixedCode: 'transaction'
            }
          ]
        }
      };

      const rules = extractConstraints(sd);
      const discriminatorRules = rules.filter(r => 
        r.category === 'Slice Discriminator' &&
        r.slicingMetadata?.discriminatorType === 'fixed'
      );

      expect(discriminatorRules.length).toBeGreaterThan(0);
      
      const fixedRule = discriminatorRules[0];
      expect(fixedRule.slicingMetadata?.expectedValue).toBe('transaction');
      expect(fixedRule.explanation).toContain('transaction');
    });

    it('should NOT transform or interpret expected values', () => {
      const complexValue = {
        coding: [
          {
            system: 'http://example.org/complex',
            code: 'TEST-123',
            display: 'Test Display',
            version: '1.0.0'
          }
        ],
        text: 'Original Text'
      };

      const sd = {
        resourceType: 'StructureDefinition',
        name: 'TestObservation',
        differential: {
          element: [
            {
              path: 'Observation.code',
              sliceName: 'specificCode',
              patternCodeableConcept: complexValue
            }
          ]
        }
      };

      const rules = extractConstraints(sd);
      const discriminatorRules = rules.filter(r => 
        r.category === 'Slice Discriminator' &&
        r.slicingMetadata?.discriminatorType === 'pattern'
      );

      expect(discriminatorRules.length).toBeGreaterThan(0);
      
      // ASSERT: Value is preserved exactly as in SD
      const extractedValue = discriminatorRules[0].slicingMetadata?.expectedValue;
      expect(extractedValue).toEqual(complexValue);
      expect(extractedValue.text).toBe('Original Text');
      expect(extractedValue.coding[0].version).toBe('1.0.0');
    });
  });

  // ========================================
  // 3️⃣ Slice Discriminator Extraction (type)
  // ========================================
  describe('Slice Discriminator Extraction (type)', () => {
    it('should extract type discriminator without expected value', () => {
      const sd = {
        resourceType: 'StructureDefinition',
        name: 'TestBundle',
        differential: {
          element: [
            {
              path: 'Bundle.entry.resource',
              slicing: {
                discriminator: [
                  {
                    type: 'type',
                    path: '$this'
                  }
                ],
                rules: 'open'
              }
            }
          ]
        }
      };

      const rules = extractConstraints(sd);
      const discriminatorRules = rules.filter(r => r.category === 'Slice Discriminator');

      expect(discriminatorRules).toHaveLength(1);

      const rule = discriminatorRules[0];
      expect(rule.slicingMetadata?.discriminatorType).toBe('type');
      expect(rule.slicingMetadata?.discriminatorPath).toBe('$this');
      
      // ASSERT: No expected value for type discriminator
      expect(rule.slicingMetadata?.expectedValue).toBeUndefined();
      expect(rule.explanation).toContain('type');
    });

    it('should extract value discriminator without expected value', () => {
      const sd = {
        resourceType: 'StructureDefinition',
        name: 'TestObservation',
        differential: {
          element: [
            {
              path: 'Observation.component',
              slicing: {
                discriminator: [
                  {
                    type: 'value',
                    path: 'code'
                  }
                ],
                rules: 'open'
              }
            }
          ]
        }
      };

      const rules = extractConstraints(sd);
      const discriminatorRules = rules.filter(r => r.category === 'Slice Discriminator');

      expect(discriminatorRules).toHaveLength(1);
      expect(discriminatorRules[0].slicingMetadata?.discriminatorType).toBe('value');
      
      // ASSERT: Rule exists even without expected value
      expect(discriminatorRules[0].explanation).toBeTruthy();
    });

    it('should NOT infer validation logic from discriminator type', () => {
      const sd = {
        resourceType: 'StructureDefinition',
        name: 'TestBundle',
        differential: {
          element: [
            {
              path: 'Bundle.entry.resource',
              slicing: {
                discriminator: [
                  {
                    type: 'type',
                    path: '$this'
                  }
                ],
                rules: 'closed'
              }
            }
          ]
        }
      };

      const rules = extractConstraints(sd);
      const discriminatorRules = rules.filter(r => r.category === 'Slice Discriminator');

      expect(discriminatorRules).toHaveLength(1);
      
      // ASSERT: Rule is purely descriptive
      const rule = discriminatorRules[0];
      expect(rule.fhirPath).toBeUndefined();
      expect(rule.explanation).not.toContain('must');
      expect(rule.explanation).not.toContain('should');
      expect(rule.explanation).toContain('distinguished');
    });
  });

  // ========================================
  // 4️⃣ Closed Slicing Detection
  // ========================================
  describe('Closed Slicing Detection', () => {
    it('should extract closed slicing rule', () => {
      const sd = {
        resourceType: 'StructureDefinition',
        name: 'TestObservation',
        differential: {
          element: [
            {
              path: 'Observation.component',
              slicing: {
                discriminator: [
                  {
                    type: 'pattern',
                    path: 'code'
                  }
                ],
                rules: 'closed'
              }
            }
          ]
        }
      };

      const rules = extractConstraints(sd);
      const closedRules = rules.filter(r => r.category === 'Slicing Closed');

      expect(closedRules).toHaveLength(1);

      const rule = closedRules[0];
      expect(rule.path).toBe('Observation.component');
      expect(rule.explanation).toContain('no additional slices');
    });

    it('should NOT extract closed rule for open slicing', () => {
      const sd = {
        resourceType: 'StructureDefinition',
        name: 'TestObservation',
        differential: {
          element: [
            {
              path: 'Observation.component',
              slicing: {
                discriminator: [
                  {
                    type: 'pattern',
                    path: 'code'
                  }
                ],
                rules: 'open'
              }
            }
          ]
        }
      };

      const rules = extractConstraints(sd);
      const closedRules = rules.filter(r => r.category === 'Slicing Closed');

      expect(closedRules).toHaveLength(0);
    });

    it('should NOT extract closed rule for openAtEnd slicing', () => {
      const sd = {
        resourceType: 'StructureDefinition',
        name: 'TestObservation',
        differential: {
          element: [
            {
              path: 'Observation.component',
              slicing: {
                discriminator: [
                  {
                    type: 'pattern',
                    path: 'code'
                  }
                ],
                rules: 'openAtEnd'
              }
            }
          ]
        }
      };

      const rules = extractConstraints(sd);
      const closedRules = rules.filter(r => r.category === 'Slicing Closed');

      expect(closedRules).toHaveLength(0);
    });

    it('should extract exactly one closed rule per sliced path', () => {
      const sd = {
        resourceType: 'StructureDefinition',
        name: 'TestBundle',
        differential: {
          element: [
            {
              path: 'Bundle.entry',
              slicing: {
                discriminator: [
                  {
                    type: 'type',
                    path: 'resource'
                  }
                ],
                rules: 'closed'
              }
            },
            {
              path: 'Bundle.entry',
              sliceName: 'patientEntry',
              min: 1,
              max: '1'
            },
            {
              path: 'Bundle.entry',
              sliceName: 'observationEntry',
              min: 0,
              max: '*'
            }
          ]
        }
      };

      const rules = extractConstraints(sd);
      const closedRules = rules.filter(r => r.category === 'Slicing Closed');

      // ASSERT: Exactly one closed rule (not one per slice)
      expect(closedRules).toHaveLength(1);
      expect(closedRules[0].path).toBe('Bundle.entry');
    });

    it('should be informational only (no min/max)', () => {
      const sd = {
        resourceType: 'StructureDefinition',
        name: 'TestObservation',
        differential: {
          element: [
            {
              path: 'Observation.component',
              slicing: {
                discriminator: [
                  {
                    type: 'pattern',
                    path: 'code'
                  }
                ],
                rules: 'closed'
              }
            }
          ]
        }
      };

      const rules = extractConstraints(sd);
      const closedRules = rules.filter(r => r.category === 'Slicing Closed');

      expect(closedRules).toHaveLength(1);
      
      // ASSERT: No cardinality metadata
      expect(closedRules[0].slicingMetadata?.sliceName).toBeUndefined();
      expect(closedRules[0].explanation).not.toMatch(/\d+\.\.\d+/);
    });
  });

  // ========================================
  // 5️⃣ Slice-Level Fixed[x] / Pattern[x] Constraints
  // ========================================
  describe('Slice-Level Fixed/Pattern Constraints', () => {
    it('should extract fixed[x] constraint attached to slice', () => {
      const sd = {
        resourceType: 'StructureDefinition',
        name: 'TestBundle',
        differential: {
          element: [
            {
              path: 'Bundle.type',
              sliceName: 'transactionBundle',
              min: 1,
              max: '1',
              fixedCode: 'transaction'
            }
          ]
        }
      };

      const rules = extractConstraints(sd);
      const fixedRules = rules.filter(r => 
        r.category === 'Slice Discriminator' &&
        r.slicingMetadata?.discriminatorType === 'fixed' &&
        r.slicingMetadata?.sliceName === 'transactionBundle'
      );

      expect(fixedRules.length).toBeGreaterThan(0);
      
      // ASSERT: Constraint is attached to slice, not base element
      const rule = fixedRules[0];
      expect(rule.slicingMetadata?.sliceName).toBe('transactionBundle');
      expect(rule.title).toContain('transactionBundle');
    });

    it('should extract pattern[x] constraint attached to slice', () => {
      const sd = {
        resourceType: 'StructureDefinition',
        name: 'TestObservation',
        differential: {
          element: [
            {
              path: 'Observation.component',
              sliceName: 'bloodPressure',
              patternCodeableConcept: {
                coding: [
                  {
                    system: 'http://loinc.org',
                    code: '85354-9'
                  }
                ]
              }
            }
          ]
        }
      };

      const rules = extractConstraints(sd);
      const patternRules = rules.filter(r => 
        r.category === 'Slice Discriminator' &&
        r.slicingMetadata?.discriminatorType === 'pattern' &&
        r.slicingMetadata?.sliceName === 'bloodPressure'
      );

      expect(patternRules.length).toBeGreaterThan(0);
      
      const rule = patternRules[0];
      expect(rule.slicingMetadata?.expectedValue).toBeDefined();
      expect(rule.slicingMetadata?.expectedValue.coding[0].code).toBe('85354-9');
    });

    it('should extract multiple fixed/pattern constraints on same slice', () => {
      const sd = {
        resourceType: 'StructureDefinition',
        name: 'TestObservation',
        differential: {
          element: [
            {
              path: 'Observation.component',
              sliceName: 'systolic',
              fixedString: 'test',
              patternCodeableConcept: {
                coding: [
                  {
                    system: 'http://loinc.org',
                    code: '8480-6'
                  }
                ]
              }
            }
          ]
        }
      };

      const rules = extractConstraints(sd);
      const constraintRules = rules.filter(r => 
        r.category === 'Slice Discriminator' &&
        r.slicingMetadata?.sliceName === 'systolic'
      );

      // ASSERT: Multiple constraints extracted
      expect(constraintRules.length).toBeGreaterThanOrEqual(2);
      
      const types = constraintRules.map(r => r.slicingMetadata?.discriminatorType);
      expect(types).toContain('fixed');
      expect(types).toContain('pattern');
    });

    it('should preserve value exactly as in SD', () => {
      const originalValue = {
        coding: [
          {
            system: 'http://example.org/system',
            code: 'CODE-123',
            display: 'Test Code Display'
          }
        ],
        text: 'Textual Representation'
      };

      const sd = {
        resourceType: 'StructureDefinition',
        name: 'TestObservation',
        differential: {
          element: [
            {
              path: 'Observation.code',
              sliceName: 'specificTest',
              patternCodeableConcept: originalValue
            }
          ]
        }
      };

      const rules = extractConstraints(sd);
      const patternRules = rules.filter(r => 
        r.category === 'Slice Discriminator' &&
        r.slicingMetadata?.discriminatorType === 'pattern'
      );

      expect(patternRules.length).toBeGreaterThan(0);
      
      // ASSERT: Exact value preservation
      const extractedValue = patternRules[0].slicingMetadata?.expectedValue;
      expect(extractedValue).toEqual(originalValue);
      expect(JSON.stringify(extractedValue)).toBe(JSON.stringify(originalValue));
    });
  });

  // ========================================
  // 6️⃣ Unsafe Discriminator Types Are Ignored
  // ========================================
  describe('Unsafe Discriminator Types Are Ignored', () => {
    it('should ignore profile discriminators', () => {
      const sd = {
        resourceType: 'StructureDefinition',
        name: 'TestBundle',
        differential: {
          element: [
            {
              path: 'Bundle.entry.resource',
              slicing: {
                discriminator: [
                  {
                    type: 'profile',
                    path: '$this'
                  }
                ],
                rules: 'open'
              }
            }
          ]
        }
      };

      const rules = extractConstraints(sd);
      const discriminatorRules = rules.filter(r => 
        r.category === 'Slice Discriminator' &&
        r.slicingMetadata?.discriminatorType === 'profile'
      );

      // ASSERT: No profile discriminator rules
      expect(discriminatorRules).toHaveLength(0);
    });

    it('should ignore exists discriminators', () => {
      const sd = {
        resourceType: 'StructureDefinition',
        name: 'TestObservation',
        differential: {
          element: [
            {
              path: 'Observation.component',
              slicing: {
                discriminator: [
                  {
                    type: 'exists',
                    path: 'value'
                  }
                ],
                rules: 'open'
              }
            }
          ]
        }
      };

      const rules = extractConstraints(sd);
      const discriminatorRules = rules.filter(r => 
        r.category === 'Slice Discriminator' &&
        r.slicingMetadata?.discriminatorType === 'exists'
      );

      // ASSERT: No exists discriminator rules
      expect(discriminatorRules).toHaveLength(0);
    });

    it('should extract safe discriminators and ignore unsafe ones in same slicing', () => {
      const sd = {
        resourceType: 'StructureDefinition',
        name: 'TestBundle',
        differential: {
          element: [
            {
              path: 'Bundle.entry',
              slicing: {
                discriminator: [
                  {
                    type: 'pattern',
                    path: 'code'
                  },
                  {
                    type: 'profile',
                    path: 'resource'
                  },
                  {
                    type: 'type',
                    path: 'resource'
                  }
                ],
                rules: 'open'
              }
            }
          ]
        }
      };

      const rules = extractConstraints(sd);
      const discriminatorRules = rules.filter(r => r.category === 'Slice Discriminator');

      // ASSERT: Only safe discriminators extracted (pattern + type)
      expect(discriminatorRules).toHaveLength(2);
      
      const types = discriminatorRules.map(r => r.slicingMetadata?.discriminatorType);
      expect(types).toContain('pattern');
      expect(types).toContain('type');
      expect(types).not.toContain('profile');
    });

    it('should complete successfully with unsafe discriminators', () => {
      const sd = {
        resourceType: 'StructureDefinition',
        name: 'TestBundle',
        differential: {
          element: [
            {
              path: 'Bundle.entry',
              slicing: {
                discriminator: [
                  {
                    type: 'profile',
                    path: 'resource'
                  }
                ],
                rules: 'closed'
              }
            }
          ]
        }
      };

      // ASSERT: No errors thrown
      expect(() => extractConstraints(sd)).not.toThrow();

      const rules = extractConstraints(sd);
      
      // ASSERT: Extraction completes, but no discriminator rules
      expect(rules).toBeDefined();
      const discriminatorRules = rules.filter(r => r.category === 'Slice Discriminator');
      expect(discriminatorRules).toHaveLength(0);
      
      // ASSERT: Closed slicing rule still extracted
      const closedRules = rules.filter(r => r.category === 'Slicing Closed');
      expect(closedRules).toHaveLength(1);
    });

    it('should NOT create partial rules for unsafe discriminators', () => {
      const sd = {
        resourceType: 'StructureDefinition',
        name: 'TestObservation',
        differential: {
          element: [
            {
              path: 'Observation.component',
              slicing: {
                discriminator: [
                  {
                    type: 'exists',
                    path: 'interpretation'
                  }
                ],
                rules: 'open'
              }
            }
          ]
        }
      };

      const rules = extractConstraints(sd);
      
      // ASSERT: No rules with exists discriminator metadata
      const hasExistsMetadata = rules.some(r => 
        r.slicingMetadata?.discriminatorType === 'exists'
      );
      expect(hasExistsMetadata).toBe(false);
      
      // ASSERT: No rules mentioning the unsafe discriminator path
      const mentionsPath = rules.some(r => 
        r.explanation.includes('interpretation') &&
        r.category === 'Slice Discriminator'
      );
      expect(mentionsPath).toBe(false);
    });
  });

  // ========================================
  // 7️⃣ Differential-Only Safety
  // ========================================
  describe('Differential-Only Safety', () => {
    it('should NOT extract slicing from snapshot when differential is empty', () => {
      const sd = {
        resourceType: 'StructureDefinition',
        name: 'TestObservation',
        differential: {
          element: []
        },
        snapshot: {
          element: [
            {
              path: 'Observation.component',
              slicing: {
                discriminator: [
                  {
                    type: 'pattern',
                    path: 'code'
                  }
                ],
                rules: 'closed'
              }
            },
            {
              path: 'Observation.component',
              sliceName: 'systolic',
              min: 1,
              max: '1'
            }
          ]
        }
      };

      const rules = extractConstraints(sd);
      const slicingRules = rules.filter(r => 
        r.category === 'Slice Existence' ||
        r.category === 'Slice Discriminator' ||
        r.category === 'Slicing Closed'
      );

      // ASSERT: No slicing rules extracted from snapshot
      expect(slicingRules).toHaveLength(0);
    });

    it('should extract slicing from differential even when snapshot exists', () => {
      const sd = {
        resourceType: 'StructureDefinition',
        name: 'TestObservation',
        differential: {
          element: [
            {
              path: 'Observation.component',
              slicing: {
                discriminator: [
                  {
                    type: 'pattern',
                    path: 'code'
                  }
                ],
                rules: 'closed'
              }
            }
          ]
        },
        snapshot: {
          element: [
            {
              path: 'Observation.status',
              min: 1,
              max: '1'
            }
          ]
        }
      };

      const rules = extractConstraints(sd);
      const discriminatorRules = rules.filter(r => r.category === 'Slice Discriminator');

      // ASSERT: Slicing extracted from differential
      expect(discriminatorRules.length).toBeGreaterThan(0);
    });

    it('should fallback to snapshot for non-slicing constraints only', () => {
      const sd = {
        resourceType: 'StructureDefinition',
        name: 'TestObservation',
        snapshot: {
          element: [
            {
              path: 'Observation.status',
              min: 1,
              max: '1'
            }
          ]
        }
      };

      const rules = extractConstraints(sd);
      const cardinalityRules = rules.filter(r => r.category === 'Cardinality');

      // ASSERT: Non-slicing constraints can fallback to snapshot
      expect(cardinalityRules.length).toBeGreaterThan(0);
      
      // ASSERT: But no slicing rules
      const slicingRules = rules.filter(r => 
        r.category.includes('Slice') || r.category.includes('Slicing')
      );
      expect(slicingRules).toHaveLength(0);
    });

    it('should prefer differential over snapshot for same element', () => {
      const sd = {
        resourceType: 'StructureDefinition',
        name: 'TestObservation',
        differential: {
          element: [
            {
              path: 'Observation.component',
              slicing: {
                discriminator: [
                  {
                    type: 'pattern',
                    path: 'code'
                  }
                ],
                rules: 'closed'
              }
            }
          ]
        },
        snapshot: {
          element: [
            {
              path: 'Observation.component',
              slicing: {
                discriminator: [
                  {
                    type: 'type',
                    path: 'value'
                  }
                ],
                rules: 'open'
              }
            }
          ]
        }
      };

      const rules = extractConstraints(sd);
      const discriminatorRules = rules.filter(r => r.category === 'Slice Discriminator');

      // ASSERT: Differential takes precedence
      expect(discriminatorRules).toHaveLength(1);
      expect(discriminatorRules[0].slicingMetadata?.discriminatorType).toBe('pattern');
      expect(discriminatorRules[0].slicingMetadata?.discriminatorPath).toBe('code');
      
      // ASSERT: Snapshot discriminator NOT used
      expect(discriminatorRules[0].slicingMetadata?.discriminatorPath).not.toBe('value');
    });
  });

  // ========================================
  // 8️⃣ No Validation Logic Leakage (Critical)
  // ========================================
  describe('No Validation Logic Leakage (Critical)', () => {
    it('should NOT include executable logic in any rule', () => {
      const sd = {
        resourceType: 'StructureDefinition',
        name: 'TestObservation',
        differential: {
          element: [
            {
              path: 'Observation.component',
              slicing: {
                discriminator: [
                  {
                    type: 'pattern',
                    path: 'code'
                  }
                ],
                rules: 'closed'
              }
            },
            {
              path: 'Observation.component',
              sliceName: 'systolic',
              min: 1,
              max: '1',
              patternCodeableConcept: {
                coding: [
                  {
                    system: 'http://loinc.org',
                    code: '8480-6'
                  }
                ]
              }
            }
          ]
        }
      };

      const rules = extractConstraints(sd);
      const slicingRules = rules.filter(r => 
        r.category === 'Slice Existence' ||
        r.category === 'Slice Discriminator' ||
        r.category === 'Slicing Closed'
      );

      // ASSERT: No FHIRPath expressions in slicing rules
      slicingRules.forEach(rule => {
        expect(rule.fhirPath).toBeUndefined();
      });
    });

    it('should NOT include evaluation results', () => {
      const sd = {
        resourceType: 'StructureDefinition',
        name: 'TestBundle',
        differential: {
          element: [
            {
              path: 'Bundle.entry',
              sliceName: 'patientEntry',
              min: 1,
              max: '1'
            }
          ]
        }
      };

      const rules = extractConstraints(sd);
      const sliceRules = rules.filter(r => r.category === 'Slice Existence');

      // ASSERT: No pass/fail implications
      sliceRules.forEach(rule => {
        expect(rule.explanation).not.toMatch(/pass|fail|valid|invalid|error/i);
        expect(rule.title).not.toMatch(/pass|fail|valid|invalid|error/i);
      });
    });

    it('should be purely descriptive for all slicing rules', () => {
      const sd = {
        resourceType: 'StructureDefinition',
        name: 'TestObservation',
        differential: {
          element: [
            {
              path: 'Observation.component',
              slicing: {
                discriminator: [
                  {
                    type: 'pattern',
                    path: 'code'
                  },
                  {
                    type: 'type',
                    path: 'value'
                  }
                ],
                rules: 'closed'
              }
            },
            {
              path: 'Observation.component',
              sliceName: 'systolic',
              min: 1,
              max: '1'
            },
            {
              path: 'Observation.component',
              sliceName: 'diastolic',
              min: 1,
              max: '1'
            }
          ]
        }
      };

      const rules = extractConstraints(sd);
      const slicingRules = rules.filter(r => 
        r.category.includes('Slice') || r.category.includes('Slicing')
      );

      expect(slicingRules.length).toBeGreaterThan(0);

      // ASSERT: All rules are descriptive
      slicingRules.forEach(rule => {
        expect(rule.explanation).toBeTruthy();
        expect(typeof rule.explanation).toBe('string');
        
        // ASSERT: Descriptive language (informational cardinality statements are acceptable)
        expect(
          rule.explanation.includes('must occur') ||
          rule.explanation.includes('distinguished by') ||
          rule.explanation.includes('allowed') ||
          rule.explanation.includes('requires')
        ).toBe(true);
      });
    });

    it('should NOT imply Firely behavior', () => {
      const sd = {
        resourceType: 'StructureDefinition',
        name: 'TestBundle',
        differential: {
          element: [
            {
              path: 'Bundle.entry',
              slicing: {
                discriminator: [
                  {
                    type: 'type',
                    path: 'resource'
                  }
                ],
                rules: 'closed'
              }
            }
          ]
        }
      };

      const rules = extractConstraints(sd);
      const allRules = rules.filter(r => 
        r.category.includes('Slice') || r.category.includes('Slicing')
      );

      // ASSERT: No mention of validation engine
      allRules.forEach(rule => {
        expect(rule.explanation).not.toMatch(/firely|validator|validate|check/i);
        expect(rule.title).not.toMatch(/firely|validator|validate|check/i);
      });
    });

    it('should maintain structural integrity without logic', () => {
      const sd = {
        resourceType: 'StructureDefinition',
        name: 'TestObservation',
        differential: {
          element: [
            {
              path: 'Observation.component',
              slicing: {
                discriminator: [
                  {
                    type: 'pattern',
                    path: 'code'
                  }
                ],
                rules: 'closed'
              }
            },
            {
              path: 'Observation.component',
              sliceName: 'bloodPressure',
              min: 1,
              max: '1',
              patternCodeableConcept: {
                coding: [{ system: 'http://loinc.org', code: '85354-9' }]
              }
            }
          ]
        }
      };

      const rules = extractConstraints(sd);

      // ASSERT: Rules are well-formed objects
      rules.forEach(rule => {
        expect(rule).toHaveProperty('id');
        expect(rule).toHaveProperty('category');
        expect(rule).toHaveProperty('path');
        expect(rule).toHaveProperty('title');
        expect(rule).toHaveProperty('explanation');
        
        expect(typeof rule.id).toBe('string');
        expect(typeof rule.category).toBe('string');
        expect(typeof rule.path).toBe('string');
        expect(typeof rule.title).toBe('string');
        expect(typeof rule.explanation).toBe('string');
      });

      // ASSERT: No executable properties
      rules.forEach(rule => {
        expect(rule).not.toHaveProperty('execute');
        expect(rule).not.toHaveProperty('validate');
        expect(rule).not.toHaveProperty('evaluate');
        expect(rule).not.toHaveProperty('check');
      });
    });
  });
});
