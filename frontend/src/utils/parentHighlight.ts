/**
 * Phase 8: Parent Highlight Manager
 * 
 * Manages temporary highlight animations when navigating to missing fields.
 * Highlights nearest existing parent with subtle pulse animation.
 * 
 * RULES:
 * - Highlight parent when navigating to missing child
 * - Auto-remove after animation completes
 * - Use subtle red outline + pulse
 * - Don't modify DOM directly (use React state)
 */

export interface HighlightState {
  /** JSON Pointer of node to highlight */
  targetPointer: string;
  /** Timestamp when highlight started */
  startTime: number;
  /** Duration in ms */
  duration: number;
}

/**
 * Create highlight state for parent node
 * 
 * @param parentPointer - JSON Pointer of parent to highlight
 * @param duration - Highlight duration in milliseconds (default: 500ms)
 */
export function createParentHighlight(
  parentPointer: string,
  duration: number = 500
): HighlightState {
  return {
    targetPointer: parentPointer,
    startTime: Date.now(),
    duration,
  };
}

/**
 * Check if highlight is still active
 */
export function isHighlightActive(highlight: HighlightState | null): boolean {
  if (!highlight) return false;
  return Date.now() - highlight.startTime < highlight.duration;
}

/**
 * Get CSS classes for highlighted node
 * 
 * Returns animation classes based on highlight progress
 */
export function getHighlightClasses(
  nodePointer: string,
  highlight: HighlightState | null
): string {
  if (!highlight || nodePointer !== highlight.targetPointer) {
    return '';
  }
  
  if (!isHighlightActive(highlight)) {
    return '';
  }
  
  // Return animation class (CSS animation defined in component)
  return 'parent-highlight-pulse';
}

/**
 * CSS animation keyframes for parent highlight
 * Add this to your global CSS or component styles
 */
export const PARENT_HIGHLIGHT_CSS = `
@keyframes parent-highlight-pulse {
  0% {
    outline: 2px solid rgba(239, 68, 68, 0);
    outline-offset: 0px;
    background-color: rgba(254, 226, 226, 0);
  }
  50% {
    outline: 2px solid rgba(239, 68, 68, 0.5);
    outline-offset: 2px;
    background-color: rgba(254, 226, 226, 0.3);
  }
  100% {
    outline: 2px solid rgba(239, 68, 68, 0);
    outline-offset: 0px;
    background-color: rgba(254, 226, 226, 0);
  }
}

.parent-highlight-pulse {
  animation: parent-highlight-pulse 500ms ease-out;
}
`;
