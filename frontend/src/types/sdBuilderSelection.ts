/**
 * SdBuilderSelection Type
 * 
 * EPIC 3.5: Explicit selection model for SD Builder
 * 
 * Rules:
 * - path is always the base element path (e.g., "Patient.communication")
 * - sliceName exists only when kind = 'slice'
 * - No other flags (isSliceMode, activeSlice, etc.) are allowed
 */

export type SdBuilderSelection =
  | { kind: 'element'; path: string }
  | { kind: 'slice'; path: string; sliceName: string };

/**
 * Helper to create element selection
 */
export function createElementSelection(path: string): SdBuilderSelection {
  return { kind: 'element', path };
}

/**
 * Helper to create slice selection
 */
export function createSliceSelection(path: string, sliceName: string): SdBuilderSelection {
  return { kind: 'slice', path, sliceName };
}

/**
 * Legacy: Parse path string with ::slice:: marker to selection object
 * Used during migration from old string-based selection
 */
export function parsePathToSelection(pathString: string): SdBuilderSelection | null {
  if (!pathString) return null;
  
  const sliceMarker = '::slice::';
  if (pathString.includes(sliceMarker)) {
    const [path, sliceName] = pathString.split(sliceMarker);
    return { kind: 'slice', path, sliceName };
  }
  
  return { kind: 'element', path: pathString };
}

/**
 * Convert selection object to legacy path string format
 * Used during migration for backward compatibility
 */
export function selectionToPathString(selection: SdBuilderSelection | null): string | null {
  if (!selection) return null;
  
  if (selection.kind === 'element') {
    return selection.path;
  }
  
  return `${selection.path}::slice::${selection.sliceName}`;
}
