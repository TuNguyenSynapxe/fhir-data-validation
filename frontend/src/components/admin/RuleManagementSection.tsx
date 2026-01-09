import { useState } from 'react';
import { Plus, Edit2, Trash2, AlertTriangle, Save, X } from 'lucide-react';
import {
  useBundleRules,
  useCreateBundleRule,
  useUpdateBundleRule,
  useDeleteBundleRule,
} from '../../hooks/useRuleManagement';
import type { BundleRule } from '../../api/projectRuleApi';

/**
 * Phase 9.4: Rule Management Section Component
 * 
 * SCOPE: Bundle-scoped manual rules ONLY
 * PROVENANCE: ManualCustom ONLY (ImportedGenerated rules are READ-ONLY)
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
}

interface RuleFormData {
  title: string;
  description: string;
  fhirPathExpression: string;
  isEnabled: boolean;
}

export function RuleManagementSection({
  projectId,
  bundleId,
  onValidationRerun,
}: RuleManagementSectionProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [formData, setFormData] = useState<RuleFormData>({
    title: '',
    description: '',
    fhirPathExpression: '',
    isEnabled: true,
  });

  const { data: rules, isLoading, error } = useBundleRules(projectId, bundleId);
  const createMutation = useCreateBundleRule();
  const updateMutation = useUpdateBundleRule();
  const deleteMutation = useDeleteBundleRule();

  // Separate imported and manual rules
  const importedRules = rules?.filter(r => r.provenance === 'ImportedGenerated') || [];
  const manualRules = rules?.filter(r => r.provenance === 'ManualCustom') || [];

  const handleCreate = async () => {
    if (!formData.title.trim() || !formData.fhirPathExpression.trim()) {
      return;
    }

    try {
      await createMutation.mutateAsync({
        projectId,
        bundleId,
        request: {
          title: formData.title,
          description: formData.description || undefined,
          fhirPathExpression: formData.fhirPathExpression,
          isEnabled: formData.isEnabled,
        },
      });

      // Reset form
      setFormData({ title: '', description: '', fhirPathExpression: '', isEnabled: true });
      setIsCreating(false);

      // Trigger validation rerun if callback provided
      onValidationRerun?.();
    } catch (error) {
      console.error('Failed to create rule:', error);
    }
  };

  const handleUpdate = async (ruleId: string) => {
    if (!formData.title.trim() || !formData.fhirPathExpression.trim()) {
      return;
    }

    try {
      await updateMutation.mutateAsync({
        projectId,
        bundleId,
        ruleId,
        request: {
          title: formData.title,
          description: formData.description || undefined,
          fhirPathExpression: formData.fhirPathExpression,
          isEnabled: formData.isEnabled,
        },
      });

      setEditingRuleId(null);
      setFormData({ title: '', description: '', fhirPathExpression: '', isEnabled: true });

      // Trigger validation rerun if callback provided
      onValidationRerun?.();
    } catch (error) {
      console.error('Failed to update rule:', error);
    }
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
    setEditingRuleId(rule.ruleId);
    setFormData({
      title: rule.title,
      description: rule.description || '',
      fhirPathExpression: rule.fhirPathExpression,
      isEnabled: rule.isEnabled,
    });
    setIsCreating(false);
  };

  const cancelEditing = () => {
    setEditingRuleId(null);
    setIsCreating(false);
    setFormData({ title: '', description: '', fhirPathExpression: '', isEnabled: true });
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
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Custom Rules (Admin Only)</h2>
            <p className="text-sm text-gray-600 mt-1">
              Manage bundle-scoped validation rules. Imported rules are read-only.
            </p>
          </div>
          <button
            onClick={() => setIsCreating(true)}
            disabled={isCreating || editingRuleId !== null}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
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

        {/* Create Form */}
        {isCreating && (
          <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
            <h3 className="font-semibold text-gray-900 mb-4">Create New Custom Rule</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Patient must have contact information"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={2}
                  placeholder="Explain the purpose of this rule..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  FHIRPath Expression <span className="text-red-600">*</span>
                </label>
                <textarea
                  value={formData.fhirPathExpression}
                  onChange={(e) => setFormData({ ...formData, fhirPathExpression: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  rows={3}
                  placeholder="Patient.telecom.exists()"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isEnabled}
                  onChange={(e) => setFormData({ ...formData, isEnabled: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label className="text-sm text-gray-700">Rule enabled</label>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={handleCreate}
                  disabled={createMutation.isPending || !formData.title.trim() || !formData.fhirPathExpression.trim()}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  <Save className="h-4 w-4" />
                  Create Rule
                </button>
                <button
                  onClick={cancelEditing}
                  disabled={createMutation.isPending}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Imported Rules (READ-ONLY) */}
        {importedRules.length > 0 && (
          <div>
            <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <span>Imported Rules</span>
              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                Read-Only ({importedRules.length})
              </span>
            </h3>
            <div className="space-y-2">
              {importedRules.map((rule) => (
                <div
                  key={rule.ruleId}
                  className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900">{rule.title}</h4>
                        <span className="px-2 py-0.5 bg-gray-200 text-gray-700 text-xs rounded">
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

        {/* Manual Rules (EDITABLE) */}
        <div>
          <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
            <span>Custom Manual Rules</span>
            <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded">
              Editable ({manualRules.length})
            </span>
          </h3>
          
          {manualRules.length === 0 && !isCreating && (
            <p className="text-sm text-gray-500 italic py-4">
              No custom rules created yet. Click "Add Custom Rule" to create one.
            </p>
          )}

          <div className="space-y-2">
            {manualRules.map((rule) => (
              <div key={rule.ruleId}>
                {editingRuleId === rule.ruleId ? (
                  // Edit Form
                  <div className="border border-green-200 rounded-lg p-4 bg-green-50">
                    <h4 className="font-semibold text-gray-900 mb-4">Edit Custom Rule</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Title <span className="text-red-600">*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Description (Optional)
                        </label>
                        <textarea
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          rows={2}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          FHIRPath Expression <span className="text-red-600">*</span>
                        </label>
                        <textarea
                          value={formData.fhirPathExpression}
                          onChange={(e) => setFormData({ ...formData, fhirPathExpression: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono text-sm"
                          rows={3}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.isEnabled}
                          onChange={(e) => setFormData({ ...formData, isEnabled: e.target.checked })}
                          className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                        />
                        <label className="text-sm text-gray-700">Rule enabled</label>
                      </div>
                      <div className="flex items-center gap-2 pt-2">
                        <button
                          onClick={() => handleUpdate(rule.ruleId)}
                          disabled={updateMutation.isPending || !formData.title.trim() || !formData.fhirPathExpression.trim()}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                        >
                          <Save className="h-4 w-4" />
                          Save Changes
                        </button>
                        <button
                          onClick={cancelEditing}
                          disabled={updateMutation.isPending}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                        >
                          <X className="h-4 w-4" />
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Display Mode
                  <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
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
                          disabled={isCreating || editingRuleId !== null}
                          className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors disabled:text-gray-400 disabled:cursor-not-allowed"
                          title="Edit rule"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(rule.ruleId)}
                          disabled={deleteMutation.isPending || isCreating || editingRuleId !== null}
                          className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors disabled:text-gray-400 disabled:cursor-not-allowed"
                          title="Delete rule"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
