import React, { useState, useMemo } from 'react';
import { Plus, Save, Download, FileJson, AlertCircle, Info, XCircle, Lock, CheckCircle, Target, AlertTriangle } from 'lucide-react';
import { RuleFilters, type RuleFilterState } from './RuleFilters';
import { RuleNavigator } from './RuleNavigator';
import { RuleList } from './RuleList';
import { RuleEditorModal } from './RuleEditorModal';
import { SuggestedRulesPanel } from './SuggestedRulesPanel';
import { RuleModeSelectorModal } from './RuleModeSelectorModal';
import { AdvancedRulesDrawer } from './AdvancedRulesDrawer';
import type { SystemRuleSuggestion } from '../../../api/projects';
import type { DraftRule } from '../../../types/ruleIntent';
import { ValidationState } from '../../../types/validationState';
import { analyzeFhirBundle, isRulePathObserved } from '../../../services/bundleAnalysisService';

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
}

interface RulesPanelProps {
  rules: Rule[];
  onRulesChange: (rules: Rule[]) => void;
  onSave: () => void;
  hasChanges?: boolean;
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
  hasChanges = false,
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
  const [isAdvancedDrawerOpen, setIsAdvancedDrawerOpen] = useState(false);

  // Analyze bundle for observed resources and paths using service
  const bundleAnalysis = useMemo(() => {
    return analyzeFhirBundle(projectBundle);
  }, [projectBundle]);

  // Check if a rule's path is observed in the bundle (wrapper for UI logic)
  const checkRuleObserved = (rule: Rule): boolean => {
    const fullPath = `${rule.resourceType}.${rule.path}`;
    return isRulePathObserved(fullPath, bundleAnalysis);
  };

  // Count rules with observed vs not observed paths
  const ruleAlignmentStats = useMemo(() => {
    const observed = rules.filter(r => checkRuleObserved(r)).length;
    const notObserved = rules.length - observed;
    return { observed, notObserved, total: rules.length };
  }, [rules, bundleAnalysis]);

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
    if (showFailedBlocking) {
      // Don't allow adding rules when validation has failed
      return;
    }
    // Check if feature flag is enabled
    if (features?.treeRuleAuthoring) {
      // Show mode selector
      setIsModeSelectorOpen(true);
    } else {
      // Directly open basic rule modal (existing behavior)
      openBasicRuleModal();
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
    if (showFailedBlocking) {
      // Don't open modal when validation has failed
      return;
    }
    setIsModeSelectorOpen(false);
    openBasicRuleModal();
  };

  // handleSelectAdvancedRule removed - Advanced Rules (Preview) is hidden

  const handleEditRule = (rule: Rule) => {
    if (showFailedBlocking) {
      // Don't allow editing rules when validation has failed
      return;
    }
    setEditingRule(rule);
    setIsModalOpen(true);
  };

  const handleSaveRule = (updatedRule: Rule) => {
    const existingIndex = rules.findIndex((r) => r.id === updatedRule.id);
    if (existingIndex >= 0) {
      // Update existing rule
      const newRules = [...rules];
      newRules[existingIndex] = updatedRule;
      onRulesChange(newRules);
    } else {
      // Add new rule
      onRulesChange([...rules, updatedRule]);
    }
    setIsModalOpen(false);
    setEditingRule(null);
  };

  const handleDeleteRule = (ruleId: string) => {
    if (showFailedBlocking) {
      // Don't allow deleting rules when validation has failed
      return;
    }
    onRulesChange(rules.filter((r) => r.id !== ruleId));
  };

