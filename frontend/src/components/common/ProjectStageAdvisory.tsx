import React from 'react';
import { Info, AlertTriangle } from 'lucide-react';
import type { ProjectStageMetadata } from '../../types/projectStage';

interface ProjectStageAdvisoryProps {
  stageMetadata: ProjectStageMetadata;
  className?: string;
}

/**
 * ProjectStageAdvisory Component
 * 
 * Displays informational/advisory messages about project stage.
 * NEVER blocks user actions - purely informational.
 */
export const ProjectStageAdvisory: React.FC<ProjectStageAdvisoryProps> = ({
  stageMetadata,
  className = '',
}) => {
  if (!stageMetadata.advisories || stageMetadata.advisories.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {stageMetadata.advisories.map((advisory, index) => {
        const isWarning = advisory.type === 'warning';
        const Icon = isWarning ? AlertTriangle : Info;
        
        const bgColor = isWarning ? 'bg-amber-50' : 'bg-blue-50';
        const borderColor = isWarning ? 'border-amber-200' : 'border-blue-200';
        const textColor = isWarning ? 'text-amber-800' : 'text-blue-800';
        const iconColor = isWarning ? 'text-amber-600' : 'text-blue-600';

        return (
          <div
            key={index}
            className={`flex items-start gap-2 p-3 rounded-lg border ${bgColor} ${borderColor}`}
          >
            <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${iconColor}`} />
            <div className="flex-1 min-w-0">
              <p className={`text-sm ${textColor}`}>{advisory.message}</p>
              {stageMetadata.suggestedAction && index === 0 && (
                <p className="text-xs text-gray-600 mt-1">
                  <span className="font-medium">Suggested:</span> {stageMetadata.suggestedAction}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
