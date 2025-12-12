import { useState, useEffect, useCallback } from 'react';
import type { ProjectMetadata } from '../types/project';
import * as projectsApi from '../api/projectsApi';

export function useProjects() {
  const [data, setData] = useState<ProjectMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(() => {
    setIsLoading(true);
    projectsApi.getProjects()
      .then(result => {
        setData(result);
        setError(null);
      })
      .catch(err => {
        setError(err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, isLoading, error, refetch };
}

export function useCreateProject() {
  const [isPending, setIsPending] = useState(false);

  const mutateAsync = useCallback(async ({ name, description }: { name: string; description?: string }) => {
    setIsPending(true);
    try {
      const result = await projectsApi.createProject(name, description);
      return result;
    } finally {
      setIsPending(false);
    }
  }, []);

  return { mutateAsync, isPending };
}

export function useDeleteProject() {
  const [isPending, setIsPending] = useState(false);

  const mutateAsync = useCallback(async (id: string) => {
    setIsPending(true);
    try {
      const result = await projectsApi.deleteProject(id);
      return result;
    } finally {
      setIsPending(false);
    }
  }, []);

  return { mutateAsync, isPending };
}
