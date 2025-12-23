import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Plus, Download, FileJson, Info, CheckCircle, ChevronDown, ChevronUp, Filter } from 'lucide-react';
import { RuleFilters, type RuleFilterState } from './RuleFilters';
import { RuleNavigator } from './RuleNavigator';
import { RuleList } from './RuleList';
import { RuleEditorModal } from './RuleEditorModal';
import { SuggestedRulesPanel } from './SuggestedRulesPanel';
import { RuleModeSelectorModal } from './RuleModeSelectorModal';
import { AddRuleModal } from './add-rule/AddRuleModal';
import type { RuleTypeOption } from './add-rule/RuleTypeSelector';
import { AdvancedRulesDrawer } from './AdvancedRulesDrawer';
import type { SystemRuleSuggestion } from '../../../api/projects';
import type { DraftRule } from '../../../types/ruleIntent';
import { ValidationState } from '../../../types/validationState';
import { analyzeFhirBundle, isRulePathObserved } from '../../../services/bundleAnalysisService';
import { useRuleReview } from '../../../playground/rule-review/hooks/useRuleReview';
import { getIssueCounts } from '../../../playground/rule-review';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

interface Rule {
  id: string;
  type: string;
  resourceType: string;
  path: string;
  severity: string;
  message: string;
  params?: Record<string, any>;
  origin?: 'manual' | 'system-suggested' | 'ai-suggested';
  explainability?: any;
  enabled?: boolean;
  saveState?: SaveState;
}

interface RulesPanelProps {
  rules: Rule[];
  onRulesChange: (rules: Rule[]) => void;
  onSave?: () => Promise<void> | void;
  projectBundle?: object;
  hl7Samples?: any[];
  onNavigateToPath?: (path: string) => void;
  suggestions?: SystemRuleSuggestion[];
  projectId?: string;
  features?: {
    treeRuleAuthoring?: boolean;
  };
  validationState?: string; // ValidationState from useValidationState hook
}

