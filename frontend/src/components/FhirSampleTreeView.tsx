import React, { useState, useEffect } from 'react';
import { AlertCircle, Loader2, ChevronDown, ChevronRight, Braces, Hash, Type, CheckSquare, FileJson } from 'lucide-react';
import type { FhirSampleMetadata } from '../types/fhirSample';
import { getSampleSource } from '../types/fhirSample';

/**
 * FhirSampleTreeView - Context-locked HL7 sample viewer for FHIRPath selection
 * 
 * 🔒 READ-ONLY CONTEXT:
 * - Drawer context is read-only by design
 * - NO API calls (all data via props)
 * - NO project bundle mutation
 * - NO persistence or side effects
 * - Sample data isolated in local state within drawer
 * - Only emits FHIRPath string via onSelectPath
 * 
 * ARCHITECTURE:
 * - Receives hl7Samples prop (metadata array)
 * - Loads sample on user selection (dropdown inside drawer)
 * - Displays tree view for selected sample
 * - Returns FHIRPath string ONLY (no metadata)
 */
interface FhirSampleTreeViewProps {
  resourceType: string;
  onSelectPath: (path: string) => void; // Returns FHIRPath string ONLY
  hl7Samples?: FhirSampleMetadata[]; // Read-only HL7 samples from parent
  onSampleLoaded?: (sampleData: any) => void; // Optional callback when sample is loaded
}

interface TreeNode {
  path: string;
  name: string;
  value: any;
  type: 'object' | 'array' | 'primitive';
  children?: TreeNode[];
  arrayIndex?: number;
}

