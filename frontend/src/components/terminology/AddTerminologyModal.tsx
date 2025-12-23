import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface AddTerminologyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (url: string, name: string) => void;
  existingUrls: string[];
}

export const AddTerminologyModal: React.FC<AddTerminologyModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  existingUrls,
}) => {
  const [url, setUrl] = useState('https://fhir.synapxe.sg/CodeSystem/');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setUrl('https://fhir.synapxe.sg/CodeSystem/');
      setName('');
      setError('');
    }
  }, [isOpen]);

  const handleSubmit = () => {
    const trimmedUrl = url.trim();
    const trimmedName = name.trim();

    // Validation
    if (!trimmedUrl) {
      setError('URL is required');
      return;
    }

    if (!trimmedName) {
      setError('Name is required');
      return;
    }

    if (existingUrls.includes(trimmedUrl)) {
      setError('A terminology with this URL already exists');
      return;
    }

    onConfirm(trimmedUrl, trimmedName);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Add New Terminology</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-4">
          {/* URL Input */}
          <div>
            <label htmlFor="terminology-url" className="block text-sm font-medium text-gray-700 mb-1">
              CodeSystem URL <span className="text-red-500">*</span>
            </label>
            <input
              id="terminology-url"
              type="text"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setError('');
              }}
              onKeyDown={handleKeyDown}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://fhir.synapxe.sg/CodeSystem/my-codes"
              autoFocus
            />
          </div>

          {/* Name Input */}
          <div>
            <label htmlFor="terminology-name" className="block text-sm font-medium text-gray-700 mb-1">
              Display Name <span className="text-red-500">*</span>
            </label>
            <input
              id="terminology-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              onKeyDown={handleKeyDown}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="My Terminology"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              {error}
            </div>
          )}

          {/* Help Text */}
          <div className="text-xs text-gray-500">
            <p>Enter a unique URL identifier for your CodeSystem.</p>
            <p className="mt-1">Example: https://fhir.synapxe.sg/CodeSystem/ethnicity</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors"
          >
            Create Terminology
          </button>
        </div>
      </div>
    </div>
  );
};
