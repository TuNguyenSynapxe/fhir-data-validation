import httpClient from './httpClient';
import type { BulkRuleIntentRequest, BulkRuleIntentResponse } from '../types/ruleIntent';

/**
 * Bulk create rules from intents
 * 
 * Backend responsibilities:
 * - Generate rule messages via template
 * - Set status = 'draft'
 * - Assign IDs
 * - Return created rules
 */
export async function bulkCreateRules(
  projectId: string,
  request: BulkRuleIntentRequest
): Promise<BulkRuleIntentResponse> {
  const response = await httpClient.post<BulkRuleIntentResponse>(
    `/api/projects/${projectId}/rules/bulk`,
    request
  );
  return response.data;
}
