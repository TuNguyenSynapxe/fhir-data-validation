import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getBundleProfileState, setBundleProfile } from '../api/bundleProfileApi';
import type { BundleProfileStateDto, SetBundleProfileRequest } from '../types/bundleProfile';

/**
 * Phase 9.6: Hook to fetch Bundle profile resolution state
 * 
 * Returns: resolved | unresolved | unprofiled
 */
export function useBundleProfile(projectId: string, bundleId: string) {
  return useQuery<BundleProfileStateDto>({
    queryKey: ['bundleProfile', projectId, bundleId],
    queryFn: () => getBundleProfileState(projectId, bundleId),
    enabled: !!projectId && !!bundleId,
    staleTime: 5 * 60 * 1000, // 5 minutes (profile state doesn't change often)
  });
}

/**
 * Phase 9.6: Hook to manually set Bundle profile (admin only)
 * 
 * Sets StructureDefinition association or marks as unprofiled (null)
 */
export function useSetBundleProfile(projectId: string, bundleId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: SetBundleProfileRequest) =>
      setBundleProfile(projectId, bundleId, request),
    onSuccess: (data) => {
      // Invalidate bundle profile query to trigger refetch
      queryClient.invalidateQueries({
        queryKey: ['bundleProfile', projectId, bundleId],
      });
      
      // Also invalidate project queries in case counts changed
      queryClient.invalidateQueries({
        queryKey: ['project', projectId],
      });
    },
  });
}

/**
 * Phase 9.6: Hook to fetch multiple bundle profiles in batch
 * 
 * Used for SD-centric project overview where we need all bundle states
 */
export function useBundleProfiles(projectId: string, bundleIds: string[]) {
  return useQuery<Map<string, BundleProfileStateDto>>({
    queryKey: ['bundleProfiles', projectId, bundleIds.sort().join(',')],
    queryFn: async () => {
      const states = await Promise.all(
        bundleIds.map(async (bundleId) => {
          const state = await getBundleProfileState(projectId, bundleId);
          return [bundleId, state] as const;
        })
      );
      return new Map(states);
    },
    enabled: !!projectId && bundleIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}
