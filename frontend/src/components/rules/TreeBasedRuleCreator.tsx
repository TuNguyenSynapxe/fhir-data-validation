import { useState, useMemo, useEffect } from 'react';
import { useRuleIntentState } from '../../hooks/useRuleIntentState';
import { bulkCreateRules } from '../../api/rulesApi';
import { validateAllIntents } from '../../utils/ruleIntentValidation';
import PendingActionBar from './PendingActionBar';
import RulePreviewDrawer from './RulePreviewDrawer';
import FhirSchemaTreeRenderer from '../FhirSchemaTreeRenderer';
import TreeNodeWithRuleIntent from './TreeNodeWithRuleIntent';
import type { DraftRule } from '../../types/ruleIntent';

/**
 * TreeBasedRuleCreator - Complete integration example
 * 
 * This component demonstrates how to integrate:
 * 1. Tree nodes with checkboxes
 * 2. Pending intent state management
 * 3. Preview drawer
 * 4. Action bar
 * 5. Bulk rule creation API
 * 
 * Usage:
 * <TreeBasedRuleCreator
 *   projectId="abc-123"
 *   resourceType="Patient"
 *   existingRules={rules}
 *   onRulesCreated={(newRules) => { ... }}
 * />
 */
interface TreeBasedRuleCreatorProps {
  projectId: string;
  resourceType: string;
  existingRules: Array<{
    id: string;
    type: string;
    path: string;
    message: string;
    severity: string;
  }>;
  onRulesCreated: (rules: DraftRule[]) => void;
  onIntentStateChange?: (hasPending: boolean) => void;
  hideAdvancedInternals?: boolean; // Presentation-only toggle
  hideExtensions?: boolean; // Presentation-only toggle for extensions
}

const TreeBasedRuleCreator: React.FC<TreeBasedRuleCreatorProps> = ({
  projectId,
  resourceType,
  existingRules,
  onRulesCreated,
  onIntentStateChange,
  hideAdvancedInternals = true, // Default to hiding
  hideExtensions = true, // Default to hiding extensions
}) => {
  const {
    intents,
    addIntent,
    removeIntent,
    hasIntent,
    getIntent,
    clearIntents,
    count,
  } = useRuleIntentState();

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Notify parent of intent state changes
  useEffect(() => {
    if (onIntentStateChange) {
      onIntentStateChange(count > 0);
    }
  }, [count, onIntentStateChange]);

  // Handle intent changes (add, update, or remove)
  const handleToggleIntent = (intent: any) => {
    if (intent === null) {
      // Null intent - ignore (deprecated pattern)
      return;
    }
    
    // Check if this is a removal action
    if (intent._action === 'remove') {
      removeIntent(intent.path, intent.type);
      return;
    }
    
    // For ARRAY_LENGTH and other parameterized intents, always add/update
    // The addIntent function in useRuleIntentState handles deduplication
    addIntent(intent);
  };

  // Validate all intents
  const validationResult = useMemo(() => validateAllIntents(intents), [intents]);

  /**
   * Preview - shows what will be created
   */
  const handlePreview = () => {
    setIsPreviewOpen(true);
  };

  /**
   * Clear - removes all pending intents
   */
  const handleClear = () => {
    if (confirm(`Clear all ${count} pending rule${count !== 1 ? 's' : ''}?`)) {
      clearIntents();
      setError(null);
    }
  };

  /**
   * Apply - sends intents to backend for actual rule creation
   */
  const handleApply = async () => {
    // Validate before applying
    if (!validationResult.isValid) {
      setError('Cannot apply: validation errors exist');
      return;
    }

    setIsApplying(true);
    setError(null);

    try {
      const response = await bulkCreateRules(projectId, { intents });

      if (response.errors && response.errors.length > 0) {
        const errorMsg = response.errors
          .map((e) => `${e.path}: ${e.reason}`)
          .join('\n');
        setError(errorMsg);
      }

      if (response.created && response.created.length > 0) {
        // Success - notify parent
        onRulesCreated(response.created);
        
        // Clear intents after successful creation
        clearIntents();
        
        // Show success message
        alert(`Successfully created ${response.created.length} rule${response.created.length !== 1 ? 's' : ''}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create rules');
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="relative">
      {/* Error Display */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm font-medium text-red-800">Error creating rules:</p>
          <pre className="mt-2 text-xs text-red-700 whitespace-pre-wrap">{error}</pre>
        </div>
      )}

      {/* FHIR Schema Tree with Rule Intent Controls */}
      <div className="border border-gray-200 rounded-lg bg-white h-full overflow-y-auto overflow-x-hidden">
        <FhirSchemaTreeRenderer
          resourceType={resourceType}
          hideAdvancedInternals={hideAdvancedInternals}
          hideExtensions={hideExtensions}
          renderNode={(context) => (
            <TreeNodeWithRuleIntent
              element={context.element}
              level={context.level}
              isExpanded={context.isExpanded}
              isSelected={context.isSelected}
              onToggle={context.onToggle}
              onSelect={context.onSelect}
              existingRules={existingRules}
              onToggleIntent={handleToggleIntent}
              hasIntent={hasIntent}
              getIntent={getIntent}
              parent={context.parent}
              // Terminology wiring will be added in future step
              // observedValues={getObservedValues(context.element.path)}
              // terminologyFieldType={getTerminologyType(context.element)}
            />
          )}
        />
      </div>

      {/* Pending Action Bar */}
      <PendingActionBar
        count={count}
        onPreview={handlePreview}
        onApply={handleApply}
        onClear={handleClear}
        isApplying={isApplying}
        hasValidationErrors={!validationResult.isValid}
        validationErrors={validationResult.errors}
      />

      {/* Preview Drawer */}
      <RulePreviewDrawer
        isOpen={isPreviewOpen}
        intents={intents}
        onClose={() => setIsPreviewOpen(false)}
      />
    </div>
  );
};

export default TreeBasedRuleCreator;