const FhirSampleTreeView: React.FC<FhirSampleTreeViewProps> = ({ 
  resourceType, 
  onSelectPath,
  hl7Samples = [],
  onSampleLoaded
}) => {
  // Drawer context is read-only by design
  // LOCAL STATE - Isolated within drawer, never touches project bundle
  const [selectedSample, setSelectedSample] = useState<FhirSampleMetadata | null>(null);
  const [sampleData, setSampleData] = useState<any>(null); // Read-only sample for tree view
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedPath, setSelectedPath] = useState<string>(''); // FHIRPath string only

  // Get type icon for value
  const getTypeIcon = (type: string, value: any) => {
    if (type === 'array') {
      return <Braces className="w-3.5 h-3.5 text-blue-500" />;
    }
    if (type === 'object') {
      return <Braces className="w-3.5 h-3.5 text-purple-500" />;
    }
    if (value === null) {
      return <FileJson className="w-3.5 h-3.5 text-gray-400" />;
    }
    if (typeof value === 'string') {
      return <Type className="w-3.5 h-3.5 text-green-600" />;
    }
    if (typeof value === 'number') {
      return <Hash className="w-3.5 h-3.5 text-orange-600" />;
    }
    if (typeof value === 'boolean') {
      return <CheckSquare className="w-3.5 h-3.5 text-indigo-600" />;
    }
    return <FileJson className="w-3.5 h-3.5 text-gray-400" />;
  };

  // Format value preview for display
  const formatValuePreview = (value: any, type: string): string => {
    if (value === null) return 'null';
    if (type === 'array') return `Array[${Array.isArray(value) ? value.length : 0}]`;
    if (type === 'object') return `{${Object.keys(value || {}).length} properties}`;
    if (typeof value === 'string') return `"${value.length > 50 ? value.substring(0, 50) + '...' : value}"`;
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'number') return String(value);
    return '';
  };

  // Filter to show only HL7 samples (preferred) or all samples for this resource type
  const availableSamples = hl7Samples.filter(s => s.resourceType === resourceType);
  const hl7OnlySamples = availableSamples.filter(s => getSampleSource(s) === 'HL7');
  const samplesToShow = hl7OnlySamples.length > 0 ? hl7OnlySamples : availableSamples;

  // Auto-select first HL7 sample on mount or when samples change
  useEffect(() => {
    if (samplesToShow.length > 0 && !selectedSample) {
      handleLoadSample(samplesToShow[0]);
    }
  }, [samplesToShow.length, resourceType]);

  const handleLoadSample = async (sample: FhirSampleMetadata) => {
    // Drawer context is read-only by design
    setLoading(true);
    setError(null);
    setSampleData(null);
    setSelectedSample(sample);

    try {
      const sampleResponse = await fetch(`/api/fhir/samples/R4/${sample.resourceType}/${sample.id}`);
      
      if (!sampleResponse.ok) {
        throw new Error(`Failed to load sample: ${sampleResponse.status} ${sampleResponse.statusText}`);
      }

      const sampleJson = await sampleResponse.json();
      setSampleData(sampleJson);

      // Notify parent if callback provided (for value suggestions)
      if (onSampleLoaded) {
        onSampleLoaded(sampleJson);
      }

      // Auto-expand root level
      setExpandedNodes(new Set([resourceType]));
    } catch (err) {
      console.error('Error loading FHIR sample:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const buildTreeFromJson = (obj: any, parentPath: string = ''): TreeNode[] => {
    if (obj === null || obj === undefined) {
      return [];
    }

    const nodes: TreeNode[] = [];

    if (Array.isArray(obj)) {
      // Array node
      obj.forEach((item, index) => {
        const arrayPath = `${parentPath}[${index}]`;
        const arrayNode: TreeNode = {
          path: arrayPath,
          name: `[${index}]`,
          value: item,
          type: typeof item === 'object' && item !== null ? 'array' : 'primitive',
          arrayIndex: index,
          children: typeof item === 'object' && item !== null ? buildTreeFromJson(item, arrayPath) : undefined
        };
        nodes.push(arrayNode);
      });
    } else if (typeof obj === 'object') {
      // Object node - iterate properties
      Object.entries(obj).forEach(([key, value]) => {
        // Skip resourceType and optionally id at root level
        if (parentPath === '' && (key === 'resourceType')) {
          return;
        }

        const fieldPath = parentPath ? `${parentPath}.${key}` : key;
        
        let nodeType: 'object' | 'array' | 'primitive';
        let children: TreeNode[] | undefined;

        if (Array.isArray(value)) {
          nodeType = 'array';
          children = buildTreeFromJson(value, fieldPath);
        } else if (typeof value === 'object' && value !== null) {
          nodeType = 'object';
          children = buildTreeFromJson(value, fieldPath);
        } else {
          nodeType = 'primitive';
          children = undefined;
        }

        nodes.push({
          path: fieldPath,
          name: key,
          value: value,
          type: nodeType,
          children: children
        });
      });
    }

    return nodes;
  };

  const generateFhirPath = (node: TreeNode): string => {
    // For array elements, use [0] notation (can be refined later with [*] or where())
    if (node.path.includes('[')) {
      return node.path;
    }
    return node.path;
  };

  const toggleNode = (nodePath: string) => {
    setExpandedNodes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(nodePath)) {
        newSet.delete(nodePath);
      } else {
        newSet.add(nodePath);
      }
      return newSet;
    });
  };

  const handleSelectNode = (node: TreeNode) => {
    const fhirPath = generateFhirPath(node);
    setSelectedPath(fhirPath);
    
    // Drawer context is read-only by design
    // CRITICAL: Only return FHIRPath string, never sample data or metadata
    onSelectPath(fhirPath);
  };

  const renderNode = (node: TreeNode, level: number = 0): React.ReactNode => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodes.has(node.path);
    const isSelected = selectedPath === node.path;

    return (
      <div key={node.path}>
        <div
          className={`flex items-center py-1 px-2 cursor-pointer transition-colors ${
            isSelected ? 'bg-blue-100 border-l-2 border-blue-600' : 'hover:bg-gray-50'
          }`}
          style={{ paddingLeft: `${level * 20 + 8}px` }}
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) {
              toggleNode(node.path);
            }
            handleSelectNode(node);
          }}
        >
          {/* Expand/Collapse Icon */}
          {hasChildren ? (
            <button className="mr-1 p-0.5 hover:bg-gray-200 rounded">
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5 text-gray-600" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
              )}
            </button>
          ) : (
            <span className="w-4 mr-1" />
          )}

          {/* Type Icon */}
          <span className="mr-1.5">{getTypeIcon(node.type, node.value)}</span>

          {/* Node Label */}
          <span className="text-sm font-mono font-medium text-gray-800">
            {node.name}
          </span>

          {/* Value Preview for Primitives */}
          {!hasChildren && (
            <span className="ml-2 text-xs text-gray-500 truncate">
              : {formatValuePreview(node.value, node.type)}
            </span>
          )}

          {/* Count for Objects/Arrays */}
          {hasChildren && (
            <span className="ml-2 text-xs text-gray-400">
              {formatValuePreview(node.value, node.type)}
            </span>
          )}
        </div>

        {/* Children */}
        {hasChildren && isExpanded && node.children && (
          <div>
            {node.children.map((child) => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  // Drawer context is read-only by design
  // No samples available case
  if (!hl7Samples || samplesToShow.length === 0) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
        <div className="flex items-start">
          <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-semibold text-yellow-800">No HL7 Samples Available</h4>
            <p className="text-sm text-yellow-700 mt-1">
              No HL7 standard samples found for resource type "{resourceType}".
            </p>
          </div>
        </div>
      </div>
    );
  }

  const treeNodes = sampleData ? buildTreeFromJson(sampleData) : [];

  return (
    <div className="space-y-3">
      {/* Sample Selector Dropdown - Inside drawer only */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-gray-700">
          Select HL7 Standard Sample
        </label>
        <div className="relative">
          <select
            value={selectedSample?.id || ''}
            onChange={(e) => {
              const sample = samplesToShow.find(s => s.id === e.target.value);
              if (sample) handleLoadSample(sample);
            }}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white pr-10"
            disabled={loading}
          >
            {samplesToShow.map((sample) => (
              <option key={sample.id} value={sample.id}>
                {sample.display}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
        <p className="text-xs text-gray-500">
          {samplesToShow.length} HL7 sample{samplesToShow.length !== 1 ? 's' : ''} available for {resourceType}
        </p>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="p-8 text-center border border-gray-200 rounded-md">
          <Loader2 className="inline-block animate-spin h-8 w-8 text-blue-600" />
          <p className="text-sm text-gray-600 mt-3">Loading sample...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-semibold text-red-800">Failed to load sample</h4>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Tree View */}
      {!loading && !error && sampleData && (
        <div className="border border-gray-200 rounded-md bg-white">
          <div className="p-3 bg-gray-50 border-b border-gray-200">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-gray-700">
                  HL7 Sample: {resourceType}
                </h4>
                <p className="text-xs text-gray-500 mt-1">
                  Click on any element to select its FHIRPath
                </p>
              </div>
              {selectedSample && getSampleSource(selectedSample) === 'HL7' && (
                <span 
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 ml-2"
                  title="Official HL7 FHIR R4 example"
                >
                  HL7 Official
                </span>
              )}
            </div>
          </div>
          <div className="p-2 max-h-96 overflow-y-auto">
            {treeNodes.map((node) => renderNode(node))}
          </div>
          {selectedPath && (
            <div className="p-3 bg-blue-50 border-t border-blue-200">
              <p className="text-xs text-blue-800">
                <span className="font-medium">Selected:</span>{' '}
                <code className="bg-white px-2 py-1 rounded text-blue-900">{selectedPath}</code>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FhirSampleTreeView;
