import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as projectsApi from '../api/projectsApi';

// Server state managed by TanStack Query by design
// Project metadata, bundle, rules, and validation results are server-owned data

export function useProject(id: string) {
  return useQuery({
    queryKey: ['project', id],
    queryFn: () => projectsApi.getProject(id),
    enabled: !!id,
  });
}

export function useSaveBundle(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (json: string) => projectsApi.saveBundle(id, json),
    onSuccess: () => {
      // Invalidate project data and validation results
      queryClient.invalidateQueries({ queryKey: ['project', id] });
    },
  });
}

export function useSaveRules(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (json: string) => projectsApi.saveRules(id, json),
    onSuccess: () => {
      // Invalidate project data
      queryClient.invalidateQueries({ queryKey: ['project', id] });
    },
  });
}

export function useSaveCodeMaster(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (json: string) => projectsApi.saveCodeMaster(id, json),
    onSuccess: () => {
      // Invalidate project data
      queryClient.invalidateQueries({ queryKey: ['project', id] });
    },
  });
}

export function useSaveValidationSettings(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (json: string) => projectsApi.saveValidationSettings(id, json),
    onSuccess: () => {
      // Invalidate project data
      queryClient.invalidateQueries({ queryKey: ['project', id] });
    },
  });
}

export function useValidateProject(id: string) {
  return useMutation({
    mutationFn: () => projectsApi.validateProject(id),
    // Validation results are returned directly, no cache invalidation needed
  });
}
