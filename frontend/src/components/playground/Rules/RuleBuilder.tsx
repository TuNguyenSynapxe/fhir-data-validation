import React, { useState, useEffect, useMemo } from 'react';
import { Plus } from 'lucide-react';
import { RuleCard } from './RuleCard';
import { RuleEditorModal } from './RuleEditorModal';
import { AddRuleModal } from './add-rule/AddRuleModal';
import RuleCoveragePanel from '../../rules/RuleCoveragePanel';
import type { SchemaNode, ValidationRule } from '../../../types/ruleCoverage';

// ⚠️ LEGACY: Do not extend.
// New rules must be created via rule-type-first flow.
// See: src/components/playground/Rules/rule-types/

interface Rule {
  id: string;
  type: string;
  resourceType: string;
  path: string;
  severity: string;
  message: string;
  params?: Record<string, any>;
}

interface RuleBuilderProps {
  rules: Rule[];
  onRulesChange: (rules: Rule[]) => void;
  onSave: () => void;
  hasChanges?: boolean;
  projectBundle?: object;
  hl7Samples?: any[];
}

export const RuleBuilder: React.FC<RuleBuilderProps> = ({
  rules,
  onRulesChange,
  onSave,
  hasChanges = false,
  projectBundle,
  hl7Samples,
}) => {
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddRuleModalOpen, setIsAddRuleModalOpen] = useState(false);
  const [schemaTree, setSchemaTree] = useState<SchemaNode[]>([]);
  const [isLoadingSchema, setIsLoadingSchema] = useState(false);

  // Determine resource type from rules (use first rule's resourceType or default to Patient)
  const resourceType = useMemo(() => {
    return rules.length > 0 ? rules[0].resourceType : 'Patient';
  }, [rules]);

  // Fetch schema tree when resource type changes
  useEffect(() => {
    const fetchSchema = async () => {
      if (!resourceType) return;

      setIsLoadingSchema(true);
      try {
        const response = await fetch(`/api/fhir/schema/${resourceType}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch schema: ${response.status}`);
        }

        const data = await response.json();
        
        // Convert backend schema to SchemaNode format
        const convertNode = (node: any): SchemaNode => ({
          path: node.path || '',
          name: node.elementName || '',
          type: node.type || 'Element',
          cardinality: `${node.min || 0}..${node.max || '1'}`,
          children: node.children?.map((child: any) => convertNode(child)) || [],
        });

        setSchemaTree([convertNode(data)]);
      } catch (error) {
        console.error('Failed to load schema:', error);
        setSchemaTree([]);
      } finally {
        setIsLoadingSchema(false);
      }
    };

    fetchSchema();
  }, [resourceType]);

  // Convert playground rules to ValidationRule format
  const validationRules: ValidationRule[] = useMemo(() => {
    return rules.map(rule => ({
      id: rule.id,
      fhirPath: rule.path,
      operator: rule.type,
      value: rule.params?.value,
      message: rule.message,
    }));
  }, [rules]);

  const handleAddRule = () => {
    setIsAddRuleModalOpen(true);
  };

  const handleDeleteRule = (ruleId: string) => {
    onRulesChange(rules.filter((r) => r.id !== ruleId));
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

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingRule(null);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between border-b bg-gray-50 px-4 py-2">
        <h3 className="font-semibold">Business Rules</h3>
        <div className="flex gap-2">
          <button
            onClick={handleAddRule}
            className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700"
          >
            <Plus className="w-4 h-4" />
            Add Rule
          </button>
          <button
            onClick={onSave}
            disabled={!hasChanges}
            className="px-4 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            Save Rules
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-3">
        {rules.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            No rules defined. Click "Add Rule" to create one.
          </div>
        ) : (
          rules.map((rule) => (
            <RuleCard
              key={rule.id}
              rule={rule}
              onEdit={handleEditRule}
              onDelete={handleDeleteRule}
            />
          ))
        )}

        {/* Rule Coverage Panel */}
        {!isLoadingSchema && schemaTree.length > 0 && (
          <div className="mt-4">
            <RuleCoveragePanel
              resourceType={resourceType}
              schemaTree={schemaTree}
              rules={validationRules}
              suggestions={[]}
            />
          </div>
        )}
      </div>

      {/* Drawer context is read-only by design */}
      {/* Rule Editor Modal - Legacy: ONLY for editing existing rules */}
      {/* Legacy rule editor removed for Required rule creation – Phase 2 architecture */}
      <RuleEditorModal
        rule={editingRule}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveRule}
        projectBundle={projectBundle}
        hl7Samples={hl7Samples}
      />

      {/* Add Rule Modal */}
      <AddRuleModal
        isOpen={isAddRuleModalOpen}
        onClose={() => setIsAddRuleModalOpen(false)}
        onSaveRule={handleSaveRule}
        selectedResourceType={resourceType}
        projectBundle={projectBundle}
        hl7Samples={hl7Samples}
      />
    </div>
  );
};
