import React, { useState, useMemo } from 'react';
import { useRuleIntentState } from '../hooks/useRuleIntentState';
import { bulkCreateRules } from '../api/rulesApi';
import { validateAllIntents } from '../utils/ruleIntentValidation';
import PendingActionBar from '../components/rules/PendingActionBar';
import RulePreviewDrawer from '../components/rules/RulePreviewDrawer';
import TreeNodeWithRuleIntent from '../components/rules/TreeNodeWithRuleIntent';
import type { RuleIntent, DraftRule } from '../types/ruleIntent';

/**
 * TreeRuleCreationExample - Complete working example
 * 
 * This page demonstrates the full tree-based rule creation workflow:
 * 1. Mock FHIR schema tree (Patient resource)
 * 2. Checkbox interaction on nodes
 * 3. Pending intent management
 * 4. Preview drawer
 * 5. Bulk rule creation
 * 
 * Can be used as:
 * - Reference implementation
 * - Integration test
 * - User demo
 */

interface TreeNode {
  path: string;
  name: string;
  type: string[];
  cardinality: string;
  children?: TreeNode[];
}

interface ObservedValue {
  value: string;
  count: number;
}

// Mock Patient schema for demonstration
const MOCK_PATIENT_SCHEMA: TreeNode = {
  path: 'Patient',
  name: 'Patient',
  type: ['Resource'],
  cardinality: '1..1',
  children: [
    {
      path: 'Patient.id',
      name: 'id',
      type: ['string'],
      cardinality: '0..1',
    },
    {
      path: 'Patient.gender',
      name: 'gender',
      type: ['code'],
      cardinality: '0..1',
    },
    {
      path: 'Patient.birthDate',
      name: 'birthDate',
      type: ['date'],
      cardinality: '0..1',
    },
    {
      path: 'Patient.name',
      name: 'name',
      type: ['HumanName'],
      cardinality: '0..*',
      children: [
        {
          path: 'Patient.name.family',
          name: 'family',
          type: ['string'],
          cardinality: '0..1',
        },
        {
          path: 'Patient.name.given',
          name: 'given',
          type: ['string'],
          cardinality: '0..*',
        },
        {
          path: 'Patient.name.prefix',
          name: 'prefix',
          type: ['string'],
          cardinality: '0..*',
        },
      ],
    },
    {
      path: 'Patient.address',
      name: 'address',
      type: ['Address'],
      cardinality: '0..*',
      children: [
        {
          path: 'Patient.address.line',
          name: 'line',
          type: ['string'],
          cardinality: '0..*',
        },
        {
          path: 'Patient.address.city',
          name: 'city',
          type: ['string'],
          cardinality: '0..1',
        },
        {
          path: 'Patient.address.state',
          name: 'state',
          type: ['string'],
          cardinality: '0..1',
        },
        {
          path: 'Patient.address.postalCode',
          name: 'postalCode',
          type: ['string'],
          cardinality: '0..1',
        },
      ],
    },
    {
      path: 'Patient.telecom',
      name: 'telecom',
      type: ['ContactPoint'],
      cardinality: '0..*',
      children: [
        {
          path: 'Patient.telecom.system',
          name: 'system',
          type: ['code'],
          cardinality: '0..1',
        },
        {
          path: 'Patient.telecom.value',
          name: 'value',
          type: ['string'],
          cardinality: '0..1',
        },
      ],
    },
    {
      path: 'Patient.identifier',
      name: 'identifier',
      type: ['Identifier'],
      cardinality: '0..*',
      children: [
        {
          path: 'Patient.identifier.system',
          name: 'system',
          type: ['uri'],
          cardinality: '0..1',
        },
        {
          path: 'Patient.identifier.value',
          name: 'value',
          type: ['string'],
          cardinality: '0..1',
        },
      ],
    },
    {
      path: 'Patient.observation',
      name: 'observation',
      type: ['Reference(Observation)'],
      cardinality: '0..*',
    },
  ],
};

