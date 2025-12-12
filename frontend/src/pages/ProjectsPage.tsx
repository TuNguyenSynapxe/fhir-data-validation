import { Loader2, AlertCircle } from 'lucide-react';
import { useProjects } from '../hooks/useProjects';
import AppLayout from '../components/layout/AppLayout';
import ProjectToolbar from '../components/projects/ProjectToolbar';
import ProjectList from '../components/projects/ProjectList';

export default function ProjectsPage() {
  const { data: projects, isLoading, error, refetch } = useProjects();

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Projects</h2>
          <p className="text-gray-600">Manage your FHIR validation projects</p>
        </div>

        <ProjectToolbar onProjectCreated={refetch} />

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3 text-gray-600">
              <Loader2 size={24} className="animate-spin" />
              <span>Loading projects...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-red-800 font-medium mb-1">Error Loading Projects</h3>
              <p className="text-red-700 text-sm">
                {error instanceof Error ? error.message : 'Failed to load projects. Please try again.'}
              </p>
            </div>
          </div>
        )}

        {!isLoading && !error && projects && (
          <ProjectList projects={projects} onProjectDeleted={refetch} />
        )}
      </div>
    </AppLayout>
  );
}
