import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getPublishedProjects } from '../../api/publicValidationApi';
import { Loader2, FolderOpen } from 'lucide-react';

export default function PublicProjectsPage() {
  const { data: projects, isLoading, error } = useQuery({
    queryKey: ['published-projects'],
    queryFn: getPublishedProjects,
  });

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Public Validation Projects
        </h1>
        <p className="text-gray-600">
          Select a published project to validate your FHIR bundles against
          project-specific rules
        </p>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="text-red-800 font-medium">Failed to load projects</p>
          <p className="text-red-600 text-sm mt-1">
            {error instanceof Error ? error.message : 'Unknown error occurred'}
          </p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && (!projects || projects.length === 0) && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
          <FolderOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">
            No public validation projects available
          </p>
        </div>
      )}

      {/* Project Grid */}
      {!isLoading && !error && projects && projects.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <ProjectCard key={project.slug} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}

interface ProjectCardProps {
  project: {
    slug: string;
    name: string;
    description?: string;
    publishedAt?: string;
  };
}

function ProjectCard({ project }: ProjectCardProps) {
  // Format published date if available
  const publishedDate = project.publishedAt
    ? new Date(project.publishedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
      {/* Icon + Title */}
      <div className="flex items-center gap-3 mb-3">
        <FolderOpen className="w-6 h-6 text-blue-600 flex-shrink-0" />
        <h3 className="text-xl font-bold text-gray-900 line-clamp-1">
          {project.name}
        </h3>
      </div>

      {/* Description */}
      <p className="text-gray-600 text-sm mb-4 line-clamp-2 min-h-[2.5rem]">
        {project.description || 'No description provided'}
      </p>

      {/* Metadata Badges */}
      <div className="flex gap-2 mb-4">
        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded font-medium">
          Published
        </span>
        {publishedDate && (
          <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
            {publishedDate}
          </span>
        )}
      </div>

      {/* Action Button */}
      <Link
        to={`/public/projects/${project.slug}/validate`}
        className="block w-full bg-blue-600 text-white px-4 py-2 rounded-lg text-center font-medium hover:bg-blue-700 transition-colors"
      >
        Validate Bundle →
      </Link>
    </div>
  );
}
