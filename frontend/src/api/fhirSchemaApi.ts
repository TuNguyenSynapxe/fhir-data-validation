/**
 * FHIR Schema API - Dedicated endpoint for FHIR schema tree
 * 
 * This module provides a single, explicit function for fetching FHIR schema data.
 * It enforces strict contracts and prevents accidental misuse of wrong endpoints.
 * 
 * CRITICAL RULES:
 * - Always use /api/fhir/schema/{resourceType}
 * - Never use /schema or registry endpoints
 * - Fail loudly on invalid responses
 * - No silent fallbacks
 */

/**
 * Strict TypeScript contract for FHIR schema tree response
 * This matches the FhirSchemaNode model from the backend.
 */
export interface FhirSchemaNodeResponse {
  path: string;
  elementName: string;
  type: string;
  choiceTypes: string[];
  isArray: boolean;
  isChoice: boolean;
  min: number;
  max: string;
  description?: string;
  short?: string;
  isBackbone: boolean;
  isRequired: boolean;
  children: FhirSchemaNodeResponse[];
}

/**
 * Runtime assertion to validate schema response shape
 * 
 * This is a hard guardrail that throws if the response doesn't match
 * the expected FhirSchemaNode format.
 * 
 * @throws Error if response is invalid
 */
export function assertFhirSchemaNode(
  resp: any
): asserts resp is FhirSchemaNodeResponse {
  if (!resp) {
    throw new Error(
      "Invalid FHIR schema response: Response is null or undefined"
    );
  }

  if (typeof resp !== "object") {
    throw new Error(
      "Invalid FHIR schema response: Response must be an object"
    );
  }

  // Validate required properties
  if (!resp.path || typeof resp.path !== "string") {
    throw new Error(
      "Invalid FHIR schema response: Missing or invalid 'path' property"
    );
  }

  if (typeof resp.min !== "number") {
    throw new Error(
      `Invalid FHIR schema response: 'min' must be a number, got ${typeof resp.min}`
    );
  }

  if (!resp.max || typeof resp.max !== "string") {
    throw new Error(
      "Invalid FHIR schema response: Missing or invalid 'max' property"
    );
  }

  if (!Array.isArray(resp.children)) {
    throw new Error(
      "Invalid FHIR schema response: 'children' must be an array"
    );
  }

  // For non-root nodes, validate elementName exists
  if (!resp.elementName && resp.path.includes('.')) {
    throw new Error(
      "Invalid FHIR schema response: Missing 'elementName' property for non-root node"
    );
  }
}

/**
 * Fetch FHIR schema tree for a specific resource type
 * 
 * This is the ONLY function that should be used to load FHIR schema
 * for tree rendering in the Advanced Rules feature.
 * 
 * ENDPOINT: /api/fhir/schema/{resourceType}
 * 
 * NOTE: The backend currently only supports R4. Version parameter is
 * reserved for future use when R5 support is added.
 * 
 * @param resourceType - FHIR resource type (e.g., "Patient", "Observation")
 * @param version - FHIR version ("R4" or "R5") - currently only R4 supported
 * @returns Validated FhirSchemaNode tree
 * @throws Error if fetch fails or response is invalid
 * 
 * @example
 * ```ts
 * const schema = await fetchFhirSchema("Patient", "R4");
 * // schema is guaranteed to be a valid FhirSchemaNode
 * ```
 */
export async function fetchFhirSchema(
  resourceType: string,
  version: "R4" | "R5" = "R4"
): Promise<FhirSchemaNodeResponse> {
  if (!resourceType || typeof resourceType !== "string") {
    throw new Error("fetchFhirSchema: resourceType must be a non-empty string");
  }

  if (!resourceType.match(/^[A-Z][a-zA-Z]*$/)) {
    throw new Error(
      `fetchFhirSchema: resourceType must start with uppercase letter and contain only letters, got "${resourceType}"`
    );
  }

  if (version !== "R4" && version !== "R5") {
    throw new Error(`fetchFhirSchema: version must be "R4" or "R5", got "${version}"`);
  }

  // Backend endpoint - no query params needed, version is implicit (R4)
  const url = `/api/fhir/schema/${resourceType}`;

  let response: Response;
  try {
    response = await fetch(url);
  } catch (error) {
    throw new Error(
      `Failed to fetch FHIR schema for ${resourceType}: ${error instanceof Error ? error.message : "Network error"}`
    );
  }

  if (!response.ok) {
    // Try to parse error response from backend
    let errorMessage = `${response.status} ${response.statusText}`;
    try {
      const errorData = await response.json();
      if (errorData.message) {
        errorMessage = errorData.message;
      }
    } catch {
      // Ignore JSON parse error, use default message
    }
    
    throw new Error(
      `Failed to load schema for ${resourceType}: ${errorMessage}`
    );
  }

  let data: any;
  try {
    data = await response.json();
  } catch (error) {
    throw new Error(
      `Failed to parse schema response for ${resourceType}: Invalid JSON`
    );
  }

  // Runtime validation - throws if invalid
  assertFhirSchemaNode(data);

  return data;
}

/**
 * Type guard to check if a value is a valid FhirSchemaNode
 * 
 * Use this for conditional checks without throwing.
 * For mandatory validation, use assertFhirSchemaNode instead.
 */
export function isFhirSchemaNode(
  value: any
): value is FhirSchemaNodeResponse {
  try {
    assertFhirSchemaNode(value);
    return true;
  } catch {
    return false;
  }
}
