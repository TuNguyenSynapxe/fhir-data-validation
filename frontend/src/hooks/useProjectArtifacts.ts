import { useQuery } from '@tanstack/react-query';
import { getProjectArtifacts } from '../api/projectQueryApi';
import type { ProjectArtifactDto } from '../types/projectImport';

/**
 * Phase 9.6: Hook to fetch project artifacts (StructureDefinitions, etc.)
 * 
 * Used for SD-centric project layout
 */
export function useProjectArtifacts(projectId: string) {
  return useQuery<ProjectArtifactDto[]>({
    queryKey: ['projectArtifacts', projectId],
    queryFn: () => getProjectArtifacts(projectId),
    enabled: !!projectId,
    staleTime: 10 * 60 * 1000, // 10 minutes (artifacts don't change often)
  });
}

/**
 * Phase 9.6: Hook to get only StructureDefinitions from artifacts
 * 
 * Filters for type='StructureDefinition'
 */
export function useProjectStructureDefinitions(projectId: string) {
  const { data, ...rest } = useProjectArtifacts(projectId);
  
  const structureDefinitions = data?.filter(
    (artifact) => artifact.type === 'StructureDefinition'
  ) || [];

  return {
    data: structureDefinitions,
    ...rest,
  };
}

/**
 * Phase 9.6: Hook to get only Bundle-type StructureDefinitions
 * 
 * Filters for type='StructureDefinition' AND resourceType='Bundle'
 * Used for Bundle profile selector dropdown
 */
export function useBundleStructureDefinitions(projectId: string) {
  const { data, ...rest } = useProjectArtifacts(projectId);
  
  const bundleStructureDefinitions = data?.filter(
    (artifact) => 
      artifact.type === 'StructureDefinition' && 
      artifact.resourceType === 'Bundle'
  ) || [];

  return {
    data: bundleStructureDefinitions,
    ...rest,
  };
}
