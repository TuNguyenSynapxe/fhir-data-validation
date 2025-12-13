/**
 * Rule Coverage Engine Tests
 * 
 * Unit tests for deterministic coverage analysis
 */

import { describe, it, expect } from 'vitest';
import {
  normalizeFhirPath,
  isExactMatch,
  isWildcardMatch,
  isParentMatch,
  getParentPath,
  splitFhirPath,
  hasWildcard,
  removeWildcards,
} from '../utils/fhirPathNormalizer';

import {
  analyzeCoverage,
  getCoverageNode,
  getUncoveredNodes,
  getSuggestedNodes,
  getCoveredNodes,
} from '../utils/ruleCoverageEngine';

import type {
  CoverageContext,
  SchemaNode,
  ValidationRule,
  RuleSuggestion,
} from '../types/ruleCoverage';

describe('FHIRPath Normalization', () => {
  describe('normalizeFhirPath', () => {
    it('should remove resource type prefix', () => {
      expect(normalizeFhirPath('Patient.identifier', 'Patient')).toBe('identifier');
      expect(normalizeFhirPath('Patient.name.family', 'Patient')).toBe('name.family');
    });

    it('should remove numeric indices', () => {
      expect(normalizeFhirPath('identifier[0].system')).toBe('identifier.system');
      expect(normalizeFhirPath('name[1].family')).toBe('name.family');
    });

    it('should preserve wildcards', () => {
      expect(normalizeFhirPath('identifier[*].system')).toBe('identifier[*].system');
      expect(normalizeFhirPath('name[*].given')).toBe('name[*].given');
    });

    it('should remove function calls', () => {
      expect(normalizeFhirPath('identifier.count()')).toBe('identifier');
      expect(normalizeFhirPath('name.exists()')).toBe('name');
    });

    it('should remove where clauses', () => {
      expect(normalizeFhirPath("identifier.where(use='official').system"))
        .toBe('identifier.system');
      expect(normalizeFhirPath("name.where(use='official')"))
        .toBe('name');
    });

    it('should handle complex expressions', () => {
      expect(normalizeFhirPath('Patient.identifier[0].where(use="official").system', 'Patient'))
        .toBe('identifier.system');
    });
  });

  describe('isExactMatch', () => {
    it('should match identical paths', () => {
      expect(isExactMatch('identifier.system', 'identifier.system')).toBe(true);
      expect(isExactMatch('name.family', 'name.family')).toBe(true);
    });

    it('should match after normalization', () => {
      expect(isExactMatch('identifier[0].system', 'identifier.system')).toBe(true);
      expect(isExactMatch('Patient.identifier', 'identifier', 'Patient')).toBe(true);
    });

    it('should not match different paths', () => {
      expect(isExactMatch('identifier.system', 'identifier.value')).toBe(false);
      expect(isExactMatch('name.family', 'name.given')).toBe(false);
    });
  });

  describe('isWildcardMatch', () => {
    it('should match wildcard to non-wildcard', () => {
      expect(isWildcardMatch('identifier[*].system', 'identifier.system')).toBe(true);
      expect(isWildcardMatch('name[*].family', 'name.family')).toBe(true);
    });

    it('should not match non-wildcard to wildcard', () => {
      expect(isWildcardMatch('identifier.system', 'identifier[*].system')).toBe(false);
    });

    it('should not match different paths with wildcard', () => {
      expect(isWildcardMatch('identifier[*].system', 'name.system')).toBe(false);
    });

    it('should require wildcard in rule path', () => {
      expect(isWildcardMatch('identifier.system', 'identifier.system')).toBe(false);
    });
  });

  describe('isParentMatch', () => {
    it('should match parent to child', () => {
      expect(isParentMatch('identifier', 'identifier.system')).toBe(true);
      expect(isParentMatch('name', 'name.family')).toBe(true);
      expect(isParentMatch('identifier', 'identifier.system.value')).toBe(true);
    });

    it('should not match child to parent', () => {
      expect(isParentMatch('identifier.system', 'identifier')).toBe(false);
    });

    it('should not match sibling paths', () => {
      expect(isParentMatch('identifier', 'name.family')).toBe(false);
    });

    it('should not match unrelated paths', () => {
      expect(isParentMatch('meta', 'identifier.system')).toBe(false);
    });
  });

  describe('getParentPath', () => {
    it('should return parent path', () => {
      expect(getParentPath('identifier.system')).toBe('identifier');
      expect(getParentPath('name.family')).toBe('name');
      expect(getParentPath('identifier.system.value')).toBe('identifier.system');
    });

    it('should return empty for root paths', () => {
      expect(getParentPath('identifier')).toBe('');
      expect(getParentPath('name')).toBe('');
    });
  });

  describe('splitFhirPath', () => {
    it('should split path into segments', () => {
      expect(splitFhirPath('identifier.system')).toEqual(['identifier', 'system']);
      expect(splitFhirPath('name.family')).toEqual(['name', 'family']);
    });

    it('should preserve wildcards in segments', () => {
      expect(splitFhirPath('identifier[*].system')).toEqual(['identifier[*]', 'system']);
    });
  });

  describe('hasWildcard', () => {
    it('should detect wildcards', () => {
      expect(hasWildcard('identifier[*].system')).toBe(true);
      expect(hasWildcard('identifier.system')).toBe(false);
    });
  });

  describe('removeWildcards', () => {
    it('should remove wildcards', () => {
      expect(removeWildcards('identifier[*].system')).toBe('identifier.system');
      expect(removeWildcards('name[*].given')).toBe('name.given');
    });
  });
});

