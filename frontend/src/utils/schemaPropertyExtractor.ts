/**
 * Schema Property Extractor
 * 
 * Extracts valid child properties for array item types from FHIR schema.
 * Used for smart property suggestions in FilterRefinementBuilder.
 * 
 * Requirements:
 * - Detect array item type from schema (e.g. telecom[] → ContactPoint)
 * - Load child properties for that type
 * - Support nested primitives (e.g. period.start)
 * - Cache results for performance
 */

import { fetchFhirSchema, type FhirSchemaNodeResponse } from '../api/fhirSchemaApi';

/**
 * Property suggestion with metadata
 */
export interface PropertySuggestion {
  /** Full property path (e.g. "system", "period.start") */
  path: string;
  /** Property display name (e.g. "system", "start") */
  name: string;
  /** FHIR data type (e.g. "code", "dateTime") */
  type: string;
  /** Human-readable description */
  description?: string;
  /** Source of suggestion */
  source: 'schema' | 'project-data';
}

/**
 * Cache for schema-based property suggestions
 * Key: "{resourceType}.{arrayPath}" (e.g. "Patient.telecom")
 * Value: PropertySuggestion[]
 */
const propertySuggestionCache = new Map<string, PropertySuggestion[]>();

/**
 * Detect array item type from FHIR schema
 * 
 * Example:
 * - basePath = "Patient.telecom" → detects ContactPoint
 * - basePath = "Patient.address.line" → detects string (primitive)
 * 
 * @param resourceType - FHIR resource type (e.g. "Patient")
 * @param arrayPath - Path to array field (e.g. "telecom", "address.line")
 * @returns Array item type name or null if not found
 */
async function detectArrayItemType(
  resourceType: string,
  arrayPath: string
): Promise<string | null> {
  try {
    const schema = await fetchFhirSchema(resourceType, 'R4');
    
    // Navigate to the array field in schema
    const pathSegments = arrayPath.split('.');
    let currentNode: FhirSchemaNodeResponse | undefined = schema;
    
    for (const segment of pathSegments) {
      if (!currentNode) return null;
      
      // Find child node matching segment
      const childNode: FhirSchemaNodeResponse | undefined = currentNode.children.find(
        child => child.elementName === segment
      );
      
      if (!childNode) return null;
      currentNode = childNode;
    }
    
    // Return the type of the array element
    if (currentNode && currentNode.isArray) {
      return currentNode.type;
    }
    
    return null;
  } catch (error) {
    console.error('Failed to detect array item type:', error);
    return null;
  }
}

/**
 * Extract child properties from a FHIR type schema node
 * 
 * Recursively extracts properties, including nested primitives.
 * Example: ContactPoint has "system", "value", "use", "rank", "period.start", "period.end"
 * 
 * @param node - FHIR schema node
 * @param pathPrefix - Current path prefix for nested properties
 * @param maxDepth - Maximum nesting depth to prevent infinite recursion
 * @returns Array of property suggestions
 */
function extractChildProperties(
  node: FhirSchemaNodeResponse,
  pathPrefix: string = '',
  maxDepth: number = 2,
  currentDepth: number = 0
): PropertySuggestion[] {
  if (!node.children || node.children.length === 0) {
    return [];
  }
  
  if (currentDepth >= maxDepth) {
    return [];
  }
  
  const properties: PropertySuggestion[] = [];
  
  for (const child of node.children) {
    const fullPath = pathPrefix ? `${pathPrefix}.${child.elementName}` : child.elementName;
    
    // Skip internal FHIR elements
    if (
      child.elementName === 'id' ||
      child.elementName === 'extension' ||
      child.elementName === 'modifierExtension'
    ) {
      continue;
    }
    
    // Add this property
    properties.push({
      path: fullPath,
      name: child.elementName,
      type: child.type,
      description: child.short || child.description,
      source: 'schema',
    });
    
    // If this is a complex type (backbone or has children), recurse
    // Only for non-array children to avoid deeply nested arrays
    if (
      !child.isArray &&
      child.children &&
      child.children.length > 0 &&
      !isPrimitiveType(child.type)
    ) {
      const nestedProperties = extractChildProperties(
        child,
        fullPath,
        maxDepth,
        currentDepth + 1
      );
      properties.push(...nestedProperties);
    }
  }
  
  return properties;
}

/**
 * Check if a FHIR type is primitive
 */
function isPrimitiveType(type: string): boolean {
  const primitives = [
    'string', 'boolean', 'integer', 'decimal', 'date', 'dateTime',
    'time', 'instant', 'uri', 'url', 'canonical', 'code', 'oid',
    'id', 'uuid', 'markdown', 'base64Binary', 'unsignedInt', 'positiveInt'
  ];
  return primitives.includes(type);
}

/**
 * Fetch property suggestions for an array path
 * 
 * @param resourceType - FHIR resource type (e.g. "Patient")
 * @param arrayPath - Path to array field (e.g. "telecom", "address.line")
 * @returns Array of valid property suggestions
 * 
 * @example
 * ```ts
 * const suggestions = await fetchPropertySuggestions("Patient", "telecom");
 * // Returns: [
 * //   { path: "system", name: "system", type: "code", source: "schema" },
 * //   { path: "value", name: "value", type: "string", source: "schema" },
 * //   { path: "use", name: "use", type: "code", source: "schema" },
 * //   { path: "period.start", name: "start", type: "dateTime", source: "schema" }
 * // ]
 * ```
 */
