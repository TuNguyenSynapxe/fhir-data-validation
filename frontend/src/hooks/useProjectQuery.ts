import { useQuery } from '@tanstack/react-query';
import * as projectQueryApi from '../api/projectQueryApi';
import * as sampleBundlesApi from '../api/sampleBundlesApi';

/**
 * Phase 7.4 + 9.2 + Phase 3: Hooks for querying project data (read-only)
 */

export function useProjectDetails(projectId: string) {
  return useQuery({
    queryKey: ['projectDetails', projectId],
    queryFn: () => projectQueryApi.getProjectDetails(projectId),
    enabled: !!projectId,
  });
}

export function useProjectBundles(projectId: string) {
  return useQuery({
    queryKey: ['projectBundles', projectId],
    queryFn: () => projectQueryApi.getProjectBundles(projectId),
    enabled: !!projectId,
  });
}

export function useProjectRules(projectId: string) {
  return useQuery({
    queryKey: ['projectRules', projectId],
    queryFn: () => projectQueryApi.getProjectRules(projectId),
    enabled: !!projectId,
  });
}

/**
 * Phase 3: Get sample bundles, optionally filtered by SD canonical URL
 */
export function useSampleBundles(projectId: string, sdCanonicalUrl?: string) {
  return useQuery({
    queryKey: ['sample-bundles', projectId, sdCanonicalUrl],
    queryFn: () => sampleBundlesApi.getSampleBundles(projectId, sdCanonicalUrl),
    enabled: !!projectId,
  });
}
