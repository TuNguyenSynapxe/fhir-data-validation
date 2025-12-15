import React from 'react';

interface ResourceTypeGroup {
  resourceType: string;
  count: number;
}

interface RuleNavigatorProps {
  resourceGroups: ResourceTypeGroup[];
  selectedResourceType: string | null;
  onSelectResource: (resourceType: string | null) => void;
}

export const RuleNavigator: React.FC<RuleNavigatorProps> = ({
  resourceGroups,
  selectedResourceType,
  onSelectResource,
}) => {
  return (
    <div className="w-48 border-r border-gray-200 bg-gray-50 overflow-y-auto">
      <div className="p-3 border-b border-gray-200">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Resources
        </h3>
      </div>
      
      <div className="p-2">
        {/* All Resources Option */}
        <button
          onClick={() => onSelectResource(null)}
          className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors mb-1 cursor-pointer ${
            selectedResourceType === null
              ? 'bg-blue-50 text-blue-900'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <div className="flex items-center justify-between">
            <span>All Resources</span>
            <span className="text-xs text-gray-500">
              {resourceGroups.reduce((sum, g) => sum + g.count, 0)}
            </span>
          </div>
        </button>

        {/* Individual Resource Types */}
        {resourceGroups.map((group) => (
          <button
            key={group.resourceType}
            onClick={() => onSelectResource(group.resourceType)}
            className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors mb-1 cursor-pointer ${
              selectedResourceType === group.resourceType
                ? 'bg-blue-50 text-blue-900'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <span>{group.resourceType}</span>
              <span className="text-xs text-gray-500">({group.count})</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
