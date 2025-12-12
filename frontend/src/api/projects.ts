const API_BASE = 'http://localhost:5000/api';

export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  bundleJson?: string;
  rulesJson?: string;
  codeMasterJson?: string;
}

export interface ValidationError {
  source: string;
  severity: string;
  resourceType?: string;
  path?: string;
  jsonPointer?: string;
  errorCode?: string;
  message: string;
  details?: Record<string, unknown>;
  navigation?: {
    jsonPointer: string;
    breadcrumbs: string[];
    missingParents: string[];
  };
}

export interface ValidationResponse {
  errors: ValidationError[];
  summary: {
    totalErrors: number;
    errorCount: number;
    warningCount: number;
    infoCount: number;
    fhirErrorCount: number;
    businessErrorCount: number;
    codeMasterErrorCount: number;
    referenceErrorCount: number;
  };
  metadata: {
    timestamp: string;
    fhirVersion?: string;
    rulesVersion?: string;
    processingTimeMs: number;
  };
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || `HTTP ${response.status}`);
  }
  return response.json();
}

export const projectsApi = {
  async list(): Promise<Project[]> {
    const response = await fetch(`${API_BASE}/projects`);
    return handleResponse(response);
  },

  async create(data: { name: string; description: string }): Promise<Project> {
    const response = await fetch(`${API_BASE}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async getById(id: string): Promise<Project> {
    const response = await fetch(`${API_BASE}/projects/${id}`);
    return handleResponse(response);
  },

  async delete(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/projects/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error(`Failed to delete project: ${response.statusText}`);
    }
  },

  async saveBundle(id: string, bundleJson: string): Promise<void> {
    const response = await fetch(`${API_BASE}/projects/${id}/bundle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bundleJson }),
    });
    return handleResponse(response);
  },

  async saveRules(id: string, rulesJson: string): Promise<void> {
    const response = await fetch(`${API_BASE}/projects/${id}/rules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rulesJson }),
    });
    return handleResponse(response);
  },

  async saveCodeMaster(id: string, codeMasterJson: string): Promise<void> {
    const response = await fetch(`${API_BASE}/projects/${id}/codemaster`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codeMasterJson }),
    });
    return handleResponse(response);
  },

  async validate(id: string): Promise<ValidationResponse> {
    const response = await fetch(`${API_BASE}/projects/${id}/validate`, {
      method: 'POST',
    });
    return handleResponse(response);
  },

  async export(id: string): Promise<unknown> {
    const response = await fetch(`${API_BASE}/projects/${id}/export`);
    return handleResponse(response);
  },
};