export async function fetchPropertySuggestions(
  resourceType: string,
  arrayPath: string
): Promise<PropertySuggestion[]> {
  // Check cache first
  const cacheKey = `${resourceType}.${arrayPath}`;
  if (propertySuggestionCache.has(cacheKey)) {
    return propertySuggestionCache.get(cacheKey)!;
  }
  
  try {
    // Detect array item type
    const itemType = await detectArrayItemType(resourceType, arrayPath);
    if (!itemType) {
      console.warn(`Could not detect array item type for ${resourceType}.${arrayPath}`);
      return [];
    }
    
    // For primitive types, return empty (no child properties)
    if (isPrimitiveType(itemType)) {
      propertySuggestionCache.set(cacheKey, []);
      return [];
    }
    
    // Fetch schema for the item type
    // For complex types like ContactPoint, HumanName, we need to load their schema
    // Note: In FHIR R4, complex types are data types, not resources
    // We'll use the parent resource schema and navigate to find the type definition
    const schema = await fetchFhirSchema(resourceType, 'R4');
    
    // Navigate to the array field to get its children (which represent the complex type structure)
    const pathSegments = arrayPath.split('.');
    let currentNode: FhirSchemaNodeResponse | undefined = schema;
    
    for (const segment of pathSegments) {
      if (!currentNode) break;
      currentNode = currentNode.children.find(
        child => child.elementName === segment
      );
    }
    
    if (!currentNode) {
      propertySuggestionCache.set(cacheKey, []);
      return [];
    }
    
    // Extract child properties
    const properties = extractChildProperties(currentNode);
    
    // Cache and return
    propertySuggestionCache.set(cacheKey, properties);
    return properties;
  } catch (error) {
    console.error('Failed to fetch property suggestions:', error);
    return [];
  }
}

/**
 * Overlay observed properties from project bundle
 * 
 * Extracts actual property paths used in the bundle data for the given array path.
 * These are merged with schema properties and marked as 'project-data' source.
 * 
 * @param bundle - Project bundle
 * @param resourceType - FHIR resource type
 * @param arrayPath - Path to array field
 * @returns Array of property suggestions from actual data
 */
export function extractObservedProperties(
  bundle: any,
  resourceType: string,
  arrayPath: string
): PropertySuggestion[] {
  if (!bundle || !bundle.entry) {
    return [];
  }
  
  const observedProps = new Set<string>();
  
  // Find entries matching the resource type
  for (const entry of bundle.entry) {
    if (entry.resource?.resourceType !== resourceType) {
      continue;
    }
    
    // Navigate to the array field
    const pathSegments = arrayPath.split('.');
    let current: any = entry.resource;
    
    for (const segment of pathSegments) {
      if (!current || typeof current !== 'object') break;
      current = current[segment];
    }
    
    // If we found an array, examine its items
    if (Array.isArray(current)) {
      for (const item of current) {
        if (item && typeof item === 'object') {
          // Extract all property keys from this item
          extractPropertiesRecursive(item, '', observedProps, 2);
        }
      }
    }
  }
  
  // Convert to PropertySuggestion array
  return Array.from(observedProps).map(path => ({
    path,
    name: path.split('.').pop() || path,
    type: 'unknown',
    source: 'project-data' as const,
  }));
}

/**
 * Recursively extract property paths from an object
 */
function extractPropertiesRecursive(
  obj: any,
  prefix: string,
  result: Set<string>,
  maxDepth: number,
  currentDepth: number = 0
): void {
  if (currentDepth >= maxDepth || !obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return;
  }
  
  for (const key of Object.keys(obj)) {
    // Skip internal FHIR fields
    if (key === 'id' || key === 'extension' || key === 'modifierExtension') {
      continue;
    }
    
    const fullPath = prefix ? `${prefix}.${key}` : key;
    result.add(fullPath);
    
    // Recurse into nested objects (not arrays)
    const value = obj[key];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      extractPropertiesRecursive(value, fullPath, result, maxDepth, currentDepth + 1);
    }
  }
}

/**
 * Merge schema properties with observed properties
 * Schema properties are primary, observed properties are secondary
 */
export function mergePropertySuggestions(
  schemaProps: PropertySuggestion[],
  observedProps: PropertySuggestion[]
): PropertySuggestion[] {
  const merged = [...schemaProps];
  const schemaPaths = new Set(schemaProps.map(p => p.path));
  
  // Add observed properties that aren't in schema
  for (const observedProp of observedProps) {
    if (!schemaPaths.has(observedProp.path)) {
      merged.push(observedProp);
    }
  }
  
  return merged;
}

/**
 * Clear property suggestion cache
 * Use when switching projects or refreshing schema
 */
export function clearPropertySuggestionCache(): void {
  propertySuggestionCache.clear();
}
