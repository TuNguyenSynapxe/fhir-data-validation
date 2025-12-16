import React, { useState, useMemo } from 'react';
import { Plus, Save, Download } from 'lucide-react';
import { RuleFilters, type RuleFilterState } from './RuleFilters';
import { RuleNavigator } from './RuleNavigator';
import { RuleList } from './RuleList';
import { RuleEditorModal } from './RuleEditorModal';
import { SuggestedRulesPanel } from './SuggestedRulesPanel';
import type { SystemRuleSuggestion } from '../../../api/projects';

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
}) => {
  const [filters, setFilters] = useState<RuleFilterState>({
    searchQuery: '',
    resourceType: '',
    ruleType: '',
    severity: '',
    origin: '',
  });
  const [selectedResourceType, setSelectedResourceType] = useState<string | null>(null);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());

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

      return true;
    });
  }, [rules, filters, selectedResourceType]);

  const handleAddRule = () => {
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

  const handleEditRule = (rule: Rule) => {
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
    onRulesChange(rules.filter((r) => r.id !== ruleId));
  };

  const handleToggleRule = (ruleId: string) => {
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
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors"
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

      {/* Filters */}
      <RuleFilters
        filters={filters}
        onFiltersChange={setFilters}
        availableResourceTypes={availableResourceTypes}
        availableRuleTypes={availableRuleTypes}
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
    </div>
  );
};