describe('Coverage Analysis Engine', () => {
  const mockSchemaTree: SchemaNode[] = [
    {
      path: 'identifier',
      name: 'identifier',
      type: 'Identifier',
      cardinality: '0..*',
      children: [
        { path: 'identifier.system', name: 'system', type: 'uri', cardinality: '0..1' },
        { path: 'identifier.value', name: 'value', type: 'string', cardinality: '0..1' },
      ],
    },
    {
      path: 'name',
      name: 'name',
      type: 'HumanName',
      cardinality: '0..*',
      children: [
        { path: 'name.family', name: 'family', type: 'string', cardinality: '0..1' },
        { path: 'name.given', name: 'given', type: 'string', cardinality: '0..*' },
      ],
    },
    {
      path: 'active',
      name: 'active',
      type: 'boolean',
      cardinality: '0..1',
    },
  ];

  describe('Exact Match Coverage', () => {
    it('should mark exact match as covered', () => {
      const rules: ValidationRule[] = [
        { fhirPath: 'identifier.system', operator: 'exists' },
      ];

      const context: CoverageContext = {
        resourceType: 'Patient',
        schemaTree: mockSchemaTree,
        existingRules: rules,
      };

      const result = analyzeCoverage(context);
      const node = getCoverageNode(result, 'identifier.system');

      expect(node).toBeDefined();
      expect(node?.status).toBe('covered');
      expect(node?.matchType).toBe('exact');
    });

    it('should count exact matches in summary', () => {
      const rules: ValidationRule[] = [
        { fhirPath: 'identifier.system', operator: 'exists' },
        { fhirPath: 'name.family', operator: 'exists' },
      ];

      const context: CoverageContext = {
        resourceType: 'Patient',
        schemaTree: mockSchemaTree,
        existingRules: rules,
      };

      const result = analyzeCoverage(context);

      expect(result.summary.exactMatches).toBe(2);
      expect(result.summary.coveredNodes).toBe(2);
    });
  });

  describe('Wildcard Match Coverage', () => {
    it('should mark wildcard match as covered', () => {
      const rules: ValidationRule[] = [
        { fhirPath: 'identifier[*].system', operator: 'exists' },
      ];

      const context: CoverageContext = {
        resourceType: 'Patient',
        schemaTree: mockSchemaTree,
        existingRules: rules,
      };

      const result = analyzeCoverage(context);
      const node = getCoverageNode(result, 'identifier.system');

      expect(node).toBeDefined();
      expect(node?.status).toBe('covered');
      expect(node?.matchType).toBe('wildcard');
    });

    it('should count wildcard matches in summary', () => {
      const rules: ValidationRule[] = [
        { fhirPath: 'identifier[*].system', operator: 'exists' },
        { fhirPath: 'name[*].family', operator: 'exists' },
      ];

      const context: CoverageContext = {
        resourceType: 'Patient',
        schemaTree: mockSchemaTree,
        existingRules: rules,
      };

      const result = analyzeCoverage(context);

      expect(result.summary.wildcardMatches).toBe(2);
      expect(result.summary.coveredNodes).toBe(2);
    });
  });

  describe('Parent Match Coverage', () => {
    it('should mark parent match as covered', () => {
      const rules: ValidationRule[] = [
        { fhirPath: 'identifier', operator: 'exists' },
      ];

      const context: CoverageContext = {
        resourceType: 'Patient',
        schemaTree: mockSchemaTree,
        existingRules: rules,
      };

      const result = analyzeCoverage(context);
      const systemNode = getCoverageNode(result, 'identifier.system');
      const valueNode = getCoverageNode(result, 'identifier.value');

      expect(systemNode).toBeDefined();
      expect(systemNode?.status).toBe('covered');
      expect(systemNode?.matchType).toBe('parent');

      expect(valueNode).toBeDefined();
      expect(valueNode?.status).toBe('covered');
      expect(valueNode?.matchType).toBe('parent');
    });

    it('should count parent matches in summary', () => {
      const rules: ValidationRule[] = [
        { fhirPath: 'identifier', operator: 'exists' },
      ];

      const context: CoverageContext = {
        resourceType: 'Patient',
        schemaTree: mockSchemaTree,
        existingRules: rules,
      };

      const result = analyzeCoverage(context);

      expect(result.summary.parentMatches).toBeGreaterThan(0);
    });
  });

  describe('Match Priority: Exact > Wildcard > Parent', () => {
    it('should prefer exact match over wildcard', () => {
      const rules: ValidationRule[] = [
        { id: '1', fhirPath: 'identifier.system', operator: 'equals', value: 'https://example.org' },
        { id: '2', fhirPath: 'identifier[*].system', operator: 'exists' },
      ];

      const context: CoverageContext = {
        resourceType: 'Patient',
        schemaTree: mockSchemaTree,
        existingRules: rules,
      };

      const result = analyzeCoverage(context);
      const node = getCoverageNode(result, 'identifier.system');

      expect(node?.matchType).toBe('exact');
      expect(node?.coveredBy?.ruleId).toBe('1');
    });

    it('should prefer wildcard match over parent', () => {
      const rules: ValidationRule[] = [
        { id: '1', fhirPath: 'identifier', operator: 'exists' },
        { id: '2', fhirPath: 'identifier[*].system', operator: 'exists' },
      ];

      const context: CoverageContext = {
        resourceType: 'Patient',
        schemaTree: mockSchemaTree,
        existingRules: rules,
      };

      const result = analyzeCoverage(context);
      const node = getCoverageNode(result, 'identifier.system');

      expect(node?.matchType).toBe('wildcard');
      expect(node?.coveredBy?.ruleId).toBe('2');
    });
  });

  describe('Suggestion vs Covered Conflict Resolution', () => {
    it('should prefer covered over suggested', () => {
      const rules: ValidationRule[] = [
        { fhirPath: 'identifier.system', operator: 'exists' },
      ];

      const suggestions: RuleSuggestion[] = [
        {
          id: 'suggestion-1',
          preview: { fhirPath: 'identifier.system', operator: 'exists' },
        },
      ];

      const context: CoverageContext = {
        resourceType: 'Patient',
        schemaTree: mockSchemaTree,
        existingRules: rules,
        suggestions,
      };

      const result = analyzeCoverage(context);
      const node = getCoverageNode(result, 'identifier.system');

      expect(node?.status).toBe('covered');
      expect(node?.suggestedBy).toBeUndefined();
    });

    it('should show suggested only when not covered', () => {
      const rules: ValidationRule[] = [];

      const suggestions: RuleSuggestion[] = [
        {
          id: 'suggestion-1',
          preview: { fhirPath: 'identifier.system', operator: 'exists' },
        },
      ];

      const context: CoverageContext = {
        resourceType: 'Patient',
        schemaTree: mockSchemaTree,
        existingRules: rules,
        suggestions,
      };

      const result = analyzeCoverage(context);
      const node = getCoverageNode(result, 'identifier.system');

      expect(node?.status).toBe('suggested');
      expect(node?.suggestedBy).toBeDefined();
    });
  });

  describe('Uncovered Nodes', () => {
    it('should mark nodes without rules as uncovered', () => {
      const rules: ValidationRule[] = [];

      const context: CoverageContext = {
        resourceType: 'Patient',
        schemaTree: mockSchemaTree,
        existingRules: rules,
      };

      const result = analyzeCoverage(context);
      const uncovered = getUncoveredNodes(result);

      expect(uncovered.length).toBeGreaterThan(0);
      uncovered.forEach(node => {
        expect(node.status).toBe('uncovered');
      });
    });
  });

  describe('Coverage Summary', () => {
    it('should calculate coverage percentage', () => {
      const rules: ValidationRule[] = [
        { fhirPath: 'identifier.system', operator: 'exists' },
        { fhirPath: 'name.family', operator: 'exists' },
      ];

      const context: CoverageContext = {
        resourceType: 'Patient',
        schemaTree: mockSchemaTree,
        existingRules: rules,
      };

      const result = analyzeCoverage(context);

      expect(result.summary.totalNodes).toBeGreaterThan(0);
      expect(result.summary.coveredNodes).toBe(2);
      expect(result.summary.coveragePercentage).toBeGreaterThanOrEqual(0);
      expect(result.summary.coveragePercentage).toBeLessThanOrEqual(100);
    });

    it('should count all status types correctly', () => {
      const rules: ValidationRule[] = [
        { fhirPath: 'identifier.system', operator: 'exists' },
      ];

      const suggestions: RuleSuggestion[] = [
        {
          id: 'suggestion-1',
          preview: { fhirPath: 'name.family', operator: 'exists' },
        },
      ];

      const context: CoverageContext = {
        resourceType: 'Patient',
        schemaTree: mockSchemaTree,
        existingRules: rules,
        suggestions,
      };

      const result = analyzeCoverage(context);

      expect(
        result.summary.coveredNodes + 
        result.summary.suggestedNodes + 
        result.summary.uncoveredNodes
      ).toBe(result.summary.totalNodes);
    });
  });

  describe('Helper Functions', () => {
    it('should get covered nodes', () => {
      const rules: ValidationRule[] = [
        { fhirPath: 'identifier.system', operator: 'exists' },
      ];

      const context: CoverageContext = {
        resourceType: 'Patient',
        schemaTree: mockSchemaTree,
        existingRules: rules,
      };

      const result = analyzeCoverage(context);
      const covered = getCoveredNodes(result);

      expect(covered.length).toBeGreaterThan(0);
      covered.forEach(node => {
        expect(node.status).toBe('covered');
      });
    });

    it('should get suggested nodes', () => {
      const suggestions: RuleSuggestion[] = [
        {
          id: 'suggestion-1',
          preview: { fhirPath: 'name.family', operator: 'exists' },
        },
      ];

      const context: CoverageContext = {
        resourceType: 'Patient',
        schemaTree: mockSchemaTree,
        existingRules: [],
        suggestions,
      };

      const result = analyzeCoverage(context);
      const suggested = getSuggestedNodes(result);

      expect(suggested.length).toBeGreaterThan(0);
      suggested.forEach(node => {
        expect(node.status).toBe('suggested');
      });
    });
  });
});
