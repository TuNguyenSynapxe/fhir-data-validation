/**
 * Validation explainers
 * 
 * Deterministic explanation layer for validation issues.
 * All functions are pure - no API calls, no side effects.
 */

export type { Explanation } from './Explanation';
export { explainError } from './explainError';
export { explainAmbiguity } from './explainAmbiguity';
export { explainPolicy, getPolicyLabel } from './explainPolicy';
export { formatValue } from './formatValue';
export {
  getRegistry,
  registerExplanation,
  createDefaultExplanation,
  getExplanationForCode,
} from './explanationRegistry';