export const RulesPanel: React.FC<RulesPanelProps> = ({
  rules,
  onRulesChange,
  onSave,
  projectBundle,
  hl7Samples,
  onNavigateToPath,
  suggestions = [],
  projectId,
  features,
  validationState,
}) => {
  const [filters, setFilters] = useState<RuleFilterState>({
    searchQuery: '',
    resourceType: '',
    ruleType: '',
    severity: '',
    origin: '',
    observationStatus: '',
  });
  const [selectedResourceType, setSelectedResourceType] = useState<string | null>(null);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());
  const [isModeSelectorOpen, setIsModeSelectorOpen] = useState(false);
  const [isAddRuleModalOpen, setIsAddRuleModalOpen] = useState(false);
  const [isAdvancedDrawerOpen, setIsAdvancedDrawerOpen] = useState(false);
  const [isRuleReviewDismissed, setIsRuleReviewDismissed] = useState(false);
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  const [ruleSaveStates, setRuleSaveStates] = useState<Map<string, SaveState>>(new Map());
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRulesRef = useRef<string>('');
  const isInitialMount = useRef(true);

  // Auto-save: Trigger save when rules change (content only, not save state)
  useEffect(() => {
    // Skip on initial mount
    if (isInitialMount.current) {
      console.log('[RulesPanel:AutoSave] Initial mount, setting baseline');
      const rulesWithoutSaveState = rules.map(({ saveState, ...rule }) => rule);
      lastSavedRulesRef.current = JSON.stringify(rulesWithoutSaveState);
      isInitialMount.current = false;
      return;
    }
    
    // Skip if no rules
    if (rules.length === 0) {
      console.log('[RulesPanel:AutoSave] Skipped - no rules');
      return;
    }
    
    // Create a serialized version without saveState for comparison
    const rulesWithoutSaveState = rules.map(({ saveState, ...rule }) => rule);
    const serialized = JSON.stringify(rulesWithoutSaveState);
    
    // Skip if rules haven't actually changed
    if (serialized === lastSavedRulesRef.current) {
      console.log('[RulesPanel:AutoSave] Skipped - no content change (save state only)');
      return;
    }
    
    console.log('[RulesPanel:AutoSave] Content changed, triggering save');
    console.log('[RulesPanel:AutoSave] Rules count:', rules.length);
    console.log('[RulesPanel:AutoSave] Changed rules:', rulesWithoutSaveState.map(r => ({ id: r.id, path: r.path })));
    
    lastSavedRulesRef.current = serialized;

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      console.log('[RulesPanel:AutoSave] Clearing previous timeout');
      clearTimeout(saveTimeoutRef.current);
    }

    // Mark all rules as saving (using local state, not parent)
    const newSaveStates = new Map<string, SaveState>();
    rules.forEach(rule => {
      newSaveStates.set(rule.id, 'saving');
    });
    console.log('[RulesPanel:AutoSave] Setting save states to "saving"');
    setRuleSaveStates(newSaveStates);

    // Actually save to backend
    saveTimeoutRef.current = setTimeout(async () => {
      console.log('[RulesPanel:AutoSave] Calling backend save...');
      
      try {
        if (onSave) {
          await onSave();
          console.log('[RulesPanel:AutoSave] Backend save successful, setting to "saved"');
        } else {
          console.log('[RulesPanel:AutoSave] No onSave callback, simulating save');
        }
        
        // Mark as saved
        const savedStates = new Map<string, SaveState>();
        rules.forEach(rule => {
          savedStates.set(rule.id, 'saved');
        });
        setRuleSaveStates(savedStates);

        // Clear 'saved' state after 2 seconds
        saveTimeoutRef.current = setTimeout(() => {
          console.log('[RulesPanel:AutoSave] Clearing save states (idle)');
          setRuleSaveStates(new Map());
          saveTimeoutRef.current = null;
        }, 2000);
      } catch (error) {
        console.error('[RulesPanel:AutoSave] Backend save failed:', error);
        // Mark as error
        const errorStates = new Map<string, SaveState>();
        rules.forEach(rule => {
          errorStates.set(rule.id, 'error');
        });
        setRuleSaveStates(errorStates);
        saveTimeoutRef.current = null;
      }
    }, 500);
  }, [rules, onSave]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Analyze bundle for observed resources and paths using service
  const bundleAnalysis = useMemo(() => {
    return analyzeFhirBundle(projectBundle);
  }, [projectBundle]);
  
  // Run Rule Review (advisory only, non-blocking)
  const ruleReviewResult = useRuleReview({
    rules: rules.length > 0 && projectBundle ? rules : [],
    bundle: projectBundle,
  });
  
  const ruleReviewCounts = getIssueCounts(ruleReviewResult);
  const hasRuleReviewIssues = ruleReviewCounts.total > 0;

  // Helper: Get advisory issues for a specific rule (for inline display)
  const getAdvisoryIssuesForRule = (ruleId: string) => {
    return ruleReviewResult.issues.filter(issue => issue.ruleId === ruleId);
  };

  // Check if a rule's path is observed in the bundle (wrapper for UI logic)
  const checkRuleObserved = (rule: Rule): boolean => {
    const fullPath = `${rule.resourceType}.${rule.path}`;
    return isRulePathObserved(fullPath, bundleAnalysis);
  };

  // Extract available filter options
  const availableResourceTypes = useMemo(() => {
    const types = new Set(rules.map((r) => r.resourceType));
    return Array.from(types).sort();
  }, [rules]);

  const availableRuleTypes = useMemo(() => {
    const types = new Set(rules.map((r) => r.type));
    return Array.from(types).sort();
  }, [rules]);

  // Group rules by resource type for navigator
  const resourceGroups = useMemo(() => {
    const groups: Record<string, number> = {};
    rules.forEach((rule) => {
      groups[rule.resourceType] = (groups[rule.resourceType] || 0) + 1;
    });
    return Object.entries(groups)
      .map(([resourceType, count]) => ({ resourceType, count }))
      .sort((a, b) => a.resourceType.localeCompare(b.resourceType));
  }, [rules]);

  // Apply filters
  const filteredRules = useMemo(() => {
    return rules.filter((rule) => {
      // Navigator filter
      if (selectedResourceType && rule.resourceType !== selectedResourceType) {
        return false;
      }

      // Search query
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        const matchesPath = rule.path?.toLowerCase().includes(query);
        const matchesMessage = rule.message?.toLowerCase().includes(query);
        if (!matchesPath && !matchesMessage) {
          return false;
        }
      }

      // Resource type filter
      if (filters.resourceType && rule.resourceType !== filters.resourceType) {
        return false;
      }

      // Rule type filter
      if (filters.ruleType && rule.type !== filters.ruleType) {
        return false;
      }

      // Severity filter
      if (filters.severity && rule.severity !== filters.severity) {
        return false;
      }

      // Origin filter
      if (filters.origin) {
        const ruleOrigin = rule.origin || 'manual';
        if (ruleOrigin !== filters.origin) {
          return false;
        }
      }

      // Observation status filter (only applies when validated)
      if (filters.observationStatus && validationState === ValidationState.Validated) {
        const isObserved = checkRuleObserved(rule);
        if (filters.observationStatus === 'observed' && !isObserved) {
          return false;
        }
        if (filters.observationStatus === 'not-observed' && isObserved) {
          return false;
        }
      }

      return true;
    });
  }, [rules, filters, selectedResourceType, validationState, bundleAnalysis]);

  const handleAddRule = () => {
    // Check if feature flag is enabled for tree authoring
    if (features?.treeRuleAuthoring) {
      // Show mode selector (for advanced/tree-based authoring)
      setIsModeSelectorOpen(true);
    } else {
      // Show new rule-type-first modal
      setIsAddRuleModalOpen(true);
    }
  };

  const openBasicRuleModal = () => {
    const newRule: Rule = {
      id: `rule-${Date.now()}`,
      type: 'Required',
      resourceType: selectedResourceType || 'Patient',
      path: '',
      severity: 'error',
      message: '',
      origin: 'manual',
      enabled: true,
    };
    setEditingRule(newRule);
    setIsModalOpen(true);
  };

  const handleSelectBasicRule = () => {
    setIsModeSelectorOpen(false);
    openBasicRuleModal();
  };

  // handleSelectAdvancedRule removed - Advanced Rules (Preview) is hidden

  const handleEditRule = (rule: Rule) => {
    setEditingRule(rule);
    setIsModalOpen(true);
  };

  const handleSaveRule = (updatedRule: Rule) => {
    console.log('[RulesPanel:handleSaveRule] Saving rule:', { id: updatedRule.id, path: updatedRule.path, type: updatedRule.type });
    
    // Don't add saveState here - let the auto-save effect handle it
    const ruleWithoutSaveState = { ...updatedRule };
    delete ruleWithoutSaveState.saveState;
    
    const existingIndex = rules.findIndex((r) => r.id === updatedRule.id);
    
    if (existingIndex >= 0) {
      // Update existing rule
      console.log('[RulesPanel:handleSaveRule] Updating existing rule at index:', existingIndex);
      const newRules = [...rules];
      newRules[existingIndex] = ruleWithoutSaveState;
      onRulesChange(newRules);
    } else {
      // Add new rule
      console.log('[RulesPanel:handleSaveRule] Adding new rule, total will be:', rules.length + 1);
      onRulesChange([...rules, ruleWithoutSaveState]);
    }
    
    setIsModalOpen(false);
    setEditingRule(null);
  };

  const handleDeleteRule = (ruleId: string) => {
    console.log('[RulesPanel:handleDeleteRule] Deleting rule:', ruleId);
    const remainingRules = rules.filter((r) => r.id !== ruleId);
    console.log('[RulesPanel:handleDeleteRule] Remaining rules count:', remainingRules.length);
    onRulesChange(remainingRules);
  };

  const handleToggleRule = (ruleId: string) => {
    const rule = rules.find(r => r.id === ruleId);
    console.log('[RulesPanel:handleToggleRule] Toggling rule:', ruleId, 'from', rule?.enabled !== false ? 'enabled' : 'disabled', 'to', rule?.enabled !== false ? 'disabled' : 'enabled');
    
    const updatedRules = rules.map((r) =>
      r.id === ruleId ? { ...r, enabled: r.enabled !== false ? false : true } : r
    );
    onRulesChange(updatedRules);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingRule(null);
  };

  const handleExportRules = () => {
    const rulesObject = {
      version: '1.0',
      fhirVersion: 'R4',
      rules: rules,
    };
    const blob = new Blob([JSON.stringify(rulesObject, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rules.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Filter out dismissed suggestions
  const visibleSuggestions = useMemo(() => {
    return suggestions.filter(s => !dismissedSuggestions.has(s.suggestionId));
  }, [suggestions, dismissedSuggestions]);

  // Handle applying a suggestion - convert to editable rule
  const handleApplySuggestion = (suggestion: SystemRuleSuggestion) => {
    // Only allow converting suggestions that have a rule type
    if (!suggestion.ruleType) {
      return; // Observation-only, cannot convert to rule
    }
    
    // Convert suggestion to Rule format
    const newRule: Rule = {
      id: `rule-${Date.now()}`, // Temporary ID
      type: suggestion.ruleType,
      resourceType: suggestion.resourceType,
      path: suggestion.path,
      severity: 'error', // Default severity
      message: `${suggestion.ruleType} validation for ${suggestion.resourceType}.${suggestion.path}`,
      params: suggestion.params,
      origin: 'system-suggested',
    };

    // Open editor modal with pre-filled suggestion data
    setEditingRule(newRule);
    setIsModalOpen(true);

    // Remove from suggestions after applying
    setDismissedSuggestions(prev => new Set(prev).add(suggestion.suggestionId));
  };

  // Handle dismissing a suggestion
  const handleDismissSuggestion = (suggestionId: string) => {
    setDismissedSuggestions(prev => new Set(prev).add(suggestionId));
  };

  // Handle rules created from tree-based authoring
  const handleTreeRulesCreated = (draftRules: DraftRule[]) => {
    // Convert DraftRule[] to Rule[] format
    const newRules: Rule[] = draftRules.map((draft) => ({
      id: draft.id,
      type: draft.type,
      resourceType: draft.resourceType || 'Unknown',
      path: draft.path,
      severity: draft.severity,
      message: draft.message,
      params: draft.params,
      origin: 'manual',
      enabled: true,
    }));

    // Append to existing rules
    onRulesChange([...rules, ...newRules]);

    // Show success feedback (could add a toast notification here)
    console.log(`Created ${newRules.length} rule(s) from tree authoring`);
  };

  // Check validation states (advisory only - never blocks)
  const showNoBundleState = validationState === ValidationState.NoBundle;
  const showValidatedSuccess = validationState === ValidationState.Validated;

  // Render NoBundle empty state
  if (showNoBundleState) {
    return (
      <div className="flex flex-col h-full bg-white">

        {/* Empty State */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <FileJson className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No Bundle Loaded
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Load a FHIR bundle in the left panel to start creating validation rules.
              Rules define constraints and checks that will be applied to your FHIR resources.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-left">
              <div className="flex gap-2">
                <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Getting Started</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Load a sample bundle from the Bundle tab</li>
                    <li>Or paste your own FHIR bundle JSON</li>
                    <li>Then return here to define rules</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">

      {/* Context Strip - Only show validated state success (not-validated state is redundant with global header) */}
      {showValidatedSuccess && (
        <div className="border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between gap-3 px-4 py-2 text-xs min-h-[32px]">
            <div className="inline-flex items-center gap-2 text-gray-600 whitespace-nowrap flex-shrink min-w-0">
              <span className="font-medium flex-shrink-0">FHIR R4</span>
              <span className="flex-shrink-0">·</span>
              <CheckCircle className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
              <span className="text-green-700 truncate">Bundle validated · {rules.length} rule{rules.length !== 1 ? 's' : ''} active</span>
            </div>
          </div>
        </div>
      )}

      {/* Rule Quality Advisory - Summary & Navigation Only (Non-blocking) */}
      {hasRuleReviewIssues && !isRuleReviewDismissed && (
        <div className="border-b border-blue-200 bg-blue-50">
          <div className="px-4 py-2.5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2 flex-1">
                <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-blue-900">
                    Rule Quality Advisory
                  </p>
                  <p className="text-xs text-blue-700 mt-0.5">
                    {ruleReviewCounts.total} suggestion{ruleReviewCounts.total !== 1 ? 's' : ''} detected
                    {' '}· Non-blocking guidance to help improve rule quality
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Some rules may not match the current bundle. These are suggestions only and won't prevent validation or editing.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsRuleReviewDismissed(true)}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium flex-shrink-0"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unified Control Bar: Filters + Actions */}
      <div className="border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between px-4 py-2 gap-4">
          {/* Left: Filter Toggle + Legend */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
              className="inline-flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900 font-medium"
            >
              <Filter className="w-3.5 h-3.5" />
              Filters
              {isFiltersExpanded ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </button>
            
            {/* Inline legend - only when validated */}
            {showValidatedSuccess && (
              <div className="flex items-center gap-3 text-xs text-gray-600">
                <div className="flex items-center gap-1.5">
                  <svg className="w-2.5 h-2.5 fill-green-500" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" />
                  </svg>
                  <span>Observed</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <svg className="w-2.5 h-2.5 fill-none stroke-2 stroke-gray-300" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" strokeWidth="2" />
                  </svg>
                  <span>Not in bundle</span>
                </div>
              </div>
            )}
          </div>

          {/* Right: Action Buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleExportRules}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
            >
              <Download size={13} />
              Export
            </button>
            <button
              onClick={handleAddRule}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors"
              title="Add new rule"
            >
              <Plus size={14} />
              Add Rule
            </button>
          </div>
        </div>

        {/* Expanded Filters */}
        {isFiltersExpanded && (
          <div className="px-4 pb-3">
            <RuleFilters
              filters={filters}
              onFiltersChange={setFilters}
              availableResourceTypes={availableResourceTypes}
              availableRuleTypes={availableRuleTypes}
              showObservationFilter={showValidatedSuccess}
            />
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Navigator Sidebar */}
        <RuleNavigator
          resourceGroups={resourceGroups}
          selectedResourceType={selectedResourceType}
          onSelectResource={setSelectedResourceType}
        />

        {/* Rule List */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Suggested Rules Section - appears above project rules */}
          <SuggestedRulesPanel
            suggestions={visibleSuggestions}
            onApplySuggestion={handleApplySuggestion}
            onDismissSuggestion={handleDismissSuggestion}
            onNavigateToPath={onNavigateToPath}
          />

          {/* Project Rules Section */}
          <RuleList
            rules={filteredRules.map(rule => ({
              ...rule,
              saveState: ruleSaveStates.get(rule.id) || 'idle',
            }))}
            onEditRule={handleEditRule}
            onDeleteRule={handleDeleteRule}
            onToggleRule={handleToggleRule}
            onNavigateToPath={onNavigateToPath}
            groupBy="resourceType"
            getObservationStatus={checkRuleObserved}
            showObservationIndicators={showValidatedSuccess}
            getAdvisoryIssues={getAdvisoryIssuesForRule}
            projectBundle={projectBundle}
          />
        </div>
      </div>

      {/* Rule Editor Modal */}
      <RuleEditorModal
        rule={editingRule}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveRule}
        projectBundle={projectBundle}
        hl7Samples={hl7Samples}
      />

      {/* Add Rule Modal - Rule Type First UX */}
      <AddRuleModal
        isOpen={isAddRuleModalOpen}
        onClose={() => setIsAddRuleModalOpen(false)}
        onSaveRule={handleSaveRule}
        selectedResourceType={selectedResourceType || 'Patient'}
        projectBundle={projectBundle}
        hl7Samples={hl7Samples}
        projectId={projectId}
      />

      {/* Rule Mode Selector Modal */}
      <RuleModeSelectorModal
        isOpen={isModeSelectorOpen}
        onClose={() => setIsModeSelectorOpen(false)}
        onSelectBasic={handleSelectBasicRule}
      />

      {/* Advanced Rules Drawer */}
      {features?.treeRuleAuthoring && projectId && (
        <AdvancedRulesDrawer
          isOpen={isAdvancedDrawerOpen}
          onClose={() => setIsAdvancedDrawerOpen(false)}
          projectId={projectId}
          resourceType="Patient"
          projectBundle={projectBundle}
          existingRules={rules.map(r => ({
            id: r.id,
            type: r.type,
            path: r.path,
            message: r.message,
            severity: r.severity,
          }))}
          onRulesCreated={handleTreeRulesCreated}
        />
      )}
    </div>
  );
};