// Mock Observation schema with coding for terminology demo
const MOCK_OBSERVATION_SCHEMA: TreeNode = {
  path: 'Observation',
  name: 'Observation',
  type: ['Resource'],
  cardinality: '1..1',
  children: [
    {
      path: 'Observation.id',
      name: 'id',
      type: ['string'],
      cardinality: '0..1',
    },
    {
      path: 'Observation.status',
      name: 'status',
      type: ['code'],
      cardinality: '1..1',
    },
    {
      path: 'Observation.code',
      name: 'code',
      type: ['CodeableConcept'],
      cardinality: '1..1',
      children: [
        {
          path: 'Observation.code.coding',
          name: 'coding',
          type: ['Coding'],
          cardinality: '0..*',
          children: [
            {
              path: 'Observation.code.coding.system',
              name: 'system',
              type: ['uri'],
              cardinality: '0..1',
            },
            {
              path: 'Observation.code.coding.code',
              name: 'code',
              type: ['code'],
              cardinality: '0..1',
            },
            {
              path: 'Observation.code.coding.display',
              name: 'display',
              type: ['string'],
              cardinality: '0..1',
            },
          ],
        },
        {
          path: 'Observation.code.text',
          name: 'text',
          type: ['string'],
          cardinality: '0..1',
        },
      ],
    },
    {
      path: 'Observation.subject',
      name: 'subject',
      type: ['Reference(Patient)'],
      cardinality: '0..1',
    },
    {
      path: 'Observation.effectiveDateTime',
      name: 'effectiveDateTime',
      type: ['dateTime'],
      cardinality: '0..1',
    },
    {
      path: 'Observation.valueQuantity',
      name: 'valueQuantity',
      type: ['Quantity'],
      cardinality: '0..1',
    },
  ],
};

// Mock observed terminology values from sample data
const OBSERVED_SYSTEMS: Record<string, ObservedValue[]> = {
  'Observation.code.coding.system': [
    { value: 'https://fhir.synapxe.sg/CodeSystem/screening-type', count: 8 },
    { value: 'http://loinc.org', count: 3 },
  ],
};

const OBSERVED_CODES: Record<string, ObservedValue[]> = {
  'Observation.code.coding.code': [
    { value: 'HS', count: 3 },
    { value: 'OS', count: 2 },
    { value: 'VS', count: 2 },
    { value: 'DS', count: 1 },
  ],
};

