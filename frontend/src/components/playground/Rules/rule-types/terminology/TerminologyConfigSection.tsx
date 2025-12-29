import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Code, AlertCircle, Tag, ChevronDown } from 'lucide-react';
import FhirPathSelectorDrawer from '../../../../rules/FhirPathSelectorDrawer';
import { listCodeSystems } from '../../../../../api/terminologyApi';
import type { CodeSystem } from '../../../../../types/terminology';
import type { FhirPathOption } from '../../common/FhirPathSelection.types';
import { 
  getSemanticType, 
  normalizeToCodingPath,
  isExtensionPath,
  buildExtensionPath,
  generateCodedFieldLabel,
  isCodedElement
} from '../../common/fhirPathSemanticUtils';

/**
 * TERMINOLOGY CONFIG SECTION
 * 
 * Rule-specific configuration for Terminology/CodeSystem rules.
 * ONLY handles rule-specific parameters - NO shared UI (resource, scope, severity).
 * 
 * Responsibilities:
 * - Field path selection (via FhirPathSelectorDrawer)
 * - Validation type selection (AllowedCode, ExactSystemCode)
 * - Conditional inputs based on type
 * - Runtime info panel (fixed error code)
 * 
 * The parent RuleForm handles: resource, severity, userHint, preview, save/cancel.
 * 
 * NOTE: Error code is FIXED: CODESYSTEM_VIOLATION
 * NOTE: Validates against project's internal terminology definitions
 */

export type ValidationType = 'AllowedCode' | 'ExactSystemCode';

export interface TerminologyParams {
  fieldPath: string;
  validationType: ValidationType;
  codeSystemUrl?: string; // For AllowedCode: the CodeSystem URL to validate against
  allowedCodes?: string[]; // For AllowedCode: optional specific codes within the CodeSystem
  system?: string; // For ExactSystemCode: the system URL
  exactCode?: string; // For ExactSystemCode: the specific code
}

interface TerminologyConfigSectionProps {
  mode: 'create' | 'edit';
  resourceType: string;
  initialParams?: TerminologyParams;
  onParamsChange: (params: TerminologyParams, isValid: boolean) => void;
  projectBundle?: object;
  hl7Samples?: any[];
  projectId?: string;
}

