/**
 * CreateCodeSystemDialog - Modal for creating a new CodeSystem (Phase 3G)
 * 
 * Features:
 * - Form validation (URL uniqueness, required fields)
 * - Template selection for starter concepts
 * - Status selection
 * - Integration with saveCodeSystem API
 */

import React, { useState } from 'react';
import { X, Plus, FileText, AlertCircle } from 'lucide-react';
import type { CodeSystem, CodeSystemConcept } from '../../types/terminology';
import { saveCodeSystem } from '../../api/terminologyApi';
import { InfoTooltip, TooltipContent } from './InfoTooltip';

interface CreateCodeSystemDialogProps {
  projectId: string;
  isOpen: boolean;
  existingUrls?: string[];
  onClose: () => void;
  onSuccess: (codeSystem: CodeSystem) => void;
}

/**
 * Templates for common CodeSystem types
 */
const TEMPLATES = [
  {
    id: 'empty',
    name: 'Empty CodeSystem',
    description: 'Start from scratch with no concepts',
    concepts: [],
  },
  {
    id: 'status-codes',
    name: 'Status Codes',
    description: 'Common status values (active, inactive, pending)',
    concepts: [
      { code: 'active', display: 'Active', definition: 'Currently active and in use' },
      { code: 'inactive', display: 'Inactive', definition: 'No longer active or in use' },
      { code: 'pending', display: 'Pending', definition: 'Awaiting activation or processing' },
    ] as CodeSystemConcept[],
  },
  {
    id: 'yes-no',
    name: 'Yes/No/Unknown',
    description: 'Boolean-like values with unknown option',
    concepts: [
      { code: 'yes', display: 'Yes', definition: 'Affirmative response' },
      { code: 'no', display: 'No', definition: 'Negative response' },
      { code: 'unknown', display: 'Unknown', definition: 'Status is not known' },
    ] as CodeSystemConcept[],
  },
  {
    id: 'priority',
    name: 'Priority Levels',
    description: 'High, medium, low priority classification',
    concepts: [
      { code: 'high', display: 'High Priority', definition: 'Requires immediate attention' },
      { code: 'medium', display: 'Medium Priority', definition: 'Normal priority level' },
      { code: 'low', display: 'Low Priority', definition: 'Can be handled when convenient' },
    ] as CodeSystemConcept[],
  },
];

export function CreateCodeSystemDialog({
  projectId,
  isOpen,
  existingUrls = [],
  onClose,
  onSuccess,
}: CreateCodeSystemDialogProps) {
  const [formData, setFormData] = useState({
    url: '',
    name: '',
    title: '',
    status: 'draft' as 'draft' | 'active' | 'retired',
    description: '',
    publisher: '',
    version: '1.0.0',
  });
  const [selectedTemplate, setSelectedTemplate] = useState('empty');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // URL is required and must be unique
    if (!formData.url.trim()) {
      newErrors.url = 'URL is required';
    } else if (existingUrls.includes(formData.url)) {
      newErrors.url = 'This URL already exists in this project';
    } else if (!formData.url.startsWith('http://') && !formData.url.startsWith('https://')) {
      newErrors.url = 'URL should start with http:// or https://';
    }

    // Name is required
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSaving(true);

    try {
      // Get template concepts
      const template = TEMPLATES.find((t) => t.id === selectedTemplate);
      const concepts = template?.concepts || [];

      // Create CodeSystem object
      const conceptList = concepts.length > 0 ? concepts : [];
      const codeSystem: CodeSystem = {
        url: formData.url,
        name: formData.name,
        title: formData.title || formData.name,
        status: formData.status,
        description: formData.description || undefined,
        publisher: formData.publisher || undefined,
        version: formData.version,
        content: 'complete',
        concept: conceptList,
        concepts: conceptList,
        count: conceptList.length,
      };

      // Save via API
      await saveCodeSystem(projectId, codeSystem);

      // Success - notify parent
      onSuccess(codeSystem);
      onClose();
    } catch (error) {
      setErrors({ submit: error instanceof Error ? error.message : 'Unknown error occurred' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUrlChange = (value: string) => {
    setFormData({ ...formData, url: value });
    // Clear URL error when user types
    if (errors.url) {
      setErrors({ ...errors, url: '' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-semibold">Create New CodeSystem</h2>
            <InfoTooltip content={TooltipContent.codeSystem} position="right" />
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
            disabled={isSaving}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4">
          {/* Error banner */}
          {errors.submit && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-red-700">{errors.submit}</span>
            </div>
          )}

          {/* URL (required, unique) */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              Canonical URL *
              <InfoTooltip content={TooltipContent.system} />
            </label>
            <input
              type="text"
              value={formData.url}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder="http://example.org/fhir/CodeSystem/my-codes"
              className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 ${
                errors.url
                  ? 'border-red-300 focus:ring-red-500'
                  : 'border-gray-300 focus:ring-blue-500'
              }`}
              disabled={isSaving}
            />
            {errors.url && <p className="text-sm text-red-600 mt-1">{errors.url}</p>}
          </div>

          {/* Name (required) */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              Name * (computer-friendly identifier)
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="PatientStatusCodes"
              className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 ${
                errors.name
                  ? 'border-red-300 focus:ring-red-500'
                  : 'border-gray-300 focus:ring-blue-500'
              }`}
              disabled={isSaving}
            />
            {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name}</p>}
          </div>

          {/* Title (optional, human-readable) */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              Title (human-readable name)
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Patient Status Codes"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSaving}
            />
          </div>

          {/* Status */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.value as typeof formData.status })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSaving}
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="retired">Retired</option>
            </select>
          </div>

          {/* Publisher (optional) */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Publisher (optional)</label>
            <input
              type="text"
              value={formData.publisher}
              onChange={(e) => setFormData({ ...formData, publisher: e.target.value })}
              placeholder="Your Organization"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSaving}
            />
          </div>

          {/* Description (optional) */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Description (optional)</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the purpose and scope of this CodeSystem..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSaving}
            />
          </div>

          {/* Template selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              <FileText className="w-4 h-4 inline mr-1" />
              Start with Template
            </label>
            <div className="grid grid-cols-1 gap-2">
              {TEMPLATES.map((template) => (
                <label
                  key={template.id}
                  className={`flex items-start p-3 border rounded cursor-pointer transition-colors ${
                    selectedTemplate === template.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-blue-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="template"
                    value={template.id}
                    checked={selectedTemplate === template.id}
                    onChange={(e) => setSelectedTemplate(e.target.value)}
                    className="mt-1 mr-3"
                    disabled={isSaving}
                  />
                  <div>
                    <div className="font-medium">{template.name}</div>
                    <div className="text-sm text-gray-600">{template.description}</div>
                    {template.concepts.length > 0 && (
                      <div className="text-xs text-gray-500 mt-1">
                        Includes {template.concepts.length} starter concepts
                      </div>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100"
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Create CodeSystem
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
