import { useQuery } from '@tanstack/react-query';
import { getProjectArtifacts, getProjectStructureDefinitions } from '../api/projectQueryApi';
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
 * Phase 10.1/10.2: Hook to get only promoted StructureDefinitions
 * 
 * Uses Phase 10.1 endpoint that returns only ValidationProfile and BundleProfile (promoted SDs).
 * Phase 10.2 expanded promotion criteria to include SDs with actionable constraints.
 */
export function useProjectStructureDefinitions(projectId: string) {
  return useQuery<ProjectArtifactDto[]>({
    queryKey: ['projectStructureDefinitions', projectId],
    queryFn: () => getProjectStructureDefinitions(projectId),
    enabled: !!projectId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
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
