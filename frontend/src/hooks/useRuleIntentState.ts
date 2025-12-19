import { useState, useCallback } from 'react';
import type { RuleIntent } from '../types/ruleIntent';

/**
 * useRuleIntentState - Manages pending rule intents before Apply
 * 
 * Core Principles:
 * - Intents are NOT rules - they're pending actions
 * - No persistence until Apply is clicked
 * - No auto-creation logic
 * - State lives in memory only
 * 
 * Usage:
 * - Tree nodes add intents on checkbox selection
 * - Preview shows what WILL be created
 * - Apply sends to backend for actual rule creation
 * - Clear removes all pending intents
 */
export function useRuleIntentState() {
  const [intents, setIntents] = useState<RuleIntent[]>([]);

  /**
   * Add a new intent or update existing one (deduplicated by path + type)
   * For ARRAY_LENGTH: updates params if intent already exists
   */
  const addIntent = useCallback((intent: RuleIntent) => {
    setIntents((prev) => {
      // Find existing intent with same path + type
      const existingIndex = prev.findIndex(
        (i) => i.path === intent.path && i.type === intent.type
      );
      
      if (existingIndex >= 0) {
        // Update existing intent (supports changing params for ARRAY_LENGTH)
        const updated = [...prev];
        updated[existingIndex] = intent;
        return updated;
      }
      
      // Add new intent
      return [...prev, intent];
    });
  }, []);

  /**
   * Remove an intent by path and type
   */
  const removeIntent = useCallback((path: string, type: RuleIntent['type']) => {
    setIntents((prev) => prev.filter((i) => !(i.path === path && i.type === type)));
  }, []);

  /**
   * Clear all intents
   */
  const clearIntents = useCallback(() => {
    setIntents([]);
  }, []);

  /**
   * Check if an intent exists for a specific path and type
   */
  const hasIntent = useCallback(
    (path: string, type: RuleIntent['type']) => {
      return intents.some((i) => i.path === path && i.type === type);
    },
    [intents]
  );

  /**
   * Get a specific intent by path and type (useful for retrieving params)
   */
  const getIntent = useCallback(
    (path: string, type: RuleIntent['type']): RuleIntent | undefined => {
      return intents.find((i) => i.path === path && i.type === type);
    },
    [intents]
  );

  return {
    intents,
    addIntent,
    removeIntent,
    clearIntents,
    hasIntent,
    getIntent,
    count: intents.length,
  };
}
