import { ValidationResultsView } from '@/validation/views';

/**
 * ValidationResultsPage
 * 
 * Demo page showing validation results from API.
 * In production, projectId would come from:
 * - Route parameters (e.g., /validation/results/:projectId)
 * - URL query string
 * - Application context
 * 
 * For demo purposes, using a mock projectId.
 * Replace with actual routing integration.
 */

// TODO: Replace with actual projectId from route/context
const DEMO_PROJECT_ID = 'demo-project-123';

export default function ValidationResultsPage() {
  return <ValidationResultsView projectId={DEMO_PROJECT_ID} />;
}
