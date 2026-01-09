import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as projectRuleApi from '../api/projectRuleApi';
import type { CreateBundleRuleRequest, UpdateBundleRuleRequest } from '../api/projectRuleApi';

/**
 * Phase 9.4: Hooks for managing bundle-scoped manual rules
 */

/**
 * Hook to fetch all rules for a bundle (imported + manual).
 */
export function useBundleRules(projectId: string, bundleId: string) {
  return useQuery({
    queryKey: ['bundle-rules', projectId, bundleId],
    queryFn: () => projectRuleApi.getBundleRules(projectId, bundleId),
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Hook to create a new bundle-scoped manual rule.
 */
export function useCreateBundleRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      bundleId,
      request,
    }: {
      projectId: string;
      bundleId: string;
      request: CreateBundleRuleRequest;
    }) => projectRuleApi.createBundleRule(projectId, bundleId, request),
    onSuccess: (_, variables) => {
      // Invalidate bundle rules query
      queryClient.invalidateQueries({
        queryKey: ['bundle-rules', variables.projectId, variables.bundleId],
      });
      // Also invalidate validation results since rules changed
      queryClient.invalidateQueries({
        queryKey: ['validation', variables.projectId, variables.bundleId],
      });
    },
  });
}

/**
 * Hook to update an existing bundle-scoped manual rule.
 */
export function useUpdateBundleRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      bundleId,
      ruleId,
      request,
    }: {
      projectId: string;
      bundleId: string;
      ruleId: string;
      request: UpdateBundleRuleRequest;
    }) => projectRuleApi.updateBundleRule(projectId, bundleId, ruleId, request),
    onSuccess: (_, variables) => {
      // Invalidate bundle rules query
      queryClient.invalidateQueries({
        queryKey: ['bundle-rules', variables.projectId, variables.bundleId],
      });
      // Also invalidate validation results since rules changed
      queryClient.invalidateQueries({
        queryKey: ['validation', variables.projectId, variables.bundleId],
      });
    },
  });
}

/**
 * Hook to delete a bundle-scoped manual rule.
 */
export function useDeleteBundleRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      bundleId,
      ruleId,
    }: {
      projectId: string;
      bundleId: string;
      ruleId: string;
    }) => projectRuleApi.deleteBundleRule(projectId, bundleId, ruleId),
    onSuccess: (_, variables) => {
      // Invalidate bundle rules query
      queryClient.invalidateQueries({
        queryKey: ['bundle-rules', variables.projectId, variables.bundleId],
      });
      // Also invalidate validation results since rules changed
      queryClient.invalidateQueries({
        queryKey: ['validation', variables.projectId, variables.bundleId],
      });
    },
  });
}
