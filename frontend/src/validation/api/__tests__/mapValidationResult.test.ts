import { describe, it, expect } from 'vitest';
import { mapValidationResult } from '../mapValidationResult';
import type { ValidationResultDto } from '../ValidationApiTypes';

describe('mapValidationResult', () => {
  const validDto: ValidationResultDto = {
    issues: [
      {
        source: 'StructureDefinition',
        severity: 'error',
        errorCode: 'TEST_ERROR',
        path: 'Bundle.entry[0]',
        message: 'Test message',
        details: { key: 'value' },
      },
    ],
    summary: {
      totalErrors: 1,
      totalWarnings: 0,
      totalInfo: 0,
      hasAmbiguity: false,
      policyMode: 'strict',
    },
  };

  it('successfully maps valid DTO', () => {
    const result = mapValidationResult(validDto);

    expect(result).toEqual({
      issues: [
        {
          source: 'StructureDefinition',
          severity: 'error',
          errorCode: 'TEST_ERROR',
          path: 'Bundle.entry[0]',
          message: 'Test message',
          details: { key: 'value' },
        },
      ],
      summary: {
        totalErrors: 1,
        totalWarnings: 0,
        totalInfo: 0,
        hasAmbiguity: false,
        policyMode: 'strict',
      },
    });
  });

  it('maps all validation sources', () => {
    const dto: ValidationResultDto = {
      issues: [
        { source: 'StructureDefinition', severity: 'error', errorCode: 'E1', path: 'p1', message: 'm1' },
        { source: 'FHIRPath', severity: 'warning', errorCode: 'E2', path: 'p2', message: 'm2' },
        { source: 'Reference', severity: 'info', errorCode: 'E3', path: 'p3', message: 'm3' },
        { source: 'Syntax', severity: 'error', errorCode: 'E4', path: 'p4', message: 'm4' },
      ],
      summary: { totalErrors: 2, totalWarnings: 1, totalInfo: 1, hasAmbiguity: false, policyMode: 'strict' },
    };

    const result = mapValidationResult(dto);

    expect(result.issues).toHaveLength(4);
    expect(result.issues[0].source).toBe('StructureDefinition');
    expect(result.issues[1].source).toBe('FHIRPath');
    expect(result.issues[2].source).toBe('Reference');
    expect(result.issues[3].source).toBe('Syntax');
  });

  it('maps all severity levels', () => {
    const dto: ValidationResultDto = {
      issues: [
        { source: 'Syntax', severity: 'error', errorCode: 'E1', path: 'p1', message: 'm1' },
        { source: 'Syntax', severity: 'warning', errorCode: 'E2', path: 'p2', message: 'm2' },
        { source: 'Syntax', severity: 'info', errorCode: 'E3', path: 'p3', message: 'm3' },
      ],
      summary: { totalErrors: 1, totalWarnings: 1, totalInfo: 1, hasAmbiguity: false, policyMode: 'strict' },
    };

    const result = mapValidationResult(dto);

    expect(result.issues[0].severity).toBe('error');
    expect(result.issues[1].severity).toBe('warning');
    expect(result.issues[2].severity).toBe('info');
  });

  it('preserves details field', () => {
    const dto: ValidationResultDto = {
      issues: [
        {
          source: 'StructureDefinition',
          severity: 'error',
          errorCode: 'TEST',
          path: 'path',
          message: 'msg',
          details: {
            violationReason: 'Cannot expand ValueSet',
            customField: 'custom value',
          },
        },
      ],
      summary: { totalErrors: 1, totalWarnings: 0, totalInfo: 0, hasAmbiguity: true, policyMode: 'permissive' },
    };

    const result = mapValidationResult(dto);

    expect(result.issues[0].details).toEqual({
      violationReason: 'Cannot expand ValueSet',
      customField: 'custom value',
    });
  });

  it('throws error when dto is null', () => {
    expect(() => mapValidationResult(null)).toThrow('Invalid validation result: must be an object');
  });

  it('throws error when dto is not an object', () => {
    expect(() => mapValidationResult('string')).toThrow('Invalid validation result: must be an object');
  });

  it('throws error when issues is not an array', () => {
    const invalidDto = { issues: 'not-an-array', summary: {} };
    expect(() => mapValidationResult(invalidDto)).toThrow('Invalid validation result: issues must be an array');
  });

  it('throws error when summary is missing', () => {
    const invalidDto = { issues: [] };
    expect(() => mapValidationResult(invalidDto)).toThrow('Invalid validation result: summary is required');
  });

  it('throws error when summary.totalErrors is not a number', () => {
    const invalidDto = {
      issues: [],
      summary: { totalErrors: 'not-a-number', totalWarnings: 0, totalInfo: 0, hasAmbiguity: false, policyMode: 'strict' },
    };
    expect(() => mapValidationResult(invalidDto)).toThrow('summary.totalErrors must be a number');
  });

  it('throws error when summary.hasAmbiguity is not a boolean', () => {
    const invalidDto = {
      issues: [],
      summary: { totalErrors: 0, totalWarnings: 0, totalInfo: 0, hasAmbiguity: 'maybe', policyMode: 'strict' },
    };
    expect(() => mapValidationResult(invalidDto)).toThrow('summary.hasAmbiguity must be a boolean');
  });

  it('throws error when summary.policyMode is invalid', () => {
    const invalidDto = {
      issues: [],
      summary: { totalErrors: 0, totalWarnings: 0, totalInfo: 0, hasAmbiguity: false, policyMode: 'lenient' },
    };
    expect(() => mapValidationResult(invalidDto)).toThrow('summary.policyMode must be "strict" or "permissive"');
  });

  it('throws error when issue has invalid source', () => {
    const invalidDto: unknown = {
      issues: [
        { source: 'InvalidSource', severity: 'error', errorCode: 'E1', path: 'p1', message: 'm1' },
      ],
      summary: { totalErrors: 1, totalWarnings: 0, totalInfo: 0, hasAmbiguity: false, policyMode: 'strict' },
    };
    expect(() => mapValidationResult(invalidDto)).toThrow('source must be one of StructureDefinition, FHIRPath, Reference, Syntax');
  });

  it('throws error when issue has invalid severity', () => {
    const invalidDto: unknown = {
      issues: [
        { source: 'Syntax', severity: 'critical', errorCode: 'E1', path: 'p1', message: 'm1' },
      ],
      summary: { totalErrors: 1, totalWarnings: 0, totalInfo: 0, hasAmbiguity: false, policyMode: 'strict' },
    };
    expect(() => mapValidationResult(invalidDto)).toThrow('severity must be one of error, warning, info');
  });

  it('throws error when errorCode is missing', () => {
    const invalidDto: unknown = {
      issues: [
        { source: 'Syntax', severity: 'error', path: 'p1', message: 'm1' },
      ],
      summary: { totalErrors: 1, totalWarnings: 0, totalInfo: 0, hasAmbiguity: false, policyMode: 'strict' },
    };
    expect(() => mapValidationResult(invalidDto)).toThrow('errorCode is required');
  });

  it('throws error when path is empty string', () => {
    const invalidDto: unknown = {
      issues: [
        { source: 'Syntax', severity: 'error', errorCode: 'E1', path: '', message: 'm1' },
      ],
      summary: { totalErrors: 1, totalWarnings: 0, totalInfo: 0, hasAmbiguity: false, policyMode: 'strict' },
    };
    expect(() => mapValidationResult(invalidDto)).toThrow('path is required and must be a non-empty string');
  });
});
