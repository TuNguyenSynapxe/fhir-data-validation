import { useState } from 'react';
import { Plus, Edit2, Trash2, AlertTriangle } from 'lucide-react';
import {
  useBundleRules,
  useDeleteBundleRule,
} from '../../hooks/useRuleManagement';
import type { BundleRule } from '../../api/projectRuleApi';
import { AddRuleModal } from '../playground/Rules/add-rule/AddRuleModal';
import type { Rule } from '../../types/rightPanelProps';

/**
 * Phase 9.4: Rule Management Section Component (REFACTORED)
 * 
 * SCOPE: Bundle-scoped manual rules ONLY
 * PROVENANCE: ManualCustom ONLY (ImportedGenerated rules are READ-ONLY)
 * 
 * REFACTOR CHANGES:
 * - Replaced legacy CustomFHIRPath-only form with unified AddRuleModal
 * - Defaults to CustomFHIRPath but allows all rule types
 * - Reuses existing RuleTypeSelector and RuleForm components
 * - No duplicate rule authoring logic
 * 
 * MANDATORY LABELING:
 * - "Custom rule (admin-defined)"
 * - "Not derived from Implementation Guide"
 * - "May affect validation outcomes"
 * 
 * FORBIDDEN:
 * - Editing imported rules
 * - Rule ordering controls
 * - Severity tuning UI
 * - Code generation helpers
 */

interface RuleManagementSectionProps {
  projectId: string;
  bundleId: string;
  onValidationRerun?: () => void;
  projectBundle?: object; // Bundle for FHIRPath picker context
  structureDefinitionCanonicalUrl?: string; // For rule metadata
  structureDefinitionResourceType?: string; // For rule resource type (e.g., Patient, Composition)
}

export function RuleManagementSection({
  projectId,
  bundleId,
  onValidationRerun,
  projectBundle,
  structureDefinitionCanonicalUrl,
  structureDefinitionResourceType,
}: RuleManagementSectionProps) {
  const [isAddRuleModalOpen, setIsAddRuleModalOpen] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);

  const { data: rules, isLoading, error } = useBundleRules(projectId, bundleId);
  const deleteMutation = useDeleteBundleRule();

  // Separate imported and manual rules
  const importedRules = rules?.filter(r => r.provenance === 'ImportedGenerated') || [];
  const manualRules = rules?.filter(r => r.provenance === 'ManualCustom') || [];

  // ✅ UNIFIED RULE CREATION: Use AddRuleModal with RuleTypeSelector + RuleForm
  const handleSaveRule = async (rule: Rule) => {
    // TODO: Implement rule conversion and save via API
    // For now, this will need backend API support for full Rule object
    console.log('[RuleManagementSection] Rule saved from unified modal:', rule);
    
    setIsAddRuleModalOpen(false);
    onValidationRerun?.();
  };

  const handleDelete = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this custom rule?')) {
      return;
    }

    try {
      await deleteMutation.mutateAsync({ projectId, bundleId, ruleId });

      // Trigger validation rerun if callback provided
      onValidationRerun?.();
    } catch (error) {
      console.error('Failed to delete rule:', error);
    }
  };

  const startEditing = (rule: BundleRule) => {
    // TODO: Implement edit with RuleEditorModal when backend supports full Rule object
    console.log('[RuleManagementSection] Edit rule:', rule.ruleId);
    setEditingRuleId(rule.ruleId);
  };

  const cancelEditing = () => {
    setEditingRuleId(null);
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-600">Loading rules...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <p className="text-red-800">Failed to load rules: {error instanceof Error ? error.message : 'Unknown error'}</p>
      </div>
    );
  }

  return (
    <>
      {/* ✅ UNIFIED RULE CREATION MODAL */}
      <AddRuleModal
        isOpen={isAddRuleModalOpen}
        onClose={() => setIsAddRuleModalOpen(false)}
        onSaveRule={handleSaveRule}
        selectedResourceType={structureDefinitionResourceType || 'Patient'} // Use SD's resource type
        projectBundle={projectBundle}
        hl7Samples={undefined}
        projectId={projectId}
        existingRules={[]} // TODO: Pass existing rules for validation
      />

      <div className="bg-white rounded-lg shadow">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Custom Rules (Admin Only)</h2>
              <p className="text-sm text-gray-600 mt-1">
                Create custom validation rules using the unified rule authoring system.
              </p>
            </div>
            <button
              onClick={() => setIsAddRuleModalOpen(true)}
              disabled={!projectBundle || editingRuleId !== null}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              title={!projectBundle ? 'Add a sample bundle first' : 'Add custom rule'}
            >
              <Plus className="h-4 w-4" />
              Add Custom Rule
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* MANDATORY WARNING BANNER */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-amber-900">
                <p className="font-semibold mb-1">Custom rule requirements:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li><strong>Custom rule (admin-defined)</strong> - Created manually by administrators</li>
                  <li><strong>Not derived from Implementation Guide</strong> - Not generated from StructureDefinitions</li>
                  <li><strong>May affect validation outcomes</strong> - Changes will impact bundle validation results</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Bundle requirement gate */}
          {!projectBundle && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <strong>Note:</strong> Add at least one sample bundle to enable custom rule creation.
                The bundle provides context for field selection and rule preview.
              </p>
            </div>
          )}

          {/* Imported Rules Section (READ-ONLY) */}
          {importedRules.length > 0 && (
            <div>
              <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <span>Imported Rules from Implementation Guide</span>
                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                  Read-only ({importedRules.length})
                </span>
              </h3>
              <div className="space-y-2">
                {importedRules.map((rule) => (
                  <div key={rule.ruleId} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-gray-900">{rule.title}</h4>
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">
                            Imported
                          </span>
                          {!rule.isEnabled && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-800 text-xs rounded">
                              Disabled
                            </span>
                          )}
                        </div>
                        {rule.description && (
                          <p className="text-sm text-gray-600 mt-1">{rule.description}</p>
                        )}
                        <pre className="mt-2 text-xs text-gray-700 bg-white p-2 rounded border border-gray-200 overflow-x-auto">
                          {rule.fhirPathExpression}
                        </pre>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Custom Manual Rules Section */}
          <div>
            <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <span>Custom Manual Rules</span>
              <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded">
                Editable ({manualRules.length})
              </span>
            </h3>
            
            {manualRules.length === 0 && (
              <p className="text-sm text-gray-500 italic py-4">
                No custom rules created yet. Click "Add Custom Rule" to create one.
              </p>
            )}

            <div className="space-y-2">
              {manualRules.map((rule) => (
                <div key={rule.ruleId} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900">{rule.title}</h4>
                        <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded">
                          Custom
                        </span>
                        {!rule.isEnabled && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-800 text-xs rounded">
                            Disabled
                          </span>
                        )}
                      </div>
                      {rule.description && (
                        <p className="text-sm text-gray-600 mt-1">{rule.description}</p>
                      )}
                      <pre className="mt-2 text-xs text-gray-700 bg-white p-2 rounded border border-gray-200 overflow-x-auto">
                        {rule.fhirPathExpression}
                      </pre>
                      <p className="text-xs text-gray-500 mt-2">
                        Last updated: {new Date(rule.updatedAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => startEditing(rule)}
                        disabled={editingRuleId !== null}
                        className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors disabled:text-gray-400 disabled:cursor-not-allowed"
                        title="Edit rule (coming soon)"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(rule.ruleId)}
                        disabled={deleteMutation.isPending || editingRuleId !== null}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors disabled:text-gray-400 disabled:cursor-not-allowed"
                        title="Delete rule"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
