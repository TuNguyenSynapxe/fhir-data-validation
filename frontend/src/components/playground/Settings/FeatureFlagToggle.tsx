import { useState, useEffect } from 'react';
import { Sparkles, AlertCircle } from 'lucide-react';

interface FeatureFlagToggleProps {
  projectId: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => Promise<void>;
}

/**
 * Feature Flag Toggle for Advanced Rules (Preview)
 * 
 * Admin-only control to enable/disable tree-based rule authoring per project.
 * Includes confirmation dialog when enabling.
 */
export function FeatureFlagToggle({ enabled, onToggle }: FeatureFlagToggleProps) {
  const [isToggling, setIsToggling] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localEnabled, setLocalEnabled] = useState(enabled);

  // Sync localEnabled with enabled prop when it changes (e.g., after page refresh)
  useEffect(() => {
    setLocalEnabled(enabled);
  }, [enabled]);

  const handleToggleClick = async (newValue: boolean) => {
    // Show confirmation dialog when enabling
    if (newValue && !showConfirmDialog) {
      setShowConfirmDialog(true);
      return;
    }

    // Disable doesn't need confirmation
    if (!newValue) {
      await performToggle(newValue);
    }
  };

  const handleConfirm = async () => {
    setShowConfirmDialog(false);
    await performToggle(true);
  };

  const handleCancel = () => {
    setShowConfirmDialog(false);
  };

  const performToggle = async (newValue: boolean) => {
    setIsToggling(true);
    setError(null);

    try {
      await onToggle(newValue);
      setLocalEnabled(newValue);
    } catch (err) {
      // Revert on error
      setError(err instanceof Error ? err.message : 'Failed to update feature flag');
      setLocalEnabled(!newValue);
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toggle Row */}
      <div className="flex items-start justify-between py-3 px-4 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
        <div className="flex-1 pr-4">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-purple-600" />
            <label htmlFor="tree-rule-authoring" className="text-sm font-medium text-gray-900">
              Advanced Rules (Preview)
            </label>
            <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded">
              EXPERIMENTAL
            </span>
          </div>
          <p className="text-xs text-gray-600">
            Enables tree-based rule authoring for this project.
            <br />
            Intended for advanced users only.
          </p>
        </div>

        {/* Toggle Switch */}
        <button
          id="tree-rule-authoring"
          role="switch"
          aria-checked={localEnabled}
          disabled={isToggling}
          onClick={() => handleToggleClick(!localEnabled)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
            localEnabled ? 'bg-purple-600' : 'bg-gray-300'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              localEnabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-start gap-3 mb-4">
              <Sparkles className="w-6 h-6 text-purple-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Enable Advanced Rules (Preview)?
                </h3>
                <p className="text-sm text-gray-600 mb-2">
                  This feature is experimental and intended for advanced users.
                </p>
                <p className="text-sm text-gray-600">
                  Rules created will start in Draft mode.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={isToggling}
                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isToggling ? 'Enabling...' : 'Enable'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
