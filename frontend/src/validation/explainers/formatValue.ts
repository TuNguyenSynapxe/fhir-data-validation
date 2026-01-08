/**
 * Format unknown values for display
 * 
 * Safely converts values to displayable strings with length limits.
 * 
 * Rules:
 * - undefined/null → "(missing)"
 * - string/number/boolean → rendered directly
 * - objects → JSON.stringify with max 200 char limit
 * - errors during stringify → "(complex value)"
 */
export function formatValue(value: unknown): string {
  if (value === undefined || value === null) {
    return '(missing)';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  // Object or array - attempt JSON stringify
  try {
    const json = JSON.stringify(value);
    // Clamp to max 200 characters
    if (json.length > 200) {
      return json.substring(0, 197) + '...';
    }
    return json;
  } catch {
    return '(complex value)';
  }
}
