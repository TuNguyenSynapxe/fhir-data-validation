import { useState } from 'react';
import { useCreateProject } from '../../hooks/useProjects';
import { Plus, Loader2 } from 'lucide-react';

export default function ProjectToolbar() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [showForm, setShowForm] = useState(false);

  const createProject = useCreateProject();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      return;
    }

    try {
      await createProject.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
      });
      
      setName('');
      setDescription('');
      setShowForm(false);
      // TanStack Query auto-invalidates projects list
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  const handleCancel = () => {
    setName('');
    setDescription('');
    setShowForm(false);
  };

  if (!showForm) {
    return (
      <div className="mb-6">
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
        >
          <Plus size={20} />
          Create New Project
        </button>
      </div>
    );
  }

  return (
    <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Create New Project</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="project-name" className="block text-sm font-medium text-gray-700 mb-1">
            Project Name *
          </label>
          <input
            id="project-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter project name"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
            disabled={createProject.isPending}
          />
        </div>
        
        <div>
          <label htmlFor="project-description" className="block text-sm font-medium text-gray-700 mb-1">
            Description (Optional)
          </label>
          <textarea
            id="project-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter project description"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            disabled={createProject.isPending}
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={!name.trim() || createProject.isPending}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createProject.isPending && <Loader2 size={16} className="animate-spin" />}
            Create Project
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={createProject.isPending}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        </div>

        {createProject.isError && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
            Failed to create project. Please try again.
          </div>
        )}
      </form>
    </div>
  );
}
