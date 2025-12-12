import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import FhirPathSelectorDrawer from '../../FhirPathSelectorDrawer';

interface Rule {
  id: string;
  type: string;
  resourceType: string;
  path: string;
  severity: string;
  message: string;
  params?: Record<string, any>;
}

interface RuleEditorModalProps {
  rule: Rule | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (rule: Rule) => void;
  projectBundle?: object;
  hl7Samples?: any[];
}

const RULE_TYPES = [
  'Required',
  'Pattern',
  'ValueSet',
  'Range',
  'Length',
  'Custom'
];

const RESOURCE_TYPES = [
  'Patient',
  'Observation',
  'Condition',
  'Procedure',
  'Medication',
  'Encounter',
  'AllergyIntolerance',
  'Immunization',
  'DiagnosticReport',
  'Organization',
  'Practitioner'
];

const SEVERITIES = ['error', 'warning', 'information'];

export const RuleEditorModal: React.FC<RuleEditorModalProps> = ({
  rule,
  isOpen,
  onClose,
  onSave,
  projectBundle,
  hl7Samples,
}) => {
  const [formData, setFormData] = useState<Rule>({
    id: '',
    type: 'Required',
    resourceType: 'Patient',
    path: '',
    severity: 'error',
    message: '',
    params: {}
  });
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    if (rule) {
      setFormData(rule);
    }
  }, [rule]);

  if (!isOpen || !rule) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.path || !formData.message) {
      alert('Path and Message are required');
      return;
    }
    onSave(formData);
  };

  const handleChange = (field: keyof Rule, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">
            {rule.id.startsWith('rule-') && rule.path === '' ? 'Add New Rule' : 'Edit Rule'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-auto p-6 space-y-4">
            {/* Rule Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rule Type *
              </label>
              <select
                value={formData.type}
                onChange={(e) => handleChange('type', e.target.value)}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                {RULE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* Resource Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Resource Type *
              </label>
              <select
                value={formData.resourceType}
                onChange={(e) => handleChange('resourceType', e.target.value)}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                {RESOURCE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* FHIRPath */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                FHIRPath *
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.path}
                  readOnly
                  placeholder="Click 'Select FHIRPath' to choose a path"
                  className="flex-1 px-3 py-2 border rounded font-mono text-sm bg-gray-50 cursor-not-allowed focus:outline-none"
                  required
                />
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors whitespace-nowrap"
                >
                  Select FHIRPath
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Use the selector to choose a FHIRPath expression
              </p>
            </div>

            {/* Severity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Severity *
              </label>
              <div className="flex gap-3">
                {SEVERITIES.map((severity) => (
                  <label key={severity} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="severity"
                      value={severity}
                      checked={formData.severity === severity}
                      onChange={(e) => handleChange('severity', e.target.value)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm capitalize">{severity}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Error Message *
              </label>
              <textarea
                value={formData.message}
                onChange={(e) => handleChange('message', e.target.value)}
                placeholder="Enter the validation error message"
                rows={3}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 p-4 border-t bg-gray-50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Save Rule
            </button>
          </div>
        </form>
      </div>

      {/* FHIRPath Selector Drawer */}
      {/* Drawer context is read-only by design */}
      <FhirPathSelectorDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSelect={(path) => {
          handleChange('path', path);
          setIsDrawerOpen(false);
        }}
        resourceType={formData.resourceType}
        projectBundle={projectBundle}
        hl7Samples={hl7Samples}
      />
    </div>
  );
};
