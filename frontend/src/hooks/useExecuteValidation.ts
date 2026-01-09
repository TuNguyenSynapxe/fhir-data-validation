import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as validationExecutionApi from '../api/validationExecutionApi';
import type { ExecuteValidationRequest } from '../api/validationExecutionApi';

interface ExecuteValidationParams {
  projectId: string;
  bundleId: string;
  request?: ExecuteValidationRequest;
}

/**
 * Hook for executing validation on a project bundle (Phase 8.2 API).
 */
export function useExecuteValidation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, bundleId, request }: ExecuteValidationParams) =>
      validationExecutionApi.executeValidation(projectId, bundleId, request),
    onSuccess: (data, variables) => {
      // Invalidate any cached validation results for this bundle
      queryClient.invalidateQueries({
        queryKey: ['validation', variables.projectId, variables.bundleId],
      });
    },
  });
}
