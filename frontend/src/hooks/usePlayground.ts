import { useState, useEffect, useCallback } from 'react';
import * as projectsApi from '../api/projectsApi';

export function useProject(id: string) {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!id) return;

    let cancelled = false;
    setIsLoading(true);
    
    projectsApi.getProject(id)
      .then(result => {
        if (!cancelled) {
          setData(result);
          setError(null);
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError(err);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  return { data, isLoading, error };
}

export function useSaveBundle(id: string) {
  const [isPending, setIsPending] = useState(false);

  const mutateAsync = useCallback(async (json: string) => {
    setIsPending(true);
    try {
      const result = await projectsApi.saveBundle(id, json);
      return result;
    } finally {
      setIsPending(false);
    }
  }, [id]);

  return { mutateAsync, isPending };
}

export function useSaveRules(id: string) {
  const [isPending, setIsPending] = useState(false);

  const mutateAsync = useCallback(async (json: string) => {
    setIsPending(true);
    try {
      const result = await projectsApi.saveRules(id, json);
      return result;
    } finally {
      setIsPending(false);
    }
  }, [id]);

  return { mutateAsync, isPending };
}

export function useSaveCodeMaster(id: string) {
  const [isPending, setIsPending] = useState(false);

  const mutateAsync = useCallback(async (json: string) => {
    setIsPending(true);
    try {
      const result = await projectsApi.saveCodeMaster(id, json);
      return result;
    } finally {
      setIsPending(false);
    }
  }, [id]);

  return { mutateAsync, isPending };
}

export function useValidateProject(id: string) {
  const [isPending, setIsPending] = useState(false);

  const mutateAsync = useCallback(async () => {
    setIsPending(true);
    try {
      const result = await projectsApi.validateProject(id);
      return result;
    } finally {
      setIsPending(false);
    }
  }, [id]);

  return { mutateAsync, isPending };
}
