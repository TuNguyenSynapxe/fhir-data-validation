import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { getPublishedProject } from '../../api/publicValidationApi';
import { RuleList } from '../../components/public/RuleList';
import type { RuleDefinition } from '../../types/public-validation';
import { Loader2, ArrowLeft, PlayCircle, FileText } from 'lucide-react';

export function ProjectDetailPage() {
  const { slug } = useParams<{ slug: string }>();

  const { data: project, isLoading, error } = useQuery({
    queryKey: ['project', slug],
    queryFn: () => getPublishedProject(slug!),
    enabled: !!slug,
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

  if (error || !project) {
    return (
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <Link
          to="/projects"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Projects
        </Link>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="text-red-800 font-medium">Failed to load project</p>
          <p className="text-red-600 text-sm mt-1">
            {error instanceof Error
              ? error.message
              : 'Project not found or unavailable'}
          </p>
        </div>
      </div>
    );
  }

  // Mock rules data - in reality, you'd fetch this from the backend
  // For MVP, the backend doesn't expose raw rules via GET, only metadata
  const mockRules: RuleDefinition[] = [];

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Back Link */}
      <Link
        to="/projects"
        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Projects
      </Link>

      {/* Project Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {project.name}
            </h1>
            <p className="text-gray-600 mb-4">{project.description}</p>

            <div className="flex flex-wrap gap-4 text-sm">
              <div>
                <span className="font-semibold text-gray-700">Slug:</span>
                <span className="ml-2 font-mono text-gray-900">
                  {project.slug}
                </span>
              </div>
              <div>
                <span className="font-semibold text-gray-700">Status:</span>
                <span className="ml-2 text-green-600 font-medium">
                  {project.status}
                </span>
              </div>
              {project.publishedAt && (
                <div>
                  <span className="font-semibold text-gray-700">
                    Published:
                  </span>
                  <span className="ml-2 text-gray-900">
                    {new Date(project.publishedAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Metadata */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {project.rulesetMetadata.ruleCount}
            </div>
            <div className="text-sm text-gray-600">Business Rules</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {project.rulesetMetadata.codeSystemCount}
            </div>
            <div className="text-sm text-gray-600">Code Systems</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {project.rulesetMetadata.fhirVersion}
            </div>
            <div className="text-sm text-gray-600">FHIR Version</div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-6 flex gap-3">
          <Link
            to={`/projects/${project.slug}/validate`}
            className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 flex items-center justify-center gap-2"
          >
            <PlayCircle className="w-5 h-5" />
            Validate Bundle with This Project
          </Link>
        </div>
      </div>

      {/* Rules Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <FileText className="w-6 h-6 text-gray-600" />
          <h2 className="text-xl font-semibold">Business Rules</h2>
        </div>

        {project.rulesetMetadata.ruleCount === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">No rules configured</p>
            <p className="text-sm mt-1">
              This project does not have any business rules defined yet.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Rule details are applied during
                validation. This project has{' '}
                <strong>{project.rulesetMetadata.ruleCount}</strong> rules
                configured for FHIR {project.rulesetMetadata.fhirVersion}.
              </p>
            </div>

            {/* If rules were available, display them here */}
            {mockRules.length > 0 && (
              <RuleList rules={mockRules} showStats={false} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
