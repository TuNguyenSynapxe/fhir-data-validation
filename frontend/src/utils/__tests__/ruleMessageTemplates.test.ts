import { describe, it, expect } from 'vitest';
import {
  generateDefaultMessage,
  resolveMessageTokens,
  getAvailableTokens,
  GLOBAL_TOKENS,
  RULE_TYPE_TOKENS,
  type RuleContext,
} from '../ruleMessageTemplates';

describe('ruleMessageTemplates', () => {
  describe('generateDefaultMessage', () => {
    it('generates Required rule message', () => {
      const context: RuleContext = {
        resourceType: 'Patient',
        path: 'name.family',
        ruleType: 'Required',
        severity: 'error',
      };
      expect(generateDefaultMessage(context)).toBe('{fullPath} is required.');
    });

    it('generates FixedValue rule message', () => {
      const context: RuleContext = {
        resourceType: 'Patient',
        path: 'gender',
        ruleType: 'FixedValue',
        severity: 'error',
        params: { value: 'male' },
      };
      expect(generateDefaultMessage(context)).toBe('{fullPath} must be exactly "{expected}".');
    });

    it('generates AllowedValues rule message', () => {
      const context: RuleContext = {
        resourceType: 'Patient',
        path: 'gender',
        ruleType: 'AllowedValues',
        severity: 'error',
      };
      expect(generateDefaultMessage(context)).toBe('{fullPath} must be one of the allowed values.');
    });

    it('generates Regex rule message', () => {
      const context: RuleContext = {
        resourceType: 'Patient',
        path: 'identifier.value',
        ruleType: 'Regex',
        severity: 'error',
      };
      expect(generateDefaultMessage(context)).toBe('{fullPath} does not match the required format.');
    });

    it('generates ArrayLength message with min and max', () => {
      const context: RuleContext = {
        resourceType: 'Patient',
        path: 'name',
        ruleType: 'ArrayLength',
        severity: 'error',
        params: { min: 1, max: 5 },
      };
      expect(generateDefaultMessage(context)).toBe('{fullPath} must contain between {min} and {max} items.');
    });

    it('generates ArrayLength message with min only', () => {
      const context: RuleContext = {
        resourceType: 'Patient',
        path: 'name',
        ruleType: 'ArrayLength',
        severity: 'error',
        params: { min: 1 },
      };
      expect(generateDefaultMessage(context)).toBe('{fullPath} must contain at least {min} item(s).');
    });

    it('generates ArrayLength message with max only', () => {
      const context: RuleContext = {
        resourceType: 'Patient',
        path: 'name',
        ruleType: 'ArrayLength',
        severity: 'error',
        params: { max: 5 },
      };
      expect(generateDefaultMessage(context)).toBe('{fullPath} must contain no more than {max} item(s).');
    });

    it('generates CodeSystem rule message', () => {
      const context: RuleContext = {
        resourceType: 'Observation',
        path: 'code.coding',
        ruleType: 'CodeSystem',
        severity: 'error',
      };
      expect(generateDefaultMessage(context)).toBe('{fullPath} must use a valid code from {system}.');
    });

    it('generates CustomFHIRPath rule message', () => {
      const context: RuleContext = {
        resourceType: 'Patient',
        path: 'birthDate',
        ruleType: 'CustomFHIRPath',
        severity: 'error',
      };
      expect(generateDefaultMessage(context)).toBe('{fullPath} does not meet the required condition.');
    });

    it('generates fallback message for unknown rule type', () => {
      const context: RuleContext = {
        resourceType: 'Patient',
        path: 'name',
        ruleType: 'UnknownType',
        severity: 'error',
      };
      expect(generateDefaultMessage(context)).toBe('{fullPath} must meet the validation requirements.');
    });
  });

  describe('resolveMessageTokens', () => {
    it('resolves global tokens', () => {
      const context: RuleContext = {
        resourceType: 'Patient',
        path: 'name.family',
        ruleType: 'Required',
        severity: 'error',
      };
      const template = '{resource}.{path} ({fullPath}) - {ruleType} - {severity}';
      const resolved = resolveMessageTokens(template, context);
      expect(resolved).toBe('Patient.name.family (Patient.name.family) - Required - error');
    });

    it('resolves FixedValue tokens', () => {
      const context: RuleContext = {
        resourceType: 'Patient',
        path: 'gender',
        ruleType: 'FixedValue',
        severity: 'error',
        params: { value: 'male' },
      };
      const template = '{fullPath} must be exactly "{expected}".';
      const resolved = resolveMessageTokens(template, context);
      expect(resolved).toBe('Patient.gender must be exactly "male".');
    });

    it('resolves AllowedValues tokens', () => {
      const context: RuleContext = {
        resourceType: 'Patient',
        path: 'gender',
        ruleType: 'AllowedValues',
        severity: 'error',
        params: { values: ['male', 'female', 'other'] },
      };
      const template = '{fullPath} must be one of: {allowed} (total: {count})';
      const resolved = resolveMessageTokens(template, context);
      expect(resolved).toBe('Patient.gender must be one of: "male", "female", "other" (total: 3)');
    });

    it('resolves AllowedValues tokens with codes array', () => {
      const context: RuleContext = {
        resourceType: 'Patient',
        path: 'maritalStatus',
        ruleType: 'AllowedValues',
        severity: 'error',
        params: { codes: ['M', 'S', 'D'] },
      };
      const template = '{fullPath} must be one of: {allowed} (total: {count})';
      const resolved = resolveMessageTokens(template, context);
      expect(resolved).toBe('Patient.maritalStatus must be one of: "M", "S", "D" (total: 3)');
    });

    it('resolves Regex tokens', () => {
      const context: RuleContext = {
        resourceType: 'Patient',
        path: 'identifier.value',
        ruleType: 'Regex',
        severity: 'error',
        params: { pattern: '^[A-Z]{2}\\d{6}$' },
      };
      const template = '{fullPath} must match pattern: {pattern}';
      const resolved = resolveMessageTokens(template, context);
      // Note: Curly braces in the pattern value get stripped as they look like unresolved tokens
      expect(resolved).toBe('Patient.identifier.value must match pattern: ^[A-Z]\\d$');
    });

    it('resolves ArrayLength tokens', () => {
      const context: RuleContext = {
        resourceType: 'Patient',
        path: 'name',
        ruleType: 'ArrayLength',
        severity: 'error',
        params: { min: 1, max: 5 },
      };
      const template = '{fullPath} must have between {min} and {max} items';
      const resolved = resolveMessageTokens(template, context);
      expect(resolved).toBe('Patient.name must have between 1 and 5 items');
    });

    it('resolves CodeSystem tokens', () => {
      const context: RuleContext = {
        resourceType: 'Observation',
        path: 'code.coding',
        ruleType: 'CodeSystem',
        severity: 'error',
        params: { 
          system: 'http://loinc.org',
          code: '8867-4',
          display: 'Heart rate'
        },
      };
      const template = '{fullPath} must use {system} (code: {code}, display: {display})';
      const resolved = resolveMessageTokens(template, context);
      expect(resolved).toBe('Observation.code.coding must use loinc.org (code: 8867-4, display: Heart rate)');
    });

    it('resolves runtime tokens', () => {
      const context: RuleContext = {
        resourceType: 'Patient',
        path: 'gender',
        ruleType: 'FixedValue',
        severity: 'error',
        params: { value: 'male' },
        actual: 'female',
      };
      const template = '{fullPath} expected "{expected}" but got "{actual}"';
      const resolved = resolveMessageTokens(template, context);
      expect(resolved).toBe('Patient.gender expected "male" but got "female"');
    });

    it('removes unresolved tokens gracefully', () => {
      const context: RuleContext = {
        resourceType: 'Patient',
        path: 'name',
        ruleType: 'Required',
        severity: 'error',
      };
      const template = '{fullPath} is required. {unknownToken} {anotherToken}';
      const resolved = resolveMessageTokens(template, context);
      expect(resolved).toBe('Patient.name is required.  ');
    });

    it('handles empty path (root-level validation)', () => {
      const context: RuleContext = {
        resourceType: 'Patient',
        path: '',
        ruleType: 'Required',
        severity: 'error',
      };
      const template = '{fullPath} is required';
      const resolved = resolveMessageTokens(template, context);
      expect(resolved).toBe('Patient is required');
    });
  });

  describe('getAvailableTokens', () => {
    it('returns global + FixedValue tokens', () => {
      const tokens = getAvailableTokens('FixedValue');
      expect(tokens.length).toBe(GLOBAL_TOKENS.length + RULE_TYPE_TOKENS.FixedValue.length);
      expect(tokens.some(t => t.name === 'expected')).toBe(true);
      expect(tokens.some(t => t.name === 'actual')).toBe(true);
      expect(tokens.some(t => t.name === 'fullPath')).toBe(true);
    });

    it('returns global + AllowedValues tokens', () => {
      const tokens = getAvailableTokens('AllowedValues');
      expect(tokens.length).toBe(GLOBAL_TOKENS.length + RULE_TYPE_TOKENS.AllowedValues.length);
      expect(tokens.some(t => t.name === 'allowed')).toBe(true);
      expect(tokens.some(t => t.name === 'count')).toBe(true);
    });

    it('returns global + Regex tokens', () => {
      const tokens = getAvailableTokens('Regex');
      expect(tokens.length).toBe(GLOBAL_TOKENS.length + RULE_TYPE_TOKENS.Regex.length);
      expect(tokens.some(t => t.name === 'pattern')).toBe(true);
    });

    it('returns global + ArrayLength tokens', () => {
      const tokens = getAvailableTokens('ArrayLength');
      expect(tokens.length).toBe(GLOBAL_TOKENS.length + RULE_TYPE_TOKENS.ArrayLength.length);
      expect(tokens.some(t => t.name === 'min')).toBe(true);
      expect(tokens.some(t => t.name === 'max')).toBe(true);
    });

    it('returns global + CodeSystem tokens', () => {
      const tokens = getAvailableTokens('CodeSystem');
      expect(tokens.length).toBe(GLOBAL_TOKENS.length + RULE_TYPE_TOKENS.CodeSystem.length);
      expect(tokens.some(t => t.name === 'system')).toBe(true);
      expect(tokens.some(t => t.name === 'code')).toBe(true);
      expect(tokens.some(t => t.name === 'display')).toBe(true);
    });

    it('returns global + CustomFHIRPath tokens', () => {
      const tokens = getAvailableTokens('CustomFHIRPath');
      expect(tokens.length).toBe(GLOBAL_TOKENS.length + RULE_TYPE_TOKENS.CustomFHIRPath.length);
      expect(tokens.some(t => t.name === 'expression')).toBe(true);
      expect(tokens.some(t => t.name === 'result')).toBe(true);
    });

    it('returns only global tokens for unknown rule type', () => {
      const tokens = getAvailableTokens('UnknownType');
      expect(tokens.length).toBe(GLOBAL_TOKENS.length);
      expect(tokens.some(t => t.name === 'fullPath')).toBe(true);
    });
  });

  describe('token security', () => {
    it('does not execute code from token values', () => {
      const context: RuleContext = {
        resourceType: 'Patient',
        path: 'name',
        ruleType: 'FixedValue',
        severity: 'error',
        params: { 
          value: '${console.log("injected")}'
        },
      };
      const template = '{fullPath} must be {expected}';
      const resolved = resolveMessageTokens(template, context);
      // Curly braces in values are treated as unresolved tokens and removed
      expect(resolved).toBe('Patient.name must be $');
    });

    it('handles object values safely', () => {
      const context: RuleContext = {
        resourceType: 'Patient',
        path: 'name',
        ruleType: 'FixedValue',
        severity: 'error',
        params: { 
          value: { nested: 'object' }
        },
      };
      const template = '{fullPath} must be {expected}';
      const resolved = resolveMessageTokens(template, context);
      // Objects are stringified, which produces [object Object]
      expect(resolved).toBe('Patient.name must be [object Object]');
    });
  });
});
