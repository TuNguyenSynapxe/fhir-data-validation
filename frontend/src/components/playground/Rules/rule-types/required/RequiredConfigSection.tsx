import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Plus, Trash2, AlertCircle } from 'lucide-react';
import FhirPathSelectorDrawer from '../../../../rules/FhirPathSelectorDrawer';

/**
 * REQUIRED CONFIG SECTION
 * 
 * Rule-specific configuration for Required rules (Field OR Resource modes).
 * ONLY handles rule-specific parameters - NO shared UI (resource, scope, severity).
 * 
 * Responsibilities:
 * - Mode selection: Field vs Resource
 * - FIELD MODE: Path selection via FhirPathSelectorDrawer
 * - RESOURCE MODE: Quantity (min/exact) + optional attribute conditions
 * - Validation and state management
 * 
 * The parent RuleForm handles: resource, scope, severity, errorCode, userHint, preview, save/cancel.
 */

// ========== DATA TYPES ==========

export interface AttributeCondition {
  path: string;      // e.g., "category.coding.code"
  operator: '=';     // Only '=' for now (future: 'in', '!=', etc.)
  value: string;
}

export interface ResourceRequirement {
  min: number;
  max?: number;      // Optional; if absent => only min
  where?: AttributeCondition[];
}

export type RequiredConfigMode = 'field' | 'resource';

export interface RequiredFieldParams {
  path: string;
}

export interface RequiredResourceParams {
  resourceRequirement: ResourceRequirement;
}

export type RequiredParams = RequiredFieldParams | RequiredResourceParams;

// ========== COMPONENT ==========

interface RequiredConfigSectionProps {
  mode: 'create' | 'edit';
  resourceType: string;
  initialParams?: RequiredParams;
  onParamsChange: (params: RequiredParams, isValid: boolean) => void;
  projectBundle?: object;
  hl7Samples?: any[];
}

