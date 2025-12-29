import React, { useState, useMemo } from 'react';
import { User, FileText, Activity, Building, MapPin, Briefcase, HelpCircle, Pill, ListOrdered, Calendar, Lock, Edit2, CheckCircle, AlertTriangle } from 'lucide-react';

/**
 * SHARED RESOURCE SELECTOR
 * 
 * Universal resource type selector used by ALL rule types.
 * 
 * BEHAVIOR:
 * - Edit mode (disabled=true): Shows locked summary view, no interaction
 * - Create mode (disabled=false): 
 *   - Initially shows grid
 *   - After selection, collapses to summary with "Change" action
 *   - Clicking "Change" re-expands grid
 * 
 * SEMANTIC LOCKING:
 * Resource type is immutable once a rule is created because it defines field paths and scope.
 * 
 * BUNDLE AWARENESS:
 * Summary views show advisory info about resource availability in current bundle.
 * Non-blocking UX - informs user but doesn't prevent rule creation.
 * 
 * RULE: This component is the SINGLE source of truth for resource selection UI.
 * DO NOT create rule-specific resource selector variants.
 */

const RESOURCE_ICONS = {
  Patient: User,
  Encounter: Activity,
  Observation: FileText,
  Organization: Building,
  Location: MapPin,
  HealthcareService: Briefcase,
  QuestionnaireResponse: HelpCircle,
  Medication: Pill,
  Condition: ListOrdered,
  Appointment: Calendar,
} as const;

export const ALL_RESOURCE_TYPES = Object.keys(RESOURCE_ICONS) as Array<keyof typeof RESOURCE_ICONS>;

interface ResourceSelectorProps {
  value: string;
  onChange: (resourceType: string) => void;
  supportedTypes?: readonly string[];
  className?: string;
  disabled?: boolean;
  projectBundle?: any; // Bundle to check resource availability
}

export const ResourceSelector: React.FC<ResourceSelectorProps> = ({
  value,
  onChange,
  supportedTypes = ALL_RESOURCE_TYPES,
  className = '',
  disabled = false,
  projectBundle,
}) => {
  // Start with grid hidden if a value exists, show grid only when user clicks "Change" or no value yet
  const [showGrid, setShowGrid] = useState(() => !value); 
  const SelectedIcon = RESOURCE_ICONS[value as keyof typeof RESOURCE_ICONS];

  // Count resources of selected type in bundle
  const resourceCount = useMemo(() => {
    if (!value || !projectBundle?.entry) return 0;
    return projectBundle.entry.filter((e: any) => 
      e.resource?.resourceType === value
    ).length;
  }, [value, projectBundle]);

  // Determine bundle status message
  const bundleStatus = useMemo(() => {
    if (!value) return null;
    
    if (resourceCount > 0) {
      return {
        type: 'found' as const,
        message: `${resourceCount} ${value} ${resourceCount === 1 ? 'instance' : 'instances'} in current bundle`,
        icon: CheckCircle,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
      };
    }
    
    return {
      type: 'not-found' as const,
      message: 'Not found in current bundle. This rule will not run unless this resource appears.',
      icon: AlertTriangle,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
    };
  }, [value, resourceCount]);

  // EDIT MODE: Show locked summary (no interaction)
  if (disabled) {
    return (
      <div className={className}>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Apply to Resource
        </label>
        <div className="flex items-center gap-3 px-4 py-3 border-2 border-gray-200 bg-gray-50 rounded-lg">
          {SelectedIcon && <SelectedIcon size={20} className="text-gray-600" />}
          <span className="text-sm font-medium text-gray-800">{value}</span>
          <div className="ml-auto flex items-center gap-2 text-xs text-gray-500">
            <Lock size={14} />
            <span>Locked</span>
          </div>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Resource type is locked for existing rules.
        </p>
        {bundleStatus && (
          <div className={`mt-2 flex items-start gap-2 px-3 py-2 rounded-md border ${bundleStatus.borderColor} ${bundleStatus.bgColor}`}>
            <bundleStatus.icon size={14} className={`${bundleStatus.color} mt-0.5 flex-shrink-0`} />
            <span className={`text-xs ${bundleStatus.color}`}>
              {bundleStatus.message}
            </span>
          </div>
        )}
      </div>
    );
  }

  // CREATE MODE: Show summary if value selected and user hasn't clicked "Change"
  if (value && !showGrid) {
    return (
      <div className={className}>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Apply to Resource
        </label>
        <div className="flex items-center gap-3 px-4 py-3 border-2 border-blue-200 bg-blue-50 rounded-lg">
          {SelectedIcon && <SelectedIcon size={20} className="text-blue-600" />}
          <span className="text-sm font-medium text-gray-800">{value}</span>
          <button
            type="button"
            onClick={() => setShowGrid(true)}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 hover:text-blue-800 hover:bg-blue-100 rounded transition-colors"
          >
            <Edit2 size={12} />
            Change
          </button>
        </div>
        {bundleStatus && (
          <div className={`mt-2 flex items-start gap-2 px-3 py-2 rounded-md border ${bundleStatus.borderColor} ${bundleStatus.bgColor}`}>
            <bundleStatus.icon size={14} className={`${bundleStatus.color} mt-0.5 flex-shrink-0`} />
            <span className={`text-xs ${bundleStatus.color}`}>
              {bundleStatus.message}
            </span>
          </div>
        )}
      </div>
    );
  }

  // CREATE MODE: Show full grid
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-3">
        Apply to Resource
      </label>
      <div className="grid grid-cols-3 gap-3">
        {supportedTypes.map((type) => {
          const Icon = RESOURCE_ICONS[type as keyof typeof RESOURCE_ICONS];
          const isSelected = value === type;

          return (
            <button
              key={type}
              type="button"
              onClick={() => {
                onChange(type);
                setShowGrid(false); // Collapse to summary after selection
              }}
              className={`
                flex flex-col items-center justify-center gap-2 p-4 border-2 rounded-lg
                transition-all duration-200
                ${isSelected
                  ? 'border-blue-500 bg-blue-50 shadow-sm'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }
                cursor-pointer
              `}
            >
              {Icon && <Icon size={24} className={isSelected ? 'text-blue-600' : 'text-gray-600'} />}
              <span className={`text-xs font-medium ${isSelected ? 'text-blue-700' : 'text-gray-700'}`}>
                {type}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
