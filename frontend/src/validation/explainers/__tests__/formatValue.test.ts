import { describe, it, expect } from 'vitest';
import { formatValue } from '../formatValue';

describe('formatValue', () => {
  it('returns "(missing)" for undefined', () => {
    expect(formatValue(undefined)).toBe('(missing)');
  });

  it('returns "(missing)" for null', () => {
    expect(formatValue(null)).toBe('(missing)');
  });

  it('returns string directly', () => {
    expect(formatValue('hello')).toBe('hello');
    expect(formatValue('')).toBe('');
  });

  it('returns number as string', () => {
    expect(formatValue(42)).toBe('42');
    expect(formatValue(0)).toBe('0');
    expect(formatValue(-123.45)).toBe('-123.45');
  });

  it('returns boolean as string', () => {
    expect(formatValue(true)).toBe('true');
    expect(formatValue(false)).toBe('false');
  });

  it('returns JSON for objects', () => {
    const obj = { code: 'test', system: 'http://example.org' };
    const result = formatValue(obj);
    expect(result).toBe('{"code":"test","system":"http://example.org"}');
  });

  it('returns JSON for arrays', () => {
    const arr = ['a', 'b', 'c'];
    const result = formatValue(arr);
    expect(result).toBe('["a","b","c"]');
  });

  it('clamps long JSON to 200 characters', () => {
    const longObj = {
      field1: 'very long string that will make the JSON exceed 200 characters',
      field2: 'another very long string that will definitely push this over the limit',
      field3: 'and yet another very long string just to be absolutely sure we exceed the limit',
    };
    const result = formatValue(longObj);
    
    expect(result.length).toBeLessThanOrEqual(200);
    expect(result.endsWith('...')).toBe(true);
  });

  it('returns "(complex value)" for objects that cannot be stringified', () => {
    // Create circular reference
    const circular: any = { a: 1 };
    circular.self = circular;
    
    const result = formatValue(circular);
    expect(result).toBe('(complex value)');
  });
});