export const RequiredConfigSection: React.FC<RequiredConfigSectionProps> = ({
  mode,
  resourceType,
  initialParams,
  onParamsChange,
  projectBundle,
  hl7Samples,
}) => {
  // ========== STATE ==========
  
  // Infer config mode from initialParams
  const inferMode = (params?: RequiredParams): RequiredConfigMode => {
    if (!params) return 'field'; // Default to field
    return 'resourceRequirement' in params ? 'resource' : 'field';
  };

  const [configMode, setConfigMode] = useState<RequiredConfigMode>(inferMode(initialParams));

  // Field mode state
  const [fieldPath, setFieldPath] = useState<string>('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Resource mode state
  const [quantityMode, setQuantityMode] = useState<'min' | 'exact'>('min');
  const [minValue, setMinValue] = useState<number>(1);
  const [exactValue, setExactValue] = useState<number>(1);
  const [conditions, setConditions] = useState<AttributeCondition[]>([]);
  const [showConditions, setShowConditions] = useState(false);

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ========== INITIALIZATION (EDIT MODE) ==========

  useEffect(() => {
    if (mode === 'edit' && initialParams) {
      const inferredMode = inferMode(initialParams);
      setConfigMode(inferredMode);

      if (inferredMode === 'field') {
        const fieldParams = initialParams as RequiredFieldParams;
        setFieldPath(fieldParams.path || '');
      } else {
        const resourceParams = initialParams as RequiredResourceParams;
        const req = resourceParams.resourceRequirement;

        if (req.max !== undefined && req.min === req.max) {
          setQuantityMode('exact');
          setExactValue(req.min);
        } else {
          setQuantityMode('min');
          setMinValue(req.min);
        }

        if (req.where && req.where.length > 0) {
          setConditions(req.where);
          setShowConditions(true);
        }
      }
    }
  }, [mode, initialParams]);

  // ========== VALIDATION & CHANGE NOTIFICATION ==========

  useEffect(() => {
    const newErrors: Record<string, string> = {};
    let isValid = true;

    if (configMode === 'field') {
      if (!fieldPath.trim()) {
        newErrors.fieldPath = 'Field path is required';
        isValid = false;
      }

      const params: RequiredFieldParams = { path: fieldPath };
      onParamsChange(params, isValid);
    } else {
      // Resource mode validation
      const quantity = quantityMode === 'exact' ? exactValue : minValue;
      if (quantity < 0) {
        newErrors.quantity = 'Quantity must be 0 or greater';
        isValid = false;
      }

      // Validate conditions: if any row is partially filled, require all fields
      conditions.forEach((cond, idx) => {
        const hasPath = cond.path.trim() !== '';
        const hasValue = cond.value.trim() !== '';

        if ((hasPath && !hasValue) || (!hasPath && hasValue)) {
          newErrors[`condition-${idx}`] = 'Both path and value are required';
          isValid = false;
        }
      });

      const requirement: ResourceRequirement = {
        min: quantityMode === 'exact' ? exactValue : minValue,
        ...(quantityMode === 'exact' ? { max: exactValue } : {}),
        ...(conditions.length > 0 && conditions.some(c => c.path.trim() && c.value.trim())
          ? { where: conditions.filter(c => c.path.trim() && c.value.trim()) }
          : {}),
      };

      const params: RequiredResourceParams = { resourceRequirement: requirement };
      onParamsChange(params, isValid);
    }

    setErrors(newErrors);
  }, [configMode, fieldPath, quantityMode, minValue, exactValue, conditions, onParamsChange]);

  // ========== HANDLERS ==========

  const handleModeChange = (newMode: RequiredConfigMode) => {
    setConfigMode(newMode);
    setErrors({});
  };

  const handleFieldPathSelected = (path: string) => {
    setFieldPath(path);
    setIsDrawerOpen(false);
  };

  const handleAddCondition = () => {
    setConditions([...conditions, { path: '', operator: '=', value: '' }]);
    setShowConditions(true);
  };

  const handleRemoveCondition = (index: number) => {
    const newConditions = conditions.filter((_, idx) => idx !== index);
    setConditions(newConditions);
    if (newConditions.length === 0) {
      setShowConditions(false);
    }
  };

  const handleConditionChange = (index: number, field: keyof AttributeCondition, value: string) => {
    const newConditions = [...conditions];
    newConditions[index] = { ...newConditions[index], [field]: value };
    setConditions(newConditions);
  };

  // ========== SUMMARY TEXT ==========

  const getSummary = (): string => {
    if (configMode === 'field') {
      return fieldPath ? `Field "${fieldPath}" must be present and not empty` : 'No field selected';
    }

    const quantity = quantityMode === 'exact' ? exactValue : minValue;
    const quantityText = quantityMode === 'exact' 
      ? `Exactly ${quantity}` 
      : `At least ${quantity}`;

    const validConditions = conditions.filter(c => c.path.trim() && c.value.trim());
    if (validConditions.length === 0) {
      return `${quantityText} ${resourceType} resource(s) required`;
    }

    const conditionsText = validConditions
      .map(c => `${c.path} = "${c.value}"`)
      .join(' AND ');
    return `${quantityText} ${resourceType} resource(s) where ${conditionsText}`;
  };

  // ========== RENDER ==========

  return (
    <div className="space-y-6">
      {/* MODE SELECTOR */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Requirement Type
        </label>
        <div className="inline-flex rounded-md shadow-sm" role="group">
          <button
            type="button"
            disabled={mode === 'edit'}
            onClick={() => handleModeChange('field')}
            className={`
              px-4 py-2 text-sm font-medium border
              rounded-l-md transition-colors
              ${mode === 'edit' ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}
              ${configMode === 'field'
                ? 'bg-blue-50 border-blue-500 text-blue-700 z-10'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }
            `}
          >
            Field
          </button>
          <button
            type="button"
            disabled={mode === 'edit'}
            onClick={() => handleModeChange('resource')}
            className={`
              px-4 py-2 text-sm font-medium border-t border-b border-r
              rounded-r-md transition-colors
              ${mode === 'edit' ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}
              ${configMode === 'resource'
                ? 'bg-blue-50 border-blue-500 text-blue-700 z-10'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }
            `}
          >
            Resource
          </button>
        </div>
        {mode === 'edit' && (
          <p className="mt-1 text-xs text-gray-500">
            Mode cannot be changed when editing
          </p>
        )}
      </div>

      {/* FIELD MODE CONFIG */}
      {configMode === 'field' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Field to Validate <span className="text-red-500">*</span>
            </label>
            <button
              type="button"
              onClick={() => setIsDrawerOpen(true)}
              className={`
                w-full px-4 py-3 text-left border rounded-md
                transition-colors
                ${errors.fieldPath
                  ? 'border-red-300 bg-red-50'
                  : fieldPath
                  ? 'border-green-300 bg-green-50 hover:border-green-400'
                  : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                }
              `}
            >
              <div className="flex items-center justify-between">
                <div>
                  {fieldPath ? (
                    <>
                      <div className="text-sm font-medium text-gray-900">
                        <code className="bg-white px-2 py-0.5 rounded text-xs">{fieldPath}</code>
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">Click to change field</div>
                    </>
                  ) : (
                    <div className="text-sm text-gray-500">Click to select a field</div>
                  )}
                </div>
                <div className="text-blue-500 text-sm">Select</div>
              </div>
            </button>
            {errors.fieldPath && (
              <p className="mt-1 text-sm text-red-600">{errors.fieldPath}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              The field that must be present and not empty
            </p>
          </div>

          <FhirPathSelectorDrawer
            isOpen={isDrawerOpen}
            onClose={() => setIsDrawerOpen(false)}
            onSelect={handleFieldPathSelected}
            resourceType={resourceType}
            projectBundle={projectBundle}
            hl7Samples={hl7Samples}
          />
        </div>
      )}

      {/* RESOURCE MODE CONFIG */}
      {configMode === 'resource' && (
        <div className="space-y-4">
          {/* Quantity Controls */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Quantity Requirement <span className="text-red-500">*</span>
            </label>

            {/* At least / Exactly radio */}
            <div className="space-y-3">
              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="radio"
                  checked={quantityMode === 'min'}
                  onChange={() => setQuantityMode('min')}
                  className="mt-0.5 h-4 w-4 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-900">At least</span>
                    <input
                      type="number"
                      min="0"
                      value={minValue}
                      onChange={(e) => setMinValue(Math.max(0, parseInt(e.target.value) || 0))}
                      disabled={quantityMode !== 'min'}
                      className="w-20 px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                    <span className="text-sm text-gray-600">resource(s)</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Minimum count required (can be more)</p>
                </div>
              </label>

              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="radio"
                  checked={quantityMode === 'exact'}
                  onChange={() => setQuantityMode('exact')}
                  className="mt-0.5 h-4 w-4 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-900">Exactly</span>
                    <input
                      type="number"
                      min="0"
                      value={exactValue}
                      onChange={(e) => setExactValue(Math.max(0, parseInt(e.target.value) || 0))}
                      disabled={quantityMode !== 'exact'}
                      className="w-20 px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                    <span className="text-sm text-gray-600">resource(s)</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Exact count required (no more, no less)</p>
                </div>
              </label>
            </div>

            {errors.quantity && (
              <p className="mt-2 text-sm text-red-600">{errors.quantity}</p>
            )}
          </div>

          {/* Optional Conditions Section */}
          <div className="border border-gray-200 rounded-md">
            <button
              type="button"
              onClick={() => setShowConditions(!showConditions)}
              className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-2">
                {showConditions ? (
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-500" />
                )}
                <span className="text-sm font-medium text-gray-700">
                  Advanced: Add Attribute Conditions
                </span>
                {conditions.length > 0 && (
                  <span className="text-xs text-gray-500">({conditions.length})</span>
                )}
              </div>
            </button>

            {showConditions && (
              <div className="px-4 pb-4 space-y-3 border-t border-gray-200">
                <div className="pt-3 flex items-start space-x-2">
                  <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-gray-600">
                    Only resources matching <strong>ALL</strong> conditions below are counted toward the requirement.
                  </p>
                </div>

                {conditions.map((condition, idx) => (
                  <div key={idx} className="flex items-start space-x-2">
                    <div className="flex-1 grid grid-cols-12 gap-2">
                      <input
                        type="text"
                        placeholder="path (e.g., category.coding.code)"
                        value={condition.path}
                        onChange={(e) => handleConditionChange(idx, 'path', e.target.value)}
                        className={`col-span-5 px-3 py-2 text-sm border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                          errors[`condition-${idx}`] ? 'border-red-300 bg-red-50' : 'border-gray-300'
                        }`}
                      />
                      <select
                        value={condition.operator}
                        onChange={(e) => handleConditionChange(idx, 'operator', e.target.value)}
                        className="col-span-2 px-2 py-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="=">=</option>
                      </select>
                      <input
                        type="text"
                        placeholder="value"
                        value={condition.value}
                        onChange={(e) => handleConditionChange(idx, 'value', e.target.value)}
                        className={`col-span-4 px-3 py-2 text-sm border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                          errors[`condition-${idx}`] ? 'border-red-300 bg-red-50' : 'border-gray-300'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveCondition(idx)}
                        className="col-span-1 p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        title="Remove condition"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={handleAddCondition}
                  className="flex items-center space-x-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add condition</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUMMARY */}
      <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-md">
        <h4 className="text-xs font-medium text-gray-700 mb-1">Summary</h4>
        <p className="text-sm text-gray-900">{getSummary()}</p>
      </div>
    </div>
  );
};