  const handleToggleRule = (ruleId: string) => {
    if (showFailedBlocking) {
      // Don't allow toggling rules when validation has failed
      return;
    }
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

  // Check if we should show empty state
  const showNoBundleState = validationState === ValidationState.NoBundle;
  const showNotValidatedGuidance = validationState === ValidationState.NotValidated;
  const showFailedBlocking = validationState === ValidationState.Failed;
  const showValidatedSuccess = validationState === ValidationState.Validated;
  const disableRuleCreation = showNoBundleState || showFailedBlocking;
  const disableRuleEditing = showFailedBlocking;

  // Render NoBundle empty state
  if (showNoBundleState) {
    return (
      <div className="flex flex-col h-full bg-white">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-900">Rules</h3>
        </div>

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
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-900">Rules</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportRules}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
          >
            <Download size={13} />
            Export
          </button>
          <button
            onClick={handleAddRule}
            disabled={disableRuleCreation}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title={
              showFailedBlocking 
                ? 'Fix validation errors first' 
                : showNoBundleState 
                  ? 'Load a bundle first' 
                  : 'Add new rule'
            }
          >
            <Plus size={14} />
            Add Rule
          </button>
          <button
            onClick={onSave}
            disabled={!hasChanges}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={14} />
            Save Rules
          </button>
        </div>
      </div>

      {/* Failed State Blocking Banner */}
      {showFailedBlocking && (
        <div className="mx-4 mt-3 mb-2 bg-red-50 border-2 border-red-300 rounded-lg p-3 shadow-sm">
          <div className="flex gap-2">
            <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-900 mb-1 flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Rule Editing Disabled
              </p>
              <p className="text-xs text-red-800 mb-2">
                Your bundle contains validation errors. Rules cannot be edited or applied until all errors are fixed.
                This prevents invalid data from influencing your validation rules.
              </p>
              <p className="text-xs text-red-700 font-medium">
                → Switch to the Validation tab to view and fix errors
              </p>
            </div>
          </div>
        </div>
      )}

      {/* NotValidated Guidance Banner */}
      {showNotValidatedGuidance && (
        <div className="mx-4 mt-3 mb-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
          <div className="flex gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-900 mb-1">
                Schema-Only Mode
              </p>
              <p className="text-xs text-amber-800 mb-2">
                You can create rules now, but they won't run until you validate your bundle.
                Rules created here will check against the FHIR schema structure.
              </p>
              <p className="text-xs text-amber-700">
                💡 <span className="font-medium">Tip:</span> Run validation to see how your rules perform against actual data.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Validated State Success Banner */}
      {showValidatedSuccess && (
        <div className="mx-4 mt-3 mb-2 bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex gap-2">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-green-900 mb-1 flex items-center gap-2">
                <Target className="w-4 h-4" />
                Rules Based on Validated Bundle
              </p>
              <p className="text-xs text-green-800 mb-2">
                Your bundle passed validation. Rules are now project-specific and aligned with your actual data.
                Observation indicators show which paths exist in your bundle.
              </p>
              {ruleAlignmentStats.notObserved > 0 && (() => {
                const unobservedRules = rules.filter(r => !checkRuleObserved(r));
                const [showDetails, setShowDetails] = useState(false);
                
                return (
                  <div className="bg-amber-50 border border-amber-200 rounded px-3 py-2 mt-2">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs text-amber-800 mb-1">
                          <span className="font-semibold">Non-Blocking Warning:</span> {ruleAlignmentStats.notObserved} of {ruleAlignmentStats.total} rule(s) target paths not in bundle.
                        </p>
                        <p className="text-xs text-amber-700 mb-2">
                          These rules won't trigger on current data but remain valid for future submissions.
                          <span className="font-medium"> You can continue editing without restrictions.</span>
                        </p>
                        <button
                          onClick={() => setShowDetails(!showDetails)}
                          className="text-xs text-amber-700 hover:text-amber-900 font-medium underline"
                        >
                          {showDetails ? 'Hide' : 'Show'} affected rules ({unobservedRules.length})
                        </button>
                        
                        {showDetails && (
                          <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                            {unobservedRules.map(rule => (
                              <div key={rule.id} className="flex items-start gap-2 text-xs bg-amber-100 rounded px-2 py-1">
                                <span className="font-mono text-amber-900 flex-shrink-0">{rule.resourceType}.{rule.path}</span>
                                <span className="text-amber-700 truncate">{rule.message || rule.type}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
              {ruleAlignmentStats.observed === ruleAlignmentStats.total && ruleAlignmentStats.total > 0 && (
                <p className="text-xs text-green-700 font-medium mt-1">
                  ✓ All {ruleAlignmentStats.total} rule(s) aligned with bundle data
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Observation Indicator Legend */}
      {showValidatedSuccess && (
        <div className="mx-4 mb-2 flex items-center gap-4 text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded px-3 py-2">
          <span className="font-medium text-gray-700">Legend:</span>
          <div className="flex items-center gap-1.5">
            <svg className="w-3 h-3 fill-green-500 text-green-500" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" />
            </svg>
            <span>Path observed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <svg className="w-3 h-3 fill-none text-gray-300 stroke-2 stroke-current" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" strokeWidth="2" />
            </svg>
            <span>Path not in bundle</span>
          </div>
        </div>
      )}

      {/* Filters */}
      <RuleFilters
        filters={filters}
        onFiltersChange={setFilters}
        availableResourceTypes={availableResourceTypes}
        availableRuleTypes={availableRuleTypes}
        showObservationFilter={showValidatedSuccess}
      />

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
            rules={filteredRules}
            onEditRule={handleEditRule}
            onDeleteRule={handleDeleteRule}
            onToggleRule={handleToggleRule}
            onNavigateToPath={onNavigateToPath}
            groupBy="resourceType"
            disabled={disableRuleEditing}
            getObservationStatus={checkRuleObserved}
            showObservationIndicators={showValidatedSuccess}
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
