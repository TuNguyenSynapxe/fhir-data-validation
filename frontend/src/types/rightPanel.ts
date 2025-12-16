/**
 * Right Panel Mode Constants
 * Defines the available modes for the right panel in the playground
 */
export const RightPanelMode = {
  Rules: 'rules',
  Validation: 'validation',
  Observations: 'observations',
} as const;

/**
 * Right Panel Mode Type
 */
export type RightPanelMode = typeof RightPanelMode[keyof typeof RightPanelMode];

/**
 * Type guard to check if a string is a valid RightPanelMode
 */
export function isValidRightPanelMode(value: string): value is RightPanelMode {
  return Object.values(RightPanelMode).includes(value as RightPanelMode);
}
