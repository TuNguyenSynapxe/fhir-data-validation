import React from 'react';
import { Search } from 'lucide-react';

export interface RuleFilterState {
  searchQuery: string;
  resourceType: string;
  ruleType: string;
  severity: string;
  origin: string;
}

interface RuleFiltersProps {
  filters: RuleFilterState;
  onFiltersChange: (filters: RuleFilterState) => void;
  availableResourceTypes: string[];
  availableRuleTypes: string[];
}

export const RuleFilters: React.FC<RuleFiltersProps> = ({
  filters,
  onFiltersChange,
  availableResourceTypes,
  availableRuleTypes,
}) => {
  const handleFilterChange = (key: keyof RuleFilterState, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  return (
    <div className="flex flex-col gap-2 p-4 bg-gray-50 border-b">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search FHIRPath or message..."
          value={filters.searchQuery}
          onChange={(e) => handleFilterChange('searchQuery', e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Filter Dropdowns */}
      <div className="grid grid-cols-4 gap-2">
        <select
          value={filters.resourceType}
          onChange={(e) => handleFilterChange('resourceType', e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Resources</option>
          {availableResourceTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>

        <select
          value={filters.ruleType}
          onChange={(e) => handleFilterChange('ruleType', e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Rule Types</option>
          {availableRuleTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>

        <select
          value={filters.severity}
          onChange={(e) => handleFilterChange('severity', e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Severities</option>
          <option value="error">Error</option>
          <option value="warning">Warning</option>
          <option value="information">Information</option>
        </select>

        <select
          value={filters.origin}
          onChange={(e) => handleFilterChange('origin', e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Origins</option>
          <option value="manual">Project</option>
          <option value="system-suggested">HL7 Advisory</option>
          <option value="ai-suggested">Suggested</option>
        </select>
      </div>
    </div>
  );
};
