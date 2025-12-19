import React, { useState, useMemo } from 'react';
import { X, ChevronDown, Info } from 'lucide-react';
import TreeBasedRuleCreator from '../../rules/TreeBasedRuleCreator';
import { ResourceSwitchConfirmDialog } from './ResourceSwitchConfirmDialog';
import type { DraftRule } from '../../../types/ruleIntent';

interface AdvancedRulesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  resourceType?: string;
  projectBundle?: object;
  existingRules: Array<{
    id: string;
    type: string;
    path: string;
    message: string;
    severity: string;
  }>;
  onRulesCreated: (draftRules: DraftRule[]) => void;
}

export const AdvancedRulesDrawer: React.FC<AdvancedRulesDrawerProps> = ({
  isOpen,
  onClose,
  projectId,
  resourceType: initialResourceType = 'Patient',
  projectBundle,
  existingRules,
  onRulesCreated,
}) => {
  const [selectedResourceType, setSelectedResourceType] = useState(initialResourceType);
  const [pendingResourceSwitch, setPendingResourceSwitch] = useState<string | null>(null);
  const [hasPendingIntents, setHasPendingIntents] = useState(false);
  const [treeKey, setTreeKey] = useState(0); // Force re-mount of TreeBasedRuleCreator
  const [hideAdvancedInternals, setHideAdvancedInternals] = useState(true); // Default to hiding
  const [hideExtensions, setHideExtensions] = useState(true); // Default to hiding extensions
  const [showHelp, setShowHelp] = useState(false); // Default to collapsed

  // Extract available resource types from bundle
  const availableResourceTypes = useMemo(() => {
    if (!projectBundle || typeof projectBundle !== 'object') {
      return [initialResourceType];
    }

    const bundle = projectBundle as any;
    if (!bundle.entry || !Array.isArray(bundle.entry)) {
      return [initialResourceType];
    }

    const resourceTypes = Array.from(
      new Set(
        bundle.entry
          .filter((e: any) => e.resource && e.resource.resourceType)
          .map((e: any) => e.resource.resourceType)
      )
    ) as string[];

    return resourceTypes.length > 0 ? resourceTypes.sort() : [initialResourceType];
  }, [projectBundle, initialResourceType]);

  const handleClose = () => {
    // TODO: Add confirmation if there are pending intents
    // For now, close directly
    onClose();
  };

  const handleRulesCreated = (draftRules: DraftRule[]) => {
    onRulesCreated(draftRules);
    // Optionally close drawer after applying rules
    // onClose();
  };

  const handleResourceChange = (nextResource: string) => {
    if (nextResource === selectedResourceType) {
      return; // No change
    }

    if (hasPendingIntents) {
      // Show confirmation dialog
      setPendingResourceSwitch(nextResource);
    } else {
      // Switch immediately
      switchResource(nextResource);
    }
  };

  const switchResource = (nextResource: string) => {
    setSelectedResourceType(nextResource);
    setTreeKey(prev => prev + 1); // Force re-mount to clear intent state
    setPendingResourceSwitch(null);
  };

  const handleConfirmSwitch = () => {
    if (pendingResourceSwitch) {
      switchResource(pendingResourceSwitch);
    }
  };

  const handleCancelSwitch = () => {
    setPendingResourceSwitch(null);
  };

  // Callback to track intent state from TreeBasedRuleCreator
  const handleIntentStateChange = (hasPending: boolean) => {
    setHasPendingIntents(hasPending);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-30 z-40 transition-opacity"
        onClick={handleClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-[720px] bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-200">
          {/* Title Row */}
          <div className="flex items-center justify-between px-6 py-3">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-gray-900">
                Advanced Rules (Preview)
              </h2>
              <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded font-medium">
                BETA
              </span>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Compact Toolbar Row */}
          <div className="flex items-center justify-between gap-4 px-6 py-2 text-sm border-t border-gray-100">
            {/* Left: Resource Selector */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-gray-600">
                Resource:
              </label>
              <div className="relative">
                <select
                  value={selectedResourceType}
                  onChange={(e) => handleResourceChange(e.target.value)}
                  className="appearance-none pl-2 pr-7 py-1 text-sm bg-white border border-gray-300 rounded hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  {availableResourceTypes.map((rt) => (
                    <option key={rt} value={rt}>
                      {rt}
                    </option>
                  ))}
                </select>
                <ChevronDown 
                  size={14} 
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" 
                />
              </div>
            </div>

            {/* Center: Inline Checkboxes */}
            <div className="flex items-center gap-4">
              <label 
                className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer hover:text-gray-800"
                title="FHIR extensions allow custom data beyond the base specification. They are typically modeled separately and are not validated here."
              >
                <input
                  type="checkbox"
                  checked={hideExtensions}
                  onChange={(e) => setHideExtensions(e.target.checked)}
                  className="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-1 focus:ring-blue-500 cursor-pointer"
                />
                <span>Hide extensions</span>
              </label>

              <label 
                className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer hover:text-gray-800"
                title="Primitive internals are part of FHIR serialization and are read-only. They cannot have validation rules."
              >
                <input
                  type="checkbox"
                  checked={hideAdvancedInternals}
                  onChange={(e) => setHideAdvancedInternals(e.target.checked)}
                  className="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-1 focus:ring-blue-500 cursor-pointer"
                />
                <span>Hide primitives</span>
              </label>
            </div>

            {/* Right: Help Trigger */}
            <button
              onClick={() => setShowHelp((v) => !v)}
              className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-800 transition-colors"
            >
              <Info className="h-3.5 w-3.5" />
              <span>Help</span>
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${
                  showHelp ? 'rotate-180' : ''
                }`}
              />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Collapsible Help Panel */}
          {showHelp && (
            <div className="mx-6 mt-4 mb-3 rounded-md border border-blue-100 bg-blue-50 p-4 text-sm text-gray-700">
              <strong className="block mb-3 text-base text-gray-900">How Advanced Rules work</strong>
              
              {/* Schema-Driven Authoring */}
              <div className="mb-3">
                <strong className="text-gray-800">Schema-Driven Rule Authoring</strong>
                <ul className="mt-1 ml-4 list-disc space-y-0.5 text-gray-700">
                  <li>The FHIR schema tree shows all possible fields for the selected resource</li>
                  <li>Rules are attached to schema paths, not sample data</li>
                  <li>Expand nodes to see structure, cardinality, and types</li>
                </ul>
              </div>

              {/* Read-Only Fields */}
              <div className="mb-3">
                <strong className="text-gray-800">Read-Only System Fields</strong>
                <ul className="mt-1 ml-4 list-disc space-y-0.5 text-gray-700">
                  <li>System fields like <code className="text-xs bg-gray-100 px-1 rounded">id</code>, <code className="text-xs bg-gray-100 px-1 rounded">meta</code> are marked <em>(Advanced)</em></li>
                  <li>These fields cannot have validation rules</li>
                  <li>They are managed by the FHIR server, not your data</li>
                </ul>
              </div>

              {/* Hidden Fields */}
              <div className="mb-3">
                <strong className="text-gray-800">Hidden Extensions & Internals</strong>
                <ul className="mt-1 ml-4 list-disc space-y-0.5 text-gray-700">
                  <li>Extensions and primitive internals (<code className="text-xs bg-gray-100 px-1 rounded">value</code>, <code className="text-xs bg-gray-100 px-1 rounded">extension</code>) are hidden by default</li>
                  <li>These are advanced FHIR mechanisms not used for business rules</li>
                  <li>Use the toolbar checkboxes to reveal them if needed</li>
                </ul>
              </div>

              {/* Supported Rule Types */}
              <div className="mb-3">
                <strong className="text-gray-800">Supported Rule Types</strong>
                <ul className="mt-1 ml-4 list-disc space-y-0.5 text-gray-700">
                  <li><strong>Required:</strong> Field must be present</li>
                  <li><strong>Length:</strong> Array must have min/max elements, or be non-empty</li>
                  <li><strong>Terminology:</strong> Code must come from allowed system or value set</li>
                </ul>
              </div>

              {/* Sample Data Usage */}
              <div className="mb-3">
                <strong className="text-gray-800">How Sample Data is Used</strong>
                <ul className="mt-1 ml-4 list-disc space-y-0.5 text-gray-700">
                  <li>Sample data helps discover common coding systems and values</li>
                  <li>It does NOT define schema structure or cardinality</li>
                  <li>Rules are validated against schema, not samples</li>
                </ul>
              </div>

              {/* Summary */}
              <div className="pt-2 border-t border-blue-200 text-xs italic text-gray-600">
                FHIR schema defines what is possible. Sample data suggests what is common. You decide what to enforce.
              </div>
            </div>
          )}

          {/* Schema Tree */}
          <div className="flex-1 overflow-hidden px-6 py-4">

          <TreeBasedRuleCreator
            key={treeKey}
            projectId={projectId}
            resourceType={selectedResourceType}
            existingRules={existingRules}
            onRulesCreated={handleRulesCreated}
            onIntentStateChange={handleIntentStateChange}
            hideAdvancedInternals={hideAdvancedInternals}
            hideExtensions={hideExtensions}
          />
          </div>
        </div>
      </div>

      {/* Resource Switch Confirmation Dialog */}
      <ResourceSwitchConfirmDialog
        isOpen={pendingResourceSwitch !== null}
        currentResource={selectedResourceType}
        onConfirm={handleConfirmSwitch}
        onCancel={handleCancelSwitch}
      />
    </>
  );
};
