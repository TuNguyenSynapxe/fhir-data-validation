import { useQuery } from '@tanstack/react-query';
import * as projectQueryApi from '../api/projectQueryApi';

/**
 * Phase 7.4 + 9.2: Hooks for querying project data (read-only)
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
