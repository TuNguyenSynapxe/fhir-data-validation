import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getPublishedProjects } from '../../api/publicValidationApi';
import { Loader2, FolderOpen, ArrowRight } from 'lucide-react';

export function ProjectListPage() {
  const { data: projects, isLoading, error } = useQuery({
    queryKey: ['published-projects'],
    queryFn: getPublishedProjects,
  });

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="text-red-800 font-medium">Failed to load projects</p>
          <p className="text-red-600 text-sm mt-1">
            {error instanceof Error ? error.message : 'Unknown error'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Published Projects
        </h1>
        <p className="text-gray-600">
          Browse validation projects with pre-configured business rules.
          Select a project to validate your bundles against its ruleset.
        </p>
      </div>

      {/* Projects Grid */}
      {!projects || projects.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <FolderOpen className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            No Published Projects
          </h2>
          <p className="text-gray-600">
            There are currently no published validation projects available.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Link
              key={project.id}
              to={`/projects/${project.slug}`}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:border-blue-400 hover:shadow-lg transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <FolderOpen className="w-8 h-8 text-blue-600" />
                <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
              </div>

              <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600">
                {project.name}
              </h3>

              {project.description && (
                <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                  {project.description}
                </p>
              )}

              <div className="flex items-center justify-between text-xs text-gray-500 border-t border-gray-200 pt-3">
                <span className="font-mono">{project.slug}</span>
                {project.publishedAt && (
                  <span>
                    Published{' '}
                    {new Date(project.publishedAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Call to Action */}
      {projects && projects.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <p className="text-blue-900 mb-3">
            Don't have project-specific rules?
          </p>
          <Link
            to="/validate"
            className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700"
          >
            Use Anonymous Validation
          </Link>
        </div>
      )}
    </div>
  );
}
