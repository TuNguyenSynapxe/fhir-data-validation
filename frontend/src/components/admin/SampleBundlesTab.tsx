import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, Trash2, Edit, Plus, AlertCircle, FileJson } from 'lucide-react';
import { createSampleBundle, updateSampleBundle, deleteSampleBundle } from '../../api/sampleBundlesApi';
import type { SampleBundleDto } from '../../api/sampleBundlesApi';

interface SampleBundlesTabProps {
  projectId: string;
  sdCanonicalUrl: string;
  bundles: SampleBundleDto[];
  onBundleSelect?: (bundleId: string) => void;
  selectedBundleId?: string | null;
}

export function SampleBundlesTab({
  projectId,
  sdCanonicalUrl,
  bundles,
  onBundleSelect,
  selectedBundleId,
}: SampleBundlesTabProps) {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editingBundleId, setEditingBundleId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data: { name: string; bundleJson: string }) =>
      createSampleBundle(projectId, {
        name: data.name,
        structureDefinitionCanonicalUrl: sdCanonicalUrl,
        bundleJson: data.bundleJson,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sample-bundles', projectId] });
      setShowUploadModal(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { bundleId: string; name: string; bundleJson: string }) =>
      updateSampleBundle(projectId, data.bundleId, {
        name: data.name,
        bundleJson: data.bundleJson,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sample-bundles', projectId] });
      setEditingBundleId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (bundleId: string) => deleteSampleBundle(projectId, bundleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sample-bundles', projectId] });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Sample Bundles</h3>
          <p className="text-sm text-gray-600 mt-1">
            Upload sample bundles for validation testing and custom rule authoring.
          </p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Upload size={16} />
          Upload Bundle
        </button>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <FileJson className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-sm text-blue-900">
            <p className="font-medium mb-1">Why Sample Bundles?</p>
            <p>
              Sample bundles provide concrete FHIR instances for custom rule authoring. They enable
              JSON path picking, instance-specific validation, and rule preview.
            </p>
          </div>
        </div>
      </div>

      {/* Bundles List */}
      {bundles.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <FileJson size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Sample Bundles</h3>
          <p className="text-gray-600 mb-4">Upload a sample bundle to get started.</p>
          <button
            onClick={() => setShowUploadModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} />
            Upload First Bundle
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {bundles.map((bundle) => (
            <div
              key={bundle.id}
              className={`bg-white border rounded-lg p-4 transition-all ${
                selectedBundleId === bundle.id
                  ? 'border-blue-500 ring-2 ring-blue-100'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-gray-900">{bundle.name}</h4>
                    <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                      {bundle.bundleSource}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Created: {new Date(bundle.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {onBundleSelect && (
                    <button
                      onClick={() => onBundleSelect(bundle.id)}
                      className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                        selectedBundleId === bundle.id
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {selectedBundleId === bundle.id ? 'Selected' : 'Select'}
                    </button>
                  )}
                  <button
                    onClick={() => setEditingBundleId(bundle.id)}
                    className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
                    title="Edit bundle"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete bundle "${bundle.name}"?`)) {
                        deleteMutation.mutate(bundle.id);
                      }
                    }}
                    className="p-2 text-gray-600 hover:text-red-600 transition-colors"
                    title="Delete bundle"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload/Edit Modal */}
      {(showUploadModal || editingBundleId) && (
        <BundleUploadModal
          isEdit={!!editingBundleId}
          bundleId={editingBundleId || undefined}
          projectId={projectId}
          onClose={() => {
            setShowUploadModal(false);
            setEditingBundleId(null);
          }}
          onSubmit={(data) => {
            if (editingBundleId) {
              updateMutation.mutate({ bundleId: editingBundleId, ...data });
            } else {
              createMutation.mutate(data);
            }
          }}
          isSubmitting={createMutation.isPending || updateMutation.isPending}
        />
      )}

      {/* Error Display */}
      {(createMutation.isError || updateMutation.isError || deleteMutation.isError) && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 text-sm text-red-900">
              <p className="font-medium">Operation Failed</p>
              <p className="mt-1">
                {(createMutation.error || updateMutation.error || deleteMutation.error)?.message ||
                  'An error occurred'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface BundleUploadModalProps {
  isEdit: boolean;
  bundleId?: string;
  projectId: string;
  onClose: () => void;
  onSubmit: (data: { name: string; bundleJson: string }) => void;
  isSubmitting: boolean;
}

function BundleUploadModal({
  isEdit,
  onClose,
  onSubmit,
  isSubmitting,
}: BundleUploadModalProps) {
  const [name, setName] = useState('');
  const [bundleJson, setBundleJson] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);

  const handleJsonChange = (value: string) => {
    setBundleJson(value);
    try {
      if (value.trim()) {
        JSON.parse(value);
        setJsonError(null);
      }
    } catch (e) {
      setJsonError('Invalid JSON format');
    }
  };

  const handleSubmit = () => {
    if (!name.trim() || !bundleJson.trim()) {
      return;
    }

    try {
      JSON.parse(bundleJson);
      onSubmit({ name, bundleJson });
    } catch (e) {
      setJsonError('Invalid JSON format');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {isEdit ? 'Edit Bundle' : 'Upload Sample Bundle'}
          </h2>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bundle Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Happy Path Example"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bundle JSON
              </label>
              <textarea
                value={bundleJson}
                onChange={(e) => handleJsonChange(e.target.value)}
                placeholder='{"resourceType": "Bundle", ...}'
                className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[400px]"
              />
              {jsonError && (
                <p className="text-sm text-red-600 mt-1">{jsonError}</p>
              )}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !name.trim() || !bundleJson.trim() || !!jsonError}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Saving...' : isEdit ? 'Update Bundle' : 'Upload Bundle'}
          </button>
        </div>
      </div>
    </div>
  );
}