export const TerminologyConfigSection: React.FC<TerminologyConfigSectionProps> = ({
  mode,
  resourceType,
  initialParams,
  onParamsChange,
  projectBundle,
  hl7Samples,
  projectId,
}) => {
  const [fieldPath, setFieldPath] = useState(initialParams?.fieldPath || '');
  const [validationType, setValidationType] = useState<ValidationType>(initialParams?.validationType || 'AllowedCode');
  const [codeSystemUrl, setCodeSystemUrl] = useState(initialParams?.codeSystemUrl || '');
  const [selectedCodes, setSelectedCodes] = useState<string[]>(initialParams?.allowedCodes || []);
  const [system, setSystem] = useState(initialParams?.system || '');
  const [exactCode, setExactCode] = useState(initialParams?.exactCode || '');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [codeSystems, setCodeSystems] = useState<CodeSystem[]>([]);
  const [availableCodesForSystem, setAvailableCodesForSystem] = useState<Array<{ code: string; display?: string }>>([]);
  const [isLoadingCodeSystems, setIsLoadingCodeSystems] = useState(false);
  const [showCodeSystemDropdown, setShowCodeSystemDropdown] = useState(false);
  const [showCodesDropdown, setShowCodesDropdown] = useState(false);

  // Detect coded fields from project bundle for restricted selection
  const suggestedCodedPaths = useMemo((): FhirPathOption[] => {
    if (!projectBundle) return [];
    
    try {
      const bundle = JSON.parse(JSON.stringify(projectBundle));
      const paths: FhirPathOption[] = [];
      const seen = new Set<string>();
      const extensionsByUrl = new Map<string, any[]>();

      const extractCodedPaths = (obj: any, currentPath: string = resourceType, parentObj?: any) => {
        if (!obj || typeof obj !== 'object') return;

        Object.keys(obj).forEach(key => {
          const value = obj[key];
          const fullPath = currentPath ? `${currentPath}.${key}` : key;
          const relativePath = fullPath.replace(`${resourceType}.`, '');

          // Handle extensions specially
          if (key === 'extension' && Array.isArray(value)) {
            value.forEach((ext: any) => {
              if (ext.url) {
                // Group extensions by URL
                if (!extensionsByUrl.has(ext.url)) {
                  extensionsByUrl.set(ext.url, []);
                }
                extensionsByUrl.get(ext.url)!.push(ext);

                // Check for valueCodeableConcept in extension
                if (ext.valueCodeableConcept) {
                  const extPath = buildExtensionPath(ext.url, 'valueCodeableConcept', 'coding');
                  if (!seen.has(extPath)) {
                    seen.add(extPath);
                    const label = generateCodedFieldLabel(extPath, ext.url);
                    paths.push({
                      label,
                      fhirPath: extPath,
                      description: undefined, // Hide technical details
                      semanticType: 'Coding',
                      isExtension: true,
                      extensionUrl: ext.url,
                    });
                  }
                }
                
                // Check for valueCoding in extension
                if (ext.valueCoding) {
                  const extPath = buildExtensionPath(ext.url, 'valueCoding');
                  if (!seen.has(extPath)) {
                    seen.add(extPath);
                    const label = generateCodedFieldLabel(extPath, ext.url);
                    paths.push({
                      label,
                      fhirPath: extPath,
                      description: undefined, // Hide technical details
                      semanticType: 'Coding',
                      isExtension: true,
                      extensionUrl: ext.url,
                    });
                  }
                }
              }
            });
            return; // Don't recurse into extensions normally
          }

          // Check if this looks like a coded element
          if (key === 'coding' || (key === 'code' && typeof value === 'object')) {
            if (isCodedElement(relativePath)) {
              // Normalize CodeableConcept to .coding
              const normalizedPath = normalizeToCodingPath(relativePath);
              if (!seen.has(normalizedPath)) {
                seen.add(normalizedPath);
                const label = generateCodedFieldLabel(normalizedPath);
                paths.push({
                  label,
                  fhirPath: normalizedPath,
                  description: undefined, // Hide technical path details
                  semanticType: getSemanticType(normalizedPath),
                  isExtension: false,
                });
              }
            }
          }

          // Recurse into nested objects/arrays
          if (Array.isArray(value)) {
            value.forEach(item => extractCodedPaths(item, fullPath, value));
          } else if (value && typeof value === 'object' && key !== 'extension') {
            extractCodedPaths(value, fullPath, obj);
          }
        });
      };

      if (bundle.entry && Array.isArray(bundle.entry)) {
        bundle.entry.forEach((entry: any) => {
          if (entry.resource && entry.resource.resourceType === resourceType) {
            extractCodedPaths(entry.resource, resourceType);
          }
        });
      }

      return paths;
    } catch (error) {
      console.error('Failed to extract coded paths from bundle:', error);
      return [];
    }
  }, [projectBundle, resourceType]);

  // Track if we've initialized from initialParams to prevent infinite loop
  const hasInitialized = useRef(false);

  // Update state when initialParams changes (e.g., when loading edit data)
  // Only run once when initialParams has actual data (not just defaults)
  useEffect(() => {
    if (initialParams && initialParams.fieldPath && !hasInitialized.current) {
      setFieldPath(initialParams.fieldPath);
      setValidationType(initialParams.validationType || 'AllowedCode');
      setCodeSystemUrl(initialParams.codeSystemUrl || '');
      setSelectedCodes(initialParams.allowedCodes || []);
      setSystem(initialParams.system || '');
      setExactCode(initialParams.exactCode || '');
      hasInitialized.current = true;
    }
  }, [initialParams]);

  // Fetch available CodeSystems from project
  useEffect(() => {
    if (projectId) {
      setIsLoadingCodeSystems(true);
      listCodeSystems(projectId)
        .then((systems: CodeSystem[]) => {
          setCodeSystems(systems);
        })
        .catch((err: any) => {
          console.error('Failed to load CodeSystems:', err);
        })
        .finally(() => {
          setIsLoadingCodeSystems(false);
        });
    }
  }, [projectId]);

  // When CodeSystem is selected, load its concepts
  useEffect(() => {
    if (codeSystemUrl) {
      const selectedSystem = codeSystems.find(cs => cs.url === codeSystemUrl);
      if (selectedSystem) {
        const concepts = selectedSystem.concepts || selectedSystem.concept || [];
        const codes = concepts
          .filter((c: any) => c.code)
          .map((c: any) => ({ code: c.code, display: c.display }));
        setAvailableCodesForSystem(codes);
      } else {
        setAvailableCodesForSystem([]);
      }
    } else {
      setAvailableCodesForSystem([]);
    }
  }, [codeSystemUrl, codeSystems]);

  // Validate and notify parent on any change
  useEffect(() => {
    const params: TerminologyParams = {
      fieldPath,
      validationType,
      codeSystemUrl: validationType === 'AllowedCode' ? codeSystemUrl : undefined,
      allowedCodes: validationType === 'AllowedCode' && selectedCodes.length > 0 ? selectedCodes : undefined,
      system: validationType === 'ExactSystemCode' ? system : undefined,
      exactCode: validationType === 'ExactSystemCode' ? exactCode : undefined,
    };

    // Validation logic
    let isValid = false;
    if (fieldPath) {
      if (validationType === 'AllowedCode') {
        isValid = !!codeSystemUrl; // CodeSystem URL is required, codes are optional
      } else if (validationType === 'ExactSystemCode') {
        isValid = !!system && !!exactCode;
      }
    }

    onParamsChange(params, isValid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldPath, validationType, codeSystemUrl, selectedCodes, system, exactCode]);

  const handleFieldPathSelect = (path: string) => {
    // Normalize to .coding for terminology validation
    try {
      const normalized = normalizeToCodingPath(path);
      setFieldPath(normalized);
      setIsDrawerOpen(false);
    } catch (error) {
      // Handle primitive code path error
      console.error('Invalid path selection:', error);
      // Path will be rejected by validation
      setFieldPath(path);
      setIsDrawerOpen(false);
    }
  };

  const handleTypeChange = (newType: ValidationType) => {
    setValidationType(newType);
    // Clear inputs that don't apply to new type
    if (newType === 'AllowedCode') {
      setSystem('');
      setExactCode('');
    } else if (newType === 'ExactSystemCode') {
      setCodeSystemUrl('');
      setSelectedCodes([]);
    }
  };

  const toggleCodeSelection = (code: string) => {
    setSelectedCodes(prev => 
      prev.includes(code) 
        ? prev.filter(c => c !== code)
        : [...prev, code]
    );
  };

  return (
    <div className="space-y-6">
      {/* 1️⃣ Field Path Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Coded Field to Validate <span className="text-red-500">*</span>
        </label>
        <p className="text-xs text-gray-500 mb-2">
          Select a Coding or CodeableConcept field
        </p>
        
        {fieldPath ? (
          <div className="flex items-center gap-2">
            <div className="flex-1 px-3 py-2 bg-blue-50 border border-blue-200 rounded-md">
              <code className="text-sm text-blue-900">{fieldPath}</code>
            </div>
            <button
              type="button"
              onClick={() => setIsDrawerOpen(true)}
              className="px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
            >
              Change
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
          >
            <Code className="w-5 h-5" />
            Select Field Path
          </button>
        )}
        
        {!fieldPath && (
          <p className="mt-1 text-xs text-red-600">Field path is required</p>
        )}
      </div>

      {/* 2️⃣ Validation Type Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Validation Type <span className="text-red-500">*</span>
        </label>
        <div className="space-y-3">
          {/* AllowedCode Type */}
          <label className="flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors hover:bg-gray-50">
            <input
              type="radio"
              name="validationType"
              value="AllowedCode"
              checked={validationType === 'AllowedCode'}
              onChange={(e) => handleTypeChange(e.target.value as ValidationType)}
              className="mt-1"
            />
            <div className="flex-1">
              <div className="font-medium text-gray-900">Allowed Code (from Terminology)</div>
              <div className="text-sm text-gray-500 mt-0.5">
                Validate that the field contains a code from a specific CodeSystem
              </div>
            </div>
          </label>

          {/* ExactSystemCode Type */}
          <label className="flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors hover:bg-gray-50">
            <input
              type="radio"
              name="validationType"
              value="ExactSystemCode"
              checked={validationType === 'ExactSystemCode'}
              onChange={(e) => handleTypeChange(e.target.value as ValidationType)}
              className="mt-1"
            />
            <div className="flex-1">
              <div className="font-medium text-gray-900">Exact System + Code</div>
              <div className="text-sm text-gray-500 mt-0.5">
                Validate an exact system and code pairing
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* 3️⃣ Conditional Inputs */}
      {validationType === 'AllowedCode' && (
        <div className="space-y-4">
          {/* Step 1: Select CodeSystem */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              CodeSystem <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white cursor-pointer hover:border-blue-400 transition-colors flex items-center justify-between"
                onClick={() => setShowCodeSystemDropdown(!showCodeSystemDropdown)}
              >
                {codeSystemUrl ? (
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">
                      {codeSystems.find(cs => cs.url === codeSystemUrl)?.name || codeSystemUrl}
                    </div>
                    <div className="text-xs text-gray-500 truncate">{codeSystemUrl}</div>
                  </div>
                ) : (
                  <span className="text-gray-400">Select a CodeSystem</span>
                )}
                <ChevronDown className="w-4 h-4 text-gray-400 ml-2 shrink-0" />
              </div>
              
              {showCodeSystemDropdown && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {isLoadingCodeSystems ? (
                    <div className="px-3 py-2 text-sm text-gray-500 text-center">
                      Loading CodeSystems...
                    </div>
                  ) : codeSystems.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-gray-500 text-center">
                      No CodeSystems available. Add them in the Terminology section.
                    </div>
                  ) : (
                    codeSystems.map((cs) => (
                      <div
                        key={cs.url}
                        className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                        onClick={() => {
                          setCodeSystemUrl(cs.url);
                          setSelectedCodes([]); // Clear selected codes when changing CodeSystem
                          setShowCodeSystemDropdown(false);
                        }}
                      >
                        <div className="font-medium text-gray-900">{cs.name || cs.url}</div>
                        <div className="text-xs text-gray-500 truncate">{cs.url}</div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Validates that the field contains a code from this CodeSystem
            </p>
            {!codeSystemUrl && (
              <p className="mt-1 text-xs text-red-600">CodeSystem is required</p>
            )}
          </div>

          {/* Step 2: Optionally select specific codes (multi-select) */}
          {codeSystemUrl && availableCodesForSystem.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Allowed Codes (Optional)
              </label>
              <div className="relative">
                <div
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white cursor-pointer hover:border-blue-400 transition-colors flex items-center justify-between min-h-[40px]"
                  onClick={() => setShowCodesDropdown(!showCodesDropdown)}
                >
                  {selectedCodes.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {selectedCodes.map(code => (
                        <span key={code} className="px-2 py-0.5 bg-blue-100 text-blue-900 rounded text-sm">
                          {code}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-400">All codes allowed</span>
                  )}
                  <ChevronDown className="w-4 h-4 text-gray-400 ml-2 shrink-0" />
                </div>
                
                {showCodesDropdown && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {availableCodesForSystem.map((item) => (
                      <div
                        key={item.code}
                        className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 flex items-center gap-2"
                        onClick={() => toggleCodeSelection(item.code)}
                      >
                        <input
                          type="checkbox"
                          checked={selectedCodes.includes(item.code)}
                          onChange={() => {}}
                          className="rounded border-gray-300"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{item.code}</div>
                          {item.display && (
                            <div className="text-sm text-gray-600">{item.display}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Leave empty to allow any code from the CodeSystem. Select specific codes to restrict validation.
              </p>
            </div>
          )}
        </div>
      )}

      {validationType === 'ExactSystemCode' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              System <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={system}
              onChange={(e) => setSystem(e.target.value)}
              onBlur={(e) => setSystem(e.target.value.trim())}
              placeholder="http://loinc.org"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-gray-500">
              Example: http://loinc.org
            </p>
            {!system && (
              <p className="mt-1 text-xs text-red-600">System is required</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Code <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={exactCode}
              onChange={(e) => setExactCode(e.target.value)}
              onBlur={(e) => setExactCode(e.target.value.trim())}
              placeholder="8867-4"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-gray-500">
              Example: 8867-4 (LOINC code for heart rate)
            </p>
            {!exactCode && (
              <p className="mt-1 text-xs text-red-600">Code is required</p>
            )}
          </div>
        </div>
      )}

      {/* 4️⃣ Runtime Info Panel */}
      <div className="px-4 py-3 border border-blue-200 bg-blue-50 rounded-md">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h4 className="text-sm font-medium text-blue-900 mb-1">
              Runtime Terminology Validation
            </h4>
            <p className="text-xs text-blue-700 mb-2">
              Validated against project terminology at runtime
            </p>
            <div className="flex items-center gap-2 mt-2">
              <Tag size={14} className="text-blue-600" />
              <span className="text-xs font-medium text-blue-900">Error Code:</span>
              <code className="text-xs font-semibold text-blue-900 bg-blue-100 px-2 py-0.5 rounded">
                CODESYSTEM_VIOLATION
              </code>
              <span className="text-xs text-blue-700">(fixed)</span>
            </div>
          </div>
        </div>
      </div>

      {/* FhirPath Selector Drawer */}
      <FhirPathSelectorDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSelect={handleFieldPathSelect}
        resourceType={resourceType}
        projectBundle={projectBundle}
        hl7Samples={hl7Samples}
        mode="restricted"
        ruleContext="terminology"
        suggestedPaths={suggestedCodedPaths}
        allowedTypes={['Coding', 'CodeableConcept']}
        value={fieldPath}
      />
    </div>
  );
};
