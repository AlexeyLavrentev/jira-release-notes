import { useQuery } from '@tanstack/react-query';
import { fetchProjects } from '../api/client.js';

/**
 * useProjects — GET /api/projects (D-39).
 * staleTime 5min (projects change rarely). Always enabled on /select.
 */
export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: fetchProjects,
    staleTime: 5 * 60 * 1000,
  });
}