const TreeRuleCreationExample: React.FC = () => {
  const [activeSchema, setActiveSchema] = useState<'patient' | 'observation'>('patient');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['Patient', 'Observation']));
  const [selectedPath, setSelectedPath] = useState<string>('');
  const [rules, setRules] = useState<DraftRule[]>([]);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    intents,
    addIntent,
    removeIntent,
    clearIntents,
    hasIntent,
    getIntent,
    count,
  } = useRuleIntentState();

  // Validate all intents
  const validationResult = useMemo(() => validateAllIntents(intents), [intents]);

  const toggleNode = (path: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const handleToggleIntent = (intent: RuleIntent | null) => {
    if (intent === null) {
      // Removal handled by child components
      return;
    }
    
    // Add or update intent
    addIntent(intent);
    setSuccessMessage(null);
    setError(null);
  };

  const handleClear = () => {
    if (count > 0 && confirm(`Clear all ${count} pending rule${count !== 1 ? 's' : ''}?`)) {
      clearIntents();
      setError(null);
      setSuccessMessage(null);
    }
  };

  const handleApply = async () => {
    // Validate before applying
    if (!validationResult.isValid) {
      setError('Cannot apply: validation errors exist');
      return;
    }

    setIsApplying(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // In real implementation, use actual projectId
      const projectId = 'demo-project';
      const response = await bulkCreateRules(projectId, { intents });

      if (response.errors && response.errors.length > 0) {
        const errorMsg = response.errors
          .map((e) => `${e.path}: ${e.reason}`)
          .join('\n');
        setError(errorMsg);
      }

      if (response.created && response.created.length > 0) {
        // Add new rules to state
        setRules((prev) => [...prev, ...response.created]);
        
        // Clear intents
        clearIntents();
        
        // Show success
        setSuccessMessage(
          `Successfully created ${response.created.length} rule${response.created.length !== 1 ? 's' : ''}! They appear as Draft in the rules list below.`
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create rules. Using mock response for demo.');
      
      // DEMO FALLBACK: Create mock rules if API fails
      const mockRules: DraftRule[] = intents.map((intent, idx) => {
        const baseRule = {
          id: `mock-rule-${Date.now()}-${idx}`,
          resourceType: intent.path.split('.')[0],
          path: intent.path,
          severity: 'error' as const,
          status: 'draft' as const,
        };

        if (intent.type === 'REQUIRED') {
          return {
            ...baseRule,
            type: 'Required' as const,
            message: `${intent.path} is required.`,
          };
        } else if (intent.type === 'ARRAY_LENGTH' && intent.params && 'min' in intent.params) {
          const { min, max, nonEmpty } = intent.params;
          const parts: string[] = [];
          
          if (min !== undefined && max !== undefined) {
            parts.push(`must contain between ${min} and ${max} items`);
          } else if (min !== undefined) {
            parts.push(`must contain at least ${min} item${min !== 1 ? 's' : ''}`);
          } else if (max !== undefined) {
            parts.push(`must contain at most ${max} item${max !== 1 ? 's' : ''}`);
          }
          
          if (nonEmpty) {
            parts.push('all items must be non-empty');
          }

          return {
            ...baseRule,
            type: 'ArrayLength' as const,
            message: `${intent.path} ${parts.join(', ')}.`,
            params: intent.params,
          };
        } else if (intent.type === 'CODE_SYSTEM') {
          const system = (intent.params as any)?.system || 'unknown';
          return {
            ...baseRule,
            type: 'CodeSystem' as const,
            message: `${intent.path} must use code system: ${system}`,
            params: intent.params,
          };
        } else if (intent.type === 'ALLOWED_CODES') {
          const codes = (intent.params as any)?.codes || [];
          return {
            ...baseRule,
            type: 'AllowedCodes' as const,
            message: `${intent.path} must be one of: ${codes.join(', ')}`,
            params: intent.params,
          };
        }

        return {
          ...baseRule,
          type: 'Required' as const,
          message: `${intent.path} rule created.`,
        };
      });
      
      setRules((prev) => [...prev, ...mockRules]);
      clearIntents();
      setSuccessMessage(`[DEMO MODE] Created ${mockRules.length} mock rule${mockRules.length !== 1 ? 's' : ''} (API endpoint not implemented yet)`);
    } finally {
      setIsApplying(false);
    }
  };

  const renderTree = (node: TreeNode, level: number = 0): React.ReactNode => {
    const isExpanded = expandedNodes.has(node.path);
    const isSelected = selectedPath === node.path;

    // Check if this node has observed terminology values
    const observedSystemValues = OBSERVED_SYSTEMS[node.path];
    const observedCodeValues = OBSERVED_CODES[node.path];
    
    // Determine field type for terminology
    let terminologyFieldType: 'system' | 'code' | undefined;
    let observedValues: ObservedValue[] | undefined;
    
    if (observedSystemValues) {
      terminologyFieldType = 'system';
      observedValues = observedSystemValues;
    } else if (observedCodeValues) {
      terminologyFieldType = 'code';
      observedValues = observedCodeValues;
    }

    return (
      <div key={node.path}>
        <TreeNodeWithRuleIntent
          element={node}
          level={level}
          isExpanded={isExpanded}
          isSelected={isSelected}
          onToggle={() => toggleNode(node.path)}
          onSelect={() => setSelectedPath(node.path)}
          existingRules={rules.map((r) => ({ path: r.path, type: r.type }))}
          onToggleIntent={handleToggleIntent}
          hasIntent={hasIntent}
          getIntent={getIntent}
          observedValues={observedValues}
          terminologyFieldType={terminologyFieldType}
        />
        
        {isExpanded && node.children && (
          <div>
            {node.children.map((child) => renderTree(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Tree-Based Rule Creation Demo
          </h1>
          <p className="text-gray-600">
            • Click checkboxes to mark fields as Required<br />
            • Click "Array Length" on array nodes to set min/max constraints<br />
            • Click "Terminology" on coding fields to constrain systems/codes<br />
            • Preview and Apply to create rules
          </p>
          
          {/* Schema Switcher */}
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => setActiveSchema('patient')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeSchema === 'patient'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Patient Schema
            </button>
            <button
              onClick={() => setActiveSchema('observation')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeSchema === 'observation'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Observation Schema (Terminology Demo)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Tree View */}
          <div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {activeSchema === 'patient' ? 'Patient Schema' : 'Observation Schema'}
              </h2>
              {activeSchema === 'patient' ? (
                <p className="text-sm text-gray-600 mb-4">
                  • Hover over fields to see "Required" checkbox<br />
                  • Array nodes (0..*) show "Array Length" section - click to expand<br />
                  • Try: Set Patient.address.line min=1, max=5, nonEmpty=true
                </p>
              ) : (
                <p className="text-sm text-gray-600 mb-4">
                  • Expand Observation.code.coding to see terminology constraints<br />
                  • "system" field shows observed code systems from sample data<br />
                  • "code" field shows multi-select for allowed codes<br />
                  • Try: Constrain to Synapxe system, then select HS and OS codes
                </p>
              )}
              
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 max-h-[600px] overflow-y-auto">
                {activeSchema === 'patient' 
                  ? renderTree(MOCK_PATIENT_SCHEMA)
                  : renderTree(MOCK_OBSERVATION_SCHEMA)
                }
              </div>
            </div>
          </div>

          {/* Right: Status & Rules */}
          <div className="space-y-6">
            {/* Status Messages */}
            {successMessage && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800">{successMessage}</p>
              </div>
            )}
            
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm font-medium text-red-800 mb-1">Error:</p>
                <pre className="text-xs text-red-700 whitespace-pre-wrap">{error}</pre>
              </div>
            )}

            {/* Pending Intents */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Pending Actions
              </h2>
              {count === 0 ? (
                <p className="text-sm text-gray-500">
                  No pending rule intents. Select checkboxes in the tree to create rules.
                </p>
              ) : (
                <div>
                  <p className="text-sm text-blue-800 mb-3">
                    {count} pending rule intent{count !== 1 ? 's' : ''}
                  </p>
                  <ul className="space-y-2">
                    {intents.map((intent, idx) => {
                      let badgeColor = 'bg-blue-100 text-blue-700';
                      let displayType = 'Required';
                      
                      if (intent.type === 'ARRAY_LENGTH') {
                        badgeColor = 'bg-purple-100 text-purple-700';
                        displayType = 'Array Length';
                      } else if (intent.type === 'CODE_SYSTEM') {
                        badgeColor = 'bg-orange-100 text-orange-700';
                        displayType = 'Code System';
                      } else if (intent.type === 'ALLOWED_CODES') {
                        badgeColor = 'bg-orange-100 text-orange-700';
                        displayType = 'Allowed Codes';
                      }
                      
                      return (
                        <li
                          key={`${intent.path}-${idx}`}
                          className="p-2 bg-blue-50 border border-blue-200 rounded text-sm"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-mono text-blue-900 text-xs">{intent.path}</span>
                            <button
                              onClick={() => removeIntent(intent.path, intent.type)}
                              className="text-blue-600 hover:text-blue-800 text-xs"
                            >
                              Remove
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 text-xs font-medium rounded ${badgeColor}`}>
                              {displayType}
                            </span>
                            {intent.type === 'ARRAY_LENGTH' && intent.params && 'min' in intent.params && (
                              <span className="text-xs text-gray-600">
                                {intent.params.min !== undefined && `min=${intent.params.min}`}
                                {intent.params.min !== undefined && intent.params.max !== undefined && ', '}
                                {intent.params.max !== undefined && `max=${intent.params.max}`}
                                {intent.params.nonEmpty && ', nonEmpty'}
                              </span>
                            )}
                            {intent.type === 'CODE_SYSTEM' && (intent.params as any)?.system && (
                              <span className="text-xs text-gray-600 truncate max-w-xs">
                                {(intent.params as any).system}
                              </span>
                            )}
                            {intent.type === 'ALLOWED_CODES' && (intent.params as any)?.codes && (
                              <span className="text-xs text-gray-600">
                                {(intent.params as any).codes.length} code(s)
                              </span>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>

            {/* Created Rules */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Created Rules ({rules.length})
              </h2>
              {rules.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No rules created yet. Apply pending actions to create rules.
                </p>
              ) : (
                <ul className="space-y-2">
                  {rules.map((rule) => {
                    let badgeColor = 'bg-blue-100 text-blue-700';
                    if (rule.type === 'ArrayLength') {
                      badgeColor = 'bg-purple-100 text-purple-700';
                    } else if (rule.type === 'CodeSystem' || rule.type === 'AllowedCodes') {
                      badgeColor = 'bg-orange-100 text-orange-700';
                    }
                    
                    return (
                      <li
                        key={rule.id}
                        className="p-3 bg-green-50 border border-green-200 rounded"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 text-xs font-medium rounded ${badgeColor}`}>
                              {rule.type}
                            </span>
                            <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded">
                              {rule.status?.toUpperCase()}
                            </span>
                          </div>
                          <span className="text-xs text-red-600 font-medium">{rule.severity}</span>
                        </div>
                        <p className="font-mono text-sm text-gray-900 mb-1">{rule.path}</p>
                        {rule.type === 'ArrayLength' && rule.params && 'min' in rule.params && (
                          <div className="text-xs text-gray-600 mb-1">
                            {rule.params.min !== undefined && `Min: ${rule.params.min}`}
                            {rule.params.min !== undefined && rule.params.max !== undefined && ' | '}
                            {rule.params.max !== undefined && `Max: ${rule.params.max}`}
                            {rule.params.nonEmpty && ' | Non-empty'}
                          </div>
                        )}
                        {rule.type === 'CodeSystem' && (rule.params as any)?.system && (
                          <div className="text-xs text-gray-600 mb-1 break-all">
                            System: {(rule.params as any).system}
                          </div>
                        )}
                        {rule.type === 'AllowedCodes' && (rule.params as any)?.codes && (
                          <div className="text-xs text-gray-600 mb-1">
                            Allowed Codes: {(rule.params as any).codes.join(', ')}
                          </div>
                        )}
                        <p className="text-xs text-gray-700 italic">{rule.message}</p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <PendingActionBar
        count={count}
        onPreview={() => setIsPreviewOpen(true)}
        onApply={handleApply}
        onClear={handleClear}
        hasValidationErrors={!validationResult.isValid}
        validationErrors={validationResult.errors}
        isApplying={isApplying}
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

export default TreeRuleCreationExample;
