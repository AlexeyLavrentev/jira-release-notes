import { useQuery } from '@tanstack/react-query';
import { fetchConfig } from '../api/client.js';

/**
 * TanStack Query hook (CONTEXT.md D-41) — fetches GET /api/config.
 * staleTime 0 + retry 1 from the client default options.
 */
export function useConnectionStatus() {
  return useQuery({ queryKey: ['config'], queryFn: fetchConfig });
}
