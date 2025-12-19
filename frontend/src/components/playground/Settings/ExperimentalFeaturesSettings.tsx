import { Settings } from 'lucide-react';
import { FeatureFlagToggle } from './FeatureFlagToggle';
import { updateProjectFeatures } from '../../../api/projectsApi';

interface ExperimentalFeaturesSettingsProps {
  projectId: string;
  features: {
    treeRuleAuthoring?: boolean;
  };
  onFeaturesUpdated: (features: { treeRuleAuthoring?: boolean }) => void;
}

/**
 * Experimental Features Settings Panel
 * 
 * Admin-only section for managing project-level feature flags.
 * Currently supports: treeRuleAuthoring (Advanced Rules Preview)
 */
export function ExperimentalFeaturesSettings({
  projectId,
  features,
  onFeaturesUpdated,
}: ExperimentalFeaturesSettingsProps) {
  const handleTreeRuleAuthoringToggle = async (enabled: boolean) => {
    const updatedProject = await updateProjectFeatures(projectId, {
      treeRuleAuthoring: enabled,
    });

    onFeaturesUpdated(updatedProject.features || {});
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
        <Settings className="w-5 h-5 text-gray-700" />
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Experimental Features</h2>
          <p className="text-sm text-gray-600 mt-0.5">
            Enable preview features for this project (admin only)
          </p>
        </div>
      </div>

      {/* Feature Toggles */}
      <div className="space-y-4">
        <FeatureFlagToggle
          projectId={projectId}
          enabled={features.treeRuleAuthoring || false}
          onToggle={handleTreeRuleAuthoringToggle}
        />
      </div>

      {/* Help Text */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-800">
          <strong>Note:</strong> Experimental features may change or be removed in future releases.
          They are intended for testing and advanced use cases only.
        </p>
      </div>
    </div>
  );
}
