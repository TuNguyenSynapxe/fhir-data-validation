import React from 'react';
import { Plus, X } from 'lucide-react';

interface CreateQuestionSetDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, description?: string) => void;
  isCreating?: boolean;
}

export const CreateQuestionSetDialog: React.FC<CreateQuestionSetDialogProps> = ({
  isOpen,
  onClose,
  onCreate,
  isCreating = false,
}) => {
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');

  // Reset form when dialog opens
  React.useEffect(() => {
    if (isOpen) {
      setName('');
      setDescription('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCreate = () => {
    if (name.trim()) {
      onCreate(name.trim(), description.trim() || undefined);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && name.trim() && !isCreating) {
      handleCreate();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
          {/* Header */}
          <div className="flex items-start gap-3 px-6 py-4 border-b border-gray-200">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Plus className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900">Create Question Set</h3>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 rounded"
              title="Close"
              disabled={isCreating}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-4 space-y-4">
            <div>
              <label htmlFor="questionSetName" className="block text-sm font-medium text-gray-700 mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                id="questionSetName"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter question set name"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isCreating}
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="questionSetDescription" className="block text-sm font-medium text-gray-700 mb-1">
                Description <span className="text-gray-400 text-xs">(optional)</span>
              </label>
              <textarea
                id="questionSetDescription"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter description"
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                disabled={isCreating}
              />
            </div>

            <p className="text-xs text-gray-500">
              The question set will be created with an empty question list. You can add questions after creation.
            </p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 rounded-b-lg">
            <button
              onClick={onClose}
              disabled={isCreating}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!name.trim() || isCreating}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreating ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
