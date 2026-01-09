import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as projectImportApi from '../api/projectImportApi';

/**
 * Phase 9.1: Hook for importing Simplifier R5 packages
 */
export function useImportProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => projectImportApi.importProject(file),
    onSuccess: () => {
      // Invalidate projects list to show newly imported project
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}
