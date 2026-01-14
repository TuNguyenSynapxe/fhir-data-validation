/**
 * SD Builder API Client
 * 
 * Frontend API client for SD Builder backend endpoints.
 * All payloads are treated as opaque JSON - no FHIR logic or validation.
 * 
 * Rules:
 * - No FHIR logic
 * - No validation
 * - All data transformations happen server-side
 * - Throws on non-2xx responses
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// ============================================================================
// DTOs (Type Definitions)
// ============================================================================

export interface StartSessionRequest {
  fhirVersion?: 'R5' | 'R4' | 'R4B'; // Default: R5
  resourceType: string;
  baseSdUrl?: string;
  visibilityMode?: 'Minimal' | 'Full'; // Changed from AuthoringOnly to Minimal/Full
  importProfileUrl?: string;
}

export interface StartSessionResponse {
  sessionId: string;
  design: ResourceDesignState;
}

export interface ResourceDesignState {
  resourceType: string;
  visibilityMode: string;
  elements: ElementDesign[];
}

export interface ElementDesign {
  path: string;
  baseCardinality: Cardinality;
  overrideCardinality: Cardinality | null;
  isIncluded: boolean;
  binding: BindingConfig | null;
  slicing: SlicingConfig | null;
  slices: SliceDesign[];
}

export interface Cardinality {
  min: number;
  max: string;
}

export interface BindingConfig {
  valueSetUrl: string;
  strength: 'Required' | 'Extensible' | 'Preferred' | 'Example';
}

export interface SlicingConfig {
  ordered: boolean;
  rules: 'Open' | 'Closed' | 'OpenAtEnd';
  discriminators: Discriminator[];
}

export interface Discriminator {
  type: 'Value' | 'Pattern' | 'Type' | 'Profile' | 'Exists';
  path: string;
}

export interface SliceDesign {
  sliceName: string;
  cardinality: Cardinality | null;
  binding: BindingConfig | null;
  children: SliceChildConstraint[];
}

export interface SliceChildConstraint {
  relativePath: string;
  cardinality: Cardinality | null;
  binding: BindingConfig | null;
  fixedValue: unknown | null;
  patternValue: unknown | null;
}

export interface SdCommand {
  commandType: string;
  path?: string;
  sliceName?: string;
  relativePath?: string;
  [key: string]: unknown;
}

export interface ImportSessionRequest {
  profileSdJson: string;
}

export interface SendCommandRequest {
  command: SdCommand;
}

export interface SendCommandResponse {
  design: ResourceDesignState;
}

export interface ValidateSessionResponse {
  validation: ValidationResult;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

export interface ValidationIssue {
  severity: 'Error' | 'Warning';
  message: string;
  path: string | null;
  sliceName: string | null;
}

export interface ExportRequest {
  metadata: SdMetadata;
}

export interface SdMetadata {
  url: string;
  name: string;
  version: string;
  status: string;
  description: string;
}

export interface ExportResponse {
  structureDefinition: unknown; // Opaque FHIR JSON
}

// ============================================================================
// Error Handling
// ============================================================================

export class SdBuilderApiError extends Error {
  constructor(
    public statusCode: number,
    public statusText: string,
    public body: unknown
  ) {
    super(`API Error ${statusCode}: ${statusText}`);
    this.name = 'SdBuilderApiError';
  }
}

// ============================================================================
// API Methods
// ============================================================================

/**
 * Start a new SD Builder session
 * @param request - Session initialization parameters
 * @returns Session ID and initial design state
 * @throws SdBuilderApiError on non-2xx response
 */
export async function startSession(
  request: StartSessionRequest
): Promise<StartSessionResponse> {
  const response = await fetch(`${API_BASE_URL}/sd-builder/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new SdBuilderApiError(response.status, response.statusText, body);
  }

  return response.json();
}

/**
 * Import a StructureDefinition into a new session
 * @param request - Profile SD JSON
 * @returns Session ID and imported design state
 * @throws SdBuilderApiError on non-2xx response
 */
export async function importSession(
  request: ImportSessionRequest
): Promise<StartSessionResponse> {
  const response = await fetch(`${API_BASE_URL}/sd-builder/session/import`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new SdBuilderApiError(response.status, response.statusText, body);
  }

  return response.json();
}

/**
 * Send a command to modify the design state
 * @param sessionId - Session ID
 * @param command - Command to execute
 * @returns Updated design state
 * @throws SdBuilderApiError on non-2xx response
 */
export async function sendCommand(
  sessionId: string,
  command: SdCommand
): Promise<SendCommandResponse> {
  // Extract commandType and rest as payload
  const { commandType, ...payload } = command;
  
  const response = await fetch(`${API_BASE_URL}/sd-builder/sessions/${sessionId}/commands`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      commandType,
      payload,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new SdBuilderApiError(response.status, response.statusText, body);
  }

  return response.json();
}

/**
 * Validate the current session state
 * @param sessionId - Session ID
 * @returns Validation result with errors and warnings
 * @throws SdBuilderApiError on non-2xx response
 */
export async function validateSession(
  sessionId: string
): Promise<ValidateSessionResponse> {
  const response = await fetch(`${API_BASE_URL}/sd-builder/sessions/${sessionId}/validate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new SdBuilderApiError(response.status, response.statusText, body);
  }

  return response.json();
}

/**
 * Export the session as a StructureDefinition
 * @param sessionId - Session ID
 * @param metadata - SD metadata
 * @returns StructureDefinition as opaque JSON
 * @throws SdBuilderApiError on non-2xx response
 */
export async function exportStructureDefinition(
  sessionId: string,
  metadata: SdMetadata
): Promise<ExportResponse> {
  const response = await fetch(`${API_BASE_URL}/sd-builder/sessions/${sessionId}/export`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ metadata }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new SdBuilderApiError(response.status, response.statusText, body);
  }

  return response.json();
}
