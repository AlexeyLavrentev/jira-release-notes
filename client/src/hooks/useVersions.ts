import { useQuery } from '@tanstack/react-query';
import { fetchVersions } from '../api/client.js';

/**
 * useVersions — GET /api/versions?project=KEY (D-39).
 * enabled only when projectKey !== null. staleTime 5min.
 */
export function useVersions(projectKey: string | null) {
  return useQuery({
    queryKey: ['versions', projectKey],
    queryFn: () => fetchVersions(projectKey!),
    enabled: projectKey !== null,
    staleTime: 5 * 60 * 1000,
  });
}
