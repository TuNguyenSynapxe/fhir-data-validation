import { useNavigate } from 'react-router-dom';
import { Folder, ChevronRight } from 'lucide-react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import type { ProjectMetadata } from '../../types/project';

dayjs.extend(relativeTime);

interface ProjectListProps {
  projects: ProjectMetadata[];
  onProjectDeleted?: () => void;
}

export default function ProjectList({ projects, onProjectDeleted }: ProjectListProps) {
  const navigate = useNavigate();

  if (projects.length === 0) {
    return (
      <div className="text-center py-12">
        <Folder size={64} className="mx-auto text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Projects Yet</h3>
        <p className="text-gray-500">Create your first project to get started.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {projects.map((project) => (
        <div
          key={project.id}
          onClick={() => navigate(`/projects/${project.id}`)}
          className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group"
        >
          <div className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex-shrink-0">
                  <Folder size={24} className="text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                    {project.name}
                  </h3>
                </div>
              </div>
              <ChevronRight size={20} className="text-gray-400 group-hover:text-blue-600 transition-colors flex-shrink-0" />
            </div>

            {project.description && (
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                {project.description}
              </p>
            )}

            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Created {dayjs(project.createdAt).fromNow()}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
