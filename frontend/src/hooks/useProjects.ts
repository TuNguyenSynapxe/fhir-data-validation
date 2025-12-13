import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import * as projectsApi from '../api/projectsApi';

// Server state managed by TanStack Query by design
// Projects list is server-owned data

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.getProjects,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ name, description }: { name: string; description?: string }) =>
      projectsApi.createProject(name, description),
    onSuccess: () => {
      // Only invalidate projects list
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => projectsApi.deleteProject(id),
    onSuccess: () => {
      // Only invalidate projects list
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}
